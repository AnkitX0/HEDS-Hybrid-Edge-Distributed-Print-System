"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import { BatchDocumentItem } from "./types";

interface DuplicateSheetProps {
  isOpen: boolean;
  sourceItem: BatchDocumentItem | null;
  allItems: BatchDocumentItem[];
  onClose: () => void;
  onDuplicate: (sourceItem: BatchDocumentItem, targetIds: string[]) => void;
}

export const DuplicateSheet: React.FC<DuplicateSheetProps> = ({
  isOpen,
  sourceItem,
  allItems,
  onClose,
  onDuplicate,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  useEffect(() => {
    if (sourceItem) {
      const candidates = allItems.filter(
        (it) => it.id !== sourceItem.id && it.status === "READY"
      );
      if (candidates.length === 1) {
        setSelectedTargetIds([candidates[0].id]);
      } else {
        setSelectedTargetIds([]);
      }
    }
  }, [sourceItem, allItems]);

  if (!isOpen || !sourceItem) return null;

  const targetCandidates = allItems.filter(
    (it) => it.id !== sourceItem.id && it.status === "READY"
  );

  const toggleTarget = (id: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    if (selectedTargetIds.length === 0) return;
    onDuplicate(sourceItem, selectedTargetIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pt-2.5 pb-3 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Duplicate Settings</h3>
              <p className="text-[11px] text-slate-500">
                Copy config from {sourceItem.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target candidates */}
        <div className="p-4 overflow-y-auto space-y-3 text-xs">
          <p className="font-semibold text-slate-700">Select files to update:</p>

          {targetCandidates.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No other ready files in this batch.
            </div>
          ) : (
            <div className="space-y-2">
              {targetCandidates.map((tgt) => {
                const isChecked = selectedTargetIds.includes(tgt.id);
                return (
                  <label
                    key={tgt.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer min-h-[48px] transition-colors ${
                      isChecked
                        ? "bg-blue-50/70 border-blue-300 text-blue-900"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTarget(tgt.id)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-xs">{tgt.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {tgt.page_count} pgs &bull; Currently {tgt.copies}x {tgt.color_mode}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedTargetIds.length === 0}
            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply ({selectedTargetIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
