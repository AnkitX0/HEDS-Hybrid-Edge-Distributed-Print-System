"use client";

import React from "react";
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  Sliders,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { BatchDocumentItem } from "./types";

interface FileBatchCardProps {
  item: BatchDocumentItem;
  index: number;
  totalCount: number;
  onConfigure: (item: BatchDocumentItem) => void;
  onDuplicate: (item: BatchDocumentItem) => void;
  onRemove: (item: BatchDocumentItem) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const FileBatchCard: React.FC<FileBatchCardProps> = ({
  item,
  index,
  totalCount,
  onConfigure,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const ext = item.name.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);
  const isWord = ["doc", "docx"].includes(ext);

  const getFileBadge = () => {
    if (isImage) {
      return (
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }
    if (isWord) {
      return (
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
          <FileCode className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  const formattedSize = (item.size / 1024).toFixed(0) + " KB";

  return (
    <div
      className={`relative bg-white rounded-xl border transition-all duration-150 ${
        item.status === "ERROR"
          ? "border-rose-300 bg-rose-50/20"
          : item.status === "UPLOADING" || item.status === "PROCESSING"
          ? "border-amber-200 bg-amber-50/10"
          : "border-slate-200 shadow-2xs"
      } p-3.5`}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Icon & Title */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {getFileBadge()}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-slate-900 truncate max-w-[170px]" title={item.name}>
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formattedSize}
              </span>
            </div>

            {/* Status indicators */}
            {item.status === "UPLOADING" && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Uploading...</span>
              </div>
            )}

            {item.status === "PROCESSING" && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Analyzing pages...</span>
              </div>
            )}

            {item.status === "ERROR" && (
              <div className="flex items-start gap-1 mt-1 text-xs text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-tight">
                  {item.error || "Unable to process document"}
                </span>
              </div>
            )}

            {item.status === "READY" && (
              <div className="mt-1 flex items-center gap-1 flex-wrap text-[11px] text-slate-600">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                  {item.page_count} {item.page_count === 1 ? "page" : "pages"}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span>{item.copies}x</span>
                <span className="text-slate-300">&bull;</span>
                <span>{item.color_mode === "COLOR" ? "Color" : "B&W"}</span>
                <span className="text-slate-300">&bull;</span>
                <span>{item.duplex ? "Duplex" : "Single"}</span>
                {item.page_range && item.page_range !== "all" && (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-mono text-blue-600">
                      Pgs {item.page_range}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Item Price & Number */}
        <div className="text-right shrink-0">
          {item.status === "READY" && item.calculated_price_cents !== undefined && (
            <div className="font-mono font-bold text-sm text-slate-900">
              ₹{(item.calculated_price_cents / 100).toFixed(2)}
            </div>
          )}
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            #{index + 1}
          </div>
        </div>
      </div>

      {/* Action Buttons (Touch targets >= 44px) */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-1">
          {item.status === "READY" && (
            <>
              <button
                type="button"
                onClick={() => onConfigure(item)}
                className="min-h-[44px] px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>

              <button
                type="button"
                onClick={() => onDuplicate(item)}
                className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium flex items-center justify-center transition-colors"
                title="Duplicate settings"
                aria-label="Duplicate settings"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {totalCount > 1 && (
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-[44px]">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveUp && onMoveUp(index)}
                className="w-8 h-full flex items-center justify-center hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move document up"
                aria-label="Move document up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={index === totalCount - 1}
                onClick={() => onMoveDown && onMoveDown(index)}
                className="w-8 h-full flex items-center justify-center hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent border-l border-slate-200"
                title="Move document down"
                aria-label="Move document down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Remove Button (min 44x44 touch target) */}
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
          title="Remove file"
          aria-label="Remove file"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
