import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { ensureDatabaseSeeded } from "@/lib/db-seed";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId") || "merchant_default_rzg";

    const opportunities = await db.opportunity.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });

    const formatted = opportunities.map((opp) => ({
      id: opp.id,
      type: opp.type,
      title: opp.title,
      description: opp.description,
      evidence: JSON.parse(opp.evidence || "{}"),
      estimatedImpact: opp.estimatedImpact,
      confidenceScore: opp.confidenceScore,
      riskLevel: opp.riskLevel,
      actionPayload: JSON.parse(opp.actionPayload || "{}"),
      status: opp.status,
      approvedAt: opp.approvedAt,
      rejectedAt: opp.rejectedAt,
      createdAt: opp.createdAt,
    }));

    return NextResponse.json({ opportunities: formatted });
  } catch (error: any) {
    console.error("Fetch opportunities error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunityId, action } = body; // action: "APPROVE" | "REJECT"

    if (!opportunityId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid opportunityId or action" }, { status: 400 });
    }

    const isApprove = action === "APPROVE";
    const status = isApprove ? "APPROVED" : "REJECTED";

    const updated = await db.opportunity.update({
      where: { id: opportunityId },
      data: {
        status,
        approvedAt: isApprove ? new Date() : null,
        rejectedAt: !isApprove ? new Date() : null,
      },
    });

    // Record Human-in-the-loop audit trace
    await logAuditEvent({
      actor: "MERCHANT",
      actorType: "HUMAN",
      action: isApprove ? "MERCHANT_APPROVAL:APPROVED" : "MERCHANT_APPROVAL:REJECTED",
      toolName: "request_merchant_approval",
      inputState: { opportunityId, action },
      outputState: { newStatus: status, title: updated.title },
      decision: isApprove ? "GATED_APPROVED" : "GATED_REJECTED",
      riskScore: 0.05,
    });

    return NextResponse.json({
      success: true,
      opportunityId: updated.id,
      status: updated.status,
      message: isApprove
        ? "Opportunity approved. Associated recommendation rules and bundle promotions are now active for the AI buyer agent."
        : "Opportunity rejected. Campaign will not be offered to buyers.",
    });
  } catch (error: any) {
    console.error("Opportunity action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
