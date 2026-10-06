import React, { useState } from "react";
import { Search, RotateCcw, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";

interface QueueViewProps {
  queueItems: any[];
  onVerifyOtp: (item: any) => void;
  onRetry: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onReconcile: (job: any) => void;
  onRefresh: () => void;
}

export function QueueView({
  queueItems,
  onVerifyOtp,
  onRetry,
  onCancel,
  onReconcile,
  onRefresh,
}: QueueViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "QUEUED" | "PRINTING" | "PICKUP_READY" | "ATTENTION">("ALL");

  // Filtering
  const filteredItems = queueItems.filter((item) => {
    // Search query matching
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.order_number?.toLowerCase().includes(q) ||
      item.document_name?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Filter tab
    if (filterTab === "QUEUED") return item.status === "QUEUED";
    if (filterTab === "PRINTING") return item.status === "PRINTING" || item.status === "DISPATCHED";
    if (filterTab === "PICKUP_READY") return item.order_status === "PICKUP_READY";
    if (filterTab === "ATTENTION") return item.status === "FAILED" || item.status === "RECONCILING";

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar: Filter tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-md text-xs">
          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterTab === "ALL"
                ? "bg-slate-800 text-slate-100 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Jobs ({queueItems.length})
          </button>
          <button
            onClick={() => setFilterTab("QUEUED")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterTab === "QUEUED"
                ? "bg-slate-800 text-slate-100 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Queued
          </button>
          <button
            onClick={() => setFilterTab("PRINTING")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterTab === "PRINTING"
                ? "bg-slate-800 text-slate-100 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Spooling
          </button>
          <button
            onClick={() => setFilterTab("PICKUP_READY")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterTab === "PICKUP_READY"
                ? "bg-slate-800 text-purple-300 shadow-xs"
                : "text-slate-400 hover:text-purple-300"
            }`}
          >
            Pickup Ready
          </button>
          <button
            onClick={() => setFilterTab("ATTENTION")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterTab === "ATTENTION"
                ? "bg-slate-800 text-rose-300 shadow-xs"
                : "text-slate-400 hover:text-rose-300"
            }`}
          >
            Attention
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="w-64">
            <Input
              placeholder="Search by order or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-3.5 h-3.5" />}
            />
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} icon={<RotateCcw className="w-3 h-3" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 w-12 text-center">Pos</th>
                <th className="px-3.5 py-2.5">Order</th>
                <th className="px-3.5 py-2.5">Document</th>
                <th className="px-3.5 py-2.5">Settings</th>
                <th className="px-3.5 py-2.5">Price</th>
                <th className="px-3.5 py-2.5">Assigned Device</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      title="No print jobs match criteria"
                      description="There are currently no print jobs matching the selected filters or search terms."
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isPickupReady = item.order_status === "PICKUP_READY";
                  const isFailed = item.status === "FAILED";
                  const isReconciling = item.status === "RECONCILING";

                  return (
                    <tr
                      key={item.job_id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isPickupReady ? "bg-purple-950/15" : isFailed ? "bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-center font-mono text-slate-500 font-semibold">
                        {item.position ? `#${item.position}` : "—"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="font-mono font-semibold text-slate-100 block">
                          {item.order_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <p className="font-medium text-slate-200 truncate max-w-[180px]">
                          {item.document_name}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.pages} pages</p>
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-slate-300">
                        <span>{item.copies}x copies</span>
                        <span className="text-slate-500 block">
                          {item.color_mode} &bull; {item.duplex ? "Duplex" : "Simplex"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-200">
                        ₹{(item.total_amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="text-slate-300 block truncate max-w-[140px]">
                          {item.printer_name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                          {item.agent_name}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StatusIndicator
                          status={isPickupReady ? "PICKUP_READY" : item.status}
                        />
                        {item.error_message && (
                          <span className="text-[10px] text-rose-400 block truncate max-w-[140px] mt-0.5">
                            {item.error_message}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        {isPickupReady && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onVerifyOtp(item)}
                            icon={<ShieldCheck className="w-3 h-3" />}
                          >
                            Verify OTP
                          </Button>
                        )}

                        {isFailed && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onRetry(item.job_id)}
                            icon={<RotateCcw className="w-3 h-3" />}
                          >
                            Retry
                          </Button>
                        )}

                        {isReconciling && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onReconcile(item)}
                            icon={<AlertTriangle className="w-3 h-3 text-orange-400" />}
                          >
                            Reconcile
                          </Button>
                        )}

                        {item.status === "QUEUED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCancel(item.job_id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
