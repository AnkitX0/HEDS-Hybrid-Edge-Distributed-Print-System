import React, { useState } from "react";
import { Search, FileText, RefreshCw, AlertTriangle, XCircle, CheckSquare } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface QueueViewProps {
  queueItems: any[];
  printers: any[];
  onMarkCollected: (item: any) => void;
  onOpenReconcileModal: (item: any) => void;
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
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
          <p className="text-xs text-slate-500 mt-0.5">Monitor active and waiting print jobs</p>
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

      {/* Tabs */}
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
            title="No print jobs in queue"
            description="There are currently no active print jobs matching your criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-2.5">Token</th>
                  <th className="px-4 py-2.5">Document</th>
                  <th className="px-4 py-2.5">Pages</th>
                  <th className="px-4 py-2.5">Settings</th>
                  <th className="px-4 py-2.5">Printer</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Wait</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredItems.map((item) => {
                  const isPickupReady = item.order_status === "PICKUP_READY" || item.status === "COMPLETED";
                  const isFailed = item.status === "FAILED";
                  const isReconciling = item.status === "RECONCILING";
                  const isQueued = item.status === "QUEUED";

                  return (
                    <tr key={item.job_id || item.order_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.order_number}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 truncate max-w-[180px]">
                        {item.document_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{item.pages}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.color_mode} &bull; {item.duplex ? "Duplex" : "Single"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{item.printer_name || "HP 4004"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={isPickupReady ? "READY" : item.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {item.status === "PRINTING" ? "Now" : "~1 min"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPickupReady && (
                          <Button size="sm" variant="primary" onClick={() => onMarkCollected(item)}>
                            Mark Collected
                          </Button>
                        )}
                        {isFailed && (
                          <Button size="sm" variant="outline" onClick={() => onRetryJob(item.job_id)}>
                            <RefreshCw className="w-3 h-3" /> Retry
                          </Button>
                        )}
                        {isReconciling && (
                          <Button size="sm" variant="danger" onClick={() => onOpenReconcileModal(item)}>
                            Reconcile
                          </Button>
                        )}
                        {isQueued && (
                          <Button size="sm" variant="ghost" onClick={() => onCancelJob(item.job_id)} className="text-slate-400 hover:text-rose-600">
                            Cancel
                          </Button>
                        )}
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
