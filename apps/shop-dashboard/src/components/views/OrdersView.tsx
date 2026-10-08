import React, { useState } from "react";
import { Search, FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface OrdersViewProps {
  orders: any[];
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("ALL");

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || o.order_number?.toLowerCase().includes(q) || o.document_name?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (selectedTab === "ALL") return true;
    if (selectedTab === "WAITING") return o.status === "QUEUED";
    if (selectedTab === "PRINTING") return o.status === "PRINTING";
    if (selectedTab === "READY") return o.order_status === "PICKUP_READY";
    if (selectedTab === "COMPLETED") return o.status === "COMPLETED" || o.order_status === "COMPLETED";
    if (selectedTab === "CANCELLED") return o.status === "CANCELLED";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Orders</h2>
          <p className="text-xs text-slate-500 mt-0.5">Complete history of student print orders</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search token or document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-white border border-slate-200 rounded pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-xs">
        {["ALL", "WAITING", "PRINTING", "READY", "COMPLETED", "CANCELLED"].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTab(t)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedTab === t
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Card padding="none">
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No orders found"
            description="No print orders match the current search or status criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-2.5">Token</th>
                  <th className="px-4 py-2.5">Document</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5">Pages</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredOrders.map((o) => (
                  <tr key={o.job_id || o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.order_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 truncate max-w-[200px]">{o.document_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{o.pages}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">UPI / Razorpay</td>
                    <td className="px-4 py-3"><StatusBadge status={o.order_status || o.status} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-right">
                      ₹{(o.total_amount_cents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
