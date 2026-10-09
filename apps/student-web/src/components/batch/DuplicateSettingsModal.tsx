"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, FileText, Image as ImageIcon } from "lucide-react";
import { BatchDocumentItem } from "./types";
import { parseAndValidatePageRange } from "./FileConfigModal";

interface DuplicateSettingsModalProps {
  isOpen: boolean;
  sourceItem: BatchDocumentItem | null;
  allItems: BatchDocumentItem[];
  onClose: () => void;
  onDuplicate: (sourceItem: BatchDocumentItem, targetIds: string[]) => void;
}

export const DuplicateSettingsModal: React.FC<DuplicateSettingsModalProps> = ({
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

  const targetCandidates = allItems.filter((it) => it.id !== sourceItem.id && it.status === "READY");

  const toggleTarget = (id: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTargetIds.length === targetCandidates.length) {
      setSelectedTargetIds([]);
    } else {
      setSelectedTargetIds(targetCandidates.map((t) => t.id));
    }
  };

  const handleApply = () => {
    if (selectedTargetIds.length === 0) return;
    onDuplicate(sourceItem, selectedTargetIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Duplicate Settings</h3>
              <p className="text-xs text-slate-500">
                Copy configuration to other files
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Source Summary Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Source Document
            </span>
            <div className="font-semibold text-slate-900 truncate">{sourceItem.name}</div>
            <div className="flex items-center gap-1.5 flex-wrap text-slate-600 text-[11px]">
              <span className="font-medium">{sourceItem.copies}x copies</span>
              <span>&bull;</span>
              <span className="font-medium">{sourceItem.color_mode === "COLOR" ? "Color" : "B&W"}</span>
              <span>&bull;</span>
              <span className="font-medium">{sourceItem.duplex ? "Duplex" : "Single-sided"}</span>
              <span>&bull;</span>
              <span className="font-medium">{sourceItem.paper_size}</span>
              <span>&bull;</span>
              <span className="font-medium">{sourceItem.orientation}</span>
            </div>
          </div>

          {/* Target List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-700">
                Apply to which file(s)?
              </label>
              {targetCandidates.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  {selectedTargetIds.length === targetCandidates.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              )}
            </div>

            {targetCandidates.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No other ready files in this batch.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {targetCandidates.map((tgt) => {
                  const isChecked = selectedTargetIds.includes(tgt.id);
                  return (
                    <label
                      key={tgt.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50/60 border-blue-200 text-blue-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTarget(tgt.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-xs">{tgt.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {tgt.page_count} pages &bull; Currently {tgt.copies}x {tgt.color_mode}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Compatible settings will be applied. File-specific ranges exceeding page limits will default safely to all pages.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedTargetIds.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply ({selectedTargetIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
