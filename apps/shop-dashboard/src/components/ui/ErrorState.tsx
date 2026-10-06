import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Error loading data",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="p-4 border border-rose-900/50 bg-rose-950/20 rounded-lg flex items-start gap-3 my-2 text-xs">
      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <h4 className="font-semibold text-rose-200">{title}</h4>
        <p className="text-slate-300 text-[11px] leading-relaxed">{message}</p>
        {onRetry && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              icon={<RefreshCw className="w-3 h-3" />}
            >
              Retry request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
