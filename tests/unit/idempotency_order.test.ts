import { describe, it, expect } from "vitest";
import { addToCartTool, createPaymentOrderTool, verifyPaymentTool } from "@/lib/ai/tools";
import { db } from "@/lib/db";

describe("Order Creation Idempotency & Concurrency Safety", () => {
  const sessionId = `sess_idemp_strict_${Date.now()}`;
  const checkoutKey = `idemp_order_${Date.now()}_abc123`;
  let createdOrderId = "";

  it("creates exactly one order on the first checkout attempt", async () => {
    await addToCartTool({
      sessionId,
      productIdOrSku: "ACC-KB-MECH",
      quantity: 1,
      isUpsell: false,
    });

    const res = await createPaymentOrderTool({
      sessionId,
      customerEmail: "aditi.sharma@techcorp.in",
      customerName: "Aditi Sharma",
      idempotencyKey: checkoutKey,
      confirmedByCustomer: true,
    });

    expect(res.success).toBe(true);
    expect(res.orderId).toBeDefined();
    expect(res.amountInINR).toBe(6499);
    createdOrderId = res.orderId!;
  });

  it("handles double-click / concurrent retries with the same idempotencyKey safely without P2002 error", async () => {
    // Simulate concurrent double-click with identical idempotencyKey
    const [res1, res2] = await Promise.all([
      createPaymentOrderTool({
        sessionId,
        customerEmail: "aditi.sharma@techcorp.in",
        customerName: "Aditi Sharma",
        idempotencyKey: checkoutKey,
        confirmedByCustomer: true,
      }),
      createPaymentOrderTool({
        sessionId,
        customerEmail: "aditi.sharma@techcorp.in",
        customerName: "Aditi Sharma",
        idempotencyKey: checkoutKey,
        confirmedByCustomer: true,
      }),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res1.orderId).toBe(createdOrderId);
    expect(res2.orderId).toBe(createdOrderId);

    // Verify only 1 order exists in database for this idempotencyKey
    const orderCount = await db.order.count({
      where: { idempotencyKey: checkoutKey },
    });
    expect(orderCount).toBe(1);
  });

  it("re-uses the existing pending order upon explicit retry", async () => {
    const retryRes = await createPaymentOrderTool({
      sessionId,
      customerEmail: "aditi.sharma@techcorp.in",
      customerName: "Aditi Sharma",
      idempotencyKey: checkoutKey,
      confirmedByCustomer: true,
    });

    expect(retryRes.success).toBe(true);
    expect(retryRes.orderId).toBe(createdOrderId);
    expect(retryRes.isExistingOrder || retryRes.isDuplicate).toBe(true);
  });

  it("creates a brand NEW order with a new idempotencyKey after payment settles", async () => {
    // Settle the first order
    const firstOrder = await db.order.findUnique({ where: { id: createdOrderId } });
    await verifyPaymentTool({
      orderId: createdOrderId,
      razorpayOrderId: firstOrder!.razorpayOrderId!,
      razorpayPaymentId: `pay_settle_${Date.now()}`,
      razorpaySignature: "sig_verified_mock_valid",
      paymentMethod: "UPI",
    });

    // Add new items for next purchase
    await addToCartTool({
      sessionId,
      productIdOrSku: "ACC-SLEEVE-14",
      quantity: 1,
      isUpsell: false,
    });

    const newKey = `idemp_order_${Date.now()}_xyz789`;
    const newRes = await createPaymentOrderTool({
      sessionId,
      customerEmail: "aditi.sharma@techcorp.in",
      customerName: "Aditi Sharma",
      idempotencyKey: newKey,
      confirmedByCustomer: true,
    });

    expect(newRes.success).toBe(true);
    expect(newRes.orderId).toBeDefined();
    expect(newRes.orderId).not.toBe(createdOrderId);
    expect(newRes.amountInINR).toBe(1999);

    // Both orders exist in database with their distinct idempotency keys
    const o1 = await db.order.findUnique({ where: { idempotencyKey: checkoutKey } });
    const o2 = await db.order.findUnique({ where: { idempotencyKey: newKey } });
    expect(o1?.status).toBe("PAID");
    expect(o2?.status).toBe("PAYMENT_INITIATED");
  });
});
