import Link from "next/link";
import { QrCode, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function StudentHomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-5 max-w-lg mx-auto">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-md flex items-center justify-center shadow-xs">
        <QrCode className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Print Without Standing in Line
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Scan shop QR code to upload documents, configure print settings, pay, and track your token in real time
        </p>
      </div>

      <Card padding="md" className="w-full text-left space-y-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
          Available Campus Print Shops
        </span>

        <Link
          href="/s/campus-xerox"
          className="flex items-center justify-between p-3 rounded border border-slate-200 hover:border-blue-600 bg-white hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 font-mono font-bold text-xs flex items-center justify-center">
              CX
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 group-hover:text-blue-600">
                Campus Xerox & Print Hub
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Slug: campus-xerox</p>
            </div>
          </div>
          <StatusBadge status="ONLINE" label="Open" />
        </Link>
      </Card>
    </div>
  );
}
