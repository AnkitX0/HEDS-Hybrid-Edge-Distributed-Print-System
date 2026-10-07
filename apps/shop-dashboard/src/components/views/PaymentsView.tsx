"use client";

import React, { useState } from "react";
import { CreditCard, Search, RefreshCw } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";

interface PaymentsViewProps {
  orders: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function PaymentsView({ orders, isLoading, onRefresh }: PaymentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<
    "ALL" | "PAID" | "PENDING" | "FAILED"
  >("ALL");

  const paymentItems = orders.map((order) => {
    const isPaid =
      order.payment_status === "PAID" ||
      [
        "PAID",
        "QUEUED",
        "DISPATCHED",
        "PRINTING",
        "PRINT_COMPLETED",
        "PICKUP_READY",
        "COMPLETED",
      ].includes(order.status);

    const isFailed =
      order.payment_status === "FAILED" || order.status === "PAYMENT_FAILED";

    let state = "PENDING";
    if (isPaid) state = "PAID";
    else if (isFailed) state = "FAILED";

    return {
      id: order.id,
      order_number: order.order_number,
      document_name: order.document_name,
      amount_cents: order.total_amount_cents || 0,
      currency: order.currency || "INR",
      method: "Online UPI / Card",
      payment_id: `pay_${order.id.slice(0, 8)}`,
      status: state,
      created_at: order.created_at,
    };
  });

  const totalRevenueCents = paymentItems
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const paidCount = paymentItems.filter((p) => p.status === "PAID").length;
  const pendingCount = paymentItems.filter((p) => p.status === "PENDING").length;
  const failedCount = paymentItems.filter((p) => p.status === "FAILED").length;

  const filteredItems = paymentItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.order_number.toLowerCase().includes(q) ||
      item.payment_id.toLowerCase().includes(q) ||
      item.document_name.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterState === "PAID") return item.status === "PAID";
    if (filterState === "PENDING") return item.status === "PENDING";
    if (filterState === "FAILED") return item.status === "FAILED";

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Payments & Collections</h1>
          <p className="text-xs text-slate-500">
            Authoritative transactional history. Students pay online upfront before jobs enter the queue.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Settled Volume
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900">
            ₹{(totalRevenueCents / 100).toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-400">Total volume collected</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Successful Payments
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-700">{paidCount}</p>
          <span className="text-[11px] text-slate-400">Captured and queued</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Pending Checkout
          </span>
          <p className="text-2xl font-bold font-mono text-amber-600">{pendingCount}</p>
          <span className="text-[11px] text-slate-400">Awaiting student payment</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Declined / Failed
          </span>
          <p className="text-2xl font-bold font-mono text-rose-600">{failedCount}</p>
          <span className="text-[11px] text-slate-400">Rejected by gateway</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterState("ALL")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterState === "ALL"
                ? "bg-slate-900 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All ({paymentItems.length})
          </button>
          <button
            onClick={() => setFilterState("PAID")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterState === "PAID"
                ? "bg-emerald-600 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Paid ({paidCount})
          </button>
          <button
            onClick={() => setFilterState("PENDING")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterState === "PENDING"
                ? "bg-amber-600 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterState("FAILED")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterState === "FAILED"
                ? "bg-rose-600 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Failed ({failedCount})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, trans ID..."
            icon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Order Ref</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Settled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No payment records found"
                      description="Payment transactions captured through checkout will appear here."
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {item.order_number}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {item.payment_id}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium truncate max-w-[200px]">
                      {item.document_name}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      ₹{(item.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.method}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === "PAID"
                            ? "success"
                            : item.status === "FAILED"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500 text-[11px]">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
