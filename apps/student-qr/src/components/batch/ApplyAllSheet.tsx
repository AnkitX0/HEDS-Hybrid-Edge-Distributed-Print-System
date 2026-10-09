"use client";

import React, { useState } from "react";
import { X, CheckCheck, SlidersHorizontal } from "lucide-react";
import { ColorMode, Orientation, Scaling } from "./types";

export interface BatchSettingsPayload {
  colorMode?: ColorMode;
  duplex?: boolean;
  copies?: number;
  paperSize?: string;
  orientation?: Orientation;
  scaling?: Scaling;
}

interface ApplyAllSheetProps {
  isOpen: boolean;
  fileCount: number;
  onClose: () => void;
  onApply: (settings: BatchSettingsPayload) => void;
}

export const ApplyAllSheet: React.FC<ApplyAllSheetProps> = ({
  isOpen,
  fileCount,
  onClose,
  onApply,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // State hooks unconditionally called
  const [colorOption, setColorOption] = useState<"keep" | "BW" | "COLOR">("keep");
  const [duplexOption, setDuplexOption] = useState<"keep" | "single" | "duplex">("keep");
  const [copiesOption, setCopiesOption] = useState<number | "keep">("keep");
  const [paperOption, setPaperOption] = useState<string>("keep");
  const [orientationOption, setOrientationOption] = useState<Orientation | "keep">("keep");

  if (!isOpen) return null;

  const handleApply = () => {
    const payload: BatchSettingsPayload = {};
    if (colorOption !== "keep") payload.colorMode = colorOption;
    if (duplexOption !== "keep") payload.duplex = duplexOption === "duplex";
    if (copiesOption !== "keep") payload.copies = copiesOption;
    if (paperOption !== "keep") payload.paperSize = paperOption;
    if (orientationOption !== "keep") payload.orientation = orientationOption;

    onApply(payload);
    onClose();
  };

  const hasSelections =
    colorOption !== "keep" ||
    duplexOption !== "keep" ||
    copiesOption !== "keep" ||
    paperOption !== "keep" ||
    orientationOption !== "keep";

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
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Apply to All Files</h3>
              <p className="text-[11px] text-slate-500">
                Updating {fileCount} documents in batch
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

        {/* Options */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Color */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Color</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "keep", label: "Keep ind." },
                { id: "BW", label: "B&W" },
                { id: "COLOR", label: "Color" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColorOption(opt.id as any)}
                  className={`min-h-[44px] px-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    colorOption === opt.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sides */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Sides</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "keep", label: "Keep ind." },
                { id: "single", label: "Single" },
                { id: "duplex", label: "Duplex" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDuplexOption(opt.id as any)}
                  className={`min-h-[44px] px-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    duplexOption === opt.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Copies */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Copies</label>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => setCopiesOption("keep")}
                className={`min-h-[44px] px-1 col-span-2 rounded-xl border text-center text-xs font-semibold ${
                  copiesOption === "keep"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                Keep ind.
              </button>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCopiesOption(num)}
                  className={`min-h-[44px] px-1 rounded-xl border text-center text-xs font-mono font-bold ${
                    copiesOption === num
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          {/* Paper Size */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Paper Size</label>
            <select
              value={paperOption}
              onChange={(e) => setPaperOption(e.target.value)}
              className="w-full min-h-[44px] px-3 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="keep">Keep individual settings</option>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="LETTER">Letter</option>
            </select>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-800">
            Page ranges are safely preserved per file.
          </div>
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
            disabled={!hasSelections}
            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Apply to All ({fileCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
