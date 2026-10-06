import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "HEDS — Student Print Portal",
  description: "Instant cloud print queue and private contactless pickup for students",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <QueryProvider>
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50 px-4 py-3 shadow-sm">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                  H
                </div>
                <div>
                  <span className="font-bold text-slate-900 tracking-tight">HEDS</span>
                  <span className="text-xs text-slate-500 block leading-none">Smart Print Queue</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Student PWA
              </span>
            </div>
          </header>

          <main className="flex-1 max-w-md w-full mx-auto p-4">{children}</main>

          <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
            HEDS Hybrid Edge Distributed Print System &copy; 2026
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
