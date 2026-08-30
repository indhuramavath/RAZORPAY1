import { db } from "../db";

export interface PolicyValidationResult {
  allowed: boolean;
  reason?: string;
  ruleCode?: string;
  riskScore: number;
}

export async function validateOrderPolicy(
  merchantId: string,
  amountINR: number,
  discountINR: number = 0,
  subtotalINR: number = amountINR
): Promise<PolicyValidationResult> {
  // 1. Hard invariant: Amount cannot be negative or zero
  if (amountINR <= 0) {
    return {
      allowed: false,
      reason: "Order amount must be greater than ₹0.",
      ruleCode: "NON_POSITIVE_AMOUNT",
      riskScore: 1.0,
    };
  }

  // 2. Fetch Merchant rules
  const merchant = await db.merchant.findUnique({
    where: { id: merchantId },
    include: { policies: { where: { isActive: true } } },
  });

  const transactionLimit = merchant?.transactionLimit || 500000;

  // 3. Hard ceiling check
  if (amountINR > transactionLimit) {
    return {
      allowed: false,
      reason: `Order total (₹${amountINR.toLocaleString("en-IN")}) exceeds merchant transaction ceiling (₹${transactionLimit.toLocaleString("en-IN")}).`,
      ruleCode: "TRANSACTION_LIMIT_EXCEEDED",
      riskScore: 0.95,
    };
  }

  // 4. Discount percentage validation
  if (subtotalINR > 0 && discountINR > 0) {
    const discountPercent = (discountINR / subtotalINR) * 100;
    const maxDiscountPolicy = merchant?.policies.find((p) => p.ruleType === "MAX_DISCOUNT_PERCENT");
    let maxAllowedPercent = 25; // Default safety threshold

    if (maxDiscountPolicy) {
      try {
        const parsed = JSON.parse(maxDiscountPolicy.ruleValue);
        if (parsed.maxDiscountPercent) maxAllowedPercent = parsed.maxDiscountPercent;
      } catch (e) {
        // use default
      }
    }

    if (discountPercent > maxAllowedPercent) {
      return {
        allowed: false,
        reason: `Applied discount (${discountPercent.toFixed(1)}%) exceeds merchant policy ceiling of ${maxAllowedPercent}%.`,
        ruleCode: "DISCOUNT_POLICY_VIOLATION",
        riskScore: 0.85,
      };
    }
  }

  return {
    allowed: true,
    riskScore: 0.05,
  };
}

export async function checkCampaignApproval(opportunityId?: string): Promise<boolean> {
  if (!opportunityId) return false;
  const opp = await db.opportunity.findUnique({
    where: { id: opportunityId },
  });
  return opp?.status === "APPROVED";
}
