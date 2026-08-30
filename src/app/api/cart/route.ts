import { NextRequest, NextResponse } from "next/server";
import { getCartSummaryTool, addToCartTool } from "@/lib/ai/tools";
import { db } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/db-seed";

export async function GET(req: NextRequest) {
  await ensureDatabaseSeeded();
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const summary = await getCartSummaryTool({ sessionId });
  return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const { sessionId, productId, sku, quantity = 1, isUpsell = false, addedVia = "DIRECT" } = body;

    const res = await addToCartTool({
      sessionId,
      productIdOrSku: sku || productId,
      quantity,
      isUpsell,
      addedVia,
    });

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cartItemId = searchParams.get("itemId");

    if (!cartItemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    const item = await db.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (item) {
      await db.cartItem.delete({ where: { id: cartItemId } });
      const remaining = await db.cartItem.findMany({ where: { cartId: item.cartId } });
      const subtotal = remaining.reduce((s, it) => s + it.totalPrice, 0);
      await db.cart.update({
        where: { id: item.cartId },
        data: { subtotal, total: subtotal },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
