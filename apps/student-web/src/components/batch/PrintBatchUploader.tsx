"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Plus, FileText, AlertCircle } from "lucide-react";

interface PrintBatchUploaderProps {
  onFilesAdded: (newFiles: File[]) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

const ALLOWED_EXTS = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const PrintBatchUploader: React.FC<PrintBatchUploaderProps> = ({
  onFilesAdded,
  isProcessing = false,
  disabled = false,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFiles = (fileList: FileList | File[]) => {
    setErrorMsg(null);
    const files = Array.from(fileList);
    if (!files.length) return;

    const validFiles: File[] = [];
    const invalidNames: string[] = [];
    const oversizedNames: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTS.includes(ext)) {
        invalidNames.push(file.name);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        oversizedNames.push(file.name);
        continue;
      }
      validFiles.push(file);
    }

    if (invalidNames.length > 0) {
      setErrorMsg(
        `Unsupported format: ${invalidNames.slice(0, 2).join(", ")}${
          invalidNames.length > 2 ? ` and ${invalidNames.length - 2} more` : ""
        }. Allowed: PDF, DOC, DOCX, JPG, PNG.`
      );
    } else if (oversizedNames.length > 0) {
      setErrorMsg(
        `File exceeds 50MB limit: ${oversizedNames.slice(0, 2).join(", ")}`
      );
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    }

    // Reset input so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="w-full space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer text-center select-none ${
          isDragOver
            ? "border-blue-600 bg-blue-50/70"
            : "border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-slate-50"
        } ${compact ? "p-4" : "p-6 md:p-8"} ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Drag & drop files here
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              or click to browse from device
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Files</span>
          </button>

          <div className="pt-1 border-t border-slate-200/80 w-full max-w-xs">
            <p className="text-[11px] font-medium text-slate-500 tracking-wide">
              PDF &bull; DOC &bull; DOCX &bull; JPG &bull; PNG
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Max 50MB per file &bull; Multi-file batch supported
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
