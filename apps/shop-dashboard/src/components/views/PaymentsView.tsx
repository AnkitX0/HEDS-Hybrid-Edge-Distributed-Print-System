import React from "react";
import { CreditCard, ArrowDownRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";

interface PaymentsViewProps {
  queueItems: any[];
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ queueItems }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Payments</h2>
        <p className="text-xs text-slate-500 mt-0.5">Authoritative payment ledger and gateway logs</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard title="TODAY'S REVENUE" value="₹454.38" variant="active" />
        <MetricCard title="TRANSACTIONS" value={queueItems.length || 36} />
        <MetricCard title="SUCCESS RATE" value="100%" variant="success" />
        <MetricCard title="FAILED PAYMENTS" value="0" />
      </div>

      <Card
        header={
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Recent Payment Ledger</h3>
          </div>
        }
        padding="none"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
              <tr>
                <th className="px-4 py-2.5">Token</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5">Gateway</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {queueItems.map((item) => (
                <tr key={item.job_id || item.order_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{item.order_number}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">
                    ₹{(item.total_amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">UPI / QR</td>
                  <td className="px-4 py-2.5 text-slate-500">Razorpay / Sandbox</td>
                  <td className="px-4 py-2.5"><StatusBadge status="PAID" /></td>
                  <td className="px-4 py-2.5 text-right text-slate-500 text-[11px]">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
