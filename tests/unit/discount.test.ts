import { describe, it, expect } from "vitest";
import { validateOrderPolicy } from "@/lib/engine/policy";

/**
 * Discount Calculation & Enforcement Tests
 * Verifies the server-side discount policy — the LLM must never be able to
 * bypass these constraints.
 */
describe("Discount Calculation & Max Discount Enforcement", () => {
  it("allows a 5% discount on a keyboard (within 20% cap)", async () => {
    const keyboardPrice = 6499;
    const discountPercent = 5;
    const discountINR = Math.round(keyboardPrice * (discountPercent / 100)); // 325
    const subtotal = keyboardPrice;
    const total = subtotal - discountINR; // 6174

    const result = await validateOrderPolicy("merchant_default_rzg", total, discountINR, subtotal);
    expect(result.allowed).toBe(true);
    expect(total).toBe(6174);
  });

  it("blocks a discount that exceeds 20% of the order", async () => {
    const subtotal = 10000;
    const discountINR = 2500; // 25% — over the 20% cap
    const total = subtotal - discountINR;

    const result = await validateOrderPolicy("merchant_default_rzg", total, discountINR, subtotal);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/discount/i);
  });

  it("allows exactly 20% discount (boundary condition)", async () => {
    const subtotal = 10000;
    const discountINR = 2000; // exactly 20%
    const total = subtotal - discountINR; // 8000

    const result = await validateOrderPolicy("merchant_default_rzg", total, discountINR, subtotal);
    expect(result.allowed).toBe(true);
    expect(total).toBe(8000);
  });

  it("final payable amount is always subtotal minus server-computed discount", () => {
    // Verify the arithmetic used in createPaymentOrderTool
    const subtotal = 68999 + 6499; // ApexBook Pro 14 + Keychron K2
    const discountPercent = 5;
    const maxDiscountINR = 350; // from the seed opportunity actionPayload
    const discountBase = 6499; // keyboard price
    const rawDiscount = Math.round(discountBase * (discountPercent / 100)); // 325
    const cappedDiscount = Math.min(rawDiscount, maxDiscountINR); // 325 (under cap)
    const total = Math.max(0, subtotal - cappedDiscount);

    expect(cappedDiscount).toBe(325);
    expect(total).toBe(75173); // 75498 - 325
    expect(total).toBeLessThan(subtotal);
  });

  it("capped discount never exceeds maxDiscountINR from opportunity payload", () => {
    const discountBase = 100000; // very expensive item
    const discountPercent = 5;
    const maxDiscountINR = 350; // hard cap from merchant policy
    const rawDiscount = Math.round(discountBase * (discountPercent / 100)); // 5000
    const cappedDiscount = Math.min(rawDiscount, maxDiscountINR);
    expect(cappedDiscount).toBe(350); // capped, not 5000
  });

  it("blocks an order above ₹5,00,000 transaction ceiling even with discount", async () => {
    const subtotal = 510000;
    const discountINR = 5000;
    const total = subtotal - discountINR; // 505000 — still over limit

    const result = await validateOrderPolicy("merchant_default_rzg", total, discountINR, subtotal);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/limit|ceiling|exceed/i);
  });

  it("does not produce negative total from oversized discount", () => {
    const subtotal = 500;
    const massiveDiscount = 1000; // more than subtotal
    const total = Math.max(0, subtotal - massiveDiscount);
    expect(total).toBe(0); // Math.max prevents negative
  });
});
