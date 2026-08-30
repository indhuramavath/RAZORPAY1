"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
  Layers,
  Check,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 rounded-full bg-blue-100/70 border border-blue-200 px-3.5 py-1 text-xs font-bold text-blue-800 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>RAZORPAY AI BUILDATHON — TRACK 1</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            RazorGrow AI
          </h1>
          <p className="mt-3 text-xl text-blue-600 font-semibold">
            The Autonomous Agentic Commerce Engine for Razorpay
          </p>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Closing the loop between <strong>Merchant Revenue Intelligence</strong> and{" "}
            <strong>AI-Native Buyer Checkout</strong> with deterministic financial safety, bounded agentic workflows, and explainable money actions.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/merchant"
              className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Launch Merchant Copilot</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/shop"
              className="inline-flex items-center space-x-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition"
            >
              <Bot className="h-4 w-4" />
              <span>Open AI Buyer Storefront</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/audit"
              className="inline-flex items-center space-x-2 rounded-xl bg-white border border-slate-300 px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Inspect Live Audit Trail</span>
            </Link>
          </div>
        </div>

        {/* 5-Minute Evaluator Demo Script Box */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-12 border border-blue-800">
          <div className="flex items-center space-x-2 mb-3">
            <span className="bg-emerald-500 text-slate-950 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">
              Evaluator Quick Guide
            </span>
            <span className="text-blue-200 text-xs font-semibold">Recommended 3-Step Demo Walkthrough</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">How to Evaluate the Closed-Loop System in 3 Minutes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <div className="flex items-center space-x-2 font-bold text-sm text-blue-200 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs">1</span>
                <span>Discover & Gate Policy</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Open <strong>Merchant Copilot</strong>. Notice the AI detected a 38.2% affinity between laptops and mechanical keyboards. Click <strong>Approve Policy</strong> to activate the bounded promotion.
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <div className="flex items-center space-x-2 font-bold text-sm text-blue-200 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs">2</span>
                <span>AI Conversational Shopping</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Open <strong>AI Buyer Storefront</strong>. Click the preset prompt <em>"I need a laptop setup for college under ₹70,000"</em>. The agent parses budget, searches catalog, and attaches the approved keyboard.
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <div className="flex items-center space-x-2 font-bold text-sm text-blue-200 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs">3</span>
                <span>Gated Razorpay Checkout</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Click <strong>Proceed to Checkout</strong>. Verify that customer confirmation is required before Razorpay test payment launches. Then view the complete immutable trace in <strong>Audit Trail</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Key Architectural Differentiators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4 font-bold">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Closed-Loop Revenue Loop</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Merchant intelligence detects high-affinity opportunities $\rightarrow$ Human merchant approves bounded rule $\rightarrow$ Buyer agent executes recommendation at checkout $\rightarrow$ Revenue attribution logged.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 font-bold">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Bounded Financial Safety</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The LLM proposes actions, but the deterministic Policy Engine strictly enforces limits, customer confirmation gates, price locks, idempotency locks, and HMAC-SHA256 signature verification.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-4 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Immutable Auditability</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every customer intent, LLM tool execution, risk score, merchant approval, and Razorpay payment attempt is permanently recorded in structured audit logs.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-4 font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Agent-Readable Catalog</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Structured catalog with technical specifications, compatibility graphs, upsell relationships, inventory tracking, and merchant policies for reliable AI tool querying.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 mb-4 font-bold">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Graceful Failure Recovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simulates realistic payment failures (card decline, gateway timeout). The agent preserves cart state, prevents duplicate charges via idempotency keys, and guides user recovery.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Zero-Config Portability</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Built on Next.js 15, Prisma with SQLite default, and dual-mode AI engine (Gemini API + deterministic fallback) ensuring 100% reproducible evaluation on any machine.
            </p>
          </div>
        </div>

        {/* Evaluation Bar Checklist */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Razorpay Buildathon Evaluation Bar Alignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
            <div className="flex items-start space-x-2.5">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Real Working Product:</strong> Full end-to-end multi-turn conversational shopping, cart builder, and Razorpay test checkout.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Meaningful AI:</strong> Semantic intent extraction, compatibility matching, affinity scoring, and explainable recommendations.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Razorpay Test APIs:</strong> Server-side order creation, standard checkout popup, HMAC-SHA256 signature verification.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Bounded & Gated:</strong> Customer confirmation required before payment; Merchant approval required for promotions.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Full Audit Trail:</strong> Structured log of every actor, tool call, input/output payload, risk score, and payment attempt.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Failure Handling:</strong> Built-in simulated gateway decline with cart retention and zero duplicate order creation.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
