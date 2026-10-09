import React, { useState } from "react";
import { Search, FileText, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface QueueViewProps {
  queueItems: any[];
  printers: any[];
  onMarkCollected: (item: any) => Promise<boolean | void> | void;
  onOpenReconcileModal: (item: any) => void;
  onRetryJob: (jobId: string) => Promise<boolean | void> | void;
  onCancelJob: (jobId: string) => Promise<boolean | void> | void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  queueItems,
  printers,
  onMarkCollected,
  onOpenReconcileModal,
  onRetryJob,
  onCancelJob,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("ALL");
  const [selectedPrinter, setSelectedPrinter] = useState<string>("ALL");

  // Track per-item async action state: idle | loading | success | failure
  const [actionStates, setActionStates] = useState<
    Record<string, { status: "idle" | "loading" | "success" | "failure"; message?: string }>
  >({});

  const handleMarkCollectedClick = async (item: any) => {
    const key = item.job_id || item.order_id || item.id;
    if (actionStates[key]?.status === "loading") return; // Prevent double clicks / race conditions

    setActionStates((prev) => ({ ...prev, [key]: { status: "loading" } }));
    try {
      await onMarkCollected(item);
      setActionStates((prev) => ({ ...prev, [key]: { status: "success" } }));
    } catch {
      setActionStates((prev) => ({
        ...prev,
        [key]: { status: "failure", message: "Could not mark this order as collected." },
      }));
      // Reset back to idle after 3 seconds so operator can retry
      setTimeout(() => {
        setActionStates((prev) => ({ ...prev, [key]: { status: "idle" } }));
      }, 3000);
    }
  };

  const handleRetryClick = async (item: any) => {
    const key = item.job_id || item.order_id || item.id;
    if (actionStates[key]?.status === "loading") return;

    setActionStates((prev) => ({ ...prev, [key]: { status: "loading" } }));
    try {
      await onRetryJob(item.job_id);
      setActionStates((prev) => ({ ...prev, [key]: { status: "success" } }));
    } catch {
      setActionStates((prev) => ({
        ...prev,
        [key]: { status: "failure", message: "Could not retry job." },
      }));
      setTimeout(() => {
        setActionStates((prev) => ({ ...prev, [key]: { status: "idle" } }));
      }, 3000);
    }
  };

  const handleCancelClick = async (item: any) => {
    const key = item.job_id || item.order_id || item.id;
    if (actionStates[key]?.status === "loading") return;

    setActionStates((prev) => ({ ...prev, [key]: { status: "loading" } }));
    try {
      await onCancelJob(item.job_id);
      setActionStates((prev) => ({ ...prev, [key]: { status: "success" } }));
    } catch {
      setActionStates((prev) => ({
        ...prev,
        [key]: { status: "failure", message: "Could not cancel job." },
      }));
      setTimeout(() => {
        setActionStates((prev) => ({ ...prev, [key]: { status: "idle" } }));
      }, 3000);
    }
  };

  const filteredItems = queueItems.filter((item) => {
    const matchesSearch =
      item.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.document_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedPrinter !== "ALL" && item.printer_name !== selectedPrinter) return false;

    if (selectedTab === "ALL") return true;
    if (selectedTab === "WAITING") return item.status === "QUEUED";
    if (selectedTab === "PRINTING") return item.status === "PRINTING";
    if (selectedTab === "READY") return item.order_status === "PICKUP_READY" || item.status === "COMPLETED";
    if (selectedTab === "ATTENTION") return item.status === "FAILED" || item.status === "RECONCILING";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Subheader Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Print Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Monitor active, printing, and waiting jobs</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search token or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-white border border-slate-200 rounded pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Printer Filter */}
          <select
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            className="h-8 px-2 text-xs bg-white border border-slate-200 rounded font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Printers</option>
            {printers.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-xs">
        {[
          { id: "ALL", label: "All" },
          { id: "WAITING", label: "Waiting" },
          { id: "PRINTING", label: "Printing" },
          { id: "READY", label: "Ready" },
          { id: "ATTENTION", label: "Attention" },
        ].map((tab) => {
          const isSelected = selectedTab === tab.id;
          const count =
            tab.id === "ALL"
              ? queueItems.length
              : tab.id === "WAITING"
              ? queueItems.filter((i) => i.status === "QUEUED").length
              : tab.id === "PRINTING"
              ? queueItems.filter((i) => i.status === "PRINTING").length
              : tab.id === "READY"
              ? queueItems.filter((i) => i.order_status === "PICKUP_READY" || i.status === "COMPLETED").length
              : queueItems.filter((i) => i.status === "FAILED" || i.status === "RECONCILING").length;

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Queue Table */}
      <Card padding="none">
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Queue is clear"
            description="There are currently no active print jobs matching your criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs table-fixed border-collapse">
              <colgroup>
                <col className="w-[90px]" />
                <col className="w-[230px]" />
                <col className="w-[60px]" />
                <col className="w-[110px]" />
                <col className="w-[130px]" />
                <col className="w-[110px]" />
                <col className="w-[80px]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
                <tr className="h-[40px]">
                  <th className="px-3.5 py-2">Token</th>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Pages</th>
                  <th className="px-3 py-2">Settings</th>
                  <th className="px-3 py-2">Printer</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Wait</th>
                  <th className="px-3.5 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredItems.map((item) => {
                  const key = item.job_id || item.order_id || item.id;
                  const itemState = actionStates[key] || { status: "idle" };

                  const isOrderCollected = item.order_status === "COMPLETED" || itemState.status === "success";
                  const isPickupReady = (item.order_status === "PICKUP_READY" || (item.status === "COMPLETED" && item.order_status !== "COMPLETED")) && !isOrderCollected;
                  const isFailed = item.status === "FAILED";
                  const isReconciling = item.status === "RECONCILING";
                  const isPrinting = item.status === "PRINTING" && !isOrderCollected && !isPickupReady;
                  const isQueued = item.status === "QUEUED" && !isOrderCollected && !isPickupReady;

                  const tokenDisplay = item.order_number?.includes("-")
                    ? `#${item.order_number.split("-").pop()}`
                    : `#${item.order_number}`;

                  const btnFootprint = "w-[124px] min-w-[124px] max-w-[124px] h-[36px] min-h-[36px] max-h-[36px] rounded-md text-xs font-medium inline-flex items-center justify-center box-border select-none shrink-0 transition-colors duration-150";

                  return (
                    <tr key={key} className="hover:bg-slate-50/80 transition-colors h-[54px] max-h-[54px]">
                      {/* Token */}
                      <td className="px-3.5 py-2 font-mono font-bold text-slate-900 text-sm whitespace-nowrap overflow-hidden">
                        {tokenDisplay}
                      </td>

                      {/* Document with ellipsis & title tooltip */}
                      <td className="px-3 py-2 font-medium text-slate-800">
                        <div className="truncate max-w-[215px]" title={item.document_name}>
                          {item.document_name}
                        </div>
                      </td>

                      {/* Pages */}
                      <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                        {item.pages}
                      </td>

                      {/* Settings */}
                      <td className="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap overflow-hidden">
                        {item.color_mode} &bull; {item.duplex ? "Duplex" : "Single"}
                      </td>

                      {/* Printer */}
                      <td className="px-3 py-2 font-mono text-slate-700 text-[11px]">
                        <div className="truncate max-w-[120px]" title={item.printer_name || "HP LaserJet Pro 4004"}>
                          {item.printer_name || "HP LaserJet Pro 4004"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={isOrderCollected ? "COMPLETED" : isPickupReady ? "READY" : item.status} />
                      </td>

                      {/* Wait Time */}
                      <td className="px-3 py-2 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {isOrderCollected ? "Done" : isPickupReady ? "At Counter" : isPrinting ? "Now" : "~1 min"}
                      </td>

                      {/* Stable Action Column (150px column, 36px x 124px invariant button footprint) */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end h-[36px]">
                          {isOrderCollected ? (
                            <div className={`${btnFootprint} bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs`}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                              <span>Collected</span>
                            </div>
                          ) : isPickupReady ? (
                            itemState.status === "loading" ? (
                              <button
                                disabled
                                className={`${btnFootprint} bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed shadow-2xs`}
                              >
                                <svg
                                  className="animate-spin mr-1.5 h-3.5 w-3.5 text-blue-600 shrink-0"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Collecting...</span>
                              </button>
                            ) : itemState.status === "failure" ? (
                              <button
                                onClick={() => handleMarkCollectedClick(item)}
                                className={`${btnFootprint} bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 shadow-2xs`}
                                title={itemState.message || "Could not mark this order as collected. Click to retry."}
                              >
                                <span>Retry Collect</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkCollectedClick(item)}
                                className={`${btnFootprint} bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              >
                                <span>Mark Collected</span>
                              </button>
                            )
                          ) : isFailed ? (
                            itemState.status === "loading" ? (
                              <button
                                disabled
                                className={`${btnFootprint} bg-slate-50 text-slate-600 border border-slate-200 cursor-not-allowed shadow-2xs`}
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-slate-500 shrink-0" />
                                <span>Retrying...</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRetryClick(item)}
                                className={`${btnFootprint} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs`}
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                                <span>Retry Print</span>
                              </button>
                            )
                          ) : isReconciling ? (
                            <button
                              onClick={() => onOpenReconcileModal(item)}
                              className={`${btnFootprint} bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                              <span>Reconcile</span>
                            </button>
                          ) : isQueued ? (
                            itemState.status === "loading" ? (
                              <button
                                disabled
                                className={`${btnFootprint} bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed`}
                              >
                                <span>Cancelling...</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCancelClick(item)}
                                className={`${btnFootprint} bg-white text-slate-600 border border-slate-200 hover:text-rose-600 hover:border-rose-300 shadow-2xs`}
                              >
                                <span>Cancel Job</span>
                              </button>
                            )
                          ) : isPrinting ? (
                            <div className={`${btnFootprint} font-mono bg-blue-50/70 text-blue-700 border border-blue-200`}>
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse mr-1.5 shrink-0" />
                              <span>Printing...</span>
                            </div>
                          ) : (
                            <div className={`${btnFootprint} font-mono bg-slate-50 text-slate-400 border border-slate-100`}>
                              <span>In Queue</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
