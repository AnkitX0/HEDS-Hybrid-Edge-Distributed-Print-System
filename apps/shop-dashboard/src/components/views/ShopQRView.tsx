import React from "react";
import { QrCode, Download, Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ShopQRViewProps {
  shopSlug?: string;
  shopName?: string;
}

export const ShopQRView: React.FC<ShopQRViewProps> = ({ shopSlug = "campus-xerox", shopName = "Campus Xerox & Print Hub" }) => {
  const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:3002` : "http://localhost:3002");
  const portalUrl = baseUrl.endsWith("/") ? `${baseUrl}s/${shopSlug}` : `${baseUrl}/s/${shopSlug}`;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Storefront QR Poster</h2>
        <p className="text-xs text-slate-500 mt-0.5">Students scan this QR code to access instant queue without downloading an app</p>
      </div>

      <Card padding="lg" className="text-center space-y-4 border-slate-300">
        <div className="p-4 bg-slate-900 text-white rounded-md inline-block shadow-md">
          <QrCode className="w-32 h-32 mx-auto" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">{shopName}</h3>
          <p className="text-xs font-semibold text-blue-600 mt-0.5">Scan to Print Instantly</p>
        </div>

        <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-700 flex justify-around">
          <span>B&W: <strong>₹1/page</strong></span>
          <span>Color: <strong>₹10/page</strong></span>
          <span>Paper: <strong>A4</strong></span>
        </div>

        <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 break-all select-all">
          {portalUrl}
        </div>

        <div className="pt-2 flex gap-2 justify-center">
          <Button variant="outline" size="md">
            <Download className="w-3.5 h-3.5" />
            Download QR
          </Button>
          <Button variant="primary" size="md">
            <Printer className="w-3.5 h-3.5" />
            Print Poster
          </Button>
        </div>
      </Card>
    </div>
  );
};
