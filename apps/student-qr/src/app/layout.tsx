import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "HEDS — Mobile Print Client",
  description: "Instant contactless mobile printing for campus shops",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <QueryProvider>
          {/* Centered mobile-optimized layout container */}
          <div className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col bg-white shadow-xs border-x border-slate-200">
            {/* Header */}
            <header className="px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                  H
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs tracking-tight uppercase block leading-none">
                    HEDS
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                    Mobile Print
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                QR Client
              </span>
            </header>

            {/* Mobile App Workspace */}
            <main className="flex-1 p-4 sm:p-5">{children}</main>

            {/* Footer */}
            <footer className="text-center py-3 text-[11px] font-mono text-slate-400 border-t border-slate-100 bg-slate-50">
              HEDS &bull; Hybrid Edge Distributed Print System
            </footer>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
