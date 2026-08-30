import { db } from "./db";
import { ActorRole, ActorType, DecisionType } from "../types";

export interface LogAuditParams {
  merchantId?: string;
  actor: ActorRole;
  actorType: ActorType;
  sessionId?: string;
  orderId?: string;
  action: string;
  toolName?: string;
  inputState?: Record<string, unknown> | null;
  outputState?: Record<string, unknown> | null;
  riskScore?: number;
  decision: DecisionType;
  ipAddress?: string;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    const record = await db.auditLog.create({
      data: {
        merchantId: params.merchantId || "merchant_default_rzg",
        actor: params.actor,
        actorType: params.actorType,
        sessionId: params.sessionId,
        orderId: params.orderId,
        action: params.action,
        toolName: params.toolName,
        inputState: params.inputState ? JSON.stringify(params.inputState) : null,
        outputState: params.outputState ? JSON.stringify(params.outputState) : null,
        riskScore: params.riskScore ?? 0,
        decision: params.decision,
        ipAddress: params.ipAddress || "127.0.0.1",
      },
    });
    return record;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
