import { NextRequest, NextResponse } from "next/server";
import { computeMerchantAnalytics, detectFreshOpportunities } from "@/lib/engine/opportunities";
import { ensureDatabaseSeeded } from "@/lib/db-seed";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId") || "merchant_default_rzg";

    // Auto-detect any fresh opportunities
    await detectFreshOpportunities(merchantId);

    const analytics = await computeMerchantAnalytics(merchantId);
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error("Merchant analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
