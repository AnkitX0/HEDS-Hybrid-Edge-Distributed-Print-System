"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Printer,
  Cpu,
  Clock,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Pause,
  Play,
  LogOut,
  QrCode,
  Tag,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function ShopDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"queue" | "printers" | "agents" | "pricing" | "audit" | "qr">("queue");

  // Modal states
  const [pickupModalOrder, setPickupModalOrder] = useState<any | null>(null);
  const [pickupOtpInput, setPickupOtpInput] = useState("");
  const [pickupError, setPickupError] = useState<string | null>(null);

  const [reconcileModalJob, setReconcileModalJob] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("heds_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("heds_token") : "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Queries
  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ["shop-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/dashboard", { headers: getAuthHeaders() });
      if (res.status === 401) {
        router.push("/login");
        throw new Error("Unauthorized");
      }
      return res.json();
    },
    refetchInterval: 3000,
  });

  const { data: queueItems = [], refetch: refetchQueue } = useQuery({
    queryKey: ["shop-queue"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/queue", { headers: getAuthHeaders() });
      return res.json();
    },
    refetchInterval: 2000,
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["shop-printers"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/printers", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "printers",
    refetchInterval: 4000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["shop-agents"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/agents", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "agents",
    refetchInterval: 5000,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["shop-audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/audit-logs", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "audit",
  });

  const { data: pricingRules = [] } = useQuery({
    queryKey: ["shop-pricing"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/pricing", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "pricing",
  });

  // Action mutations
  const handleTogglePause = async () => {
    try {
      await fetch("/api/v1/shop/queue/toggle-pause", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      refetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/retry`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Retry failed");
      setActionMessage("Job re-enqueued for print dispatch.");
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Cancel failed");
      setActionMessage("Job cancelled.");
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message);
    }
  };

  const handleConfirmPickup = async () => {
    if (!pickupModalOrder || !pickupOtpInput) return;
    setPickupError(null);
    try {
      const res = await fetch("/api/v1/pickups/confirm", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          order_id: pickupModalOrder.order_id,
          otp: pickupOtpInput.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Invalid OTP code");
      }
      setPickupModalOrder(null);
      setPickupOtpInput("");
      setActionMessage(`Order ${pickupModalOrder.order_number} confirmed and completed.`);
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setPickupError(err.message || "Failed to confirm pickup");
    }
  };

  const handleReconcileDecision = async (decision: string) => {
    if (!reconcileModalJob) return;
    try {
      const res = await fetch(`/api/v1/jobs/${reconcileModalJob.job_id}/reconcile`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error("Reconciliation failed");
      setReconcileModalJob(null);
      setActionMessage(`Job resolved with decision: ${decision}`);
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("heds_token");
    localStorage.removeItem("heds_user_role");
    router.push("/login");
  };

  const stats = dashboardData?.stats || {
    active_jobs: 0,
    waiting_jobs: 0,
    completed_today: 0,
    failed_jobs: 0,
    revenue_formatted: "₹0.00",
    online_printers: 0,
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
            H
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">
              {dashboardData?.shop?.name || "Campus Xerox & Print Hub"}
            </h1>
            <p className="text-[11px] text-slate-400">HEDS Edge Orchestration Console</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={handleTogglePause}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
              dashboardData?.shop?.is_queue_paused
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
            }`}
          >
            {dashboardData?.shop?.is_queue_paused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Queue</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Queue</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast / Notification Banner */}
        {actionMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="font-bold text-emerald-400">
              &times;
            </button>
          </div>
        )}

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">In Queue</span>
            <span className="text-2xl font-bold text-amber-400">{stats.waiting_jobs}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Waiting for dispatch</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Spooling</span>
            <span className="text-2xl font-bold text-blue-400">{stats.active_jobs}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Physical printing active</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Completed</span>
            <span className="text-2xl font-bold text-emerald-400">{stats.completed_today}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Printed today</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Failed / Reconciling</span>
            <span className="text-2xl font-bold text-rose-400">{stats.failed_jobs}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Requires operator review</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Printers Online</span>
            <span className="text-2xl font-bold text-purple-400">{stats.online_printers}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Mock & CUPS adapters</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Revenue</span>
            <span className="text-2xl font-bold text-white">{stats.revenue_formatted}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Total collected today</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("queue")}
            className={`pb-3 flex items-center space-x-1.5 transition-colors ${
              activeTab === "queue"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Queue ({queueItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("printers")}
            className={`pb-3 flex items-center space-x-1.5 transition-colors ${
              activeTab === "printers"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printers</span>
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`pb-3 flex items-center space-x-1.5 transition-colors ${
              activeTab === "agents"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Edge Agents</span>
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`pb-3 flex items-center space-x-1.5 transition-colors ${
              activeTab === "pricing"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Pricing Rules</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 flex items-center space-x-1.5 transition-colors ${
              activeTab === "audit"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`pb-3 flex items-center space-x-1.5 transition-colors ${
              activeTab === "qr"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Shop QR</span>
          </button>
        </div>

        {/* TAB 1: ACTIVE QUEUE TABLE */}
        {activeTab === "queue" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Pages / Spec</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Printer / Agent</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {queueItems.map((item: any) => {
                    const isPickupReady = item.order_status === "PICKUP_READY";
                    const isFailed = item.status === "FAILED";
                    const isReconciling = item.status === "RECONCILING";

                    return (
                      <tr key={item.job_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-slate-200 block">
                            {item.order_number}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.created_at).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px] font-medium text-slate-300">
                              {item.document_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-300">
                            {item.pages} pgs &bull; {item.copies}x
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.color_mode} &bull; {item.duplex ? "Duplex" : "1-sided"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-200">
                          ₹{(item.total_amount_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-300 truncate max-w-[140px]">{item.printer_name}</div>
                          <div className="text-[10px] text-slate-500">{item.agent_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                              item.status === "COMPLETED"
                                ? isPickupReady
                                  ? "bg-purple-950 text-purple-300 border border-purple-800 animate-pulse"
                                  : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : item.status === "PRINTING"
                                ? "bg-blue-950 text-blue-300 border border-blue-800"
                                : item.status === "QUEUED"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : item.status === "FAILED"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-orange-950 text-orange-300 border border-orange-800"
                            }`}
                          >
                            {isPickupReady ? "PICKUP_READY" : item.status}
                          </span>
                          {item.error_message && (
                            <span className="block text-[10px] text-rose-400 truncate max-w-[120px] mt-0.5">
                              {item.error_message}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {isPickupReady && (
                            <button
                              onClick={() => {
                                setPickupModalOrder(item);
                                setPickupOtpInput("");
                                setPickupError(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-sm"
                            >
                              Verify OTP
                            </button>
                          )}

                          {isFailed && (
                            <button
                              onClick={() => handleRetryJob(item.job_id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg font-semibold"
                            >
                              Retry
                            </button>
                          )}

                          {isReconciling && (
                            <button
                              onClick={() => setReconcileModalJob(item)}
                              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold"
                            >
                              Reconcile
                            </button>
                          )}

                          {item.status === "QUEUED" && (
                            <button
                              onClick={() => handleCancelJob(item.job_id)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PRINTER DASHBOARD */}
        {activeTab === "printers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((p: any) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400">Adapter: {p.adapter_type} &bull; Agent: {p.agent_name || "None"}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.status === "ONLINE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : p.status === "BUSY"
                        ? "bg-blue-950 text-blue-300 border border-blue-800"
                        : p.status === "ERROR"
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {p.last_error && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                    Error: {p.last_error}
                  </p>
                )}

                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span>Supported Media: {p.capabilities?.paper_sizes?.join(", ") || "A4"}</span>
                  <span>{p.capabilities?.color ? "Color & B/W" : "Monochrome Only"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: EDGE AGENTS */}
        {activeTab === "agents" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((a: any) => (
              <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">{a.name}</h3>
                    <p className="text-xs text-slate-400">Host: {a.hostname} &bull; OS: {a.os_info}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      a.status === "ONLINE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-300 border border-rose-800"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 space-y-1">
                  <p>Software Version: v{a.version}</p>
                  <p>Printers Attached: {a.printer_count}</p>
                  <p>Last Heartbeat: {a.last_heartbeat_at ? new Date(a.last_heartbeat_at).toLocaleTimeString() : "Never"}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PRICING RULES */}
        {activeTab === "pricing" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white">Active Shop Pricing Rules</h3>
            <div className="divide-y divide-slate-800">
              {pricingRules.map((rule: any) => (
                <div key={rule.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-200">{rule.name} ({rule.paper_size})</p>
                    <p className="text-slate-400 mt-0.5">
                      B/W: ₹{(rule.bw_per_page_cents / 100).toFixed(2)} / page &bull; Color: ₹{(rule.color_per_page_cents / 100).toFixed(2)} / page
                    </p>
                  </div>
                  <div className="text-right text-slate-300">
                    <p>Duplex Discount: ₹{(rule.duplex_discount_cents / 100).toFixed(2)} / sheet</p>
                    <p className="text-slate-500 text-[10px]">Min Order: ₹{(rule.minimum_order_cents / 100).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {auditLogs.slice(0, 30).map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-400">
                      {new Date(l.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-200">{l.action}</td>
                    <td className="px-4 py-2.5 text-slate-300">{l.actor_type}</td>
                    <td className="px-4 py-2.5 text-slate-400">{l.resource_type} ({l.resource_id?.slice(0, 8)})</td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[200px]">
                      {JSON.stringify(l.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: SHOP QR DESTINATION */}
        {activeTab === "qr" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md mx-auto text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-white">Shop Student Portal URL</h3>
            <p className="text-xs text-slate-400">
              Students scanning this QR code are automatically directed to your shop without logging in.
            </p>
            <div className="p-3 bg-slate-950 rounded-lg font-mono text-xs text-emerald-400 border border-slate-800 break-all select-all">
              http://localhost:3000/s/{dashboardData?.shop?.slug || "campus-xerox"}
            </div>
          </div>
        )}
      </main>

      {/* PRIVACY HOLD OTP VERIFICATION MODAL */}
      {pickupModalOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Confirm Student Pickup</h3>
            </div>
            <p className="text-xs text-slate-300">
              Enter the 6-digit pickup code displayed on the student&apos;s phone for order{" "}
              <span className="font-mono font-bold text-emerald-400">{pickupModalOrder.order_number}</span>.
            </p>

            {pickupError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
                {pickupError}
              </div>
            )}

            <input
              type="text"
              autoFocus
              maxLength={6}
              value={pickupOtpInput}
              onChange={(e) => setPickupOtpInput(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 482913"
              className="w-full text-center tracking-widest font-mono text-2xl py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            />

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPickupModalOrder(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPickup}
                disabled={pickupOtpInput.length < 6}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                Confirm Pickup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILE MODAL */}
      {reconcileModalJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Reconcile Ambiguous Print</h3>
            </div>
            <p className="text-xs text-slate-300">
              Physical execution for Job <span className="font-mono text-amber-400">{reconcileModalJob.order_number}</span> was interrupted. Please inspect the printer output tray.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleReconcileDecision("MARK_COMPLETED")}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Paper Printed (Mark Ready for Pickup)</span>
              </button>
              <button
                onClick={() => handleReconcileDecision("RETRY_PRINT")}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Paper Did Not Print (Re-enqueue)</span>
              </button>
              <button
                onClick={() => setReconcileModalJob(null)}
                className="w-full py-2 bg-slate-900 text-slate-400 text-xs hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
