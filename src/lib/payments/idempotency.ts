import { db } from "../db";

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  status?: "PENDING" | "RESOLVED" | "FAILED";
  cachedResponse?: Record<string, unknown>;
}

export async function checkIdempotency(
  key: string,
  scope: "ORDER_CREATE" | "PAYMENT_INITIATE" | "PAYMENT_VERIFY"
): Promise<IdempotencyCheckResult> {
  if (!key) return { isDuplicate: false };

  const existing = await db.idempotencyRecord.findUnique({
    where: { key },
  });

  if (!existing) {
    // Acquire lock with 15-minute TTL
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.idempotencyRecord.create({
      data: {
        key,
        scope,
        status: "PENDING",
        expiresAt,
      },
    });
    return { isDuplicate: false };
  }

  // Check if expired
  if (existing.expiresAt < new Date()) {
    await db.idempotencyRecord.delete({ where: { key } });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.idempotencyRecord.create({
      data: {
        key,
        scope,
        status: "PENDING",
        expiresAt,
      },
    });
    return { isDuplicate: false };
  }

  return {
    isDuplicate: true,
    status: existing.status as "PENDING" | "RESOLVED" | "FAILED",
    cachedResponse: existing.response ? JSON.parse(existing.response) : undefined,
  };
}

export async function resolveIdempotency(
  key: string,
  response: Record<string, unknown>,
  status: "RESOLVED" | "FAILED" = "RESOLVED"
) {
  try {
    await db.idempotencyRecord.update({
      where: { key },
      data: {
        status,
        response: JSON.stringify(response),
      },
    });
  } catch (err) {
    console.error("Failed to resolve idempotency key:", key, err);
  }
}
