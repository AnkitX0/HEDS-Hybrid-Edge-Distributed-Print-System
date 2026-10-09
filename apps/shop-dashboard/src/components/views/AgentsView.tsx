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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Edge Agents & Devices</h1>
          <p className="text-xs text-slate-500">
            Local daemon services running inside physical print shops managing local queues and hardware.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
        >
          Refresh Agents
        </Button>
      </div>

      {/* Grid of Agents */}
      {isLoading && agents.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 space-y-2 border border-slate-200 rounded-xl bg-white">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p>Scanning edge agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <EmptyState
            title="No edge agents online"
            description="Start the local Python print agent using `make run-agent`."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{agent.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {agent.hostname} &bull; v{agent.version}
                    </p>
                  </div>
                </div>

                <StatusIndicator status={agent.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-500 block">Host OS</span>
                  <span className="font-medium text-slate-800">{agent.os_info || "Linux"}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Connected Printers</span>
                  <span className="font-medium text-slate-800">{agent.printer_count} devices</span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block">Last Cloud Heartbeat</span>
                  <span className="font-medium text-slate-700">
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
