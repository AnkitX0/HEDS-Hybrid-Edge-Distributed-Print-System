"use client";

import React, { useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
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
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Orders Ledger</h2>
          <p className="text-xs text-slate-400">
            Authoritative order history and lifecycle records for this shop.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-md">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {statusFilters.map((tab) => {
            const isSelected = selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-slate-800 text-slate-100 font-semibold border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
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
            placeholder="Search order number, document..."
            className="h-8 text-xs bg-slate-950"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-slate-800 rounded-md bg-slate-900 overflow-hidden">
        {isLoading && orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p>Loading orders ledger...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No matching orders found" : "No orders recorded"}
            description={
              searchQuery
                ? `No orders matching "${searchQuery}" under the selected filter.`
                : "Customer print orders will appear here once submitted."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  <th className="px-3.5 py-2.5">Order</th>
                  <th className="px-3.5 py-2.5">Timestamp</th>
                  <th className="px-3.5 py-2.5">Document</th>
                  <th className="px-3.5 py-2.5">Configuration</th>
                  <th className="px-3.5 py-2.5">Price</th>
                  <th className="px-3.5 py-2.5">Printer</th>
                  <th className="px-3.5 py-2.5">Payment</th>
                  <th className="px-3.5 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors font-normal"
                    >
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-medium text-slate-200">
                          {order.order_number}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : "N/A"}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-200" title={order.document_name}>
                            {order.document_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-300">
                        <span>
                          {order.pages} pgs &times; {order.copies}
                        </span>
                        <span className="text-slate-500 text-[11px] ml-1.5">
                          ({order.color_mode}, {order.duplex ? "Duplex" : "1-sided"})
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-200">
                        ₹{(order.total_amount_cents / 100).toFixed(2)}
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-300">
                        {order.printer_name || <span className="text-slate-500">—</span>}
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Badge
                          variant={order.payment_status === "PAID" ? "success" : "neutral"}
                        >
                          {order.payment_status}
                        </Badge>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
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
