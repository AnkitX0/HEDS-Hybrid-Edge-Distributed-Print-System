"use client";

import React, { useState } from "react";
import {
  Search,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Printer,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Badge } from "../ui/Badge";
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
  const [filterTab, setFilterTab] = useState<
    "ALL" | "PRINTING" | "QUEUED" | "READY" | "ATTENTION"
  >("ALL");

  // Segregate jobs for hierarchy (Section 9)
  const currentlyPrinting = queueItems.find(
    (item) => item.status === "PRINTING" || item.status === "DISPATCHED"
  );
  const queuedJobs = queueItems.filter((item) => item.status === "QUEUED");
  const readyJobs = queueItems.filter((item) => item.order_status === "PICKUP_READY");
  const attentionJobs = queueItems.filter(
    (item) => item.status === "FAILED" || item.status === "RECONCILING"
  );

  // Filtered list for detailed table
  const filteredItems = queueItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.order_number?.toLowerCase().includes(q) ||
      item.document_name?.toLowerCase().includes(q) ||
      item.printer_name?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterTab === "PRINTING") return item.status === "PRINTING" || item.status === "DISPATCHED";
    if (filterTab === "QUEUED") return item.status === "QUEUED";
    if (filterTab === "READY") return item.order_status === "PICKUP_READY";
    if (filterTab === "ATTENTION") return item.status === "FAILED" || item.status === "RECONCILING";

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Print Queue</h1>
          <p className="text-xs text-slate-500">
            Real-time execution queue. Jobs are leased and dispatched automatically to local printers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-56 sm:w-64">
            <Input
              placeholder="Search token, file, printer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-3.5 h-3.5" />}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={onRefresh} icon={<RotateCcw className="w-3 h-3" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Top Focused Section: CURRENTLY PRINTING (Section 9) */}
      {currentlyPrinting && (
        <div className="bg-white border-2 border-blue-500/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Currently Printing Now
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-700">
              {currentlyPrinting.printer_name}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold font-mono text-base shadow-2xs">
                {currentlyPrinting.order_number.replace("ORD-", "#")}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {currentlyPrinting.document_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentlyPrinting.pages} pages &bull; {currentlyPrinting.color_mode} &bull;{" "}
                  {currentlyPrinting.duplex ? "Duplex" : "Single-sided"} &bull;{" "}
                  {currentlyPrinting.copies} copy
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 block">
                ₹{(currentlyPrinting.total_amount_cents / 100).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500">Paid online</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-blue-600 h-full rounded-full w-2/3 animate-pulse" />
          </div>
        </div>
      )}

      {/* 3. Filter Pills */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filterTab === "ALL"
              ? "bg-slate-900 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          All Jobs ({queueItems.length})
        </button>
        <button
          onClick={() => setFilterTab("PRINTING")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filterTab === "PRINTING"
              ? "bg-blue-600 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Printing ({currentlyPrinting ? 1 : 0})
        </button>
        <button
          onClick={() => setFilterTab("QUEUED")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filterTab === "QUEUED"
              ? "bg-amber-600 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Queued ({queuedJobs.length})
        </button>
        <button
          onClick={() => setFilterTab("READY")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filterTab === "READY"
              ? "bg-indigo-600 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Ready for Pickup ({readyJobs.length})
        </button>
        {attentionJobs.length > 0 && (
          <button
            onClick={() => setFilterTab("ATTENTION")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterTab === "ATTENTION"
                ? "bg-rose-600 text-white font-semibold"
                : "text-rose-600 hover:bg-rose-50"
            }`}
          >
            Needs Attention ({attentionJobs.length})
          </button>
        )}
      </div>

      {/* 4. Clean Professional Data Table (Section 10) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-16 text-center">Pos</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Settings</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Printer</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <EmptyState
                      title="No print jobs found"
                      description="No jobs match the current filter. New student submissions will appear automatically."
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isReady = item.order_status === "PICKUP_READY";
                  const isPrinting = item.status === "PRINTING" || item.status === "DISPATCHED";
                  const isFailed = item.status === "FAILED";
                  const isReconciling = item.status === "RECONCILING";

                  return (
                    <tr
                      key={item.job_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-400">
                        {isPrinting ? (
                          <span className="text-blue-600 font-bold">●</span>
                        ) : item.position ? (
                          `#${item.position}`
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {item.order_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 block truncate max-w-[180px]">
                          {item.document_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {item.pages} pgs
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span>{item.color_mode}</span> &bull;{" "}
                        <span>{item.duplex ? "Duplex" : "1-sided"}</span>
                        {item.copies > 1 && (
                          <span className="text-slate-400"> &bull; {item.copies}x</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        ₹{(item.total_amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusIndicator
                          status={isReady ? "PICKUP_READY" : item.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="truncate block max-w-[130px]">
                          {item.printer_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {isReady && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onVerifyOtp(item)}
                            className="bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verify</span>
                          </Button>
                        )}
                        {isFailed && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onRetry(item.job_id)}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </Button>
                        )}
                        {isReconciling && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onReconcile(item)}
                            className="text-amber-700 border-amber-300"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Reconcile</span>
                          </Button>
                        )}
                        {item.status === "QUEUED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCancel(item.job_id)}
                            className="text-slate-400 hover:text-rose-600"
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
