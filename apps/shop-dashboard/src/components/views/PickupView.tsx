"use client";

import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { apiClient } from "@/lib/api/client";

interface PickupViewProps {
  queueItems: any[];
  onRefresh: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export function PickupView({ queueItems, onRefresh, getAuthHeaders }: PickupViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderQuery, setOrderQuery] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    orderNumber: string;
    documentName: string;
    pages: number;
    amountFormatted: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Ready orders
  const readyOrders = queueItems.filter(
    (item) => item.order_status === "PICKUP_READY"
  );

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    setOrderQuery(order.order_number);
    setErrorMessage(null);
    setVerificationResult(null);
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 50);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length < 6) {
      setErrorMessage("Enter the 6-digit code from student's screen.");
      return;
    }

    setErrorMessage(null);
    setIsVerifying(true);

    try {
      const payload: Record<string, any> = {
        otp: otpInput.trim(),
      };
      if (selectedOrder?.order_id) {
        payload.order_id = selectedOrder.order_id;
      } else if (orderQuery.trim()) {
        payload.order_number = orderQuery.trim().toUpperCase();
      } else if (readyOrders.length === 1) {
        payload.order_id = readyOrders[0].order_id;
      } else {
        setErrorMessage("Please select or type the order number being collected.");
        setIsVerifying(false);
        return;
      }

      const res = await apiClient.post<any>("/api/v1/pickups/confirm", payload, {
        headers: getAuthHeaders(),
      });

      setVerificationResult({
        orderNumber: res.order_number || selectedOrder?.order_number || orderQuery,
        documentName: selectedOrder?.document_name || "Document",
        pages: selectedOrder?.pages || 1,
        amountFormatted: `₹${((selectedOrder?.total_amount_cents || 0) / 100).toFixed(2)}`,
      });

      setOtpInput("");
      setSelectedOrder(null);
      setOrderQuery("");
      onRefresh();
    } catch (err: any) {
      setErrorMessage(
        err.message || "Invalid pickup code. Please ask student to verify their 6-digit code."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetForNext = () => {
    setVerificationResult(null);
    setErrorMessage(null);
    setOtpInput("");
    setSelectedOrder(null);
    setOrderQuery("");
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-base font-bold text-slate-900">Pickup Counter Station</h1>
        <p className="text-xs text-slate-500">
          Verify student OTP code to complete handover and purge temporary files.
        </p>
      </div>

      {/* POS Terminal Card (Section 27) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        {verificationResult ? (
          /* SUCCESS CONFIRMATION */
          <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                ✓ Pickup Verified
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-mono">
                {verificationResult.orderNumber}
              </h2>
              <p className="text-sm font-semibold text-slate-700">
                {verificationResult.documentName} &bull; {verificationResult.pages} pages
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Paper verified. Please hand physical document to student.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleResetForNext}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold px-8"
              >
                <span>Complete Handover</span>
              </Button>
            </div>
          </div>
        ) : (
          /* COUNTER INPUT FORM */
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ready for Pickup
              </h2>
              <p className="text-xs text-slate-600">
                Ask student for the 6-digit code on their phone screen.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4 max-w-sm mx-auto">
              {/* Order Number selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Order / Token #
                </label>
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => {
                    setOrderQuery(e.target.value);
                    setSelectedOrder(null);
                  }}
                  placeholder="e.g. ORD-12345 or tap below"
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              {/* 6-Digit OTP Box */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block text-center">
                  Enter 6-Digit OTP
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full text-center tracking-widest font-mono text-3xl font-bold py-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:border-blue-600 shadow-inner"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={isVerifying || otpInput.length < 6}
                className="w-full h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? "Verifying..." : "Verify Pickup"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Orders currently waiting for collection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Orders Ready For Collection ({readyOrders.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs text-slate-500">
            Refresh
          </Button>
        </div>

        {readyOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <EmptyState
              title="No orders awaiting collection"
              description="Completed print jobs will appear here automatically ready for counter handover."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyOrders.map((order) => {
              const isSelected = selectedOrder?.order_id === order.order_id;
              return (
                <div
                  key={order.order_id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {order.order_number}
                    </span>
                    <Badge variant="success">Printed</Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {order.document_name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 mt-2 border-t border-slate-100">
                    <span>{order.pages} pages</span>
                    <span className="font-medium text-slate-900">
                      ₹{(order.total_amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
