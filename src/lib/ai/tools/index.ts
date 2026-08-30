import { z } from "zod";
import { db } from "../../db";
import { logAuditEvent } from "../../audit";
import { getRecommendations } from "../../engine/recommendations";
import { validateOrderPolicy } from "../../engine/policy";
import { checkIdempotency, resolveIdempotency } from "../../payments/idempotency";
import { createRazorpayOrder, verifyRazorpaySignature } from "../../payments/razorpay";
import { CartSummary, ProductCatalogItem } from "../../../types";

// Helper to format raw product from DB
export function formatDbProduct(p: any): ProductCatalogItem {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    inventory: p.inventory,
    attributes: JSON.parse(p.attributes || "{}"),
    tags: JSON.parse(p.tags || "[]"),
    compatibleProductIds: JSON.parse(p.compatibleProductIds || "[]"),
    upsellProductIds: JSON.parse(p.upsellProductIds || "[]"),
    crossSellProductIds: JSON.parse(p.crossSellProductIds || "[]"),
    viewsCount: p.viewsCount,
    purchasesCount: p.purchasesCount,
  };
}

// 1. Tool: search_catalog
export const searchCatalogSchema = z.object({
  query: z.string().optional().describe("Keywords like 'laptop', 'developer', 'mechanical keyboard'"),
  category: z.string().optional().describe("Category filter: Laptops, Monitors, Keyboards, Mice, Audio, Accessories, Furniture"),
  maxPrice: z.number().optional().describe("Maximum budget ceiling in INR"),
  minPrice: z.number().optional().describe("Minimum price in INR"),
  limit: z.number().optional().default(6).describe("Maximum items to return"),
});

export async function searchCatalogTool(args: z.infer<typeof searchCatalogSchema>, sessionId?: string) {
  const { query, category, maxPrice, minPrice, limit = 6 } = args;

  const rawProducts = await db.product.findMany();
  let filtered = rawProducts.map(formatDbProduct);

  if (category) {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= maxPrice);
  }

  if (minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= minPrice);
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }

  await logAuditEvent({
    actor: "AGENT",
    actorType: "LLM",
    sessionId,
    action: "TOOL_CALL:search_catalog",
    toolName: "search_catalog",
    inputState: args,
    outputState: { matchCount: filtered.length },
    decision: "ALLOWED",
    riskScore: 0.01,
  });

  return {
    count: filtered.length,
    products: filtered.slice(0, limit),
  };
}

// 2. Tool: get_product_details
export const getProductDetailsSchema = z.object({
  productIdOrSku: z.string().describe("The product ID or SKU"),
});

export async function getProductDetailsTool(args: z.infer<typeof getProductDetailsSchema>, sessionId?: string) {
  const prod = await db.product.findFirst({
    where: {
      OR: [{ id: args.productIdOrSku }, { sku: args.productIdOrSku }],
    },
  });

  if (!prod) {
    return { error: `Product '${args.productIdOrSku}' not found.` };
  }

  // Increment view count
  await db.product.update({
    where: { id: prod.id },
    data: { viewsCount: { increment: 1 } },
  });

  return { product: formatDbProduct(prod) };
}

// 3. Tool: compare_products
export const compareProductsSchema = z.object({
  productSkus: z.array(z.string()).min(2).max(4).describe("Array of 2 to 4 product SKUs or IDs to compare"),
});

export async function compareProductsTool(args: z.infer<typeof compareProductsSchema>, sessionId?: string) {
  const prods = await db.product.findMany({
    where: {
      OR: [{ id: { in: args.productSkus } }, { sku: { in: args.productSkus } }],
    },
  });

  const formatted = prods.map(formatDbProduct);

  return {
    comparisonCount: formatted.length,
    products: formatted,
    priceRange: {
      min: Math.min(...formatted.map((p) => p.price)),
      max: Math.max(...formatted.map((p) => p.price)),
    },
  };
}

// 4. Tool: get_recommendations
export const getRecommendationsSchema = z.object({
  targetCategory: z.string().optional(),
  cartProductIds: z.array(z.string()).optional(),
  maxBudgetINR: z.number().optional(),
  limit: z.number().optional().default(3),
});

export async function getRecommendationsTool(args: z.infer<typeof getRecommendationsSchema>, sessionId?: string) {
  const recommendations = await getRecommendations(args);

  await logAuditEvent({
    actor: "AGENT",
    actorType: "LLM",
    sessionId,
    action: "TOOL_CALL:get_recommendations",
    toolName: "get_recommendations",
    inputState: args,
    outputState: { returnedCount: recommendations.length },
    decision: "ALLOWED",
    riskScore: 0.02,
  });

  return { recommendations };
}

// 5. Tool: add_to_cart
export const addToCartSchema = z.object({
  sessionId: z.string().describe("Active session token / ID"),
  productIdOrSku: z.string().describe("The product SKU or ID to add"),
  quantity: z.number().default(1),
  isUpsell: z.boolean().default(false),
  addedVia: z.enum(["DIRECT", "AGENT_RECOMMENDATION", "BUNDLE"]).default("DIRECT"),
});

export async function addToCartTool(args: z.infer<typeof addToCartSchema>) {
  const { sessionId, productIdOrSku, quantity = 1, isUpsell = false, addedVia = "DIRECT" } = args;

  const product = await db.product.findFirst({
    where: { OR: [{ id: productIdOrSku }, { sku: productIdOrSku }] },
  });

  if (!product) {
    return { error: `Product ${productIdOrSku} not found.` };
  }

  // Ensure session exists
  let session = await db.session.findUnique({
    where: { sessionToken: sessionId },
    include: { cart: { include: { items: true, order: true } } },
  });

  if (!session) {
    session = await db.session.create({
      data: { sessionToken: sessionId, state: "CART_BUILDING" },
      include: { cart: { include: { items: true, order: true } } },
    });
  }

  // Ensure cart exists and is ACTIVE (if old cart was CONVERTED or order was PAID, archive it and start a fresh active cart)
  let cart = session.cart;
  if (cart && (cart.status === "CONVERTED" || cart.order?.status === "PAID")) {
    const archivedSession = await db.session.create({
      data: {
        sessionToken: `archived_${session.sessionToken}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        state: "CONVERTED",
      },
    });

    await db.cart.update({
      where: { id: cart.id },
      data: { sessionId: archivedSession.id, status: "CONVERTED" },
    });
    cart = null as any;
  }

  if (!cart) {
    cart = await db.cart.create({
      data: {
        sessionId: session.id,
        status: "ACTIVE",
        subtotal: 0,
        total: 0,
      },
      include: { items: true, order: true },
    });
  }

  // Add or increment item
  const existingItem = await db.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id },
  });

  if (existingItem) {
    await db.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
        totalPrice: (existingItem.quantity + quantity) * product.price,
      },
    });
  } else {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
        isUpsell,
        addedVia,
      },
    });
  }

  // Recalculate totals
  const updatedItems = await db.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
  });

  const subtotal = updatedItems.reduce((s, it) => s + it.totalPrice, 0);
  await db.cart.update({
    where: { id: cart.id },
    data: { subtotal, total: subtotal, status: "ACTIVE" },
  });

  await logAuditEvent({
    actor: "BUYER",
    actorType: "HUMAN",
    sessionId: session.id,
    action: "CART_MODIFIED:add_to_cart",
    toolName: "add_to_cart",
    inputState: { productId: product.id, sku: product.sku, quantity, isUpsell, addedVia },
    outputState: { newSubtotal: subtotal, itemCount: updatedItems.length },
    decision: "ALLOWED",
    riskScore: 0.05,
  });

  return {
    success: true,
    message: `Added ${product.name} (x${quantity}) to cart.`,
    cart: {
      cartId: cart.id,
      sessionId: session.sessionToken,
      subtotal,
      total: subtotal,
      itemCount: updatedItems.reduce((acc, it) => acc + it.quantity, 0),
    },
  };
}

// 6. Tool: get_cart_summary
export const getCartSummarySchema = z.object({
  sessionId: z.string().describe("Active session token"),
});

export async function getCartSummaryTool(args: z.infer<typeof getCartSummarySchema>): Promise<CartSummary | { error: string }> {
  const session = await db.session.findUnique({
    where: { sessionToken: args.sessionId },
    include: {
      cart: {
        include: {
          items: {
            include: { product: true },
          },
          order: true,
        },
      },
    },
  });

  if (!session || !session.cart || session.cart.status === "CONVERTED" || session.cart.order?.status === "PAID") {
    return {
      cartId: "",
      sessionId: args.sessionId,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      currency: "INR",
      itemCount: 0,
    };
  }

  const items = session.cart.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    productName: it.product.name,
    sku: it.product.sku,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    totalPrice: it.totalPrice,
    isUpsell: it.isUpsell,
    addedVia: it.addedVia,
  }));

  const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);

  return {
    cartId: session.cart.id,
    sessionId: session.sessionToken,
    items,
    subtotal,
    discount: session.cart.discount,
    total: session.cart.total || subtotal,
    currency: "INR",
    itemCount: items.reduce((s, it) => s + it.quantity, 0),
  };
}

// 7. Tool: request_customer_confirmation
export const requestCustomerConfirmationSchema = z.object({
  sessionId: z.string(),
  orderSummaryText: z.string(),
  totalAmountINR: z.number(),
});

export async function requestCustomerConfirmationTool(args: z.infer<typeof requestCustomerConfirmationSchema>) {
  const session = await db.session.findUnique({
    where: { sessionToken: args.sessionId },
    include: { cart: { include: { items: { include: { product: true } } } } },
  });

  if (!session || !session.cart || session.cart.items.length === 0) {
    return { error: "Cart is empty. Cannot request payment confirmation." };
  }

  // Update session state
  await db.session.update({
    where: { id: session.id },
    data: { state: "CUSTOMER_CONFIRMATION" },
  });

  const confirmationToken = `CONFIRM_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  await logAuditEvent({
    actor: "AGENT",
    actorType: "LLM",
    sessionId: session.id,
    action: "STATE_TRANSITION:CUSTOMER_CONFIRMATION",
    toolName: "request_customer_confirmation",
    inputState: args,
    outputState: { confirmationToken, state: "CUSTOMER_CONFIRMATION" },
    decision: "ALLOWED",
    riskScore: 0.1,
  });

  return {
    status: "CONFIRMATION_REQUIRED",
    confirmationToken,
    message: `Payment order prepared for ₹${args.totalAmountINR.toLocaleString("en-IN")}. Explicit customer authorization required.`,
    cart: {
      cartId: session.cart.id,
      items: session.cart.items.map((i) => ({ name: i.product.name, qty: i.quantity, price: i.totalPrice })),
      total: session.cart.total,
    },
  };
}

// 8. Tool: create_payment_order (Strictly bounded, idempotent & safe)
export const createPaymentOrderSchema = z.object({
  sessionId: z.string(),
  customerEmail: z.string().email().optional().default("shopper@apextech.in"),
  customerName: z.string().optional().default("Valued Customer"),
  idempotencyKey: z.string().describe("Unique UUID or request token for idempotency protection"),
  confirmedByCustomer: z.boolean().describe("Must be true; indicates explicit human consent"),
});

export async function createPaymentOrderTool(args: z.infer<typeof createPaymentOrderSchema>) {
  const { sessionId, customerEmail, customerName, idempotencyKey, confirmedByCustomer } = args;

  // 1. Strict Gate: Customer confirmation
  if (!confirmedByCustomer) {
    await logAuditEvent({
      actor: "AGENT",
      actorType: "LLM",
      sessionId,
      action: "PAYMENT_BLOCKED:UNCONFIRMED",
      toolName: "create_payment_order",
      decision: "BLOCKED",
      riskScore: 1.0,
    });
    return {
      success: false,
      error: "Financial Safety Rule: Payment creation blocked. Explicit customer confirmation was not granted.",
    };
  }

  // 2. Idempotency check
  const idempResult = await checkIdempotency(idempotencyKey, "ORDER_CREATE");
  if (idempResult.isDuplicate && idempResult.cachedResponse) {
    return {
      success: true,
      isDuplicate: true,
      ...idempResult.cachedResponse,
    };
  }

  // 3. Fetch session and cart
  const session = await db.session.findUnique({
    where: { sessionToken: sessionId },
    include: {
      cart: {
        include: {
          items: {
            include: { product: true },
          },
          order: true,
        },
      },
    },
  });

  if (!session || !session.cart || session.cart.items.length === 0) {
    return { success: false, error: "Active cart is empty." };
  }

  let activeCart = session.cart;

  // 4. Ensure or create customer
  let customer = await db.customer.findUnique({ where: { email: customerEmail } });
  if (!customer) {
    customer = await db.customer.create({
      data: {
        email: customerEmail,
        name: customerName,
      },
    });
  }

  // 5. Freeze prices deterministically from database
  const subtotal = activeCart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal - (activeCart.discount || 0);

  // 6. Policy Check
  const policyCheck = await validateOrderPolicy("merchant_default_rzg", total, activeCart.discount, subtotal);
  if (!policyCheck.allowed) {
    await logAuditEvent({
      actor: "SYSTEM",
      actorType: "WORKER",
      sessionId: session.id,
      action: "PAYMENT_BLOCKED:POLICY_VIOLATION",
      toolName: "create_payment_order",
      inputState: { amount: total, policyCheck },
      decision: "BLOCKED",
      riskScore: policyCheck.riskScore,
    });
    return { success: false, error: policyCheck.reason };
  }

  // 7. Check if an Order already exists for this Cart or IdempotencyKey
  let existingOrder = await db.order.findFirst({
    where: {
      OR: [
        { idempotencyKey },
        { cartId: activeCart.id },
      ],
    },
  });

  // Lifecycle Rule: If existing order is already PAID/SETTLED, NEVER reuse it.
  // If active cart has items, archive the old settled cart and instantiate a fresh active cart for this new transaction.
  if (existingOrder && (existingOrder.status === "PAID" || activeCart.status === "CONVERTED")) {
    const archivedSession = await db.session.create({
      data: {
        sessionToken: `archived_${session.sessionToken}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        state: "CONVERTED",
      },
    });

    await db.cart.update({
      where: { id: activeCart.id },
      data: { sessionId: archivedSession.id, status: "CONVERTED" },
    });

    const newCart = await db.cart.create({
      data: {
        sessionId: session.id,
        status: "ACTIVE",
        subtotal,
        total,
        discount: activeCart.discount || 0,
      },
    });

    for (const item of activeCart.items) {
      await db.cartItem.create({
        data: {
          cartId: newCart.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          isUpsell: item.isUpsell,
          addedVia: item.addedVia,
        },
      });
    }

    activeCart = (await db.cart.findUnique({
      where: { id: newCart.id },
      include: { items: { include: { product: true } }, order: true },
    }))!;

    existingOrder = null; // Proceed to create a brand new order for newCart
  }

  if (existingOrder) {
    // Case B: If order is PAYMENT_INITIATED and matches current cart total, reuse it
    if (existingOrder.status === "PAYMENT_INITIATED" && existingOrder.razorpayOrderId && existingOrder.total === total) {
      const responsePayload = {
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        razorpayOrderId: existingOrder.razorpayOrderId,
        amountInINR: existingOrder.total,
        amountInPaise: Math.round(existingOrder.total * 100),
        currency: existingOrder.currency,
        customerEmail,
        customerName,
      };

      await resolveIdempotency(idempotencyKey, responsePayload, "RESOLVED");

      await logAuditEvent({
        actor: "AGENT",
        actorType: "LLM",
        sessionId: session.id,
        orderId: existingOrder.id,
        action: "ORDER_REUSED:EXISTING_PAYMENT_INITIATED",
        toolName: "create_payment_order",
        inputState: { orderNumber: existingOrder.orderNumber, idempotencyKey },
        outputState: responsePayload,
        decision: "ALLOWED",
        riskScore: 0.01,
      });

      return {
        success: true,
        isExistingOrder: true,
        ...responsePayload,
      };
    }

    // Case C: If order total changed or order was FAILED/CANCELLED, sync existing order with latest cart amount and items
    const rzpRes = await createRazorpayOrder({
      amountInINR: total,
      orderNumber: existingOrder.orderNumber,
      notes: {
        sessionId: session.sessionToken,
        customerEmail,
        orderNumber: existingOrder.orderNumber,
      },
    });

    // Replace order items to match current cart items
    await db.orderItem.deleteMany({ where: { orderId: existingOrder.id } });

    const updatedOrder = await db.order.update({
      where: { id: existingOrder.id },
      data: {
        status: "PAYMENT_INITIATED",
        razorpayOrderId: rzpRes.order.id,
        failureReason: null,
        idempotencyKey,
        subtotal,
        total,
        items: {
          create: activeCart.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            isUpsell: it.isUpsell,
          })),
        },
      },
    });

    const attemptKey = `pay_${updatedOrder.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.paymentAttempt.create({
      data: {
        orderId: updatedOrder.id,
        razorpayOrderId: rzpRes.order.id,
        amount: total,
        currency: "INR",
        status: "INITIATED",
        idempotencyKey: attemptKey,
      },
    });

    const responsePayload = {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      razorpayOrderId: rzpRes.order.id,
      amountInINR: total,
      amountInPaise: Math.round(total * 100),
      currency: "INR",
      customerEmail,
      customerName,
    };

    await resolveIdempotency(idempotencyKey, responsePayload, "RESOLVED");

    await logAuditEvent({
      actor: "AGENT",
      actorType: "LLM",
      sessionId: session.id,
      orderId: updatedOrder.id,
      action: "ORDER_UPDATED:LATEST_CART_TOTAL",
      toolName: "create_payment_order",
      inputState: { orderNumber: updatedOrder.orderNumber, total, idempotencyKey },
      outputState: responsePayload,
      decision: "ALLOWED",
      riskScore: 0.02,
    });

    return {
      success: true,
      isRetry: true,
      ...responsePayload,
    };
  }

  // 8. No existing order exists for this cart/key -> create fresh order
  const orderNumber = `RZG-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  const rzpRes = await createRazorpayOrder({
    amountInINR: total,
    orderNumber,
    notes: {
      sessionId: session.sessionToken,
      customerEmail,
      orderNumber,
    },
  });

  const hasUpsell = activeCart.items.some((i) => i.isUpsell);
  const aiAmount = activeCart.items.filter((i) => i.isUpsell).reduce((s, i) => s + i.totalPrice, 0);

  let order;
  try {
    order = await db.order.create({
      data: {
        orderNumber,
        merchantId: "merchant_default_rzg",
        customerId: customer.id,
        cartId: activeCart.id,
        subtotal,
        total,
        currency: "INR",
        status: "PAYMENT_INITIATED",
        razorpayOrderId: rzpRes.order.id,
        idempotencyKey,
        confirmedByCustomer: true,
        aiAttributed: hasUpsell,
        aiAttributionType: hasUpsell ? "UPSELL" : "DIRECT_DISCOVERY",
        aiRevenueAmount: aiAmount,
        items: {
          create: activeCart.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            isUpsell: it.isUpsell,
          })),
        },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      const raceOrder = await db.order.findFirst({
        where: {
          OR: [{ idempotencyKey }, { cartId: activeCart.id }],
        },
      });
      if (raceOrder) {
        return {
          success: true,
          isDuplicate: true,
          orderId: raceOrder.id,
          orderNumber: raceOrder.orderNumber,
          razorpayOrderId: raceOrder.razorpayOrderId,
          amountInINR: raceOrder.total,
          amountInPaise: Math.round(raceOrder.total * 100),
          currency: raceOrder.currency,
          customerEmail,
          customerName,
        };
      }
    }
    throw error;
  }

  const attemptKey = `pay_${order.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.paymentAttempt.create({
    data: {
      orderId: order.id,
      razorpayOrderId: rzpRes.order.id,
      amount: total,
      currency: "INR",
      status: "INITIATED",
      idempotencyKey: attemptKey,
    },
  });

  const responsePayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    razorpayOrderId: rzpRes.order.id,
    amountInINR: total,
    amountInPaise: Math.round(total * 100),
    currency: "INR",
    customerEmail,
    customerName,
  };

  await resolveIdempotency(idempotencyKey, responsePayload, "RESOLVED");

  await logAuditEvent({
    actor: "AGENT",
    actorType: "LLM",
    sessionId: session.id,
    orderId: order.id,
    action: "ORDER_CREATED:RAZORPAY_INITIATED",
    toolName: "create_payment_order",
    inputState: { orderNumber, total, idempotencyKey },
    outputState: responsePayload,
    decision: "ALLOWED",
    riskScore: 0.05,
  });

  return {
    success: true,
    ...responsePayload,
  };
}

// 9. Tool: verify_payment (HMAC verification & state finalization)
export const verifyPaymentSchema = z.object({
  orderId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  paymentMethod: z.string().optional().default("UPI"),
});

export async function verifyPaymentTool(args: z.infer<typeof verifyPaymentSchema>) {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod = "UPI" } = args;

  const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  if (!isValid) {
    await db.order.update({
      where: { id: orderId },
      data: { status: "FAILED", failureReason: "Signature verification failed" },
    });

    await logAuditEvent({
      actor: "SYSTEM",
      actorType: "WORKER",
      orderId,
      action: "PAYMENT_FAILED:INVALID_SIGNATURE",
      toolName: "verify_payment",
      inputState: { razorpayOrderId, razorpayPaymentId, paymentMethod },
      decision: "BLOCKED",
      riskScore: 0.99,
    });

    return {
      success: false,
      error: "Payment verification failed. Invalid cryptographic signature.",
    };
  }

  // Update order to PAID
  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      razorpayPaymentId,
      razorpaySignature,
    },
    include: { items: { include: { product: true } } },
  });

  // Mark cart converted
  await db.cart.update({
    where: { id: order.cartId },
    data: { status: "CONVERTED" },
  });

  // Decrement product inventory
  for (const it of order.items) {
    await db.product.update({
      where: { id: it.productId },
      data: {
        inventory: { decrement: it.quantity },
        purchasesCount: { increment: it.quantity },
      },
    });
  }

  await logAuditEvent({
    actor: "BUYER",
    actorType: "HUMAN",
    orderId,
    action: "PAYMENT_SUCCESS:SETTLED",
    toolName: "verify_payment",
    inputState: { razorpayOrderId, razorpayPaymentId, paymentMethod },
    outputState: { status: "PAID", amount: order.total, paymentMethod },
    decision: "ALLOWED",
    riskScore: 0.0,
  });

  return {
    success: true,
    status: "PAID",
    orderNumber: order.orderNumber,
    total: order.total,
    paymentMethod,
    message: "Payment successfully verified and settled via Razorpay test mode.",
  };
}
