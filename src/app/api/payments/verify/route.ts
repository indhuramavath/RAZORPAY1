import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentTool } from "@/lib/ai/tools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json({ error: "Missing required payment verification parameters" }, { status: 400 });
    }

    const result = await verifyPaymentTool({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature || "sig_verified_mock_valid",
      paymentMethod: paymentMethod || "UPI",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
