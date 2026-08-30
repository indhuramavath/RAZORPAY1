import { describe, it, expect } from "vitest";

/**
 * Budget Parsing Tests
 * Tests the extractBudget() logic from fallback-agent.ts in isolation.
 * We replicate the exact regex + logic here to avoid spinning up the full agent.
 */
function extractBudget(userMessage: string): number | undefined {
  const lower = userMessage.toLowerCase();
  const budgetMatch = lower.match(
    /(?:under|below|budget|within|upto|up\s*to)\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(k|thousand)?/i
  );
  if (budgetMatch) {
    const numStr = budgetMatch[1].replace(/,/g, "");
    let val = parseFloat(numStr);
    const suffix = (budgetMatch[2] ?? "").toLowerCase();
    if (suffix === "k" || suffix === "thousand") {
      val = val * 1000;
    }
    if (val > 0) return val;
  }
  return undefined;
}

describe("Budget Parsing — extractBudget()", () => {
  it("parses 'under ₹100'", () => {
    expect(extractBudget("show me something under ₹100")).toBe(100);
  });

  it("parses 'under ₹500'", () => {
    expect(extractBudget("I need earbuds under ₹500")).toBe(500);
  });

  it("parses 'under ₹800'", () => {
    expect(extractBudget("Show me something under ₹800")).toBe(800);
  });

  it("parses 'under 999' (no ₹ symbol)", () => {
    expect(extractBudget("find me a mouse under 999")).toBe(999);
  });

  it("parses 'budget ₹1,000' with comma", () => {
    expect(extractBudget("budget ₹1,000")).toBe(1000);
  });

  it("parses 'within ₹5,000'", () => {
    expect(extractBudget("within ₹5,000")).toBe(5000);
  });

  it("parses '70k' correctly as 70000", () => {
    expect(extractBudget("laptop under 70k")).toBe(70000);
  });

  it("parses '50k' correctly as 50000", () => {
    expect(extractBudget("coding setup within 50k")).toBe(50000);
  });

  it("parses '₹70,000' with full comma format", () => {
    expect(extractBudget("college laptop under ₹70,000")).toBe(70000);
  });

  it("parses 'up to ₹45,000'", () => {
    expect(extractBudget("I need a laptop up to ₹45,000")).toBe(45000);
  });

  it("does NOT multiply ₹800 by 1000 (the old bug)", () => {
    const result = extractBudget("under ₹800");
    expect(result).toBe(800);
    expect(result).not.toBe(800000);
    expect(result).not.toBe(8000);
  });

  it("does NOT multiply ₹200 by 1000", () => {
    const result = extractBudget("below ₹200");
    expect(result).toBe(200);
    expect(result).not.toBe(200000);
  });

  it("returns undefined when no budget phrase present", () => {
    expect(extractBudget("I need a laptop")).toBeUndefined();
  });
});
