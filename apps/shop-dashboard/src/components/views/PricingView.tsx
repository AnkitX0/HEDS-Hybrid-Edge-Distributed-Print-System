"use client";

import React, { useState } from "react";
import { Tag, Edit2, Check, X, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

interface PricingRuleItem {
  id: string;
  name: string;
  paper_size: string;
  bw_per_page_cents: number;
  color_per_page_cents: number;
  duplex_discount_cents: number;
  minimum_order_cents: number;
  is_active: boolean;
}

interface PricingViewProps {
  rules: PricingRuleItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateRule: (
    ruleId: string,
    payload: {
      bw_per_page_cents: number;
      color_per_page_cents: number;
      duplex_discount_cents: number;
      minimum_order_cents: number;
    }
  ) => Promise<void>;
}

export function PricingView({
  rules,
  isLoading,
  onRefresh,
  onUpdateRule,
}: PricingViewProps) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    bw_rupees: "",
    color_rupees: "",
    duplex_discount_rupees: "",
    min_order_rupees: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const startEdit = (rule: PricingRuleItem) => {
    setEditingRuleId(rule.id);
    setEditForm({
      bw_rupees: (rule.bw_per_page_cents / 100).toFixed(2),
      color_rupees: (rule.color_per_page_cents / 100).toFixed(2),
      duplex_discount_rupees: (rule.duplex_discount_cents / 100).toFixed(2),
      min_order_rupees: (rule.minimum_order_cents / 100).toFixed(2),
    });
    setFeedbackMessage(null);
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setFeedbackMessage(null);
  };

  const handleSave = async (ruleId: string) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const bwCents = Math.round(parseFloat(editForm.bw_rupees) * 100) || 0;
      const colorCents = Math.round(parseFloat(editForm.color_rupees) * 100) || 0;
      const duplexCents = Math.round(parseFloat(editForm.duplex_discount_rupees) * 100) || 0;
      const minCents = Math.round(parseFloat(editForm.min_order_rupees) * 100) || 0;

      await onUpdateRule(ruleId, {
        bw_per_page_cents: bwCents,
        color_per_page_cents: colorCents,
        duplex_discount_cents: duplexCents,
        minimum_order_cents: minCents,
      });

      setEditingRuleId(null);
      setFeedbackMessage("Pricing rule updated successfully.");
      onRefresh();
    } catch (err: any) {
      setFeedbackMessage(err.message || "Failed to update pricing rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Pricing Rules</h1>
          <p className="text-xs text-slate-500">
            Authoritative rate sheets used to calculate prices for student uploads before payment.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
        >
          Refresh Rates
        </Button>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          {feedbackMessage}
        </div>
      )}

      {isLoading && rules.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 space-y-2 border border-slate-200 rounded-xl bg-white">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p>Loading pricing rules...</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <EmptyState
            title="No pricing rules configured"
            description="This shop currently has no active pricing rules."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const isEditing = editingRuleId === rule.id;

            return (
              <div
                key={rule.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                    <Badge variant={rule.is_active ? "success" : "neutral"}>
                      {rule.paper_size}
                    </Badge>
                  </div>

                  {!isEditing && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => startEdit(rule)}
                      icon={<Edit2 className="w-3 h-3" />}
                    >
                      Edit Rates
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input
                        label="B&W per page (₹)"
                        type="number"
                        step="0.5"
                        value={editForm.bw_rupees}
                        onChange={(e) =>
                          setEditForm({ ...editForm, bw_rupees: e.target.value })
                        }
                      />
                      <Input
                        label="Color per page (₹)"
                        type="number"
                        step="0.5"
                        value={editForm.color_rupees}
                        onChange={(e) =>
                          setEditForm({ ...editForm, color_rupees: e.target.value })
                        }
                      />
                      <Input
                        label="Duplex discount (₹)"
                        type="number"
                        step="0.25"
                        value={editForm.duplex_discount_rupees}
                        onChange={(e) =>
                          setEditForm({ ...editForm, duplex_discount_rupees: e.target.value })
                        }
                      />
                      <Input
                        label="Minimum order (₹)"
                        type="number"
                        step="1"
                        value={editForm.min_order_rupees}
                        onChange={(e) =>
                          setEditForm({ ...editForm, min_order_rupees: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSave(rule.id)}
                        disabled={isSubmitting}
                      >
                        Save Rates
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">Monochrome B&W</span>
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{(rule.bw_per_page_cents / 100).toFixed(2)} / page
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Color Page</span>
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{(rule.color_per_page_cents / 100).toFixed(2)} / page
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Duplex Discount</span>
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{(rule.duplex_discount_cents / 100).toFixed(2)} / sheet
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Minimum Order</span>
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{(rule.minimum_order_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
