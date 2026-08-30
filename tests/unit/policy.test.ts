import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { validateOrderPolicy } from "@/lib/engine/policy";
import { db } from "@/lib/db";

describe("Deterministic Financial Policy & Safety Engine", () => {
  it("rejects non-positive order amounts", async () => {
    const res = await validateOrderPolicy("merchant_default_rzg", 0);
    expect(res.allowed).toBe(false);
    expect(res.ruleCode).toBe("NON_POSITIVE_AMOUNT");
    expect(res.riskScore).toBe(1.0);
  });

  it("rejects negative order amounts", async () => {
    const res = await validateOrderPolicy("merchant_default_rzg", -500);
    expect(res.allowed).toBe(false);
    expect(res.ruleCode).toBe("NON_POSITIVE_AMOUNT");
  });

  it("rejects orders exceeding merchant transaction limit", async () => {
    const res = await validateOrderPolicy("merchant_default_rzg", 600000); // Merchant limit is 500,000
    expect(res.allowed).toBe(false);
    expect(res.ruleCode).toBe("TRANSACTION_LIMIT_EXCEEDED");
  });

  it("rejects unauthorized excessive discount percentages", async () => {
    // Subtotal 10,000, Discount 4,000 = 40% discount (Merchant max is 20%)
    const res = await validateOrderPolicy("merchant_default_rzg", 6000, 4000, 10000);
    expect(res.allowed).toBe(false);
    expect(res.ruleCode).toBe("DISCOUNT_POLICY_VIOLATION");
  });

  it("allows valid orders within safety thresholds", async () => {
    const res = await validateOrderPolicy("merchant_default_rzg", 68999, 0, 68999);
    expect(res.allowed).toBe(true);
    expect(res.riskScore).toBeLessThan(0.1);
  });
});
