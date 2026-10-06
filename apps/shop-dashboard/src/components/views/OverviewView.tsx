import React from "react";
import {
  Layers,
  Printer,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
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
  const activeItems = queueItems.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* 6 Key Operational Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>In Queue</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-semibold text-slate-100">{stats.waiting_jobs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting dispatch</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Spooling</span>
            <Printer className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-semibold text-slate-100">{stats.active_jobs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Physical print active</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-semibold text-slate-100">{stats.completed_today}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Printed today</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Needs Review</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-semibold text-rose-400">{stats.failed_jobs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Failed / Reconciling</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Hardware</span>
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-semibold text-slate-100">
            {stats.online_printers} / {stats.total_printers}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Printers online</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Volume</span>
            <span className="text-[11px] font-mono text-slate-400">INR</span>
          </div>
          <p className="text-xl font-semibold text-slate-100">{stats.revenue_formatted}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Gross revenue today</p>
        </div>
      </div>

      {/* Split Section: Real-time Queue Glimpse & Hardware Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Queue Immediate Focus (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Live Queue Activity</h2>
              <p className="text-xs text-slate-400">Immediate print jobs requiring processing</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("queue")}
              icon={<ArrowRight className="w-3 h-3" />}
            >
              View Full Queue ({queueItems.length})
            </Button>
          </div>

          <div className="border border-slate-800/80 rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Specs</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-xs">
                      No active print jobs in queue.
                    </td>
                  </tr>
                ) : (
                  activeItems.map((item) => (
                    <tr key={item.job_id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2.5 font-mono text-slate-200 font-medium">
                        {item.order_number}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 truncate max-w-[150px]">
                        {item.document_name}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-[11px]">
                        {item.pages}p &bull; {item.copies}x &bull; {item.color_mode}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusIndicator
                          status={
                            item.order_status === "PICKUP_READY"
                              ? "PICKUP_READY"
                              : item.status
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {item.order_status === "PICKUP_READY" ? (
                          <Button size="sm" variant="primary" onClick={() => onVerifyOtp(item)}>
                            Verify OTP
                          </Button>
                        ) : item.status === "FAILED" ? (
                          <Button size="sm" variant="danger" onClick={() => onRetry(item.job_id)}>
                            Retry
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">
                            {item.printer_name}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hardware Status Column (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Printers & Hardware</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("printers")}>
              Details
            </Button>
          </div>

          <div className="space-y-2">
            {printers.slice(0, 4).map((printer) => (
              <div
                key={printer.id}
                className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-md flex items-center justify-between"
              >
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-medium text-slate-200 truncate">{printer.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {printer.adapter_type} &bull; {printer.capabilities?.color ? "Color" : "Mono"}
                  </p>
                </div>
                <StatusIndicator status={printer.status} />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Edge Agent: Online</span>
            <span className="text-emerald-400 font-mono">10s heartbeat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
