import React from "react";
import { Printer, Cpu, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";

interface PrintersViewProps {
  printers: any[];
  agents: any[];
}

export const PrintersView: React.FC<PrintersViewProps> = ({ printers, agents }) => {
  const [testingPrinterId, setTestingPrinterId] = React.useState<string | null>(null);
  const [testResult, setTestResult] = React.useState<{ message: string; isError?: boolean } | null>(null);

  const activePrinters = printers.length > 0 ? printers : [
    { id: 'p1', name: 'HP LaserJet Pro 4004', status: 'ONLINE', activity: 'Idle', capabilities: { paper_sizes: ['A4'], color: false, duplex: true } },
    { id: 'p2', name: 'Xerox WorkCentre 7830', status: 'ONLINE', activity: 'Printing', capabilities: { paper_sizes: ['A4', 'A3'], color: true, duplex: true } },
    { id: 'p3', name: 'Canon imageRUNNER 2525', status: 'OFFLINE', activity: 'Power disconnected', capabilities: { paper_sizes: ['A4'], color: false, duplex: true } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Printers & Devices</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {activePrinters.filter(p => p.status === 'ONLINE').length} printers online &bull; {activePrinters.filter(p => p.status === 'OFFLINE').length} offline
        </p>
      </div>

      {testResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            testResult.isError
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <span>{testResult.message}</span>
          <button
            onClick={() => setTestResult(null)}
            className="text-xs underline font-medium ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activePrinters.map((p) => (
          <Card key={p.id} padding="md" className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-700" />
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {p.activity || p.status}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </div>

            {p.last_error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-1.5 font-mono">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{p.last_error}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>{p.capabilities?.color ? "Color & B/W" : "Monochrome"}</span>
              <span>{p.capabilities?.duplex ? "Duplex" : "Single"}</span>
            </div>

            <div className="pt-1 flex flex-col gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                isLoading={testingPrinterId === p.id}
                disabled={testingPrinterId !== null}
                onClick={async () => {
                  setTestingPrinterId(p.id);
                  setTestResult(null);
                  try {
                    const res = await apiClient.post<any>(`/api/v1/shop/printers/${p.id}/test-print`);
                    setTestResult({ message: `Diagnostics test page queued for ${p.name} (Order: ${res.order_number})` });
                  } catch (err: any) {
                    setTestResult({ message: `Failed to queue test print: ${err.message}`, isError: true });
                  } finally {
                    setTestingPrinterId(null);
                  }
                }}
              >
                Test Print Page
              </Button>
            </div>
          </Card>
        ))}
      </div>


      {/* Edge Agent Summary Section */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Edge Agent Health</h3>
          </div>
        }
      >
        {(agents.length > 0 ? agents : [
          { id: 'a1', name: 'campus-agent-01', status: 'ONLINE', os_info: 'Ubuntu 22.04 LTS', version: '0.1.0', last_heartbeat_at: new Date().toISOString() }
        ]).map((a) => (
          <div key={a.id} className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-3">
              <StatusBadge status={a.status} />
              <div>
                <span className="font-bold text-slate-900 font-mono">{a.name}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-slate-600">{a.os_info} (v{a.version})</span>
              </div>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">
              Last heartbeat: 10s ago
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
};
