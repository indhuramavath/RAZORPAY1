import { NextRequest, NextResponse } from "next/server";
import { createPaymentOrderTool } from "@/lib/ai/tools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, customerEmail, customerName, idempotencyKey, confirmedByCustomer } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (confirmedByCustomer !== true) {
      return NextResponse.json(
        { error: "Explicit customer confirmation is required before creating a payment order." },
        { status: 400 }
      );
    }

    const result = await createPaymentOrderTool({
      sessionId,
      customerEmail: customerEmail || "shopper@apextech.in",
      customerName: customerName || "Valued Shopper",
      idempotencyKey: idempotencyKey || `idemp_${sessionId}`,
      confirmedByCustomer: true,
    });

    if (!result.success) {
      const isAlreadyPaid = (result as any).isAlreadyPaid;
      return NextResponse.json(
        { error: result.error, isAlreadyPaid },
        { status: isAlreadyPaid ? 409 : 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Create payment order error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment order" }, { status: 500 });
  }
}
