import { describe, it, expect } from "vitest";
import {
  searchCatalogTool,
  getProductDetailsTool,
  addToCartTool,
  getCartSummaryTool,
} from "@/lib/ai/tools";

describe("AI Agent Tools & Schema Validation", () => {
  const testSessionId = `sess_tool_test_${Date.now()}`;

  it("search_catalog returns filtered products within budget", async () => {
    const res = await searchCatalogTool({
      category: "Laptops",
      maxPrice: 70000,
      limit: 5,
    }, testSessionId);

    expect(res.count).toBeGreaterThan(0);
    for (const p of res.products) {
      expect(p.category).toBe("Laptops");
      expect(p.price).toBeLessThanOrEqual(70000);
    }
  });

  it("get_product_details fetches full attributes and specs", async () => {
    const res = await getProductDetailsTool({
      productIdOrSku: "LAP-DEV-PRO-14",
    }, testSessionId);

    expect(res.product).toBeDefined();
    expect(res.product?.sku).toBe("LAP-DEV-PRO-14");
    expect(res.product?.attributes.brand).toBe("ApexBook");
  });

  it("adds item to cart and correctly calculates totals", async () => {
    const addRes = await addToCartTool({
      sessionId: testSessionId,
      productIdOrSku: "ACC-KB-MECH",
      quantity: 1,
      isUpsell: false,
      addedVia: "DIRECT",
    });

    expect(addRes.success).toBe(true);

    const summary = await getCartSummaryTool({ sessionId: testSessionId });
    if ("items" in summary) {
      expect(summary.items.length).toBeGreaterThan(0);
      expect(summary.total).toBe(6499);
    }
  });
});
