import { GoogleGenerativeAI } from "@google/generative-ai";
import { BUYER_AGENT_SYSTEM_PROMPT } from "./prompts";
import { processFallbackAgent, AgentProcessResult } from "./fallback-agent";
import {
  searchCatalogTool,
  getProductDetailsTool,
  compareProductsTool,
  getRecommendationsTool,
  addToCartTool,
  getCartSummaryTool,
  requestCustomerConfirmationTool,
} from "./tools";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function runBuyerAgent(
  sessionId: string,
  userMessage: string
): Promise<AgentProcessResult> {
  // If no Gemini API Key is provided or in test environment, use deterministic fallback agent
  if (!genAI || !apiKey || apiKey.trim() === "") {
    return processFallbackAgent(sessionId, userMessage);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: BUYER_AGENT_SYSTEM_PROMPT,
    });

    // Run fallback logic for immediate zero-latency rich tool calling and supplement with LLM text
    const fallbackResult = await processFallbackAgent(sessionId, userMessage);

    // If Gemini is available, enhance the conversational explanation
    const prompt = `User said: "${userMessage}". Context: We identified ${fallbackResult.productCards?.length || 0} product matches and state is ${fallbackResult.state}. Give a concise, helpful response explaining why these recommendations fit the user's need.`;
    const response = await model.generateContent(prompt);
    const text = response.response.text();

    if (text && text.trim().length > 10) {
      return {
        ...fallbackResult,
        message: text.trim(),
      };
    }

    return fallbackResult;
  } catch (error) {
    console.warn("Gemini API call failed, falling back to deterministic agent:", error);
    return processFallbackAgent(sessionId, userMessage);
  }
}
