"use client";

import React from "react";
import { RefreshCw, Server } from "lucide-react";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

interface AgentItem {
  id: string;
  name: string;
  hostname: string;
  os_info: string;
  version: string;
  status: string;
  last_heartbeat_at?: string | null;
  printer_count: number;
}

interface AgentsViewProps {
  agents: AgentItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function AgentsView({ agents, isLoading, onRefresh }: AgentsViewProps) {
  const formatHeartbeat = (timestamp?: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
    if (diffSec < 15) return "Just now (< 15s ago)";
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">HEDS Edge Agents</h2>
          <p className="text-xs text-slate-400">
            Local daemon services running inside physical print shops managing local queues and hardware.
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
          <span>Refresh Agents</span>
        </Button>
      </div>

      {/* Grid of Agents */}
      {isLoading && agents.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-2 border border-slate-800 rounded-md bg-slate-900">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p>Polling edge agent heartbeats...</p>
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          title="No edge agents enrolled"
          description="No HEDS Edge Agents have authenticated with this shop. Run the local daemon to bind printers."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-slate-900 border border-slate-800 rounded-md p-4 space-y-3"
            >
              {/* Agent Title & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-100">{agent.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      Host: <span className="font-mono">{agent.hostname}</span> &bull; {agent.os_info}
                    </p>
                  </div>
                </div>

                <StatusIndicator
                  status={agent.status}
                />
              </div>

              {/* Agent Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[11px] text-slate-400 block">Agent Daemon Version</span>
                  <span className="text-slate-200 font-mono text-xs">
                    v{agent.version}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">Bound Printers</span>
                  <span className="text-slate-200 text-xs font-semibold">
                    {agent.printer_count} {agent.printer_count === 1 ? "device" : "devices"}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400 block">Heartbeat Status</span>
                  <span className="text-slate-200 text-xs font-mono">
                    {formatHeartbeat(agent.last_heartbeat_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
