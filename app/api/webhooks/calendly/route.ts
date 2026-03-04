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

/**
 * Two-tier matching: find an Introduction for the incoming Calendly event.
 *
 * 1. If `calendlyEventUri` is provided, look up by exact match on
 *    `calendlyEventId` (pre-populated when booking link was set).
 * 2. Fallback: match by invitee email + time window (±7 days of intro
 *    creation) + org association through the match's demand brief.
 */
async function findIntroduction(payload: Record<string, unknown>) {
  const inner = payload.payload as Record<string, unknown> | undefined;
  const calendlyEventUri = inner?.event as string | undefined;

  // Tier 1: exact event URI match
  if (calendlyEventUri) {
    const intro = await db.introduction.findFirst({
      where: { calendlyEventId: calendlyEventUri },
      include: {
        match: {
          include: {
            demandBrief: { select: { createdByOrgId: true } },
          },
        },
      },
    });
    if (intro) return intro;
  }

  // Tier 2: fallback — invitee email + time window + org
  const invitee = (
    inner?.invitee as Record<string, unknown> | undefined
  );
  const inviteeEmail = invitee?.email as string | undefined;

  if (!inviteeEmail) return null;

  // Look within a ±7 day window of the scheduled event start time
  const scheduledEvent = inner?.scheduled_event as Record<string, unknown> | undefined;
  const eventStartStr = scheduledEvent?.start_time as string | undefined;
  const eventStart = eventStartStr ? new Date(eventStartStr) : new Date();

  const windowStart = new Date(eventStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(eventStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find contacts that match the invitee email to resolve the org
  const contacts = await db.contact.findMany({
    where: { email: inviteeEmail },
    select: { account: { select: { orgId: true } } },
  });
  const orgIds = [...new Set(contacts.map((c) => c.account.orgId))];

  if (orgIds.length === 0) {
    // Try matching any recent SENT introduction without org filter
    const intro = await db.introduction.findFirst({
      where: {
        status: "SENT",
        calendlyEventId: null,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        match: {
          include: {
            demandBrief: { select: { createdByOrgId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return intro;
  }

  // Find introductions for those orgs in the time window
  const intro = await db.introduction.findFirst({
    where: {
      status: "SENT",
      calendlyEventId: null,
      createdAt: { gte: windowStart, lte: windowEnd },
      match: {
        demandBrief: { createdByOrgId: { in: orgIds } },
      },
    },
    include: {
      match: {
        include: {
          demandBrief: { select: { createdByOrgId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return intro;
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
        const calendlyEventUri = payload.payload?.event as string | undefined;
        const introduction = await findIntroduction(payload);

        if (introduction) {
          // Store the Calendly event URI and update status atomically
          await db.$transaction([
            db.introduction.update({
              where: { id: introduction.id },
              data: {
                status: "MEETING_BOOKED",
                calendlyEventId: calendlyEventUri ?? null,
              },
            }),
            db.match.update({
              where: { id: introduction.matchId },
              data: { status: "MEETING_BOOKED" },
            }),
          ]);

          // Create follow-up task
          const clientOrgId =
            introduction.match.sharedOrgId ??
            introduction.match.demandBrief.createdByOrgId;

          await db.task.create({
            data: {
              title: `Follow up: meeting booked for ${introduction.id}`,
              description:
                "A meeting has been booked via Calendly. Prepare talking points and follow up after the meeting.",
              status: "TODO",
              priority: "HIGH",
              orgId: clientOrgId,
              relatedType: "Introduction",
              relatedId: introduction.id,
              dueDate: payload.payload?.scheduled_event?.start_time
                ? new Date(payload.payload.scheduled_event.start_time)
                : null,
            },
          });
        }
        break;
      }

      case "invitee.canceled": {
        const calendlyEventUri = payload.payload?.event as string | undefined;

        if (calendlyEventUri) {
          const introduction = await db.introduction.findFirst({
            where: { calendlyEventId: calendlyEventUri },
          });

          if (introduction) {
            // Revert status based on whether the intro was previously sent
            const revertStatus = introduction.introSentAt ? "SENT" : "PENDING";

            await db.$transaction([
              db.introduction.update({
                where: { id: introduction.id },
                data: { status: revertStatus },
              }),
              db.match.update({
                where: { id: introduction.matchId },
                data: {
                  status: introduction.introSentAt
                    ? "INTRO_SENT"
                    : "PROPOSED",
                },
              }),
            ]);
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
