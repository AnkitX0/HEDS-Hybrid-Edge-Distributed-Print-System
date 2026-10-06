"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pause,
  Play,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  X,
} from "lucide-react";

import { Sidebar, type NavTab } from "@/components/layout/Sidebar";
import { OverviewView } from "@/components/views/OverviewView";
import { QueueView } from "@/components/views/QueueView";
import { OrdersView } from "@/components/views/OrdersView";
import { PrintersView } from "@/components/views/PrintersView";
import { AgentsView } from "@/components/views/AgentsView";
import { PricingView } from "@/components/views/PricingView";
import { AuditLogsView } from "@/components/views/AuditLogsView";
import { QrView } from "@/components/views/QrView";
import { SettingsView } from "@/components/views/SettingsView";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function ShopDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NavTab>("overview");

  // Operator user metadata
  const [operatorEmail, setOperatorEmail] = useState("operator@campus-xerox.local");
  const [userRole, setUserRole] = useState("SHOP_OPERATOR");

  // Modal states
  const [pickupModalOrder, setPickupModalOrder] = useState<any | null>(null);
  const [pickupOtpInput, setPickupOtpInput] = useState("");
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);

  const [reconcileModalJob, setReconcileModalJob] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("heds_token");
    if (!token) {
      router.push("/");
    }
    const role = localStorage.getItem("heds_user_role");
    if (role) setUserRole(role);
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
        router.push("/");
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
    refetchInterval: 2500,
  });

  const {
    data: orders = [],
    refetch: refetchOrders,
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ["shop-orders"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/orders", { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "orders",
  });

  const {
    data: printers = [],
    refetch: refetchPrinters,
    isLoading: isLoadingPrinters,
  } = useQuery({
    queryKey: ["shop-printers"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/printers", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "printers" || activeTab === "overview",
    refetchInterval: 4000,
  });

  const {
    data: agents = [],
    refetch: refetchAgents,
    isLoading: isLoadingAgents,
  } = useQuery({
    queryKey: ["shop-agents"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/agents", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "agents",
    refetchInterval: 5000,
  });

  const {
    data: auditLogs = [],
    refetch: refetchAudit,
    isLoading: isLoadingAudit,
  } = useQuery({
    queryKey: ["shop-audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/audit-logs", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "audit",
  });

  const {
    data: pricingRules = [],
    refetch: refetchPricing,
    isLoading: isLoadingPricing,
  } = useQuery({
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
    setIsConfirmingPickup(true);
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
    } finally {
      setIsConfirmingPickup(false);
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

  const handleUpdatePricingRule = async (
    ruleId: string,
    payload: {
      bw_per_page_cents: number;
      color_per_page_cents: number;
      duplex_discount_cents: number;
      minimum_order_cents: number;
    }
  ) => {
    const res = await fetch(`/api/v1/shop/pricing/${ruleId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.detail || "Failed to update pricing rule");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("heds_token");
    localStorage.removeItem("heds_user_role");
    router.push("/");
  };

  const stats = dashboardData?.stats || {
    active_jobs: 0,
    waiting_jobs: 0,
    completed_today: 0,
    failed_jobs: 0,
    revenue_formatted: "₹0.00",
    online_printers: 0,
    total_printers: 0,
    total_agents: 0,
  };

  const shopName = dashboardData?.shop?.name || "Campus Xerox & Print Hub";
  const shopSlug = dashboardData?.shop?.slug || "campus-xerox";
  const isQueuePaused = !!dashboardData?.shop?.is_queue_paused;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        shopName={shopName}
        operatorName={operatorEmail}
        onLogout={handleLogout}
        waitingQueueCount={stats.waiting_jobs}
      />

      {/* Main Operational Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Operational Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200 capitalize">
              {activeTab === "overview"
                ? "Operational Overview"
                : activeTab === "queue"
                ? "Active Dispatch Queue"
                : activeTab === "orders"
                ? "Orders Ledger"
                : activeTab === "printers"
                ? "Printers Fleet"
                : activeTab === "agents"
                ? "Edge Agents"
                : activeTab === "pricing"
                ? "Pricing Engine"
                : activeTab === "audit"
                ? "Audit Trail"
                : activeTab === "qr"
                ? "Student Storefront QR"
                : "Shop Settings"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={isQueuePaused ? "primary" : "secondary"}
              size="sm"
              onClick={handleTogglePause}
              className="flex items-center gap-1.5 text-xs h-8"
            >
              {isQueuePaused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Queue</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Intake</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-5">
          {/* Action Notification Banner */}
          {actionMessage && (
            <div className="p-3 bg-blue-950/70 border border-blue-800/80 rounded-md text-xs text-blue-200 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VIEW SWITCHER */}
          {activeTab === "overview" && (
            <OverviewView
              stats={stats}
              queueItems={queueItems}
              printers={printers}
              onNavigate={setActiveTab}
              onVerifyOtp={(item) => {
                setPickupModalOrder(item);
                setPickupOtpInput("");
                setPickupError(null);
              }}
              onRetry={handleRetryJob}
            />
          )}

          {activeTab === "queue" && (
            <QueueView
              queueItems={queueItems}
              onVerifyOtp={(item) => {
                setPickupModalOrder(item);
                setPickupOtpInput("");
                setPickupError(null);
              }}
              onRetry={handleRetryJob}
              onCancel={handleCancelJob}
              onReconcile={(job) => setReconcileModalJob(job)}
              onRefresh={refetchQueue}
            />
          )}

          {activeTab === "orders" && (
            <OrdersView
              orders={orders}
              isLoading={isLoadingOrders}
              onRefresh={refetchOrders}
            />
          )}

          {activeTab === "printers" && (
            <PrintersView
              printers={printers}
              isLoading={isLoadingPrinters}
              onRefresh={refetchPrinters}
            />
          )}

          {activeTab === "agents" && (
            <AgentsView
              agents={agents}
              isLoading={isLoadingAgents}
              onRefresh={refetchAgents}
            />
          )}

          {activeTab === "pricing" && (
            <PricingView
              rules={pricingRules}
              isLoading={isLoadingPricing}
              onRefresh={refetchPricing}
              onUpdateRule={handleUpdatePricingRule}
            />
          )}

          {activeTab === "audit" && (
            <AuditLogsView
              logs={auditLogs}
              isLoading={isLoadingAudit}
              onRefresh={refetchAudit}
            />
          )}

          {activeTab === "qr" && (
            <QrView shopSlug={shopSlug} shopName={shopName} />
          )}

          {activeTab === "settings" && (
            <SettingsView
              shopName={shopName}
              shopSlug={shopSlug}
              isQueuePaused={isQueuePaused}
              onTogglePause={handleTogglePause}
              operatorEmail={operatorEmail}
              userRole={userRole}
            />
          )}
        </main>
      </div>

      {/* PRIVACY HOLD OTP VERIFICATION MODAL */}
      {pickupModalOrder && (
        <Modal
          isOpen={true}
          onClose={() => setPickupModalOrder(null)}
          title="Verify Student Pickup Code"
          description={`Enter the 6-digit verification code provided by the student for Order ${pickupModalOrder.order_number}.`}
        >
          <div className="space-y-4 pt-1">
            {pickupError && (
              <div className="p-2.5 bg-red-950/60 border border-red-800 rounded text-xs text-red-300">
                {pickupError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block text-center">
                6-Digit Pickup Code
              </label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={pickupOtpInput}
                onChange={(e) => setPickupOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="482913"
                className="w-full text-center tracking-widest font-mono text-2xl py-2.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 block mb-0.5">Privacy Invariant</span>
              Once confirmed, the order will mark as COMPLETED and document retention schedule begins.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickupModalOrder(null)}
                disabled={isConfirmingPickup}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmPickup}
                disabled={pickupOtpInput.length < 6 || isConfirmingPickup}
                className="flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isConfirmingPickup ? "Verifying..." : "Confirm & Release"}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* RECONCILE AMBIGUOUS PRINT MODAL */}
      {reconcileModalJob && (
        <Modal
          isOpen={true}
          onClose={() => setReconcileModalJob(null)}
          title="Reconcile Ambiguous Print Job"
          description={`Physical print status for ${reconcileModalJob.order_number} is ambiguous. Operator must inspect the physical tray before deciding.`}
        >
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded text-xs text-amber-300 space-y-1">
              <span className="font-semibold block">Physical Paper Invariant</span>
              <p className="text-[11px] text-amber-400/90">
                Automatic retry is strictly prohibited to avoid paper wastage and privacy leaks. Inspect printer output tray.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReconcileDecision("MARK_COMPLETED")}
                className="w-full justify-center flex items-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Physical Paper Printed (Mark Pickup Ready)</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReconcileDecision("RETRY_PRINT")}
                className="w-full justify-center flex items-center gap-2 text-amber-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>No Paper Printed (Re-enqueue Job)</span>
              </Button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReconcileModalJob(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
