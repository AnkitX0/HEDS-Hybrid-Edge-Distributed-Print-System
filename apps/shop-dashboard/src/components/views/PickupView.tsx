import React, { useState } from "react";
import { Search, CheckSquare, CheckCircle2, FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

interface PickupViewProps {
  queueItems: any[];
  onConfirmPickup: (orderId: string, orderNumber: string) => Promise<any> | void;
}

export const PickupView: React.FC<PickupViewProps> = ({ queueItems, onConfirmPickup }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const readyPickupItems = queueItems.filter((item) => {
    const isReady = item.order_status === "PICKUP_READY" || (item.status === "COMPLETED" && item.order_status !== "COMPLETED");
    if (!isReady) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.order_number?.toLowerCase().includes(q) ||
      item.document_name?.toLowerCase().includes(q)
    );
  });

  const handleConfirmCollected = async () => {
    if (!selectedOrder) return;
    setIsSubmitting(true);
    setPickupError(null);
    try {
      await onConfirmPickup(selectedOrder.order_id || selectedOrder.id, selectedOrder.order_number);
      setSelectedOrder(null);
    } catch (e: any) {
      setPickupError(e.message || "Could not mark this order as collected. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Counter Pickup</h2>
          <p className="text-xs text-slate-500 mt-0.5">Orders ready for student collection</p>
        </div>

        {/* Compact Token / Document Search */}
        <div className="w-full sm:w-72">
          <div className="relative">
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
      </div>

      {/* Ready Orders Grid / List */}
      {readyPickupItems.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No documents waiting for pickup"
          description={
            searchQuery
              ? "No ready pickup orders match your search token."
              : "When physical printing completes, ready documents will appear here automatically for student collection."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readyPickupItems.map((item) => (
            <Card key={item.job_id || item.order_id} padding="md" className="space-y-3 border-emerald-200 bg-emerald-50/20">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Token</span>
                  <span className="text-xl font-bold font-mono text-slate-900">{item.order_number}</span>
                </div>
                <StatusBadge status="READY" />
              </div>

              <div className="space-y-1 py-1 border-t border-b border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900 truncate">{item.document_name}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                  <span>{item.pages} pages &bull; {item.color_mode}</span>
                  <span className="font-bold text-slate-900">₹{(item.total_amount_cents / 100).toFixed(2)} PAID</span>
                </div>
              </div>

              <Button
                size="md"
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold"
                onClick={() => setSelectedOrder(item)}
              >
                Mark Collected
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Mark order ${selectedOrder?.order_number} as collected?`}
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmCollected}
            >
              Mark Collected
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1 text-xs">
          {pickupError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
              {pickupError}
            </div>
          )}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Document:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[180px]">{selectedOrder?.document_name}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Pages:</span>
              <span className="font-semibold text-slate-900">{selectedOrder?.pages} pages</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Amount:</span>
              <span className="font-bold text-slate-900">₹{((selectedOrder?.total_amount_cents || 0) / 100).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Confirming will mark token {selectedOrder?.order_number} as completed in system records.
          </p>
        </div>
      </Modal>
    </div>
  );
};
