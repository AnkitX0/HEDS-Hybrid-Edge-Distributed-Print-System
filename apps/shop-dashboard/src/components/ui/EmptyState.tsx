import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-slate-200 rounded-md", className)}>
      {Icon && (
        <div className="p-2.5 bg-slate-100 rounded-full text-slate-500 mb-2.5">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
      )}
      <h4 className="text-xs font-semibold text-slate-900">{title}</h4>
      {description && <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{description}</p>}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
};
