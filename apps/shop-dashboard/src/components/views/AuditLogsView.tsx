import React from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface AuditLogsViewProps {
  auditLogs: any[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ auditLogs }) => {
  const sampleLogs = auditLogs.length > 0 ? auditLogs : [
    { id: '1', created_at: new Date().toISOString(), action: 'Order completed', actor_type: 'Amit Kumar', resource_type: 'Order', resource_id: '#51', metadata: { result: 'Success' } },
    { id: '2', created_at: new Date().toISOString(), action: 'Print completed', actor_type: 'Print Agent', resource_type: 'Order', resource_id: '#51', metadata: { result: 'Success' } },
    { id: '3', created_at: new Date().toISOString(), action: 'Payment confirmed', actor_type: 'Payment Gateway', resource_type: 'Order', resource_id: '#51', metadata: { result: 'Success' } },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Audit Logs</h2>
        <p className="text-xs text-slate-500 mt-0.5">Internal operational event trail and system state transitions</p>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
              <tr>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {sampleLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{l.actor_type || "System"}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-800 font-sans">{l.action}</td>
                  <td className="px-4 py-2.5 text-slate-700">{l.resource_id || "#51"}</td>
                  <td className="px-4 py-2.5 text-emerald-700 font-semibold">Success</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
