"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  BatchDocumentItem,
  ColorMode,
  Orientation,
  Scaling,
  Margins,
  ShopPricing,
} from "./types";

interface FileConfigModalProps {
  isOpen: boolean;
  item: BatchDocumentItem | null;
  shopPricing?: ShopPricing;
  onClose: () => void;
  onSave: (updatedItem: BatchDocumentItem) => void;
}

export function parseAndValidatePageRange(
  rangeStr: string,
  totalPages: number
): { valid: boolean; activePages: number; error?: string } {
  const trimmed = rangeStr.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return { valid: true, activePages: Math.max(1, totalPages) };
  }
  const parts = trimmed.split(",");
  const pagesSet = new Set<number>();
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes("-")) {
      const [startStr, endStr] = p.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        return { valid: false, activePages: 0, error: `Invalid range "${p}". Format as e.g. 1-3,5` };
      }
      if (end > totalPages) {
        return {
          valid: false,
          activePages: 0,
          error: `Page ${end} exceeds total document pages (${totalPages})`,
        };
      }
      for (let i = start; i <= end; i++) pagesSet.add(i);
    } else {
      const pageNum = parseInt(p, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return { valid: false, activePages: 0, error: `Invalid page number "${p}"` };
      }
      if (pageNum > totalPages) {
        return {
          valid: false,
          activePages: 0,
          error: `Page ${pageNum} exceeds total document pages (${totalPages})`,
        };
      }
      pagesSet.add(pageNum);
    }
  }
  if (pagesSet.size === 0) {
    return { valid: false, activePages: 0, error: "No valid pages specified" };
  }
  return { valid: true, activePages: pagesSet.size };
}

export const FileConfigModal: React.FC<FileConfigModalProps> = ({
  isOpen,
  item,
  shopPricing,
  onClose,
  onSave,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const ext = item?.name.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);

  // Form State (unconditional to obey React Rules of Hooks)
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<ColorMode>("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [orientation, setOrientation] = useState<Orientation>("PORTRAIT");
  const [pageRangeMode, setPageRangeMode] = useState<"all" | "custom">("all");
  const [customPageRange, setCustomPageRange] = useState<string>("");
  const [scaling, setScaling] = useState<Scaling>("FIT");
  const [margins, setMargins] = useState<Margins>("DEFAULT");
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setCopies(item.copies || 1);
      setColorMode(item.color_mode || "BW");
      setDuplex(isImage ? false : item.duplex || false);
      setPaperSize(item.paper_size || "A4");
      setOrientation(item.orientation || "PORTRAIT");
      setPageRangeMode(
        item.page_range_mode || (item.page_range && item.page_range !== "all" ? "custom" : "all")
      );
      setCustomPageRange(item.page_range && item.page_range !== "all" ? item.page_range : "");
      setScaling(item.scaling || "FIT");
      setMargins(item.margins || "DEFAULT");
      setRangeError(null);
    }
  }, [item, isImage]);

  if (!isOpen || !item) return null;

  // Validate range on change
  const handleRangeChange = (val: string) => {
    setCustomPageRange(val);
    if (!val.trim()) {
      setRangeError("Enter page range (e.g. 1-3, 5)");
      return;
    }
    const check = parseAndValidatePageRange(val, item.page_count);
    if (!check.valid) {
      setRangeError(check.error || "Invalid page range");
    } else {
      setRangeError(null);
    }
  };

  // Live estimated item price
  const calculateEstimatedPrice = () => {
    const bwRate = shopPricing?.bw_per_page_cents ?? 100;
    const colorRate = shopPricing?.color_per_page_cents ?? 1000;
    const duplexDiscount = shopPricing?.duplex_discount_cents ?? 50;

    let activePages = item.page_count || 1;
    if (!isImage && pageRangeMode === "custom") {
      const check = parseAndValidatePageRange(customPageRange, item.page_count);
      if (check.valid) activePages = check.activePages;
    }

    const rate = colorMode === "COLOR" ? colorRate : bwRate;
    const rawTotal = rate * activePages * copies;
    const discount = duplex ? Math.floor(activePages / 2) * duplexDiscount * copies : 0;
    const priceCents = Math.max(0, rawTotal - discount);
    return (priceCents / 100).toFixed(2);
  };

  const handleSave = () => {
    if (!isImage && pageRangeMode === "custom") {
      const check = parseAndValidatePageRange(customPageRange, item.page_count);
      if (!check.valid) {
        setRangeError(check.error || "Please fix page range error");
        return;
      }
    }

    const effectiveRange =
      !isImage && pageRangeMode === "custom" && customPageRange.trim()
        ? customPageRange.trim()
        : "all";

    onSave({
      ...item,
      copies: Math.max(1, copies),
      color_mode: colorMode,
      duplex: isImage ? false : duplex,
      paper_size: paperSize,
      page_range_mode: pageRangeMode,
      page_range: effectiveRange,
      orientation: orientation,
      scaling: scaling,
      margins: margins,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Configure Print
              </h3>
              <p className="text-xs text-slate-500 truncate" title={item.name}>
                {item.name} &bull; {item.page_count} {item.page_count === 1 ? "page" : "pages"}
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Copies */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Copies</label>
            <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden h-9 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="w-10 h-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm border-r border-slate-300 transition-colors"
              >
                &minus;
              </button>
              <span className="w-12 text-center font-mono font-bold text-sm text-slate-900">
                {copies}
              </span>
              <button
                type="button"
                onClick={() => setCopies(Math.min(99, copies + 1))}
                className="w-10 h-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm border-l border-slate-300 transition-colors"
              >
                &#43;
              </button>
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Color</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColorMode("BW")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                  colorMode === "BW"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                B&amp;W {shopPricing && `(₹${(shopPricing.bw_per_page_cents / 100).toFixed(2)}/pg)`}
              </button>
              <button
                type="button"
                onClick={() => setColorMode("COLOR")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                  colorMode === "COLOR"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Color {shopPricing && `(₹${(shopPricing.color_per_page_cents / 100).toFixed(2)}/pg)`}
              </button>
            </div>
          </div>

          {/* Sides (Only relevant for multi-page or PDF/Word) */}
          {!isImage && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Sides</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDuplex(false)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                    !duplex
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Single-sided
                </button>
                <button
                  type="button"
                  onClick={() => setDuplex(true)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                    duplex
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Duplex (Two-sided)
                </button>
              </div>
            </div>
          )}

          {/* Paper Size & Orientation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="A4">A4 Standard</option>
                <option value="A3">A3 Large</option>
                <option value="LETTER">Letter</option>
                <option value="LEGAL">Legal</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as Orientation)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="PORTRAIT">Portrait</option>
                <option value="LANDSCAPE">Landscape</option>
              </select>
            </div>
          </div>

          {/* Pages Range (Hide for single-page images) */}
          {!isImage && (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">Pages</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="pageRangeMode"
                    checked={pageRangeMode === "all"}
                    onChange={() => {
                      setPageRangeMode("all");
                      setRangeError(null);
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>All pages ({item.page_count} pages)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="pageRangeMode"
                    checked={pageRangeMode === "custom"}
                    onChange={() => {
                      setPageRangeMode("custom");
                      if (customPageRange) handleRangeChange(customPageRange);
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Custom pages</span>
                </label>
              </div>

              {pageRangeMode === "custom" && (
                <div className="pt-1 pl-5">
                  <input
                    type="text"
                    placeholder={`e.g. 1-3, 5 (up to ${item.page_count})`}
                    value={customPageRange}
                    onChange={(e) => handleRangeChange(e.target.value)}
                    className={`w-full h-8 px-2.5 text-xs bg-white border rounded-md font-mono ${
                      rangeError
                        ? "border-rose-400 focus:ring-rose-500"
                        : "border-slate-300 focus:ring-blue-600/20 focus:border-blue-600"
                    } focus:outline-none`}
                  />
                  {rangeError && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {rangeError}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Comma-separated list or hyphenated range: 1-3,5,8-10
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Scaling & Margins */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Scaling</label>
              <select
                value={scaling}
                onChange={(e) => setScaling(e.target.value as Scaling)}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="FIT">Fit to page</option>
                <option value="ACTUAL">Actual size (100%)</option>
              </select>
            </div>

            {isImage ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Margins</label>
                <select
                  value={margins}
                  onChange={(e) => setMargins(e.target.value as Margins)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="DEFAULT">Default margins</option>
                  <option value="MINIMAL">Minimal margins</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer with Live Estimate & Save */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Estimated Price
            </span>
            <span className="text-base font-mono font-bold text-slate-900">
              ₹{calculateEstimatedPrice()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={Boolean(rangeError)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
