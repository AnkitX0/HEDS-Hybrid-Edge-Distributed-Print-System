import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "success";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  let variantStyles = "bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-xs";

  switch (variant) {
    case "primary":
      variantStyles = "bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-600";
      break;
    case "secondary":
      variantStyles = "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs";
      break;
    case "outline":
      variantStyles = "bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300";
      break;
    case "success":
      variantStyles = "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600";
      break;
    case "danger":
      variantStyles = "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200";
      break;
    case "ghost":
      variantStyles = "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-transparent";
      break;
  }

  let sizeStyles = "px-3 py-1.5 text-xs font-medium rounded-lg";
  if (size === "sm") sizeStyles = "px-2.5 py-1 text-[11px] font-medium rounded-md";
  if (size === "lg") sizeStyles = "px-4 py-2 text-sm font-semibold rounded-lg";

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
