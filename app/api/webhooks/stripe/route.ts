import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLAN_QUOTAS } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  isWebhookProcessed,
  recordWebhookEvent,
  markWebhookProcessed,
} from "@/lib/webhooks";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // Idempotency check
  if (await isWebhookProcessed("stripe", event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await recordWebhookEvent("stripe", event.id, event.type, event.data);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        if (status === "active") {
          // Find the org by Stripe customer metadata or lookup
          const metadata = subscription.metadata;
          const orgId = metadata?.org_id;

          if (orgId) {
            // Determine quota from price/product metadata
            const planKey = metadata?.plan ?? "starter";
            const quota = PLAN_QUOTAS[planKey] ?? 4;

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            await db.deliveryCycle.upsert({
              where: {
                orgId_month: { orgId, month: monthStart },
              },
              create: {
                orgId,
                month: monthStart,
                introQuota: quota,
                deliveredCount: 0,
                status: "ACTIVE",
                stripeSubId: subscription.id,
              },
              update: {
                introQuota: quota,
                stripeSubId: subscription.id,
                status: "ACTIVE",
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const metadata = subscription.metadata;
        const orgId = metadata?.org_id;

        if (orgId) {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          await db.deliveryCycle.updateMany({
            where: { orgId, month: monthStart },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Could trigger monthly cycle renewal
        break;
      }
    }

    await markWebhookProcessed("stripe", event.id);
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
