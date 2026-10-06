import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "HEDS — Shop Operations Console",
  description: "Real-time print queue management, edge agent monitoring, and privacy pickup verification",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
