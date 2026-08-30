"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Bot,
  User,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface AuditEntry {
  id: string;
  actor: "BUYER" | "MERCHANT" | "AGENT" | "SYSTEM";
  actorType: "HUMAN" | "LLM" | "WORKER";
  sessionId?: string;
  orderId?: string;
  action: string;
  toolName?: string;
  inputState?: any;
  outputState?: any;
  riskScore?: number;
  decision: "ALLOWED" | "BLOCKED" | "GATED_APPROVED" | "GATED_REJECTED";
  ipAddress?: string;
  createdAt: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActor, setSelectedActor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = selectedActor !== "ALL" ? `/api/audit?actor=${selectedActor}` : "/api/audit";
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedActor]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.toolName && l.toolName.toLowerCase().includes(q)) ||
      (l.orderId && l.orderId.toLowerCase().includes(q)) ||
      (l.sessionId && l.sessionId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compliance & Safety Audit Trail</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Immutable ledger of agent tool calls, financial guardrail decisions, merchant gating, and Razorpay settlements.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh Trail</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "AGENT", "MERCHANT", "BUYER", "SYSTEM"].map((actor) => (
              <button
                key={actor}
                onClick={() => setSelectedActor(actor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selectedActor === actor
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {actor}
              </button>
            ))}
          </div>

          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, tools, or orders..."
              className="w-full rounded-lg bg-white border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {loading ? "Loading audit trail..." : "No matching audit log entries found."}
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                const isAllowed = log.decision === "ALLOWED" || log.decision === "GATED_APPROVED";
                const isBlocked = log.decision === "BLOCKED" || log.decision === "GATED_REJECTED";

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-50/70 transition">
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs ${
                            log.actor === "AGENT"
                              ? "bg-blue-600"
                              : log.actor === "MERCHANT"
                              ? "bg-purple-600"
                              : log.actor === "BUYER"
                              ? "bg-slate-800"
                              : "bg-amber-600"
                          }`}
                        >
                          {log.actor === "AGENT" ? (
                            <Bot className="h-4 w-4" />
                          ) : log.actor === "MERCHANT" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : log.actor === "BUYER" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Cpu className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{log.action}</span>
                            {log.toolName && (
                              <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-mono text-slate-700">
                                {log.toolName}()
                              </span>
                            )}
                            <span
                              className={`rounded px-2 py-0.2 text-[10px] font-extrabold uppercase ${
                                log.decision === "ALLOWED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : log.decision === "GATED_APPROVED"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {log.decision}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>Actor: {log.actor} ({log.actorType})</span>
                            {log.orderId && <span>Order: #{log.orderId.substring(0, 8)}...</span>}
                            <span>Risk Score: {log.riskScore !== undefined ? log.riskScore.toFixed(2) : "0.00"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-right">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString("en-IN")}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded JSON State Inspector */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 rounded-lg p-3 text-xs font-mono animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Input State / Arguments
                            </span>
                            <pre className="p-2.5 rounded bg-slate-900 text-slate-100 text-[11px] overflow-x-auto max-h-48">
                              {JSON.stringify(log.inputState || {}, null, 2)}
                            </pre>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Output State / Policy Evaluation
                            </span>
                            <pre className="p-2.5 rounded bg-slate-900 text-slate-100 text-[11px] overflow-x-auto max-h-48">
                              {JSON.stringify(log.outputState || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
