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
import { PickupView } from "@/components/views/PickupView";
import { PaymentsView } from "@/components/views/PaymentsView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { apiClient, ApiError } from "@/lib/api/client";

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

  const [isRunningDemo, setIsRunningDemo] = useState(false);

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("heds_token");
    if (!token) {
      router.push("/login");
    }
    const role = localStorage.getItem("heds_user_role");
    if (role) setUserRole(role);
    const savedShop = localStorage.getItem("heds_active_shop_id");
    if (savedShop) setSelectedShopId(savedShop);
  }, [router]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("heds_token") : "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (selectedShopId) {
      headers["X-Shop-ID"] = selectedShopId;
    }
    return headers;
  };

  // 0. Operator Authorized Shops
  const { data: operatorShops = [] } = useQuery({
    queryKey: ["operator-shops"],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/operator/shops", { headers: getAuthHeaders() });
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        }
        return [];
      }
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (operatorShops.length > 0 && !selectedShopId) {
      const saved = localStorage.getItem("heds_active_shop_id");
      const matched = operatorShops.find((s: any) => s.id === saved);
      const chosen = matched ? matched.id : operatorShops[0].id;
      setSelectedShopId(chosen);
      localStorage.setItem("heds_active_shop_id", chosen);
    }
  }, [operatorShops, selectedShopId]);

  // Queries scoped to selectedShopId
  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ["shop-dashboard", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any>("/api/v1/shop/dashboard", { headers: getAuthHeaders() });
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          throw new Error("Unauthorized");
        }
        throw err;
      }
    },
    refetchInterval: 3000,
  });

  const { data: queueItems = [], refetch: refetchQueue } = useQuery({
    queryKey: ["shop-queue", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/shop/queue", { headers: getAuthHeaders() });
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        }
        return [];
      }
    },
    refetchInterval: 2500,
  });

  const {
    data: orders = [],
    refetch: refetchOrders,
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ["shop-orders", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/shop/orders", { headers: getAuthHeaders() });
      } catch {
        return [];
      }
    },
    enabled: activeTab === "orders" || activeTab === "payments" || activeTab === "analytics",
  });

  const {
    data: printers = [],
    refetch: refetchPrinters,
    isLoading: isLoadingPrinters,
  } = useQuery({
    queryKey: ["shop-printers", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/shop/printers", { headers: getAuthHeaders() });
      } catch {
        return [];
      }
    },
    enabled: activeTab === "printers" || activeTab === "overview",
    refetchInterval: 4000,
  });

  const {
    data: agents = [],
    refetch: refetchAgents,
    isLoading: isLoadingAgents,
  } = useQuery({
    queryKey: ["shop-agents", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/shop/agents", { headers: getAuthHeaders() });
      } catch {
        return [];
      }
    },
    enabled: activeTab === "agents" || activeTab === "overview",
    refetchInterval: 5000,
  });

  const {
    data: auditLogs = [],
    refetch: refetchAudit,
    isLoading: isLoadingAudit,
  } = useQuery({
    queryKey: ["shop-audit-logs", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/shop/audit-logs", { headers: getAuthHeaders() });
      } catch {
        return [];
      }
    },
    enabled: activeTab === "audit" || activeTab === "overview",
    refetchInterval: 4000,
  });

  const {
    data: pricingRules = [],
    refetch: refetchPricing,
    isLoading: isLoadingPricing,
  } = useQuery({
    queryKey: ["shop-pricing", selectedShopId],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>("/api/v1/shop/pricing", { headers: getAuthHeaders() });
      } catch {
        return [];
      }
    },
    enabled: activeTab === "pricing",
  });


  // Action mutations
  const handleTogglePause = async () => {
    try {
      await apiClient.post("/api/v1/shop/queue/toggle-pause", {}, {
        headers: getAuthHeaders(),
      });
      refetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiClient.post(`/api/v1/jobs/${jobId}/retry`, {}, {
        headers: getAuthHeaders(),
      });
      setActionMessage("Job re-enqueued for print dispatch.");
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message || "Retry failed");
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await apiClient.post(`/api/v1/jobs/${jobId}/cancel`, {}, {
        headers: getAuthHeaders(),
      });
      setActionMessage("Job cancelled.");
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message || "Cancel failed");
    }
  };

  const handleRunDemoPrint = async () => {
    setIsRunningDemo(true);
    try {
      const data = await apiClient.post<any>("/api/v1/dev/demo-print", {}, {
        headers: getAuthHeaders(),
      });
      setActionMessage(`⚡ Demo print triggered: Order ${data.order_number} enqueued (${data.amount_formatted}). Live execution running!`);
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message || "Failed to run demo print");
    } finally {
      setIsRunningDemo(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!pickupModalOrder || !pickupOtpInput) return;
    setPickupError(null);
    setIsConfirmingPickup(true);
    try {
      await apiClient.post("/api/v1/pickups/confirm", {
        order_id: pickupModalOrder.order_id,
        otp: pickupOtpInput.trim(),
      }, {
        headers: getAuthHeaders(),
      });
      setPickupModalOrder(null);
      setPickupOtpInput("");
      setActionMessage(`Order ${pickupModalOrder.order_number} confirmed and completed.`);
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setPickupError(err.message || "Failed to confirm pickup. Please verify the OTP code.");
    } finally {
      setIsConfirmingPickup(false);
    }
  };

  const handleReconcileDecision = async (decision: string) => {
    if (!reconcileModalJob) return;
    try {
      await apiClient.post(`/api/v1/jobs/${reconcileModalJob.job_id}/reconcile`, { decision }, {
        headers: getAuthHeaders(),
      });
      setReconcileModalJob(null);
      setActionMessage(`Job resolved with decision: ${decision}`);
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message || "Reconciliation failed");
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
    await apiClient.put(`/api/v1/shop/pricing/${ruleId}`, payload, {
      headers: getAuthHeaders(),
    });
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
    total_printers: 0,
    total_agents: 0,
  };

  const shopName = dashboardData?.shop?.name || "Campus Xerox & Print Hub";
  const shopSlug = dashboardData?.shop?.slug || "campus-xerox";
  const isQueuePaused = !!dashboardData?.shop?.is_queue_paused;

  const pickupReadyCount = queueItems.filter(
    (item: any) => item.order_status === "PICKUP_READY"
  ).length;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        shopName={shopName}
        operatorName={operatorEmail}
        onLogout={handleLogout}
        waitingQueueCount={stats.waiting_jobs}
        pickupReadyCount={pickupReadyCount}
        availableShops={operatorShops}
        selectedShopId={selectedShopId}
        onSelectShop={(id) => {
          setSelectedShopId(id);
          localStorage.setItem("heds_active_shop_id", id);
        }}
      />


      {/* Main Operational Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                {shopName}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                  isQueuePaused
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isQueuePaused ? "PAUSED" : "● OPEN"}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                &bull; {stats.online_printers}/{stats.total_printers} printers online &bull; {stats.active_jobs} printing &bull; {stats.waiting_jobs} waiting
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Run Demo Print dev trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunDemoPrint}
              disabled={isRunningDemo}
              className="flex items-center gap-1.5 text-xs h-8 text-slate-700 border-slate-200 hover:bg-slate-100"
            >
              <span>⚡</span>
              <span>{isRunningDemo ? "Spooling..." : "Demo Print"}</span>
            </Button>

            <Button
              variant={isQueuePaused ? "primary" : "secondary"}
              size="sm"
              onClick={handleTogglePause}
              className="flex items-center gap-1.5 text-xs h-8"
            >
              {isQueuePaused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Intake</span>
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
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Action Notification Banner */}
          {actionMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
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
              agents={agents}
              auditLogs={auditLogs}
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

          {activeTab === "pickup" && (
            <PickupView
              queueItems={queueItems}
              onRefresh={() => {
                refetchQueue();
                refetchDashboard();
              }}
              getAuthHeaders={getAuthHeaders}
            />
          )}

          {activeTab === "orders" && (
            <OrdersView
              orders={orders}
              isLoading={isLoadingOrders}
              onRefresh={refetchOrders}
            />
          )}

          {activeTab === "payments" && (
            <PaymentsView
              orders={orders}
              isLoading={isLoadingOrders}
              onRefresh={refetchOrders}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              stats={stats}
              orders={orders}
              printers={printers}
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
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {pickupError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block text-center">
                6-Digit Pickup Code
              </label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={pickupOtpInput}
                onChange={(e) => setPickupOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="482913"
                className="w-full text-center tracking-widest font-mono text-2xl font-bold py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-inner"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 block mb-0.5">Privacy Invariant</span>
              Once confirmed, the order will mark as COMPLETED and document retention schedule begins.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <span className="font-semibold block">Physical Paper Invariant</span>
              <p className="text-[11px] text-amber-700">
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
                className="w-full justify-center flex items-center gap-2 text-amber-800 border-amber-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>No Paper Printed (Re-enqueue Job)</span>
              </Button>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
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
