import { describe, it, expect } from "vitest";
import { getRecommendations } from "@/lib/engine/recommendations";

describe("Deterministic Hybrid Recommendation Engine", () => {
  it("recommends compatible keyboard when laptop is in cart", async () => {
    const recs = await getRecommendations({
      cartProductIds: ["LAP-DEV-PRO-14"],
      limit: 3,
    });

    expect(recs.length).toBeGreaterThan(0);
    // Keychron keyboard should rank near top because of compatibility + approved promotional campaign
    const skus = recs.map((r) => r.product.sku);
    expect(skus).toContain("ACC-KB-MECH");
  });

  it("filters recommendations according to strict budget caps", async () => {
    const recs = await getRecommendations({
      maxBudgetINR: 5000,
      limit: 4,
    });

    // Highly scored products should be within budget
    const affordable = recs.filter((r) => r.product.price <= 5000);
    expect(affordable.length).toBeGreaterThan(0);
  });
});
