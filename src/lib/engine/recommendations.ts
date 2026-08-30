import { db } from "../db";
import { ProductCatalogItem, ScoredRecommendation } from "../../types";

export interface RecommendationQueryParams {
  targetCategory?: string;
  cartProductIds?: string[];
  maxBudgetINR?: number;
  customerSegment?: string;
  intentKeywords?: string[];
  limit?: number;
}

export async function getRecommendations(
  params: RecommendationQueryParams
): Promise<ScoredRecommendation[]> {
  const {
    targetCategory,
    cartProductIds = [],
    maxBudgetINR,
    limit = 4,
  } = params;

  // 1. Fetch all active catalog items
  const rawProducts = await db.product.findMany();
  const products: ProductCatalogItem[] = rawProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    inventory: p.inventory,
    attributes: JSON.parse(p.attributes || "{}"),
    tags: JSON.parse(p.tags || "[]"),
    compatibleProductIds: JSON.parse(p.compatibleProductIds || "[]"),
    upsellProductIds: JSON.parse(p.upsellProductIds || "[]"),
    crossSellProductIds: JSON.parse(p.crossSellProductIds || "[]"),
    viewsCount: p.viewsCount,
    purchasesCount: p.purchasesCount,
  }));

  // 2. Fetch approved merchant opportunities (promotions & upsells)
  const approvedOpportunities = await db.opportunity.findMany({
    where: { status: "APPROVED" },
  });

  const approvedRules = approvedOpportunities.map((opp) => {
    try {
      return {
        id: opp.id,
        type: opp.type,
        payload: JSON.parse(opp.actionPayload),
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  // 3. Score candidate products
  const scoredList: ScoredRecommendation[] = [];

  for (const product of products) {
    // Skip if already in cart
    if (cartProductIds.includes(product.id) || cartProductIds.includes(product.sku)) {
      continue;
    }

    // Skip if out of stock
    if (product.inventory <= 0) {
      continue;
    }

    let score = 50; // Baseline
    const reasons: string[] = [];
    let isApprovedPromotion = false;
    let promotionalDiscount = 0;

    // A. Budget check
    if (maxBudgetINR && product.price > maxBudgetINR) {
      // Penalize heavily if over strict budget cap
      score -= 40;
    } else if (maxBudgetINR) {
      score += 15;
      reasons.push(`Fits within budget limit (₹${product.price.toLocaleString("en-IN")})`);
    }

    // B. Category match
    if (targetCategory && product.category.toLowerCase() === targetCategory.toLowerCase()) {
      score += 25;
      reasons.push(`Direct category match for ${targetCategory}`);
    }

    // C. Compatibility with items currently in cart
    for (const inCartId of cartProductIds) {
      const inCartProd = products.find((p) => p.id === inCartId || p.sku === inCartId);
      if (inCartProd) {
        if (
          inCartProd.compatibleProductIds.includes(product.sku) ||
          inCartProd.compatibleProductIds.includes(product.id)
        ) {
          score += 30;
          reasons.push(`Engineered compatibility with your ${inCartProd.name}`);
        }
        if (
          inCartProd.crossSellProductIds.includes(product.sku) ||
          inCartProd.crossSellProductIds.includes(product.id)
        ) {
          score += 20;
          reasons.push(`Frequently purchased companion to ${inCartProd.name}`);
        }
      }
    }

    // D. Active Merchant-Approved Policies / Promotions
    for (const rule of approvedRules) {
      if (!rule) continue;
      if (
        rule.payload.suggestProductSku === product.sku ||
        rule.payload.suggestProductSku === product.id
      ) {
        score += 35;
        isApprovedPromotion = true;
        promotionalDiscount = rule.payload.discountPercent || rule.payload.bundleDiscountINR || 0;
        reasons.push("Merchant-verified high-affinity recommendation");
      }
    }

    // E. Popularity / Conversion signal
    if (product.purchasesCount > 100) {
      score += 10;
      reasons.push(`High customer satisfaction rating (${product.purchasesCount}+ orders)`);
    }

    const confidence = Math.min(0.98, Math.max(0.4, score / 120));

    scoredList.push({
      product,
      score,
      reasons,
      confidence: Number(confidence.toFixed(2)),
      isApprovedPromotion,
      promotionalDiscount,
    });
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  return scoredList.slice(0, limit);
}
