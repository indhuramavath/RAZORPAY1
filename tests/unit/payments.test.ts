import { describe, it, expect } from "vitest";
import { addToCartTool, createPaymentOrderTool, verifyPaymentTool, getCartSummaryTool } from "@/lib/ai/tools";
import { db } from "@/lib/db";

describe("Payment Flow & Cart-Order Lifecycle Consistency (7 Core Scenarios)", () => {
  const sessionId = `sess_lifecycle_7scenarios_${Date.now()}`;
  let initialOrderId = "";
  let secondOrderId = "";

  // TEST 1: New cart -> checkout -> payment -> Settled
  it("TEST 1: New cart creates initial payment order and settles via UPI", async () => {
    // 1. Add Keychron K2 V2 (₹6,499)
    await addToCartTool({
      sessionId,
      productIdOrSku: "ACC-KB-MECH",
      quantity: 1,
      isUpsell: false,
    });

    const createRes = await createPaymentOrderTool({
      sessionId,
      customerEmail: "aditi.sharma@techcorp.in",
      customerName: "Aditi Sharma",
      idempotencyKey: `idemp_test1_${Date.now()}`,
      confirmedByCustomer: true,
    });

    expect(createRes.success).toBe(true);
    expect(createRes.amountInINR).toBe(6499);
    expect(createRes.orderId).toBeDefined();
    initialOrderId = createRes.orderId!;

    // Verify initial payment via UPI
    const verifyRes = await verifyPaymentTool({
      orderId: initialOrderId,
      razorpayOrderId: createRes.razorpayOrderId!,
      razorpayPaymentId: `pay_upi_${Date.now()}`,
      razorpaySignature: "sig_verified_mock_valid",
      paymentMethod: "UPI",
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.status).toBe("PAID");
    expect(verifyRes.paymentMethod).toBe("UPI");

    const settledOrder = await db.order.findUnique({ where: { id: initialOrderId } });
    expect(settledOrder?.status).toBe("PAID");
    expect(settledOrder?.total).toBe(6499);
  });

  // TEST 2 & TEST 5: Cart amount changes before payment -> updates order amount, pending order reuse
  it("TEST 2 & 5: Pending order is updated when cart amount changes, or reused when identical", async () => {
    const pendingSessionId = `sess_pending_${Date.now()}`;
    
    // Add 1 item of ₹6,499
    await addToCartTool({
      sessionId: pendingSessionId,
      productIdOrSku: "ACC-KB-MECH",
      quantity: 1,
      isUpsell: false,
    });

    const res1 = await createPaymentOrderTool({
      sessionId: pendingSessionId,
      customerEmail: "tester@apextech.in",
      customerName: "Test Customer",
      idempotencyKey: `idemp_pending_1_${Date.now()}`,
      confirmedByCustomer: true,
    });
    expect(res1.success).toBe(true);
    expect(res1.amountInINR).toBe(6499);

    // Identical cart -> Reuses pending order (TEST 2)
    const res2 = await createPaymentOrderTool({
      sessionId: pendingSessionId,
      customerEmail: "tester@apextech.in",
      customerName: "Test Customer",
      idempotencyKey: `idemp_pending_2_${Date.now()}`,
      confirmedByCustomer: true,
    });
    expect(res2.success).toBe(true);
    expect(res2.orderId).toBe(res1.orderId);
    expect(res2.isExistingOrder).toBe(true);

    // Cart amount changes (add 2nd item of ₹1,999 -> ₹8,498) -> Incompatible amount NOT reused, order synced to ₹8,498 (TEST 5)
    await addToCartTool({
      sessionId: pendingSessionId,
      productIdOrSku: "ACC-SLEEVE-14",
      quantity: 1,
      isUpsell: false,
    });

    const res3 = await createPaymentOrderTool({
      sessionId: pendingSessionId,
      customerEmail: "tester@apextech.in",
      customerName: "Test Customer",
      idempotencyKey: `idemp_pending_3_${Date.now()}`,
      confirmedByCustomer: true,
    });
    expect(res3.success).toBe(true);
    expect(res3.amountInINR).toBe(8498);
  });

  // TEST 3 & TEST 4: Cart changes after previous successful payment -> NEVER reuse settled order, create NEW order
  it("TEST 3 & 4: Adding products after previous payment creates a NEW payment order for ₹8,498", async () => {
    // Add Keychron K2 V2 (₹6,499) + Tomtoc Sleeve (₹1,999) on the original session (which previously paid order 1)
    await addToCartTool({
      sessionId,
      productIdOrSku: "ACC-KB-MECH",
      quantity: 1,
      isUpsell: false,
    });

    await addToCartTool({
      sessionId,
      productIdOrSku: "ACC-SLEEVE-14",
      quantity: 1,
      isUpsell: false,
    });

    const summary = await getCartSummaryTool({ sessionId });
    expect("items" in summary).toBe(true);
    if ("items" in summary) {
      expect(summary.items.length).toBe(2);
      expect(summary.total).toBe(8498);
    }

    // Checkout: Must NOT throw "already been paid" and must create a NEW order for ₹8,498
    const newOrderRes = await createPaymentOrderTool({
      sessionId,
      customerEmail: "aditi.sharma@techcorp.in",
      customerName: "Aditi Sharma",
      idempotencyKey: `idemp_new_cart_${Date.now()}`,
      confirmedByCustomer: true,
    });

    expect(newOrderRes.success).toBe(true);
    expect(newOrderRes.orderId).toBeDefined();
    expect(newOrderRes.orderId).not.toBe(initialOrderId);
    expect(newOrderRes.amountInINR).toBe(8498);
    secondOrderId = newOrderRes.orderId!;

    // Verify the old initial order is still untouched and settled for ₹6,499
    const initialOrder = await db.order.findUnique({ where: { id: initialOrderId } });
    expect(initialOrder?.status).toBe("PAID");
    expect(initialOrder?.total).toBe(6499);
  });

  // TEST 6 & TEST 7: Test Credit/Debit Card payment settlement and audit trail verification
  it("TEST 6 & 7: Test Credit/Debit Card completes settlement and logs CARD in Audit Trail", async () => {
    const secondOrder = await db.order.findUnique({ where: { id: secondOrderId } });
    expect(secondOrder).toBeDefined();

    const verifyCardRes = await verifyPaymentTool({
      orderId: secondOrderId,
      razorpayOrderId: secondOrder!.razorpayOrderId!,
      razorpayPaymentId: `pay_card_4111_${Date.now()}`,
      razorpaySignature: "sig_verified_mock_valid",
      paymentMethod: "CARD",
    });

    expect(verifyCardRes.success).toBe(true);
    expect(verifyCardRes.status).toBe("PAID");
    expect(verifyCardRes.total).toBe(8498);
    expect(verifyCardRes.paymentMethod).toBe("CARD");

    const settledSecondOrder = await db.order.findUnique({ where: { id: secondOrderId } });
    expect(settledSecondOrder?.status).toBe("PAID");
    expect(settledSecondOrder?.total).toBe(8498);

    // Verify Audit Trail recorded PAYMENT_SUCCESS:SETTLED with CARD
    const auditLog = await db.auditLog.findFirst({
      where: { orderId: secondOrderId, action: "PAYMENT_SUCCESS:SETTLED" },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.outputState).toContain("CARD");
    expect(auditLog?.outputState).toContain("8498");
  });
});
