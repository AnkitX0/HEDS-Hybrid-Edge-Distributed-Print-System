"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SidebarLayout, TabType } from "@/components/layout/SidebarLayout";
import { OverviewView } from "@/components/views/OverviewView";
import { QueueView } from "@/components/views/QueueView";
import { OrdersView } from "@/components/views/OrdersView";
import { PickupView } from "@/components/views/PickupView";
import { PrintersView } from "@/components/views/PrintersView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { PaymentsView } from "@/components/views/PaymentsView";
import { PricingView } from "@/components/views/PricingView";
import { AuditLogsView } from "@/components/views/AuditLogsView";
import { ShopQRView } from "@/components/views/ShopQRView";
import { SettingsView } from "@/components/views/SettingsView";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export default function ShopDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const [pickupModalOrder, setPickupModalOrder] = useState<any | null>(null);
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
    enabled: activeTab === "printers" || activeTab === "overview",
    refetchInterval: 4000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["shop-agents"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shop/agents", { headers: getAuthHeaders() });
      return res.json();
    },
    enabled: activeTab === "printers" || activeTab === "overview",
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

  // Actions
  const handleConfirmPickupDirect = async (orderId: string, orderNumber: string) => {
    try {
      const res = await fetch("/api/v1/pickups/confirm", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          order_id: orderId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to confirm pickup");
      }
      setActionMessage(`Order ${orderNumber} marked as collected.`);
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      setActionMessage(err.message || "Failed to mark order as collected");
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

  const handleSimulateCompleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/dev/jobs/${jobId}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        // Fallback to standard dev status update if endpoint differs
        await fetch(`/api/v1/dev/complete-next-job`, { method: "POST", headers: getAuthHeaders() });
      }
      setActionMessage("Demo print completion triggered.");
      refetchQueue();
      refetchDashboard();
    } catch (err: any) {
      console.error(err);
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

  const onlinePrinters = printers.filter((p: any) => p.status === "ONLINE").length || 2;
  const totalPrinters = printers.length || 3;

  return (
    <SidebarLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      shopData={dashboardData?.shop}
      onlinePrintersCount={onlinePrinters}
      totalPrintersCount={totalPrinters}
      onLogout={handleLogout}
      searchQuery={globalSearchQuery}
      onSearchChange={(q) => setGlobalSearchQuery(q)}
      actionMessage={actionMessage}
      onDismissMessage={() => setActionMessage(null)}
    >
      {activeTab === "overview" && (
        <OverviewView
          dashboardData={dashboardData}
          queueItems={queueItems}
          printers={printers}
          onNavigateTab={(tab) => setActiveTab(tab as TabType)}
          onMarkCollected={(item) => handleConfirmPickupDirect(item.order_id || item.id, item.order_number)}
          onSimulateCompleteJob={handleSimulateCompleteJob}
        />
      )}

      {activeTab === "queue" && (
        <QueueView
          queueItems={queueItems}
          printers={printers}
          onMarkCollected={(item) => handleConfirmPickupDirect(item.order_id || item.id, item.order_number)}
          onOpenReconcileModal={(item) => setReconcileModalJob(item)}
          onRetryJob={handleRetryJob}
          onCancelJob={handleCancelJob}
        />
      )}

      {activeTab === "orders" && <OrdersView orders={queueItems} />}

      {activeTab === "pickup" && (
        <PickupView
          queueItems={queueItems}
          onConfirmPickup={handleConfirmPickupDirect}
        />
      )}

      {activeTab === "printers" && <PrintersView printers={printers} agents={agents} />}
      {activeTab === "analytics" && <AnalyticsView stats={dashboardData?.stats} queueItems={queueItems} />}
      {activeTab === "payments" && <PaymentsView queueItems={queueItems} />}
      {activeTab === "pricing" && <PricingView pricingRules={pricingRules} />}
      {activeTab === "audit" && <AuditLogsView auditLogs={auditLogs} />}
      {activeTab === "qr" && (
        <ShopQRView shopSlug={dashboardData?.shop?.slug} shopName={dashboardData?.shop?.name} />
      )}
      {activeTab === "settings" && <SettingsView shopData={dashboardData?.shop} />}

      {/* RECONCILE MODAL */}
      <Modal
        isOpen={!!reconcileModalJob}
        onClose={() => setReconcileModalJob(null)}
        title="Reconcile Physical Print Execution"
        description={`Job ${reconcileModalJob?.order_number} experienced an ambiguous print lease state. Inspect physical printer tray.`}
        maxWidth="md"
      >
        <div className="space-y-3 py-1">
          <Button
            variant="primary"
            className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleReconcileDecision("MARK_COMPLETED")}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Paper Printed Correctly (Mark Pickup Ready)</span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-slate-800"
            onClick={() => handleReconcileDecision("RETRY_PRINT")}
          >
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <span>Paper Did Not Print (Re-enqueue Print Dispatch)</span>
          </Button>
        </div>
      </Modal>
    </SidebarLayout>
  );
}
