import Link from "next/link";
import { QrCode, Printer, ShieldCheck, Zap } from "lucide-react";

export default function StudentHomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center space-y-6">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
        <QrCode className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Print Without Standing in Line
        </h1>
        <p className="text-sm text-slate-600 max-w-xs mx-auto">
          Scan the QR code at your campus print shop to upload documents, pay seamlessly, and track your queue in real time.
        </p>
      </div>

      <div className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Demo Print Shops
        </h2>

        <Link
          href="/s/campus-xerox"
          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              CX
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700">
                Campus Xerox & Print Hub
              </p>
              <p className="text-xs text-slate-500">Slug: campus-xerox (Online)</p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-600">&rarr;</span>
        </Link>

        <Link
          href="/s/eng-press"
          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
              EP
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">
                Engineering Block Digital Press
              </p>
              <p className="text-xs text-slate-500">Slug: eng-press</p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">&rarr;</span>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full text-center pt-2">
        <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200/50">
          <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <p className="text-[11px] font-medium text-slate-700">Zero Wait</p>
          <p className="text-[9px] text-slate-400">No WhatsApp</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200/50">
          <Printer className="w-4 h-4 mx-auto text-blue-500 mb-1" />
          <p className="text-[11px] font-medium text-slate-700">Auto Queue</p>
          <p className="text-[9px] text-slate-400">Real-time ETA</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200/50">
          <ShieldCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
          <p className="text-[11px] font-medium text-slate-700">Privacy Hold</p>
          <p className="text-[9px] text-slate-400">OTP Pickup</p>
        </div>
      </div>
    </div>
  );
}
