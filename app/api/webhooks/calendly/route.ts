import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import {
  isWebhookProcessed,
  recordWebhookEvent,
  markWebhookProcessed,
} from "@/lib/webhooks";

function verifyCalendlySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("calendly-webhook-signature");

  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (secret && !verifyCalendlySignature(body, signature, secret)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const payload = JSON.parse(body);
  const event = payload.event;
  const eventId =
    payload.payload?.tracking?.utm_content ??
    payload.payload?.uri ??
    crypto.randomUUID();

  // Idempotency check
  if (await isWebhookProcessed("calendly", eventId)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await recordWebhookEvent("calendly", eventId, event, payload);

  try {
    switch (event) {
      case "invitee.created": {
        const calendlyEventUri = payload.payload?.event;

        // Find the introduction by calendly event ID pattern
        if (calendlyEventUri) {
          const introduction = await db.introduction.findFirst({
            where: { calendlyEventId: calendlyEventUri },
            include: { match: true },
          });

          if (introduction) {
            // Update introduction status
            await db.introduction.update({
              where: { id: introduction.id },
              data: { status: "MEETING_BOOKED" },
            });

            // Update match status
            await db.match.update({
              where: { id: introduction.matchId },
              data: { status: "MEETING_BOOKED" },
            });

            // Create follow-up task
            const match = introduction.match;
            if (match.sharedOrgId) {
              await db.task.create({
                data: {
                  title: `Follow up after meeting for match ${match.id}`,
                  description:
                    "Meeting has been booked via Calendly. Prepare talking points and follow up after the meeting.",
                  status: "TODO",
                  priority: "HIGH",
                  orgId: match.sharedOrgId,
                  relatedType: "Introduction",
                  relatedId: introduction.id,
                },
              });
            }
          }
        }
        break;
      }

      case "invitee.canceled": {
        const calendlyEventUri = payload.payload?.event;

        if (calendlyEventUri) {
          const introduction = await db.introduction.findFirst({
            where: { calendlyEventId: calendlyEventUri },
          });

          if (introduction) {
            await db.introduction.update({
              where: { id: introduction.id },
              data: { status: "PENDING" },
            });

            await db.match.update({
              where: { id: introduction.matchId },
              data: { status: "INTRO_SENT" },
            });
          }
        }
        break;
      }
    }

    await markWebhookProcessed("calendly", eventId);
  } catch (err) {
    console.error("Calendly webhook processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
