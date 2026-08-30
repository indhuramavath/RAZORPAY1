import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/db-seed";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "40", 10);
    const actor = searchParams.get("actor");
    const sessionId = searchParams.get("sessionId");

    const where: any = {};
    if (actor) where.actor = actor;
    if (sessionId) where.sessionId = sessionId;

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      actor: l.actor,
      actorType: l.actorType,
      sessionId: l.sessionId,
      orderId: l.orderId,
      action: l.action,
      toolName: l.toolName,
      inputState: l.inputState ? JSON.parse(l.inputState) : null,
      outputState: l.outputState ? JSON.parse(l.outputState) : null,
      riskScore: l.riskScore,
      decision: l.decision,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ logs: formatted, count: formatted.length });
  } catch (error: any) {
    console.error("Audit query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
