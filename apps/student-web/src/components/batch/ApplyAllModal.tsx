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

interface ApplyAllModalProps {
  isOpen: boolean;
  fileCount: number;
  onClose: () => void;
  onApply: (settings: BatchSettingsPayload) => void;
}

export const ApplyAllModal: React.FC<ApplyAllModalProps> = ({
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
  const [scalingOption, setScalingOption] = useState<Scaling | "keep">("keep");

  if (!isOpen) return null;

  const handleApply = () => {
    const payload: BatchSettingsPayload = {};
    if (colorOption !== "keep") payload.colorMode = colorOption;
    if (duplexOption !== "keep") payload.duplex = duplexOption === "duplex";
    if (copiesOption !== "keep") payload.copies = copiesOption;
    if (paperOption !== "keep") payload.paperSize = paperOption;
    if (orientationOption !== "keep") payload.orientation = orientationOption;
    if (scalingOption !== "keep") payload.scaling = scalingOption;

    onApply(payload);
    onClose();
  };

  const hasSelections =
    colorOption !== "keep" ||
    duplexOption !== "keep" ||
    copiesOption !== "keep" ||
    paperOption !== "keep" ||
    orientationOption !== "keep" ||
    scalingOption !== "keep";

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
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Apply Settings to All</h3>
              <p className="text-xs text-slate-500">
                Updating {fileCount} documents in current batch
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

        {/* Form */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Color */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Color</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "keep", label: "Keep individual" },
                { id: "BW", label: "B&W" },
                { id: "COLOR", label: "Color" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColorOption(opt.id as any)}
                  className={`py-1.5 px-2 rounded-md border text-center text-[11px] font-medium transition-all ${
                    colorOption === opt.id
                      ? "bg-slate-900 text-white border-slate-900 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "keep", label: "Keep individual" },
                { id: "single", label: "Single-sided" },
                { id: "duplex", label: "Duplex" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDuplexOption(opt.id as any)}
                  className={`py-1.5 px-2 rounded-md border text-center text-[11px] font-medium transition-all ${
                    duplexOption === opt.id
                      ? "bg-slate-900 text-white border-slate-900 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
            <div className="grid grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => setCopiesOption("keep")}
                className={`py-1.5 px-1 col-span-2 rounded-md border text-center text-[11px] font-medium transition-all ${
                  copiesOption === "keep"
                    ? "bg-slate-900 text-white border-slate-900 font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Keep ind.
              </button>
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCopiesOption(num)}
                  className={`py-1.5 px-1 rounded-md border text-center text-[11px] font-mono font-medium transition-all ${
                    copiesOption === num
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {num}
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
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="keep">Keep individual settings</option>
              <option value="A4">A4 Standard</option>
              <option value="A3">A3 Large</option>
              <option value="LETTER">Letter</option>
              <option value="LEGAL">Legal</option>
            </select>
          </div>

          {/* Orientation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Orientation</label>
            <select
              value={orientationOption}
              onChange={(e) => setOrientationOption(e.target.value as any)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="keep">Keep individual settings</option>
              <option value="PORTRAIT">Portrait</option>
              <option value="LANDSCAPE">Landscape</option>
              <option value="AUTO">Auto</option>
            </select>
          </div>

          <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800">
            <span className="font-semibold">Note:</span> Page ranges are preserved per document to avoid conflicts across different page lengths.
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
            disabled={!hasSelections}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply to All ({fileCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
