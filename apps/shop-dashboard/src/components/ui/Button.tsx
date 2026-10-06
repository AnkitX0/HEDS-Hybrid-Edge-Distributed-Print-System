import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
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
  let variantStyles = "bg-blue-600 hover:bg-blue-500 text-white border-transparent";

  switch (variant) {
    case "primary":
      variantStyles = "bg-blue-600 hover:bg-blue-500 text-white shadow-sm border border-blue-500/30";
      break;
    case "secondary":
      variantStyles = "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm";
      break;
    case "outline":
      variantStyles = "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700";
      break;
    case "danger":
      variantStyles = "bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80";
      break;
    case "ghost":
      variantStyles = "bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-transparent";
      break;
  }

  let sizeStyles = "px-3 py-1.5 text-xs font-medium rounded-md";
  if (size === "sm") sizeStyles = "px-2 py-1 text-[11px] font-medium rounded";
  if (size === "lg") sizeStyles = "px-4 py-2 text-sm font-semibold rounded-md";

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles} ${sizeStyles} ${className}`}
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
