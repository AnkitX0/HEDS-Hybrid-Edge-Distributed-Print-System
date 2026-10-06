"use client";

import React, { useState } from "react";
import { ShieldCheck, RefreshCw, Search } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";

interface AuditLogItem {
  id: string;
  actor_type: string;
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

interface AuditLogsViewProps {
  logs: AuditLogItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function AuditLogsView({ logs, isLoading, onRefresh }: AuditLogsViewProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor_type.toLowerCase().includes(q) ||
      log.resource_type.toLowerCase().includes(q) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Audit Trail & Event Log</h2>
          <p className="text-xs text-slate-400">
            Immutable audit records capturing all state machine transitions, dispatches, and operator interventions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Trail</span>
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-md flex items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by action, actor, resource..."
            className="h-8 text-xs bg-slate-950"
          />
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">
          Showing {filteredLogs.length} events
        </span>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-md bg-slate-900 overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p>Loading audit ledger...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit entries"
            description={
              filterQuery
                ? `No events match "${filterQuery}".`
                : "No system events or operator actions have been recorded yet."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  <th className="px-3.5 py-2.5">Timestamp</th>
                  <th className="px-3.5 py-2.5">Action</th>
                  <th className="px-3.5 py-2.5">Actor</th>
                  <th className="px-3.5 py-2.5">Resource</th>
                  <th className="px-3.5 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredLogs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/40 transition-colors font-normal"
                    >
                      <td className="px-3.5 py-2 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <span className="font-semibold text-slate-200">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <Badge variant="neutral">
                          {log.actor_type}
                        </Badge>
                      </td>

                      <td className="px-3.5 py-2 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {log.resource_type}
                        {log.resource_id && (
                          <span className="text-slate-500 ml-1">
                            ({log.resource_id.slice(0, 8)})
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-2 text-slate-400 text-[11px] max-w-xs truncate font-mono">
                        {log.metadata && Object.keys(log.metadata).length > 0
                          ? JSON.stringify(log.metadata)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
