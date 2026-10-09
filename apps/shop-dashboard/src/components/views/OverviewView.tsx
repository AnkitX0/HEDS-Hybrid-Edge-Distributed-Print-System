import React, { useState } from "react";
import { Layers, Printer, FileText, CheckSquare, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface OverviewViewProps {
  dashboardData: any;
  queueItems: any[];
  printers: any[];
  onNavigateTab: (tab: string) => void;
  onMarkCollected: (item: any) => void;
  onSimulateCompleteJob?: (jobId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  dashboardData,
  queueItems,
  printers,
  onNavigateTab,
  onMarkCollected,
  onSimulateCompleteJob,
}) => {
  const stats = dashboardData?.stats || {
    orders_today: 36,
    pages_printed: 177,
    revenue_formatted: "₹454.38",
    in_queue: 2,
    ready_for_pickup: 3,
    failed_jobs: 0,
  };

  const currentlyPrinting = queueItems.find((i) => i.status === "PRINTING") || queueItems.find((i) => i.status === "QUEUED");
  const readyPickupItems = queueItems.filter((i) => i.order_status === "PICKUP_READY" || i.status === "COMPLETED" && i.order_status !== "COMPLETED");
  const recentOrders = queueItems.slice(0, 5);

  const [collectingKeys, setCollectingKeys] = useState<Record<string, boolean>>({});

  const handleCollect = async (item: any) => {
    const key = item.job_id || item.order_id || item.id;
    if (collectingKeys[key]) return;
    setCollectingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      await onMarkCollected(item);
    } finally {
      setCollectingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Date & Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {dashboardData?.shop?.name || "Campus Xerox & Print Hub"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Today: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <StatusBadge status={dashboardData?.shop?.is_queue_paused ? "paused" : "online"} label={dashboardData?.shop?.is_queue_paused ? "Paused" : "Open"} />
      </div>

      {/* KPI Row (Compact Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="ORDERS TODAY" value={stats.orders_today ?? queueItems.length} subtext="Total received" />
        <MetricCard title="PAGES PRINTED" value={stats.pages_printed ?? 177} subtext="Physical volume" />
        <MetricCard title="REVENUE" value={stats.revenue_formatted ?? "₹454.38"} variant="active" subtext="Collected today" />
        <MetricCard title="IN QUEUE" value={stats.in_queue ?? queueItems.filter(i => i.status === 'QUEUED').length} variant="warning" subtext="Awaiting spool" />
        <MetricCard title="READY FOR PICKUP" value={stats.ready_for_pickup ?? readyPickupItems.length} variant="success" subtext="Counter hold" />
        <MetricCard title="FAILED" value={stats.failed_jobs ?? 0} variant="danger" subtext="Requires review" />
      </div>

      {/* Main Operational Split Row (65% Current Job / 35% Ready Pickup) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left ~65%: Current Print Job */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            header={
              <>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Current Print Job</h3>
                </div>
                {currentlyPrinting && <StatusBadge status={currentlyPrinting.status} />}
              </>
            }
          >
            {currentlyPrinting ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {currentlyPrinting.order_number}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-800 mt-0.5">
                      {currentlyPrinting.document_name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentlyPrinting.pages} pages &bull; {currentlyPrinting.color_mode} &bull; {currentlyPrinting.duplex ? "Duplex" : "Single-sided"} &bull; {currentlyPrinting.copies} copy
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Assigned Printer</span>
                    <span className="text-xs font-semibold text-slate-900 font-mono">
                      {currentlyPrinting.printer_name || "Xerox WorkCentre 7830"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-semibold text-slate-900">
                      {currentlyPrinting.progress_page || 7} / {currentlyPrinting.pages || 12} pages
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((currentlyPrinting.progress_page || 7) / (currentlyPrinting.pages || 12)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Developer Demo Action */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono">Development Control</span>
                  {onSimulateCompleteJob && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSimulateCompleteJob(currentlyPrinting.job_id)}
                    >
                      Complete Demo Print
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No active print job currently spooling.
              </div>
            )}
          </Card>
        </div>

        {/* Right ~35%: Ready For Pickup */}
        <div className="space-y-4">
          <Card
            header={
              <>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Ready for Pickup</h3>
                </div>
                <button
                  onClick={() => onNavigateTab("pickup")}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </>
            }
          >
            {readyPickupItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No documents waiting for student collection.
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100">
                {readyPickupItems.slice(0, 3).map((item, idx) => (
                  <div key={item.job_id || item.order_id || idx} className={idx > 0 ? "pt-3" : ""}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">{item.order_number}</span>
                        <p className="text-xs font-medium text-slate-800 truncate max-w-[150px]">
                          {item.document_name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.pages} pages &bull; ₹{(item.total_amount_cents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="shrink-0 ml-2">
                        {collectingKeys[item.job_id || item.order_id || idx] ? (
                          <button
                            disabled
                            className="h-[36px] w-[124px] min-w-[124px] max-w-[124px] rounded-md text-xs font-medium flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed shadow-2xs box-border shrink-0 select-none"
                          >
                            <svg className="animate-spin mr-1.5 h-3.5 w-3.5 text-blue-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Collecting...</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCollect(item)}
                            className="h-[36px] w-[124px] min-w-[124px] max-w-[124px] rounded-md text-xs font-medium flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors box-border shrink-0 select-none"
                          >
                            <span>Mark Collected</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Printers & Devices Compact Rows */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Printers & Devices</h3>
          </div>
        }
      >
        <div className="divide-y divide-slate-100 text-xs">
          {(printers.length > 0 ? printers : [
            { id: 'p1', name: 'HP LaserJet Pro 4004', status: 'ONLINE', activity: 'Idle', caps: 'B&W · Duplex' },
            { id: 'p2', name: 'Xerox WorkCentre 7830', status: 'ONLINE', activity: 'Printing', caps: 'Color · Duplex' },
            { id: 'p3', name: 'Canon imageRUNNER 2525', status: 'OFFLINE', activity: 'Power disconnected', caps: 'B&W · Duplex' },
          ]).map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={p.status} />
                <div>
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  <span className="text-slate-400 mx-2">•</span>
                  <span className="text-slate-600">{p.activity || p.status}</span>
                </div>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {p.caps || (p.capabilities?.color ? "Color · Duplex" : "B&W · Duplex")}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Orders Table */}
      <Card
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Recent Orders</h3>
            </div>
            <button
              onClick={() => onNavigateTab("orders")}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              All Orders <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        }
        padding="none"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
              <tr>
                <th className="px-4 py-2.5">Token</th>
                <th className="px-4 py-2.5">Document</th>
                <th className="px-4 py-2.5">Pages</th>
                <th className="px-4 py-2.5">Print</th>
                <th className="px-4 py-2.5">Payment</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {recentOrders.map((item) => (
                <tr key={item.job_id || item.order_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{item.order_number}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 truncate max-w-[160px]" title={item.document_name}>{item.document_name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{item.pages}</td>
                  <td className="px-4 py-2.5 text-slate-600">{item.color_mode}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono">UPI</td>
                  <td className="px-4 py-2.5"><StatusBadge status={item.order_status || item.status} /></td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">₹{(item.total_amount_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-500 text-[11px]">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
