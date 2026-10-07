"use client";

import React from "react";
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  PackageCheck,
  Layers,
  ChevronRight,
} from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { NavTab } from "../layout/Sidebar";

interface OverviewViewProps {
  stats: {
    active_jobs: number;
    waiting_jobs: number;
    completed_today: number;
    failed_jobs: number;
    revenue_formatted: string;
    online_printers: number;
    total_printers: number;
    total_agents: number;
  };
  queueItems: any[];
  printers: any[];
  agents?: any[];
  auditLogs?: any[];
  onNavigate: (tab: NavTab) => void;
  onVerifyOtp: (item: any) => void;
  onRetry: (jobId: string) => void;
}

export function OverviewView({
  stats,
  queueItems,
  printers,
  onNavigate,
  onVerifyOtp,
  onRetry,
}: OverviewViewProps) {
  // Extract currently printing job (if any)
  const currentlyPrinting = queueItems.find(
    (item) => item.status === "PRINTING" || item.status === "DISPATCHED"
  );

  // Up next queued jobs
  const nextJobs = queueItems.filter((item) => item.status === "QUEUED").slice(0, 4);

  // Ready for pickup jobs
  const readyJobs = queueItems.filter(
    (item) => item.order_status === "PICKUP_READY"
  );

  // Attention / issues
  const issueJobs = queueItems.filter(
    (item) => item.status === "FAILED" || item.status === "RECONCILING"
  );

  return (
    <div className="space-y-6">
      {/* 1. TODAY'S SUMMARY (Section 7) */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Today's Operations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Orders Today</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {stats.completed_today + stats.active_jobs + stats.waiting_jobs}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Pages Printed</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {queueItems
                .filter((j) => j.status === "COMPLETED" || j.order_status === "PICKUP_READY")
                .reduce((sum, j) => sum + (j.pages || 1) * (j.copies || 1), 0)}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Revenue Collected</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
              {stats.revenue_formatted}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">In Queue</span>
            <p className="text-xl font-bold text-amber-600 mt-0.5">
              {stats.waiting_jobs}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Ready for Pickup</span>
            <p className="text-xl font-bold text-indigo-600 mt-0.5">
              {readyJobs.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Issues / Failed</span>
            <p className={`text-xl font-bold mt-0.5 ${stats.failed_jobs > 0 ? "text-rose-600" : "text-slate-400"}`}>
              {stats.failed_jobs}
            </p>
          </div>
        </div>
      </section>

      {/* 2. MAIN WORKFLOW: CURRENTLY PRINTING & UP NEXT (Section 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Currently Printing Focus Card */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Currently Printing
            </h2>
            {currentlyPrinting && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Active Spooling
              </span>
            )}
          </div>

          {currentlyPrinting ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold font-mono text-sm">
                    {currentlyPrinting.order_number.replace("ORD-", "#")}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentlyPrinting.document_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentlyPrinting.pages} pages &bull; {currentlyPrinting.color_mode} &bull;{" "}
                      {currentlyPrinting.duplex ? "Duplex (2-sided)" : "1-sided"} &bull;{" "}
                      {currentlyPrinting.copies} {currentlyPrinting.copies > 1 ? "copies" : "copy"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-700 block">
                    {currentlyPrinting.printer_name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {currentlyPrinting.order_number}
                  </span>
                </div>
              </div>

              {/* Printing Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Executing physical print job...</span>
                  <span className="text-blue-600 font-semibold font-mono">In Progress</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full w-3/4 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
              <Printer className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">Printer is Idle</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No job currently printing. New jobs submitted by students will automatically lease and start printing.
              </p>
            </div>
          )}

          {/* Up Next in Queue */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Up Next In Queue ({nextJobs.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("queue")}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                <span>View Full Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {nextJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-500">
                Queue is clear. No waiting students.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {nextJobs.map((job, idx) => (
                  <div
                    key={job.job_id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold font-mono text-slate-800 block">
                          {job.order_number}
                        </span>
                        <p className="text-xs font-medium text-slate-700 truncate max-w-xs">
                          {job.document_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div className="text-xs text-slate-500">
                        <span>{job.pages} pgs &bull; {job.color_mode}</span>
                      </div>
                      <Badge variant="neutral">Queued</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ready for Pickup & Printers Status (Section 7) */}
        <div className="space-y-5">
          {/* Ready for Pickup Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ready for Pickup ({readyJobs.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("pickup")}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                <span>Pickup Station</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {readyJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-500">
                Trays are clear. All printed orders collected.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {readyJobs.slice(0, 3).map((job) => (
                  <div key={job.job_id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold font-mono text-slate-900 block">
                        {job.order_number}
                      </span>
                      <p className="text-xs text-slate-600 truncate max-w-[140px]">
                        {job.document_name} ({job.pages} pgs)
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onVerifyOtp(job)}
                      className="text-xs h-7 px-2.5"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verify</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Printer Status Section (Section 7) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Printer Hardware Status
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("printers")}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                <span>Manage</span>
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {printers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No printers connected
                </div>
              ) : (
                printers.map((p) => {
                  const isOnline = p.status === "ONLINE";
                  const isPrintingThis =
                    currentlyPrinting && currentlyPrinting.printer_name === p.name;
                  return (
                    <div key={p.id} className="p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {isPrintingThis
                            ? `Printing ${currentlyPrinting?.order_number}`
                            : isOnline
                            ? "Idle • Ready for print"
                            : "Offline"}
                        </span>
                      </div>
                      <StatusIndicator
                        status={isPrintingThis ? "PRINTING" : isOnline ? "ONLINE" : "OFFLINE"}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Needs Attention / Issues (if any) */}
          {issueJobs.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Needs Attention ({issueJobs.length})
              </h2>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                {issueJobs.slice(0, 2).map((job) => (
                  <div key={job.job_id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-900">{job.order_number}</span>
                      <p className="text-[11px] text-rose-700">{job.error_message || "Ambiguous print"}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onRetry(job.job_id)}
                      className="h-6 text-[10px] px-2"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Retry</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
