export type AgentState =
  | "DISCOVER"
  | "INTENT_PARSED"
  | "SEARCH_COMPARE"
  | "RECOMMEND"
  | "CART_BUILDING"
  | "ORDER_REVIEW"
  | "CUSTOMER_CONFIRMATION"
  | "PAYMENT_PENDING"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "RECOVERY"
  | "COMPLETE";

export type ActorType = "HUMAN" | "LLM" | "WORKER";
export type ActorRole = "BUYER" | "MERCHANT" | "AGENT" | "SYSTEM";
export type DecisionType = "ALLOWED" | "BLOCKED" | "GATED_APPROVED" | "GATED_REJECTED";

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

export interface StructuredProductAttributes {
  brand?: string;
  ram?: string;
  storage?: string;
  screen?: string;
  processor?: string;
  weight?: string;
  ports?: string[];
  warranty?: string;
  resolution?: string;
  refreshRate?: string;
  panelType?: string;
  powerDelivery?: string;
  switchType?: string;
  connectivity?: string;
  battery?: string;
  material?: string;
  [key: string]: unknown;
}

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  inventory: number;
  attributes: StructuredProductAttributes;
  tags: string[];
  compatibleProductIds: string[];
  upsellProductIds: string[];
  crossSellProductIds: string[];
  viewsCount: number;
  purchasesCount: number;
}

export interface CartSummaryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isUpsell: boolean;
  addedVia: string;
}

export interface CartSummary {
  cartId: string;
  sessionId: string;
  items: CartSummaryItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  itemCount: number;
}

export interface ScoredRecommendation {
  product: ProductCatalogItem;
  score: number;
  reasons: string[];
  confidence: number;
  isApprovedPromotion?: boolean;
  promotionalDiscount?: number;
}

export interface OpportunityEvidence {
  primaryProductSku?: string;
  recommendedProductSku?: string;
  historicalAffinity?: number;
  monthlyQualifiedOrders?: number;
  conversionLiftEstimate?: number;
  avgAdditionalOrderValueINR?: number;
  sampleSize?: number;
  abandonmentRate?: number;
  detectedDropoffStep?: string;
  targetBudgetCap?: number;
  [key: string]: unknown;
}

export interface OpportunityActionPayload {
  actionType: string;
  triggerProductSku?: string;
  suggestProductSku?: string;
  discountPercent?: number;
  maxDiscountINR?: number;
  bundleDiscountINR?: number;
  position?: string;
  [key: string]: unknown;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}
