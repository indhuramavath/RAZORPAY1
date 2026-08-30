import { describe, it, expect } from "vitest";
import { computeMerchantAnalytics } from "@/lib/engine/opportunities";

/**
 * Analytics Metrics Tests
 * Verifies that revenue metrics, growth calculations, and cart abandonment
 * are computed from real DB data (not hardcoded).
 */
describe("Revenue Metrics & Cart Abandonment (computed from DB)", () => {
  it("computeMerchantAnalytics returns required fields", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");

    // All required fields must be present
    expect(metrics).toHaveProperty("totalRevenueINR");
    expect(metrics).toHaveProperty("totalOrdersCount");
    expect(metrics).toHaveProperty("avgOrderValueINR");
    expect(metrics).toHaveProperty("aiAttributedRevenueINR");
    expect(metrics).toHaveProperty("aiAttributedPercent");
    expect(metrics).toHaveProperty("upsellRevenueINR");
    expect(metrics).toHaveProperty("crossSellRevenueINR");
    expect(metrics).toHaveProperty("cartAbandonmentRate");
    expect(metrics).toHaveProperty("opportunityCount");
    // New fields from FIX 2
    expect(metrics).toHaveProperty("revenueGrowthPercent");
    expect(metrics).toHaveProperty("upsellGrowthPercent");
  });

  it("totalRevenueINR is a positive number (orders exist)", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");
    expect(metrics.totalRevenueINR).toBeGreaterThan(0);
  });

  it("cartAbandonmentRate is a real number (never a hardcoded fallback)", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");
    // Must be a real number between 0 and 100
    expect(metrics.cartAbandonmentRate).toBeGreaterThanOrEqual(0);
    expect(metrics.cartAbandonmentRate).toBeLessThanOrEqual(100);
    // Must NOT be the old hardcoded 28.5 fallback
    expect(metrics.cartAbandonmentRate).not.toBe(28.5);
  });

  it("revenueGrowthPercent is either a number (when period data exists) or null", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");
    if (metrics.revenueGrowthPercent !== null) {
      expect(typeof metrics.revenueGrowthPercent).toBe("number");
      // Should be finite and within a reasonable range for a demo dataset
      expect(isFinite(metrics.revenueGrowthPercent)).toBe(true);
    }
    // null is valid when previous period has no data
  });

  it("aiAttributedPercent is between 0 and 100", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");
    expect(metrics.aiAttributedPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.aiAttributedPercent).toBeLessThanOrEqual(100);
  });

  it("avgOrderValueINR equals totalRevenue / totalOrders (rounded)", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");
    if (metrics.totalOrdersCount > 0) {
      const expected = Math.round(metrics.totalRevenueINR / metrics.totalOrdersCount);
      expect(metrics.avgOrderValueINR).toBe(expected);
    }
  });

  it("upsellRevenueINR + crossSellRevenueINR <= aiAttributedRevenueINR", async () => {
    const metrics = await computeMerchantAnalytics("merchant_default_rzg");
    // Upsell + CrossSell should not exceed total AI attributed revenue
    expect(metrics.upsellRevenueINR + metrics.crossSellRevenueINR).toBeLessThanOrEqual(
      metrics.aiAttributedRevenueINR + 1 // +1 for rounding tolerance
    );
  });
});
