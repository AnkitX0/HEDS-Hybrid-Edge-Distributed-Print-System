import React, { useState } from "react";
import { Search, FileText, Eye, Layers, Printer, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";

interface OrdersViewProps {
  orders: any[];
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.order_number?.toLowerCase().includes(q) ||
      o.document_name?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (selectedTab === "ALL") return true;
    if (selectedTab === "WAITING") return o.status === "QUEUED";
    if (selectedTab === "PRINTING") return o.status === "PRINTING";
    if (selectedTab === "READY") return o.order_status === "PICKUP_READY" || o.status === "PICKUP_READY";
    if (selectedTab === "COMPLETED") return o.status === "COMPLETED" || o.order_status === "COMPLETED";
    if (selectedTab === "CANCELLED") return o.status === "CANCELLED";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Orders</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete history of multi-document student print batches
          </p>
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
                  <th className="px-4 py-2.5">Documents</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5">Total Pages</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredOrders.map((o) => {
                  const docCount = o.documents?.length || 1;
                  return (
                    <tr
                      key={o.job_id || o.id}
                      onClick={() => setActiveOrder(o)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {o.order_number}
                      </td>
                      <td
                        className="px-4 py-3 font-medium text-slate-800 truncate max-w-[200px]"
                        title={o.document_name}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{o.document_name}</span>
                          {docCount > 1 && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-mono rounded text-[10px]">
                              {docCount} docs
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{o.pages}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {o.payment_status || "PAID"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.order_status || o.status} />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-right">
                        ₹{(o.total_amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveOrder(o)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="View order documents"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Batch Details Modal */}
      <Modal
        isOpen={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        title={`Order Details · #${activeOrder?.order_number || ""}`}
        description={`Status: ${activeOrder?.status || "UNKNOWN"} · Total: ₹${activeOrder ? (activeOrder.total_amount_cents / 100).toFixed(2) : "0.00"}`}
        maxWidth="lg"
      >
        {activeOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-900">
                  {activeOrder.documents?.length || 1} Document(s) in Print Batch
                </span>
              </div>
              <div className="font-mono text-slate-600">
                {activeOrder.pages} pages total
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                DOCUMENT SPECIFICATIONS
              </span>
              {activeOrder.documents && activeOrder.documents.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {activeOrder.documents.map((d: any, idx: number) => (
                    <div
                      key={d.id || idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-slate-900">
                          {idx + 1}. {d.filename}
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          ₹{d.price_cents ? (d.price_cents / 100).toFixed(2) : "--"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-slate-600 font-mono text-[11px]">
                        <span>{d.pages} pages</span>
                        <span>&bull;</span>
                        <span>{d.copies} {d.copies === 1 ? "copy" : "copies"}</span>
                        <span>&bull;</span>
                        <span className="font-sans font-medium">
                          {d.color_mode === "COLOR" ? "Color" : "B&W"}
                        </span>
                        <span>&bull;</span>
                        <span className="font-sans font-medium">
                          {d.duplex ? "Duplex" : "Single-sided"}
                        </span>
                        <span>&bull;</span>
                        <span>{d.paper_size || "A4"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>1. {activeOrder.document_name}</span>
                    <span>₹{(activeOrder.total_amount_cents / 100).toFixed(2)}</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    {activeOrder.pages} pages &bull; {activeOrder.copies}x &bull; {activeOrder.color_mode} &bull; {activeOrder.duplex ? "Duplex" : "Single"}
                  </div>
                </div>
              )}
            </div>

            {/* Operator Print Hardware Info */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Printer: {activeOrder.printer_name || "Auto-routed by capability"}</span>
              </div>
              <div className="font-mono text-slate-500 text-[11px]">
                Payment: {activeOrder.payment_status || "VERIFIED"}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
