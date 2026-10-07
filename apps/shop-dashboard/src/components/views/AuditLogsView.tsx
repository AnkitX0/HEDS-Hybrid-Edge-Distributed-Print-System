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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Audit Trail</h1>
          <p className="text-xs text-slate-500">
            Immutable audit records capturing all order state machine transitions, print dispatches, and operator interventions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-56 sm:w-64">
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by action, actor..."
              icon={<Search className="w-3.5 h-3.5" />}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading && logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p>Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={filterQuery ? "No matching audit events" : "No audit records found"}
              description={
                filterQuery
                  ? `No events match "${filterQuery}".`
                  : "Audit records will appear here as state transitions and operations occur."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Context / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={
                            log.actor_type === "SYSTEM"
                              ? "neutral"
                              : log.actor_type === "OPERATOR"
                              ? "info"
                              : "default"
                          }
                        >
                          {log.actor_type}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {log.action}
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <span>{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-slate-400 text-[11px] block">
                            {log.resource_id.slice(0, 8)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 font-sans max-w-sm truncate text-xs">
                        {log.metadata?.reason ||
                          log.metadata?.transition ||
                          JSON.stringify(log.metadata || {})}
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
