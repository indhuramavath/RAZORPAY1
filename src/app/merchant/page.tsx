"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sparkles,
  Zap,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatINR, formatPercent } from "@/lib/utils";

interface AnalyticsData {
  totalRevenueINR: number;
  totalOrdersCount: number;
  avgOrderValueINR: number;
  aiAttributedRevenueINR: number;
  aiAttributedPercent: number;
  upsellRevenueINR: number;
  crossSellRevenueINR: number;
  cartAbandonmentRate: number;
  opportunityCount: number;
}

interface OpportunityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  evidence: Record<string, any>;
  estimatedImpact: number;
  confidenceScore: number;
  riskLevel: string;
  actionPayload: Record<string, any>;
  status: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}

export default function MerchantDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [anRes, oppRes] = await Promise.all([
        fetch("/api/merchant/analytics"),
        fetch("/api/merchant/opportunities"),
      ]);
      const anData = await anRes.json();
      const oppData = await oppRes.json();
      setAnalytics(anData);
      setOpportunities(oppData.opportunities || []);
    } catch (err) {
      console.error("Failed to load merchant data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpportunityAction = async (opportunityId: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(opportunityId);
    try {
      const res = await fetch("/api/merchant/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(data.message);
        setTimeout(() => setFeedbackMessage(null), 5000);
        // Refresh
        await fetchData();
      }
    } catch (err) {
      console.error("Opportunity action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Merchant AI Growth Copilot</h1>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                ApexTech Store
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time revenue intelligence, affinity mining, and human-in-the-loop opportunity gating.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center space-x-2 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh Analytics</span>
            </button>

            <a
              href="/shop"
              className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              <span>Test as AI Buyer</span>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">
                {analytics ? formatINR(analytics.totalRevenueINR) : "—"}
              </span>
              <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                +14.2%
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {analytics?.totalOrdersCount || 0} settled orders (Razorpay Test Mode)
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">AI-Attributed Revenue</span>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-700">
                {analytics ? formatINR(analytics.aiAttributedRevenueINR) : "—"}
              </span>
              <span className="rounded bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-bold text-purple-700">
                {analytics ? `${analytics.aiAttributedPercent}% of total` : "—"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Generated via conversational discovery & smart checkout upsell
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Upsell & Cross-Sell Lift</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">
                {analytics ? formatINR(analytics.upsellRevenueINR + analytics.crossSellRevenueINR) : "—"}
              </span>
              <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                +24.8%
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Avg Order Value: {analytics ? formatINR(analytics.avgOrderValueINR) : "—"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending AI Opportunities</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600">
                {analytics?.opportunityCount || 0}
              </span>
              <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                Requires Approval
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {opportunities.filter((o) => o.status === "APPROVED").length} campaigns currently active in buyer agent
            </p>
          </div>
        </div>

        {/* Opportunities Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Revenue Opportunities & Human Gating</h2>
              <p className="text-xs text-slate-500">
                The AI scans product views and affinities to detect revenue growth opportunities. Consequential actions require explicit merchant approval.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {opportunities.length} Total Detected
            </span>
          </div>

          <div className="space-y-4">
            {opportunities.map((opp) => {
              const isApproved = opp.status === "APPROVED";
              const isRejected = opp.status === "REJECTED";
              const isPending = opp.status === "PENDING";

              return (
                <div
                  key={opp.id}
                  className={`bg-white rounded-xl p-5 sm:p-6 border transition-all ${
                    isApproved
                      ? "border-emerald-200 bg-emerald-50/20"
                      : isRejected
                      ? "border-slate-200 opacity-60"
                      : "border-blue-200 shadow-sm ring-1 ring-blue-100"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                            opp.type === "UPSELL_ATTACH"
                              ? "bg-blue-100 text-blue-800"
                              : opp.type === "BUNDLE_CROSS_SELL"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {opp.type.replace(/_/g, " ")}
                        </span>

                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Confidence: {(opp.confidenceScore * 100).toFixed(0)}%
                        </span>

                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          Est. Lift: +{formatINR(opp.estimatedImpact)}/mo
                        </span>

                        {isApproved && (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active in Buyer Agent</span>
                          </span>
                        )}

                        {isRejected && (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <XCircle className="h-3 w-3" />
                            <span>Rejected / Inactive</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{opp.title}</h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opp.description}</p>

                      {/* Evidence Details */}
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                          <Layers className="h-3 w-3 text-slate-500" />
                          <span>Underlying Mathematical Evidence</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {opp.evidence.historicalAffinity && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Item Affinity</span>
                              <span className="font-bold text-slate-800">{(opp.evidence.historicalAffinity * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {opp.evidence.sampleSize && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Sample Size</span>
                              <span className="font-bold text-slate-800">{opp.evidence.sampleSize} views</span>
                            </div>
                          )}
                          {opp.evidence.conversionLiftEstimate && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Attach Lift</span>
                              <span className="font-bold text-emerald-600">+{(opp.evidence.conversionLiftEstimate * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          {opp.evidence.avgAdditionalOrderValueINR && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Addl. Value</span>
                              <span className="font-bold text-slate-800">{formatINR(opp.evidence.avgAdditionalOrderValueINR)}</span>
                            </div>
                          )}
                          {opp.evidence.currentConversionRate && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">Conversion Rate</span>
                              <span className="font-bold text-slate-800">{opp.evidence.currentConversionRate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Gating Controls */}
                    <div className="lg:w-64 shrink-0 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Merchant Policy Gate
                        </div>
                        <p className="text-[11px] text-slate-600 mb-3">
                          {isApproved
                            ? "Action deployed. The buyer agent will offer this upgrade when trigger criteria are met."
                            : isRejected
                            ? "Action withheld by merchant."
                            : "Approval required before the buyer agent can offer this promotion."}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleOpportunityAction(opp.id, "APPROVE")}
                              disabled={actionLoading === opp.id}
                              className="flex-1 inline-flex items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve Policy</span>
                            </button>
                            <button
                              onClick={() => handleOpportunityAction(opp.id, "REJECT")}
                              disabled={actionLoading === opp.id}
                              className="inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 px-3 py-2 text-xs font-semibold text-slate-600 transition disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : isApproved ? (
                          <button
                            onClick={() => handleOpportunityAction(opp.id, "REJECT")}
                            disabled={actionLoading === opp.id}
                            className="w-full inline-flex items-center justify-center space-x-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                          >
                            <span>Deactivate Policy</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpportunityAction(opp.id, "APPROVE")}
                            disabled={actionLoading === opp.id}
                            className="w-full inline-flex items-center justify-center space-x-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition"
                          >
                            <span>Re-Approve Policy</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
