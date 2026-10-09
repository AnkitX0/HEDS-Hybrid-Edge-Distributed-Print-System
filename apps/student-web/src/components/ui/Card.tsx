import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  header,
  footer,
  padding = "md",
}) => {
  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-5",
    lg: "p-6",
  };

  return (
    <div className={cn("bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden", className)}>
      {header && <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">{header}</div>}
      <div className={paddings[padding]}>{children}</div>
      {footer && <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">{footer}</div>}
    </div>
  );
};
