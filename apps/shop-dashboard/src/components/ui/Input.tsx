import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, icon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "h-9 px-3 text-xs bg-white border border-slate-300 rounded shadow-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500 w-full",
              icon && "pl-8",
              error && "border-rose-500 focus:ring-rose-500 focus:border-rose-500",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <span className="text-xs text-rose-600 font-medium">{error}</span>
        ) : helpText ? (
          <span className="text-xs text-slate-500">{helpText}</span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
