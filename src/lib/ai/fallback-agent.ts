import {
  searchCatalogTool,
  getRecommendationsTool,
  addToCartTool,
  getCartSummaryTool,
  requestCustomerConfirmationTool,
  formatDbProduct,
} from "./tools";
import { db } from "../db";

export interface AgentProcessResult {
  message: string;
  toolCalls: Array<{ name: string; args: any; result: any }>;
  state: string;
  productCards?: any[];
  cartSummary?: any;
  requiresConfirmation?: boolean;
  confirmationData?: any;
}

export async function processFallbackAgent(
  sessionId: string,
  userMessage: string
): Promise<AgentProcessResult> {
  const lower = userMessage.toLowerCase();
  const toolCalls: Array<{ name: string; args: any; result: any }> = [];

  // Extract budget mentions — handles all formats:
  //   "under ₹800"   → 800      "under 8000"  → 8000
  //   "under 70k"    → 70000    "under ₹70,000" → 70000
  //   "budget 1,500" → 1500     "within 50 thousand" → 50000
  // Regex tries comma-formatted number FIRST (requires at least one comma group),
  // then falls back to a plain integer (\d+). This prevents 8000 → 800.
  let extractedBudget: number | undefined;
  const budgetMatch = lower.match(
    /(?:under|below|budget|within|upto|up\s*to)\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(k|thousand)?/i
  );
  if (budgetMatch) {
    const numStr = budgetMatch[1].replace(/,/g, "");
    let val = parseFloat(numStr);
    const suffix = (budgetMatch[2] ?? "").toLowerCase();
    if (suffix === "k" || suffix === "thousand") {
      val = val * 1000; // "70k" → 70,000 / "50 thousand" → 50,000
    }
    if (val > 0) extractedBudget = val;
  }

  // 1. Checkout / Confirmation intent
  if (
    lower.includes("checkout") ||
    lower.includes("pay") ||
    lower.includes("proceed to payment") ||
    lower.includes("buy now") ||
    lower.includes("place order")
  ) {
    const cartRes = await getCartSummaryTool({ sessionId });
    toolCalls.push({ name: "get_cart_summary", args: { sessionId }, result: cartRes });

    if ("items" in cartRes && cartRes.items.length > 0) {
      const confirmRes = await requestCustomerConfirmationTool({
        sessionId,
        orderSummaryText: `Order of ${cartRes.itemCount} items totaling ₹${cartRes.total.toLocaleString("en-IN")}`,
        totalAmountINR: cartRes.total,
      });
      toolCalls.push({
        name: "request_customer_confirmation",
        args: { sessionId, totalAmountINR: cartRes.total },
        result: confirmRes,
      });

      return {
        message: `I have prepared your order for **${cartRes.itemCount} items** totaling **₹${cartRes.total.toLocaleString("en-IN")}**.\n\n🛡️ **Financial Guardrail**: To protect your account, RazorGrow requires your explicit authorization before launching the Razorpay payment window. Please review and confirm below.`,
        toolCalls,
        state: "CUSTOMER_CONFIRMATION",
        cartSummary: cartRes,
        requiresConfirmation: true,
        confirmationData: confirmRes,
      };
    } else {
      return {
        message: "Your cart is currently empty! Tell me what you're looking for (e.g. 'I need a coding laptop under ₹70,000') and I'll find the best options.",
        toolCalls,
        state: "DISCOVER",
      };
    }
  }

  // 2. Add to cart intent (e.g. "Add to cart", "Add the laptop", "Add the keyboard")
  if (
    lower.includes("add to cart") ||
    lower.includes("add item") ||
    lower.includes("add the") ||
    lower.includes("add both")
  ) {
    // Identify candidate product to add
    let targetSku = "LAP-DEV-PRO-14";
    if (lower.includes("keyboard") || lower.includes("keychron")) targetSku = "ACC-KB-MECH";
    else if (lower.includes("mouse") || lower.includes("mx master")) targetSku = "ACC-MOU-ERGO";
    else if (lower.includes("monitor") || lower.includes("4k")) targetSku = "MON-4K-27";
    else if (lower.includes("dock") || lower.includes("ts4")) targetSku = "ACC-DOCK-TB4";
    else if (lower.includes("student") || lower.includes("slim") || lower.includes("air")) targetSku = "LAP-STUDENT-AIR-13";

    const addRes = await addToCartTool({
      sessionId,
      productIdOrSku: targetSku,
      quantity: 1,
      isUpsell: targetSku !== "LAP-DEV-PRO-14" && targetSku !== "LAP-STUDENT-AIR-13",
      addedVia: "AGENT_RECOMMENDATION",
    });

    toolCalls.push({ name: "add_to_cart", args: { sessionId, productIdOrSku: targetSku }, result: addRes });

    const cartSummary = await getCartSummaryTool({ sessionId });
    toolCalls.push({ name: "get_cart_summary", args: { sessionId }, result: cartSummary });

    // Fetch recommendations for companion items
    const recRes = await getRecommendationsTool({
      cartProductIds: [targetSku],
      limit: 2,
    });
    toolCalls.push({ name: "get_recommendations", args: { cartProductIds: [targetSku] }, result: recRes });

    return {
      message: `✅ Added **${targetSku}** to your cart!\n\nYour cart total is now **₹${"total" in cartSummary ? cartSummary.total.toLocaleString("en-IN") : "0"}** (${"itemCount" in cartSummary ? cartSummary.itemCount : 0} items).\n\nWould you like to review recommended companion gear below, or proceed to checkout?`,
      toolCalls,
      state: "CART_BUILDING",
      cartSummary,
      productCards: recRes.recommendations.map((r) => ({
        ...r.product,
        recommendationReason: r.reasons.join(" • "),
        isPromotion: r.isApprovedPromotion,
      })),
    };
  }

  // 3. Natural Language Search & Recommendation intent (e.g. "I need a laptop setup for college under ₹70,000")
  let category: string | undefined;
  if (lower.includes("laptop") || lower.includes("notebook") || lower.includes("macbook")) category = "Laptops";
  else if (lower.includes("monitor") || lower.includes("screen") || lower.includes("display")) category = "Monitors";
  else if (lower.includes("keyboard")) category = "Keyboards";
  else if (lower.includes("mouse")) category = "Mice";
  else if (lower.includes("audio") || lower.includes("headphone") || lower.includes("earbuds")) category = "Audio";

  let catalogQuery = "";

if (category === "Laptops") {
  catalogQuery = "laptop";
} else if (category === "Monitors") {
  catalogQuery = "monitor";
} else if (category === "Keyboards") {
  catalogQuery = "keyboard";
} else if (category === "Mice") {
  catalogQuery = "mouse";
} else if (category === "Audio") {
  catalogQuery = "audio";
} else {
  catalogQuery = lower
    .replace(
      /(?:i need|i want|looking for|show me|find me|under|below|budget|within|upto|up to|setup|college|developer)/gi,
      ""
    )
    .replace(/₹|rs\.?|inr/gi, "")
    .replace(/\d+(?:,\d{3})*(?:\.\d+)?k?/gi, "")
    .trim();
}

const searchRes = await searchCatalogTool(
  {
    query: catalogQuery,
    category,
    maxPrice: extractedBudget,
    limit: 4,
  },
  sessionId
);

  // Fetch companion upsell recommendations
  const leadProduct = searchRes.products[0];
  let recommendations: any[] = [];
  if (leadProduct) {
    const recRes = await getRecommendationsTool({
      cartProductIds: [leadProduct.sku],
      limit: 2,
    }, sessionId);
    recommendations = recRes.recommendations;
    toolCalls.push({
      name: "get_recommendations",
      args: { cartProductIds: [leadProduct.sku] },
      result: recRes,
    });
  }

  const primaryCards = searchRes.products.map((p) => ({
    ...p,
    recommendationReason: extractedBudget
      ? `Matches your requirement under ₹${extractedBudget.toLocaleString("en-IN")}`
      : "Top verified matching product in catalog",
  }));

  const companionCards = recommendations.map((r) => ({
    ...r.product,
    recommendationReason: `⚡ Smart Pair: ${r.reasons.join(" • ")}`,
    isPromotion: r.isApprovedPromotion,
  }));

  const allCards = [...primaryCards, ...companionCards];

  const budgetText = extractedBudget ? ` within your budget of ₹${extractedBudget.toLocaleString("en-IN")}` : "";
  const message = searchRes.products.length > 0
    ? `I analyzed our catalog and found **${searchRes.products.length} options**${budgetText}.\n\nHere is my top recommendation: **${leadProduct.name}** at **₹${leadProduct.price.toLocaleString("en-IN")}**.\n\nI also identified a high-affinity companion gear match based on merchant performance data. You can click **Add to Cart** or ask me to compare specifications!`
    : `I searched the catalog${budgetText}, but couldn't find an exact match for those specific parameters. Let me show you our featured workspace products:`;

  return {
    message,
    toolCalls,
    state: "RECOMMEND",
    productCards: allCards,
  };
}
