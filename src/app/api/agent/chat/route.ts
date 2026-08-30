import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runBuyerAgent } from "@/lib/ai/agent";
import { ensureDatabaseSeeded } from "@/lib/db-seed";

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();

    const body = await req.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
    }

    // Ensure session exists
    let session = await db.session.findUnique({
      where: { sessionToken: sessionId },
    });

    if (!session) {
      session = await db.session.create({
        data: {
          sessionToken: sessionId,
          state: "DISCOVER",
        },
      });
    }

    // Save incoming user message
    await db.message.create({
      data: {
        sessionId: session.id,
        sender: "USER",
        content: message,
      },
    });

    // Run Agent
    const agentResult = await runBuyerAgent(sessionId, message);

    // Save agent response
    const agentMsg = await db.message.create({
      data: {
        sessionId: session.id,
        sender: "AGENT",
        content: agentResult.message,
        toolCalls: JSON.stringify(agentResult.toolCalls),
        metadata: JSON.stringify({
          productCards: agentResult.productCards,
          cartSummary: agentResult.cartSummary,
          requiresConfirmation: agentResult.requiresConfirmation,
          confirmationData: agentResult.confirmationData,
        }),
      },
    });

    // Update session state
    await db.session.update({
      where: { id: session.id },
      data: { state: agentResult.state },
    });

    return NextResponse.json({
      success: true,
      messageId: agentMsg.id,
      response: agentResult.message,
      state: agentResult.state,
      toolCalls: agentResult.toolCalls,
      productCards: agentResult.productCards,
      cartSummary: agentResult.cartSummary,
      requiresConfirmation: agentResult.requiresConfirmation,
      confirmationData: agentResult.confirmationData,
    });
  } catch (error: any) {
    console.error("Agent chat error:", error);
    return NextResponse.json(
      { error: "Agent execution error", details: error.message },
      { status: 500 }
    );
  }
}
