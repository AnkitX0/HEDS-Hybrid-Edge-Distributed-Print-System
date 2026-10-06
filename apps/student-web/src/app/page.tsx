import Link from "next/link";
import { QrCode, ArrowRight, Store } from "lucide-react";

export default function StudentHomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
      <div className="text-center space-y-1.5">
        <div className="w-10 h-10 bg-slate-200 text-slate-800 rounded-md mx-auto flex items-center justify-center mb-3">
          <QrCode className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
          Scan Shop Counter QR
        </h1>
        <p className="text-xs text-slate-600 max-w-xs mx-auto">
          Scan the QR code displayed at your campus print shop to upload documents, configure pages, and pay.
        </p>
      </div>

      {/* Local Storefront Selector */}
      <div className="w-full bg-white rounded-md border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-slate-500 pb-1 border-b border-slate-100">
          <Store className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">
            Available Print Shops
          </span>
        </div>

        <div className="space-y-2">
          <Link
            href="/s/campus-xerox"
            className="flex items-center justify-between p-3 rounded border border-slate-200 hover:border-blue-500 hover:bg-slate-50 transition-colors group"
          >
            <div>
              <p className="font-semibold text-xs text-slate-900 group-hover:text-blue-600">
                Campus Xerox & Print Hub
              </p>
              <p className="text-[11px] text-slate-500 font-mono">/s/campus-xerox &bull; Active</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          <Link
            href="/s/eng-press"
            className="flex items-center justify-between p-3 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors group"
          >
            <div>
              <p className="font-semibold text-xs text-slate-900">
                Engineering Block Digital Press
              </p>
              <p className="text-[11px] text-slate-500 font-mono">/s/eng-press</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 max-w-xs">
        No account required. Your order will be assigned a secure guest access token for live queue tracking and pickup verification.
      </div>
    </div>
  );
}
