import React from "react";
import { BarChart3, TrendingUp, Clock, FileText } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";

interface AnalyticsViewProps {
  stats: any;
  queueItems: any[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats, queueItems }) => {
  const peakHours = [
    { hour: "09:00", volume: 14, bar: "████" },
    { hour: "10:00", volume: 38, bar: "████████" },
    { hour: "11:00", volume: 62, bar: "████████████" },
    { hour: "12:00", volume: 28, bar: "██████" },
    { hour: "13:00", volume: 12, bar: "███" },
    { hour: "14:00", volume: 44, bar: "████████" },
    { hour: "15:00", volume: 30, bar: "██████" },
    { hour: "16:00", volume: 18, bar: "████" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Overview of your print shop business performance</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard title="ORDERS TODAY" value={stats?.orders_today ?? queueItems.length} subtext="Successful student orders" />
        <MetricCard title="PAGES PRINTED" value={stats?.pages_printed ?? 177} subtext="Total paper sheets" />
        <MetricCard title="REVENUE" value={stats?.revenue_formatted ?? "₹454.38"} variant="active" subtext="Net collected" />
        <MetricCard title="AVG ORDER VALUE" value="₹12.62" subtext="Per student transaction" />
      </div>

      {/* PEAK PRINT HOURS VISUALIZATION */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Peak Print Hours (Volume by Hour)</h3>
          </div>
        }
      >
        <div className="space-y-2 text-xs font-mono py-1">
          {peakHours.map((h) => (
            <div key={h.hour} className="flex items-center gap-4">
              <span className="w-12 text-slate-500">{h.hour}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden flex items-center px-1">
                <span className="text-blue-600 font-bold text-xs leading-none tracking-tighter">
                  {h.bar}
                </span>
              </div>
              <span className="w-16 text-right font-bold text-slate-900">{h.volume} pgs</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
