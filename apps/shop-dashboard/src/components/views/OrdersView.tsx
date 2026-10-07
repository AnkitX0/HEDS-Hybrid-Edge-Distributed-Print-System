"use client";

import React, { useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";

interface OrderItem {
  id: string;
  order_number: string;
  status: string;
  total_amount_cents: number;
  currency: string;
  document_name: string;
  pages: number;
  copies: number;
  color_mode: string;
  duplex: boolean;
  paper_size: string;
  printer_name?: string | null;
  payment_status: string;
  created_at: string;
}

interface OrdersViewProps {
  orders: OrderItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function OrdersView({ orders, isLoading, onRefresh }: OrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.printer_name && order.printer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      selectedStatus === "ALL" || order.status.toUpperCase() === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const statusFilters = [
    { label: "All", value: "ALL" },
    { label: "Queued", value: "QUEUED" },
    { label: "Printing", value: "PRINTING" },
    { label: "Pickup Ready", value: "PICKUP_READY" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Failed", value: "FAILED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Orders Ledger</h1>
          <p className="text-xs text-slate-500">
            Authoritative order history and lifecycle records for this shop.
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {statusFilters.map((tab) => {
            const isSelected = selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="w-full md:w-64">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, document..."
            icon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
        {isLoading && orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p>Loading orders ledger...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={searchQuery ? "No matching orders found" : "No orders recorded"}
              description={
                searchQuery
                  ? `No orders matching "${searchQuery}" under the selected filter.`
                  : "Customer print orders will appear here once submitted."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Configuration</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Printer</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors font-normal"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">
                          {order.order_number}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-800" title={order.document_name}>
                            {order.document_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        <span>
                          {order.pages} pgs &times; {order.copies}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1.5">
                          ({order.color_mode}, {order.duplex ? "Duplex" : "1-sided"})
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                        ₹{(order.total_amount_cents / 100).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {order.printer_name || <span className="text-slate-400">—</span>}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={order.payment_status === "PAID" ? "success" : "neutral"}
                        >
                          {order.payment_status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <StatusIndicator
                          status={order.status}
                          className="justify-end"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
