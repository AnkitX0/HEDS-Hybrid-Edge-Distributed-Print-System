import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-lg bg-slate-900/40 my-2">
      <div className="w-9 h-9 rounded-md bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3">
        {icon || <FolderOpen className="w-5 h-5" />}
      </div>
      <h3 className="text-xs font-semibold text-slate-200">{title}</h3>
      {description && <p className="text-[11px] text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
