"use client";

import React, { useState } from "react";
import { Printer, RefreshCw, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
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
  const [selectedDetails, setSelectedDetails] = useState<PrinterItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Printers & Hardware</h1>
          <p className="text-xs text-slate-500">
            Physical printers connected to local edge agents. The scheduler assigns matching jobs based on capabilities.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
        >
          Refresh Status
        </Button>
      </div>

      {/* Grid of Printers */}
      {isLoading && printers.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 space-y-2 border border-slate-200 rounded-xl bg-white">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p>Connecting to printer hardware...</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <EmptyState
            title="No printers connected"
            description="Ensure the local HEDS edge print agent is running on your shop computer."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((printer) => {
            const hasError = !!printer.last_error;
            const paperSizes = printer.capabilities?.paper_sizes || ["A4"];
            const supportsColor = printer.capabilities?.color ?? false;
            const supportsDuplex = printer.capabilities?.duplex ?? true;

            return (
              <div
                key={printer.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{printer.name}</h3>
                      <p className="text-xs text-slate-500">
                        Adapter: {printer.adapter_type}
                      </p>
                    </div>
                  </div>

                  <StatusIndicator status={printer.status} />
                </div>

                {/* Error Banner if applicable */}
                {hasError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Hardware Alert:</span>
                      <span>{printer.last_error}</span>
                    </div>
                  </div>
                )}

                {/* Info Rows (Section 26) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-500">Current Job:</span>
                    <span className="font-medium text-slate-900 font-mono">
                      {printer.current_job_id ? printer.current_job_id.slice(0, 8) : "Idle"}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-500">Capabilities:</span>
                    <span className="font-medium text-slate-800">
                      {paperSizes.join(", ")} &bull; {supportsColor ? "Color" : "B&W"} &bull;{" "}
                      {supportsDuplex ? "Duplex" : "Simplex"}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-500">Edge Agent:</span>
                    <span className="font-mono text-slate-700">
                      {printer.agent_name || "campus-agent-01"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedDetails(printer)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">{selectedDetails.name}</h3>
              <button
                onClick={() => setSelectedDetails(null)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">ID:</span>
                <span className="font-mono text-slate-800">{selectedDetails.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-emerald-700">{selectedDetails.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Adapter Type:</span>
                <span className="font-mono text-slate-800">{selectedDetails.adapter_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Agent:</span>
                <span className="font-mono text-slate-800">{selectedDetails.agent_name || "campus-agent-01"}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDetails(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
