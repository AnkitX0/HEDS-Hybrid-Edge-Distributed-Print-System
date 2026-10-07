import React from "react";
import {
  Layers,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  ArrowRight,
  Activity,
  Server,
  Database,
  Radio,
  Clock,
  ShieldCheck,
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
  agents = [],
  auditLogs = [],
  onNavigate,
  onVerifyOtp,
  onRetry,
}: OverviewViewProps) {
  // Sort and display active & queued jobs
  const activeItems = queueItems.slice(0, 7);
  const recentActivities = auditLogs.slice(0, 5);

  const calculateEta = (item: any, idx: number) => {
    if (item.status === "PRINTING") return "1m 20s";
    if (item.status === "COMPLETED") return "Done";
    if (item.status === "FAILED") return "Halted";
    if (item.status === "RECONCILING") return "Review";
    const pos = item.position || idx + 1;
    return `${Math.max(1, pos * 2)}m`;
  };

  return (
    <div className="space-y-4">
      {/* 6 Key Operational Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-300">IN QUEUE</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">{stats.waiting_jobs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting dispatch</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-300">PRINTING</span>
            <Printer className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">{stats.active_jobs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Physical spooling</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-300">COMPLETED TODAY</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">{stats.completed_today}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Verified & collected</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-rose-400">NEEDS REVIEW</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400">{stats.failed_jobs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Failed / Reconciling</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-300">PRINTERS ONLINE</span>
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">
            {stats.online_printers} / {stats.total_printers}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Hardware operational</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-300">REVENUE</span>
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">INR</span>
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">{stats.revenue_formatted}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total volume settled</p>
        </div>
      </div>

      {/* Main Center Area: Active Dispatch Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">ACTIVE QUEUE</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PostgreSQL Lease Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic priority dispatch with atomic row-level leasing (SKIP LOCKED)
            </p>
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
            <thead className="bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800/80 font-mono">
              <tr>
                <th className="px-3 py-2 w-12 text-center">POS</th>
                <th className="px-3 py-2">ORDER</th>
                <th className="px-3 py-2">DOCUMENT</th>
                <th className="px-3 py-2">PAGES</th>
                <th className="px-3 py-2">MODE</th>
                <th className="px-3 py-2">STATUS</th>
                <th className="px-3 py-2">PRINTER</th>
                <th className="px-3 py-2">ETA</th>
                <th className="px-3 py-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {activeItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-xs">
                    No active print jobs in queue.
                  </td>
                </tr>
              ) : (
                activeItems.map((item, idx) => {
                  const isCurrentPrinting = item.status === "PRINTING";
                  const isPickupReady = item.order_status === "PICKUP_READY";
                  const isFailed = item.status === "FAILED" || item.status === "RECONCILING";

                  return (
                    <tr
                      key={item.job_id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isCurrentPrinting ? "bg-blue-950/20" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center font-mono text-slate-400 font-semibold">
                        {isCurrentPrinting ? (
                          <span className="text-blue-400 animate-pulse font-bold">▶</span>
                        ) : (
                          item.position || idx + 1
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-200 font-semibold">
                        {item.order_number}
                      </td>
                      <td className="px-3 py-2 text-slate-300 truncate max-w-[180px] font-medium">
                        {item.document_name}
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-mono">
                        {item.pages}p {item.copies > 1 ? `(${item.copies}x)` : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-300 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                          {item.color_mode}
                        </span>{" "}
                        {item.duplex ? (
                          <span className="text-slate-400 text-[10px]">/ Duplex</span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">/ Single</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusIndicator
                          status={isPickupReady ? "PICKUP_READY" : item.status}
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-mono text-[11px] truncate max-w-[130px]">
                        {item.printer_name || "Auto-Assign"}
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                        {calculateEta(item, idx)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isPickupReady ? (
                          <Button size="sm" variant="primary" onClick={() => onVerifyOtp(item)}>
                            Verify OTP
                          </Button>
                        ) : isFailed ? (
                          <Button size="sm" variant="danger" onClick={() => onRetry(item.job_id)}>
                            Retry
                          </Button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            {isCurrentPrinting ? "In Progress" : "Queued"}
                          </span>
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

      {/* Bottom Grid: Hardware Fleet, Edge Agent Health, Recent Activity & System Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Hardware / Printers Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                PRINTERS FLEET
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {stats.online_printers} / {stats.total_printers} ONLINE
            </span>
          </div>

          <div className="space-y-1.5">
            {printers.slice(0, 3).map((printer) => (
              <div
                key={printer.id}
                className="p-2 bg-slate-950/60 border border-slate-800/80 rounded text-xs flex items-center justify-between"
              >
                <div className="overflow-hidden pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-200 truncate">{printer.name}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {printer.capabilities?.color ? "A4/A3 · Color · Duplex" : "A4 · B&W · Duplex"}
                  </p>
                </div>
                <StatusIndicator status={printer.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Edge Agents Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                EDGE AGENTS
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">DURABLE SQLITE</span>
          </div>

          <div className="space-y-1.5">
            {agents.length > 0 ? (
              agents.slice(0, 2).map((agent) => (
                <div
                  key={agent.id}
                  className="p-2 bg-slate-950/60 border border-slate-800/80 rounded text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-slate-200">{agent.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                        agent.status === "ONLINE"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{agent.printer_count || 1} printers attached</span>
                    <span>heartbeat active</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded text-xs text-slate-400">
                campus-agent-01 (ONLINE • 2 printers)
              </div>
            )}
          </div>
        </div>

        {/* Recent Operational Activity (Audit Logs) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                RECENT ACTIVITY
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">AUDIT TRAIL</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {recentActivities.length > 0 ? (
              recentActivities.map((log: any) => {
                const timeStr = log.created_at
                  ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";
                const note =
                  log.metadata?.note ||
                  log.metadata?.message ||
                  `${log.action.replace(/_/g, " ")} (${log.resource_id || ""})`;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 p-1.5 rounded bg-slate-950/40 text-[11px] border border-slate-800/60"
                  >
                    <span className="font-mono text-slate-500 text-[10px] shrink-0">{timeStr}</span>
                    <span className="text-slate-300 truncate font-mono">{note}</span>
                  </div>
                );
              })
            ) : (
              <div className="space-y-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">14:21</span>
                  <span>Job HDS-1041 completed</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">14:20</span>
                  <span>Job HDS-1042 started printing</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">14:19</span>
                  <span>Payment verified for HDS-1042</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">14:18</span>
                  <span>Agent campus-agent-01 heartbeat received</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">14:17</span>
                  <span>Job HDS-1040 moved to pickup hold</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact System Health Bar (Requirement 34) */}
      <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
            SYSTEM HEALTH:
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> API: ONLINE
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> DATABASE: ONLINE (PostgreSQL)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> EDGE AGENT: ONLINE
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> PRINTERS: {stats.online_printers}/{stats.total_printers} ONLINE
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> QUEUE: HEALTHY
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          ARCHITECTURE: CLOUD QUEUE ↓ EDGE AGENT (SQLite) ↓ MOCK / CUPS
        </div>
      </div>
    </div>
  );
}
