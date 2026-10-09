import React from "react";
import { cn } from "@/lib/utils";

interface Option<T> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SegmentedControlProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string | boolean>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center justify-center py-2.5 px-3 rounded-md min-h-[44px] transition-all text-xs font-medium select-none focus:outline-hidden",
              isSelected
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <span>{option.label}</span>
            {option.sublabel && (
              <span
                className={cn(
                  "text-[10px] mt-0.5",
                  isSelected ? "text-blue-600 font-normal" : "text-slate-400"
                )}
              >
                {option.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
