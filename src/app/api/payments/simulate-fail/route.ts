import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, reason = "CARD_DECLINED_SIMULATED" } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { cart: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order state to FAILED
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        failureReason: reason,
      },
    });

    // Record failed payment attempt
    await db.paymentAttempt.create({
      data: {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId || `fail_${Date.now()}`,
        amount: order.total,
        currency: "INR",
        status: "FAILED",
        idempotencyKey: `pay_fail_${Date.now()}`,
        errorCode: "PAYMENT_DECLINED",
        errorDescription: "Simulated test-mode bank decline: Insufficient balance or bank timeout.",
      },
    });

    // Cart remains ACTIVE (preserves user state so they can retry)
    await db.cart.update({
      where: { id: order.cartId },
      data: { status: "ACTIVE" },
    });

    // Audit log
    await logAuditEvent({
      actor: "SYSTEM",
      actorType: "WORKER",
      orderId: order.id,
      action: "PAYMENT_FAILED:GATEWAY_DECLINE",
      toolName: "handle_payment_failure",
      inputState: { orderId, reason },
      outputState: { recovered: true, cartPreserved: true },
      decision: "BLOCKED",
      riskScore: 0.4,
    });

    return NextResponse.json({
      success: true,
      status: "FAILED",
      orderId: order.id,
      cartId: order.cartId,
      message: "Payment declined by simulated gateway. Your cart items have been preserved. You may retry checkout with an alternate payment method.",
      canRetry: true,
    });
  } catch (error: any) {
    console.error("Payment failure simulation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
