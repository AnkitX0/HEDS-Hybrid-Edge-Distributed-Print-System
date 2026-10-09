"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Layers, Printer, BarChart2, CheckCircle, AlertOctagon, RotateCw } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";

interface AnalyticsData {
  range: string;
  has_data: boolean;
  kpis: {
    orders_today: number;
    pages_printed: number;
    revenue_cents: number;
    revenue_formatted: string;
    average_order_formatted: string;
    failed_jobs: number;
    print_success_rate: string;
  };
  peak_hours: Array<{ hour: string; pages: number }>;
  print_mix: {
    bw: number;
    color: number;
    single_sided: number;
    duplex: number;
  };
  printer_utilization: Array<{ name: string; jobs: number; percentage: number }>;
  order_status: {
    COMPLETED: number;
    PRINTING: number;
    QUEUED: number;
    FAILED: number;
    PICKUP_READY: number;
  };
}

interface AnalyticsViewProps {
  stats?: any;
  queueItems?: any[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = () => {
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d">("today");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AnalyticsData>(`/api/v1/shop/analytics?range=${dateRange}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load shop analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxPeakPages = data?.peak_hours
    ? Math.max(...data.peak_hours.map((h) => h.pages), 1)
    : 1;

  const totalColorMix = (data?.print_mix.bw || 0) + (data?.print_mix.color || 0);
  const bwPercent = totalColorMix > 0 ? Math.round(((data?.print_mix.bw || 0) / totalColorMix) * 100) : 0;
  const colorPercent = totalColorMix > 0 ? 100 - bwPercent : 0;

  const totalSidesMix = (data?.print_mix.single_sided || 0) + (data?.print_mix.duplex || 0);
  const singlePercent = totalSidesMix > 0 ? Math.round(((data?.print_mix.single_sided || 0) / totalSidesMix) * 100) : 0;
  const duplexPercent = totalSidesMix > 0 ? 100 - singlePercent : 0;

  return (
    <div className="space-y-6">
      {/* Page Header with Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Analytics & Operations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Authoritative business metrics from PostgreSQL records</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {(
            [
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                dateRange === tab.id
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md"
            title="Refresh analytics"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
          <RotateCw className="w-4 h-4 animate-spin mr-2" />
          Aggregating shop records...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          {/* Row 1: Top KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title={dateRange === "today" ? "ORDERS TODAY" : "TOTAL ORDERS"}
              value={data.kpis.orders_today}
              subtext="Settled student orders"
            />
            <MetricCard
              title="PAGES PRINTED"
              value={data.kpis.pages_printed}
              subtext="Authoritative sheets"
            />
            <MetricCard
              title="REVENUE"
              value={data.kpis.revenue_formatted}
              variant="active"
              subtext="Authoritative net"
            />
            <MetricCard
              title="AVG ORDER"
              value={data.kpis.average_order_formatted}
              subtext="Per student transaction"
            />
            <MetricCard
              title="FAILED JOBS"
              value={data.kpis.failed_jobs}
              variant={data.kpis.failed_jobs > 0 ? "warning" : "neutral"}
              subtext="Hardware / aborts"
            />
            <MetricCard
              title="SUCCESS RATE"
              value={data.kpis.print_success_rate}
              variant="active"
              subtext="Completed cleanly"
            />
          </div>

          {!data.has_data ? (
            <EmptyState
              icon={BarChart2}
              title="No data available"
              description={`No student printing activity has been recorded for this ${dateRange === "today" ? "day" : dateRange} range.`}
            />
          ) : (
            <>
              {/* Row 2: Peak Print Hours */}
              <Card
                header={
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Peak Print Hours (Pages by Hour of Day)
                    </h3>
                  </div>
                }
              >
                <div className="space-y-2 py-1">
                  {data.peak_hours.map((h) => {
                    const pct = Math.max(0, Math.min(100, (h.pages / maxPeakPages) * 100));
                    return (
                      <div key={h.hour} className="flex items-center gap-3 text-xs font-mono">
                        <span className="w-12 text-slate-500 shrink-0">{h.hour}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-semibold text-slate-800 shrink-0">
                          {h.pages} {h.pages === 1 ? "pg" : "pgs"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Row 3: Print Mix & Row 4: Printer Utilization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Print Mix */}
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Print Mix
                      </h3>
                    </div>
                  }
                >
                  <div className="space-y-4 py-1 text-xs">
                    {/* B&W vs Color */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono text-slate-600">
                        <span>Color Mode</span>
                        <span>
                          B&W {bwPercent}% &bull; Color {colorPercent}%
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="bg-slate-700 h-full"
                          style={{ width: `${bwPercent}%` }}
                          title={`B&W: ${data.print_mix.bw}`}
                        />
                        <div
                          className="bg-amber-500 h-full"
                          style={{ width: `${colorPercent}%` }}
                          title={`Color: ${data.print_mix.color}`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>B&W: {data.print_mix.bw} jobs</span>
                        <span>Color: {data.print_mix.color} jobs</span>
                      </div>
                    </div>

                    {/* Simplex vs Duplex */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex justify-between font-mono text-slate-600">
                        <span>Paper Sides</span>
                        <span>
                          Single {singlePercent}% &bull; Duplex {duplexPercent}%
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${singlePercent}%` }}
                          title={`Single: ${data.print_mix.single_sided}`}
                        />
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${duplexPercent}%` }}
                          title={`Duplex: ${data.print_mix.duplex}`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Single-sided: {data.print_mix.single_sided} jobs</span>
                        <span>Double-sided: {data.print_mix.duplex} jobs</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Printer Utilization */}
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Printer Utilization
                      </h3>
                    </div>
                  }
                >
                  <div className="space-y-3 py-1">
                    {data.printer_utilization.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No printer records found</p>
                    ) : (
                      data.printer_utilization.map((p) => (
                        <div key={p.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="font-medium text-slate-900 truncate max-w-[200px]">
                              {p.name}
                            </span>
                            <span className="text-slate-600 font-semibold">
                              {p.percentage}% ({p.jobs} {p.jobs === 1 ? "job" : "jobs"})
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${p.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Row 5: Order Status Breakdown */}
              <Card
                header={
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Order Status Distribution
                    </h3>
                  </div>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-center">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block font-bold uppercase">Completed</span>
                    <span className="text-lg font-extrabold text-emerald-900 mt-1 block">
                      {data.order_status.COMPLETED}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-blue-700 block font-bold uppercase">Printing</span>
                    <span className="text-lg font-extrabold text-blue-900 mt-1 block">
                      {data.order_status.PRINTING}
                    </span>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-[10px] text-purple-700 block font-bold uppercase">Pickup Ready</span>
                    <span className="text-lg font-extrabold text-purple-900 mt-1 block">
                      {data.order_status.PICKUP_READY}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-amber-700 block font-bold uppercase">Queued</span>
                    <span className="text-lg font-extrabold text-amber-900 mt-1 block">
                      {data.order_status.QUEUED}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-rose-700 block font-bold uppercase">Failed</span>
                    <span className="text-lg font-extrabold text-rose-900 mt-1 block">
                      {data.order_status.FAILED}
                    </span>
                  </div>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};
