import { describe, it, expect } from "vitest";
import { checkIdempotency, resolveIdempotency } from "@/lib/payments/idempotency";
import { db } from "@/lib/db";

describe("Payment & Order Idempotency Engine", () => {
  const testKey = `test_idemp_${Date.now()}`;

  it("first attempt returns non-duplicate with PENDING lock", async () => {
    const check1 = await checkIdempotency(testKey, "ORDER_CREATE");
    expect(check1.isDuplicate).toBe(false);
  });

  it("second concurrent attempt with same key detects duplicate", async () => {
    const check2 = await checkIdempotency(testKey, "ORDER_CREATE");
    expect(check2.isDuplicate).toBe(true);
    expect(check2.status).toBe("PENDING");
  });

  it("resolves idempotency key and returns cached response on subsequent calls", async () => {
    const sampleResponse = { orderNumber: "RZG-2026-TEST", total: 68999, status: "PAID" };
    await resolveIdempotency(testKey, sampleResponse, "RESOLVED");

    const check3 = await checkIdempotency(testKey, "ORDER_CREATE");
    expect(check3.isDuplicate).toBe(true);
    expect(check3.status).toBe("RESOLVED");
    expect(check3.cachedResponse).toEqual(sampleResponse);
  });
});
