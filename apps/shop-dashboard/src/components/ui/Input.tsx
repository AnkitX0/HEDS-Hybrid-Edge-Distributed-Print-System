import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, hint, icon, className = "", id, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-white border text-slate-900 placeholder-slate-400 text-xs rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors shadow-xs ${
            icon ? "pl-8 pr-3" : "px-3"
          } ${error ? "border-rose-400 focus:border-rose-600 focus:ring-rose-500/20" : "border-slate-300 hover:border-slate-400"} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
