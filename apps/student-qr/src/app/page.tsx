"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ArrowRight, Search, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function StudentQrHome() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState("");

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (token) {
      router.push(`/orders/${token}`);
    }
  };

  return (
    <div className="space-y-5 py-2">
      {/* Hero Welcome Card */}
      <Card padding="lg" className="border-blue-100 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="info">Zero Wait</Badge>
          <Badge variant="success">Express Queue</Badge>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
          Scan &bull; Upload &bull; Print
        </h1>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Order printouts directly from your phone outside any campus print shop. Collect with your token number.
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600">
          <span>Starting at:</span>
          <span className="font-bold text-slate-900 text-sm">₹1.00 / page</span>
        </div>
      </Card>

      {/* Featured Campus Shop */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider block">
          Available Campus Shop
        </span>

        <Link href="/s/campus-xerox" className="block group">
          <Card padding="md" className="transition-all border-slate-200 group-hover:border-blue-400 group-hover:shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Campus Xerox & Print Hub
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Central Library, Ground Floor
                  </p>
                </div>
              </div>
              <Badge variant="success">OPEN</Badge>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Instant Express Queue
              </span>
              <span className="text-xs font-medium text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Start Printing <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Track Existing Order */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
            Track Existing Print Job
          </h2>
        </div>
        <form onSubmit={handleTrack} className="flex gap-2">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste guest token..."
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-mono"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!tokenInput.trim()}>
            Track
          </Button>
        </form>
      </Card>
    </div>
  );
}
