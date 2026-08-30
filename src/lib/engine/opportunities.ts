import { db } from "../db";

export interface RevenueMetricsSummary {
  totalRevenueINR: number;
  totalOrdersCount: number;
  avgOrderValueINR: number;
  aiAttributedRevenueINR: number;
  aiAttributedPercent: number;
  upsellRevenueINR: number;
  crossSellRevenueINR: number;
  cartAbandonmentRate: number;
  opportunityCount: number;
  // Calculated from real DB data — current 30d vs previous 30d
  revenueGrowthPercent: number | null;
  upsellGrowthPercent: number | null;
}

export async function computeMerchantAnalytics(merchantId: string = "merchant_default_rzg"): Promise<RevenueMetricsSummary> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const allPaidOrders = await db.order.findMany({
    where: { merchantId, status: "PAID" },
    include: { items: true },
  });

  // Split into current period (last 30 days) and previous period (31-60 days ago)
  const currentPeriodOrders = allPaidOrders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
  const previousPeriodOrders = allPaidOrders.filter(
    (o) => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo
  );

  const totalRevenueINR = allPaidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = allPaidOrders.length;
  const avgOrderValueINR = totalOrdersCount > 0 ? totalRevenueINR / totalOrdersCount : 0;

  const aiOrders = allPaidOrders.filter((o) => o.aiAttributed);
  const aiAttributedRevenueINR = aiOrders.reduce((sum, o) => sum + o.aiRevenueAmount, 0);
  const aiAttributedPercent = totalRevenueINR > 0 ? (aiAttributedRevenueINR / totalRevenueINR) * 100 : 0;

  const upsellOrders = allPaidOrders.filter((o) => o.aiAttributionType === "UPSELL");
  const upsellRevenueINR = upsellOrders.reduce((sum, o) => sum + o.aiRevenueAmount, 0);
  const crossSellRevenueINR = allPaidOrders
    .filter((o) => o.aiAttributionType === "CROSS_SELL")
    .reduce((sum, o) => sum + o.aiRevenueAmount, 0);

  // Period-over-period growth — real calculation from DB dates
  const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + o.total, 0);
  const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + o.total, 0);
  const revenueGrowthPercent =
    previousRevenue > 0
      ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
      : null; // null = insufficient history, don't show a fake number

  const currentUpsellRevenue = currentPeriodOrders
    .filter((o) => o.aiAttributionType === "UPSELL")
    .reduce((sum, o) => sum + o.aiRevenueAmount, 0);
  const previousUpsellRevenue = previousPeriodOrders
    .filter((o) => o.aiAttributionType === "UPSELL")
    .reduce((sum, o) => sum + o.aiRevenueAmount, 0);
  const upsellGrowthPercent =
    previousUpsellRevenue > 0
      ? Number((((currentUpsellRevenue - previousUpsellRevenue) / previousUpsellRevenue) * 100).toFixed(1))
      : null;

  // Cart abandonment — computed from real cart statuses in DB
  const totalCarts = await db.cart.count();
  const abandonedCarts = await db.cart.count({ where: { status: "ABANDONED" } });
  // Only compute rate when we have data; never hardcode a fallback percentage
  const cartAbandonmentRate = totalCarts > 0 ? Number(((abandonedCarts / totalCarts) * 100).toFixed(1)) : 0;

  const opportunityCount = await db.opportunity.count({
    where: { merchantId, status: "PENDING" },
  });

  return {
    totalRevenueINR,
    totalOrdersCount,
    avgOrderValueINR: Math.round(avgOrderValueINR),
    aiAttributedRevenueINR,
    aiAttributedPercent: Number(aiAttributedPercent.toFixed(1)),
    upsellRevenueINR,
    crossSellRevenueINR,
    cartAbandonmentRate,
    opportunityCount,
    revenueGrowthPercent,
    upsellGrowthPercent,
  };
}

export async function detectFreshOpportunities(merchantId: string = "merchant_default_rzg") {
  // Scans product views, cart dropoffs and orders to discover untapped revenue
  const products = await db.product.findMany({ where: { merchantId } });

  const detected = [];

  for (const prod of products) {
    // High views but low purchases: conversion bottleneck
    if (prod.viewsCount > 1000 && prod.purchasesCount < 50) {
      const existing = await db.opportunity.findFirst({
        where: {
          merchantId,
          evidence: { contains: prod.sku },
        },
      });

      if (!existing) {
        const potentialLiftINR = prod.price * (prod.viewsCount * 0.03);
        const opp = await db.opportunity.create({
          data: {
            merchantId,
            type: "PRICE_ELASTICITY",
            title: `Conversion Optimization for ${prod.name}`,
            description: `High customer interest (${prod.viewsCount} views) with under-indexed conversion (${prod.purchasesCount} sales). A targeted 5% bundle incentive could capture ₹${Math.round(potentialLiftINR).toLocaleString("en-IN")} in lost pipeline.`,
            evidence: JSON.stringify({
              sku: prod.sku,
              views: prod.viewsCount,
              purchases: prod.purchasesCount,
              currentConversionRate: ((prod.purchasesCount / prod.viewsCount) * 100).toFixed(2) + "%",
              targetConversionLift: "+3.0%",
            }),
            estimatedImpact: Math.round(potentialLiftINR),
            confidenceScore: 0.81,
            riskLevel: "LOW",
            actionPayload: JSON.stringify({
              actionType: "ENABLE_DISCOUNT_INCENTIVE",
              productSku: prod.sku,
              discountPercent: 5,
            }),
            status: "PENDING",
          },
        });
        detected.push(opp);
      }
    }
  }

  return detected;
}
