import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "HEDS — Student Print Portal",
  description: "Direct contactless document printing with real-time queue status and private OTP pickup.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between font-sans antialiased">
        <QueryProvider>
          {/* Header */}
          <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-4 py-2.5">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider">
                  H
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-slate-900">
                    HEDS
                  </span>
                  <span className="text-[11px] text-slate-500">Print Portal</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Contactless Pickup
              </span>
            </div>
          </header>

          {/* Main content - mobile-first max-w-md */}
          <main className="flex-1 max-w-md w-full mx-auto p-4">{children}</main>

          {/* Footer */}
          <footer className="text-center py-4 text-[11px] text-slate-500 border-t border-slate-200">
            HEDS &bull; End-to-end hardware queue &bull; Ephemeral retention
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
