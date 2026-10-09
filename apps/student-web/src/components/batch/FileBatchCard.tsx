"use client";

import React from "react";
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  Settings,
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
        <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }
    if (isWord) {
      return (
        <div className="w-9 h-9 rounded bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
          <FileCode className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  const formattedSize = (item.size / 1024).toFixed(1) + " KB";

  return (
    <div
      className={`relative bg-white rounded-lg border transition-all duration-150 ${
        item.status === "ERROR"
          ? "border-rose-300 bg-rose-50/20"
          : item.status === "UPLOADING" || item.status === "PROCESSING"
          ? "border-amber-200 bg-amber-50/10"
          : "border-slate-200 hover:border-slate-300 shadow-xs"
      } p-3.5 sm:p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & Details */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {getFileBadge()}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-sm" title={item.name}>
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formattedSize}
              </span>
            </div>

            {/* Status / Configuration Summary line */}
            {item.status === "UPLOADING" && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Uploading file...</span>
              </div>
            )}

            {item.status === "PROCESSING" && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Analyzing & counting pages...</span>
              </div>
            )}

            {item.status === "ERROR" && (
              <div className="flex items-start gap-1.5 mt-1 text-xs text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-tight">
                  {item.error || "Unable to process document"}
                </span>
              </div>
            )}

            {item.status === "READY" && (
              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {item.page_count} {item.page_count === 1 ? "page" : "pages"} detected
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-medium">
                  {item.copies} {item.copies === 1 ? "copy" : "copies"}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-medium">
                  {item.color_mode === "COLOR" ? "Color" : "B&W"}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-medium">
                  {item.duplex ? "Duplex" : "Single-sided"}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {item.paper_size}
                </span>
                {item.page_range && item.page_range !== "all" && (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-mono text-[11px] text-blue-600">
                      Pages: {item.page_range}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Item Price & Position */}
        <div className="text-right shrink-0">
          {item.status === "READY" && item.calculated_price_cents !== undefined && (
            <div className="font-mono font-bold text-sm sm:text-base text-slate-900">
              ₹{(item.calculated_price_cents / 100).toFixed(2)}
            </div>
          )}
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            #{index + 1} of {totalCount}
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {item.status === "READY" && (
            <>
              <button
                type="button"
                onClick={() => onConfigure(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Configure</span>
              </button>

              <button
                type="button"
                onClick={() => onDuplicate(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                title="Duplicate these settings to other files"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Duplicate</span>
              </button>
            </>
          )}

          {/* Reordering Controls */}
          {totalCount > 1 && (
            <div className="flex items-center border border-slate-200 rounded overflow-hidden">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveUp && onMoveUp(index)}
                className="p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move document up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalCount - 1}
                onClick={() => onMoveDown && onMoveDown(index)}
                className="p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent border-l border-slate-200"
                title="Move document down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Remove file from batch"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    </div>
  );
};
