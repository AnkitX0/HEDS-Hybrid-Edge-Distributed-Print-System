import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "HEDS — Student Print Portal",
  description: "Instant cloud print queue and contactless pickup for students",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
        <QueryProvider>
          {/* Header */}
          <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 py-3">
            <div className="max-w-xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                  H
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs tracking-tight uppercase block leading-none">HEDS</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Print Automation</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                Student Access
              </span>
            </div>
          </header>

          {/* Main Content Workspace (Centered on desktop max-w-2xl) */}
          <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">{children}</main>

          {/* Footer */}
          <footer className="text-center py-4 text-[11px] font-mono text-slate-400 border-t border-slate-200">
            HEDS Hybrid Edge Distributed Print System &bull; Campus Xerox & Print Hub
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
