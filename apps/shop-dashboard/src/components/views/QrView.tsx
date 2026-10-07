"use client";

import React, { useState } from "react";
import { QrCode, Copy, Check, ExternalLink, Printer } from "lucide-react";
import { Button } from "../ui/Button";

interface QrViewProps {
  shopSlug: string;
  shopName: string;
}

export function QrView({ shopSlug, shopName }: QrViewProps) {
  const [copied, setCopied] = useState(false);
  const activeSlug = shopSlug || "campus-xerox";
  const studentPath = `/s/${activeSlug}`;
  const studentUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3000${studentPath}`
    : `http://localhost:3000${studentPath}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Counter Storefront QR</h1>
          <p className="text-xs text-slate-500">
            Print this poster for your checkout counter. Students scan to upload documents directly into the automated queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrintPoster}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Counter Poster
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={copyToClipboard}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* Main Counter Poster Frame (Optimized for both screen and print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-2xs flex flex-col items-center">
        {/* Printable Card Area */}
        <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-8 shadow-md flex flex-col items-center text-center space-y-6 border border-slate-200">
          {/* Brand & Shop Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs tracking-wider">
              <span>HEDS FAST PRINT</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 pt-1">
              {shopName || "Campus Xerox & Print Hub"}
            </h2>
            <p className="text-xs text-slate-500">
              Skip the queue &bull; Print directly from your phone
            </p>
          </div>

          {/* High-Resolution QR Graphic Box */}
          <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-xl shadow-inner flex flex-col items-center">
            <svg
              className="w-48 h-48 text-slate-950"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              {/* Outer Top-Left Finder */}
              <rect x="5" y="5" width="26" height="26" rx="2" fill="currentColor" />
              <rect x="9" y="9" width="18" height="18" fill="white" />
              <rect x="13" y="13" width="10" height="10" fill="currentColor" />

              {/* Outer Top-Right Finder */}
              <rect x="69" y="5" width="26" height="26" rx="2" fill="currentColor" />
              <rect x="73" y="9" width="18" height="18" fill="white" />
              <rect x="77" y="13" width="10" height="10" fill="currentColor" />

              {/* Outer Bottom-Left Finder */}
              <rect x="5" y="69" width="26" height="26" rx="2" fill="currentColor" />
              <rect x="9" y="73" width="18" height="18" fill="white" />
              <rect x="13" y="77" width="10" height="10" fill="currentColor" />

              {/* Timing Patterns */}
              <rect x="35" y="15" width="4" height="4" />
              <rect x="43" y="15" width="4" height="4" />
              <rect x="51" y="15" width="4" height="4" />
              <rect x="59" y="15" width="4" height="4" />

              <rect x="15" y="35" width="4" height="4" />
              <rect x="15" y="43" width="4" height="4" />
              <rect x="15" y="51" width="4" height="4" />
              <rect x="15" y="59" width="4" height="4" />

              {/* Center & Data Matrix Grid */}
              <rect x="35" y="35" width="8" height="8" rx="1" />
              <rect x="47" y="35" width="6" height="6" />
              <rect x="57" y="35" width="6" height="6" />
              <rect x="35" y="47" width="6" height="6" />
              <rect x="45" y="45" width="10" height="10" fill="#2563eb" rx="2" />
              <rect x="59" y="47" width="6" height="6" />
              <rect x="35" y="57" width="6" height="6" />
              <rect x="47" y="57" width="6" height="6" />
              <rect x="57" y="57" width="8" height="8" rx="1" />

              {/* Dense Data Dots */}
              <rect x="35" y="69" width="4" height="4" />
              <rect x="43" y="75" width="4" height="4" />
              <rect x="51" y="69" width="4" height="4" />
              <rect x="59" y="75" width="4" height="4" />
              <rect x="69" y="35" width="4" height="4" />
              <rect x="75" y="43" width="4" height="4" />
              <rect x="81" y="35" width="4" height="4" />
              <rect x="87" y="43" width="4" height="4" />
              <rect x="69" y="51" width="4" height="4" />
              <rect x="75" y="59" width="4" height="4" />
              <rect x="69" y="69" width="6" height="6" />
              <rect x="79" y="69" width="6" height="6" />
              <rect x="75" y="79" width="6" height="6" />
              <rect x="85" y="81" width="6" height="6" />
            </svg>
            <span className="text-[10px] font-mono font-bold text-slate-500 mt-2 uppercase tracking-widest">
              SCAN WITH PHONE
            </span>
          </div>

          {/* 3 Steps */}
          <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-800">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                1
              </span>
              <span className="font-semibold">Scan QR with phone camera</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                2
              </span>
              <span className="font-semibold">Upload PDF or Photos (No Login Needed)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center font-mono shrink-0">
                3
              </span>
              <span className="font-semibold">Show Token & 6-digit OTP at counter</span>
            </div>
          </div>

          {/* Direct Link */}
          <div className="pt-1 text-center space-y-1">
            <span className="text-[11px] text-slate-500 block">
              Store URL:
            </span>
            <span className="text-xs font-mono font-bold text-blue-600 underline">
              {studentUrl}
            </span>
          </div>
        </div>

        {/* Action Controls below */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrintPoster}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Counter Flyer
          </Button>

          <a
            href={studentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
          >
            <span>Open Student Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
