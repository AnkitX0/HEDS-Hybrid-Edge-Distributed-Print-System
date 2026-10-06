"use client";

import React, { useState } from "react";
import { QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button";

interface QrViewProps {
  shopSlug: string;
  shopName: string;
}

export function QrView({ shopSlug, shopName }: QrViewProps) {
  const [copied, setCopied] = useState(false);
  const studentUrl = `http://localhost:3000/s/${shopSlug || "campus-xerox"}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Shop QR & Student Entry URL</h2>
        <p className="text-xs text-slate-400">
          Direct storefront link for walk-up students. No account or password required.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-md p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Functional QR Preview box */}
          <div className="p-4 bg-white rounded-md shadow-sm shrink-0 flex flex-col items-center justify-center">
            <QrCode className="w-32 h-32 text-slate-900" />
            <span className="text-[10px] font-mono text-slate-600 mt-1 uppercase font-semibold">
              {shopSlug}
            </span>
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{shopName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Print counter placement QR. Scanning directs the student straight to your document upload and authoritative pricing pipeline.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-medium">Public Storefront URL:</span>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 select-all break-all">
                {studentUrl}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied URL" : "Copy URL"}</span>
              </Button>

              <a
                href={studentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1"
              >
                <span>Open in Browser</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Operational Best Practice</p>
          <p>
            Print and laminate this QR code at your checkout counter. Students can submit multi-page PDF jobs from their phone while waiting, automatically receiving real-time queue position and Pickup OTP codes upon completion.
          </p>
        </div>
      </div>
    </div>
  );
}
