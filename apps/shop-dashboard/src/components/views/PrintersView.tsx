"use client";

import React from "react";
import { Printer, RefreshCw, AlertTriangle } from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

interface PrinterItem {
  id: string;
  name: string;
  adapter_type: string;
  status: string;
  capabilities?: {
    paper_sizes?: string[];
    color?: boolean;
    duplex?: boolean;
    dpi?: number;
  };
  current_job_id?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  last_error?: string | null;
}

interface PrintersViewProps {
  printers: PrinterItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function PrintersView({ printers, isLoading, onRefresh }: PrintersViewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Printers Infrastructure</h2>
          <p className="text-xs text-slate-400">
            Physical hardware adapters and queue spooling targets registered to this shop.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Hardware</span>
        </Button>
      </div>

      {/* Grid of Printers */}
      {isLoading && printers.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-2 border border-slate-800 rounded-md bg-slate-900">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p>Inspecting printer adapters...</p>
        </div>
      ) : printers.length === 0 ? (
        <EmptyState
          title="No printers registered"
          description="No print hardware or virtual adapters are connected to this shop. Ensure the edge print agent is configured and running."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {printers.map((printer) => {
            const hasError = !!printer.last_error;
            const paperSizes = printer.capabilities?.paper_sizes || ["A4"];
            const supportsColor = printer.capabilities?.color ?? false;

            return (
              <div
                key={printer.id}
                className="bg-slate-900 border border-slate-800 rounded-md p-4 space-y-3"
              >
                {/* Printer Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-100">{printer.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        Adapter: <span className="font-mono">{printer.adapter_type}</span>
                      </p>
                    </div>
                  </div>

                  <StatusIndicator
                    status={printer.status}
                  />
                </div>

                {/* Error Banner if applicable */}
                {hasError && (
                  <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded text-xs text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Hardware Alert:</span>
                      <span className="text-[11px]">{printer.last_error}</span>
                    </div>
                  </div>
                )}

                {/* Capabilities and Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Agent Link</span>
                    <span className="text-slate-200 font-mono text-[11px] truncate block">
                      {printer.agent_name || "Direct Local"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Active Job</span>
                    <span className="text-slate-200 font-mono text-[11px] truncate block">
                      {printer.current_job_id ? printer.current_job_id.slice(0, 8) : "Idle"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Supported Media</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {paperSizes.map((size) => (
                        <span
                          key={size}
                          className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono"
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Color Capabilities</span>
                    <span className="text-slate-200 text-xs">
                      {supportsColor ? "Color + Monochrome" : "Monochrome Only"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
