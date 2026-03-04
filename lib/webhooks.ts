import { db } from "./db";

export async function isWebhookProcessed(
  provider: string,
  externalId: string
): Promise<boolean> {
  const existing = await db.webhookEvent.findUnique({
    where: { provider_externalId: { provider, externalId } },
  });
  return existing?.processedAt !== null && existing?.processedAt !== undefined;
}

export async function recordWebhookEvent(
  provider: string,
  externalId: string,
  eventType: string,
  payload: unknown
) {
  return db.webhookEvent.upsert({
    where: { provider_externalId: { provider, externalId } },
    create: {
      provider,
      externalId,
      eventType,
      payload: payload as object,
    },
    update: {},
  });
}

export async function markWebhookProcessed(
  provider: string,
  externalId: string
) {
  return db.webhookEvent.update({
    where: { provider_externalId: { provider, externalId } },
    data: { processedAt: new Date() },
  });
}
