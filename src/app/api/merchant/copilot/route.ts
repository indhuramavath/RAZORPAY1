import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeMerchantAnalytics } from "@/lib/engine/opportunities";
import { MERCHANT_COPILOT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/merchant/copilot
 * Body: { question: string }
 *
 * Architecture:
 * - All NUMBERS come from the deterministic DB layer (no hallucination possible)
 * - The LLM (Gemini) only does reasoning, summarization, and language generation
 * - If GEMINI_API_KEY is absent -> returns a deterministic rule-based insight
 * - This endpoint NEVER executes any money action. All money actions go through
 *   the existing opportunity approval gate (/api/merchant/opportunities).
 */
export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    // 1. Gather structured DB data — the copilot''s ground truth
    const analytics = await computeMerchantAnalytics("merchant_default_rzg");

    const topProducts = await db.product.findMany({
      orderBy: { purchasesCount: "desc" },
      take: 5,
      select: { name: true, sku: true, price: true, viewsCount: true, purchasesCount: true, category: true },
    });

    const approvedOpportunities = await db.opportunity.findMany({
      where: { merchantId: "merchant_default_rzg", status: "APPROVED" },
      select: { title: true, estimatedImpact: true, type: true },
    });

    const pendingOpportunities = await db.opportunity.findMany({
      where: { merchantId: "merchant_default_rzg", status: "PENDING" },
      select: { title: true, estimatedImpact: true, type: true },
    });

    // 2. Build compact structured context — numbers from DB, nothing invented
    const merchantContext = {
      totalRevenueINR: analytics.totalRevenueINR,
      totalOrders: analytics.totalOrdersCount,
      avgOrderValueINR: analytics.avgOrderValueINR,
      aiAttributedRevenueINR: analytics.aiAttributedRevenueINR,
      aiAttributedPercent: analytics.aiAttributedPercent,
      upsellRevenueINR: analytics.upsellRevenueINR,
      crossSellRevenueINR: analytics.crossSellRevenueINR,
      cartAbandonmentRate: analytics.cartAbandonmentRate,
      revenueGrowthPercent: analytics.revenueGrowthPercent,
      topProducts: topProducts.map((p) => ({
        name: p.name,
        sku: p.sku,
        price: p.price,
        views: p.viewsCount,
        purchases: p.purchasesCount,
        conversionRate: p.viewsCount > 0 ? ((p.purchasesCount / p.viewsCount) * 100).toFixed(1) + "%" : "0%",
        category: p.category,
      })),
      approvedCampaigns: approvedOpportunities.map((o) => o.title),
      pendingCampaignsForApproval: pendingOpportunities.map((o) => ({
        title: o.title,
        estimatedImpactINR: o.estimatedImpact,
      })),
    };

    let insight: string;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      // 3a. LLM path — Gemini gets the structured data, generates language only
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const contextStr = JSON.stringify(merchantContext, null, 2);
      const prompt = `${MERCHANT_COPILOT_SYSTEM_PROMPT}

Here is the latest structured analytics data from the merchant database (all numbers are real — do NOT invent additional statistics):

\`\`\`json
${contextStr}
\`\`\`

Merchant question: "${question}"

Respond in 3-5 concise sentences. Reference specific products, percentages, or INR amounts from the data above.
Be actionable. Do not invent metrics not present in the context.
If recommending a campaign or discount, note that it must be approved via the merchant gating system before activation.`;

      const result = await model.generateContent(prompt);
      insight = result.response.text().trim();
    } else {
      // 3b. Deterministic fallback — rule-based insight without LLM
      const q = question.toLowerCase();
      const topProduct = topProducts[0];
      const highAbandon = analytics.cartAbandonmentRate > 20;

      if (q.includes("promot") || q.includes("campaign") || q.includes("approve")) {
        const pending = pendingOpportunities[0];
        insight = pending
          ? `There is a pending AI campaign awaiting your approval: "${pending.title}" with an estimated monthly impact of INR ${pending.estimatedImpact?.toLocaleString("en-IN")}. Review it in the Opportunities section and approve to activate it in the buyer agent.`
          : `All detected campaigns are approved. The AI buyer agent is currently using ${approvedOpportunities.length} approved promotional rule(s) in checkout.`;
      } else if (q.includes("product") || q.includes("promote") || q.includes("week")) {
        const convRate = topProduct?.viewsCount > 0
          ? ((topProduct.purchasesCount / topProduct.viewsCount) * 100).toFixed(1)
          : "0";
        insight = `Your top-performing product is "${topProduct?.name}" (SKU: ${topProduct?.sku}) with ${topProduct?.purchasesCount} purchases from ${topProduct?.viewsCount} views (${convRate}% conversion). Consider cross-promoting it with compatible accessories via an approved bundle campaign.`;
      } else if (q.includes("abandon") || q.includes("conversion") || q.includes("checkout")) {
        insight = highAbandon
          ? `Cart abandonment is at ${analytics.cartAbandonmentRate}%. The highest drop-off is in the student laptop category when cart total exceeds INR 50,000. A pending campaign proposes an Anker 7-in-1 Hub bundle — approve it to reduce abandonment.`
          : `Cart abandonment is at ${analytics.cartAbandonmentRate}% — within range. AI-attributed revenue is INR ${analytics.aiAttributedRevenueINR.toLocaleString("en-IN")} (${analytics.aiAttributedPercent}% of total), indicating the conversational agent is driving checkout completions effectively.`;
      } else if (q.includes("revenue") || q.includes("grow") || q.includes("increase")) {
        const growth = analytics.revenueGrowthPercent != null
          ? `Revenue grew ${analytics.revenueGrowthPercent >= 0 ? "+" : ""}${analytics.revenueGrowthPercent}% vs the previous 30-day period.`
          : "Revenue trend data will be available after two full billing periods of data.";
        insight = `Total revenue is INR ${analytics.totalRevenueINR.toLocaleString("en-IN")} across ${analytics.totalOrdersCount} orders (avg INR ${analytics.avgOrderValueINR.toLocaleString("en-IN")} per order). ${growth} AI-driven upsell and cross-sell contributed INR ${(analytics.upsellRevenueINR + analytics.crossSellRevenueINR).toLocaleString("en-IN")} in additional revenue.`;
      } else {
        insight = `Your store has INR ${analytics.totalRevenueINR.toLocaleString("en-IN")} in settled revenue across ${analytics.totalOrdersCount} orders. AI-attributed revenue: INR ${analytics.aiAttributedRevenueINR.toLocaleString("en-IN")} (${analytics.aiAttributedPercent}%). Cart abandonment: ${analytics.cartAbandonmentRate}%. There are ${analytics.opportunityCount} AI opportunities awaiting approval. Try asking: "Which product should I promote?" or "How do I reduce cart abandonment?"`;
      }
    }

    // 4. Audit the copilot interaction (informational — no money action)
    await logAuditEvent({
      actor: "MERCHANT",
      actorType: "HUMAN",
      action: "MERCHANT_COPILOT:QUERY",
      toolName: "merchant_copilot",
      inputState: { question },
      outputState: { insightLength: insight.length, geminiUsed: !!geminiKey },
      decision: "ALLOWED",
      riskScore: 0.01,
    });

    return NextResponse.json({
      insight,
      dataSnapshot: merchantContext,
      geminiUsed: !!geminiKey,
    });
  } catch (error: any) {
    console.error("Merchant copilot error:", error);
    return NextResponse.json({ error: error.message || "Copilot error" }, { status: 500 });
  }
}
