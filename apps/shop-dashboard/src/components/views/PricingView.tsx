import React, { useState } from "react";
import { Tag, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PricingViewProps {
  pricingRules: any[];
}

export const PricingView: React.FC<PricingViewProps> = ({ pricingRules }) => {
  const [bwRate, setBwRate] = useState("1.00");
  const [colorRate, setColorRate] = useState("10.00");
  const [duplexDiscount, setDuplexDiscount] = useState("0.50");
  const [minOrder, setMinOrder] = useState("1.00");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Pricing Configuration</h2>
        <p className="text-xs text-slate-500 mt-0.5">Current shop rates enforced on student checkout calculations</p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Black & White (per page)"
              value={bwRate}
              onChange={(e) => setBwRate(e.target.value)}
              placeholder="1.00"
            />
            <Input
              label="Color (per page)"
              value={colorRate}
              onChange={(e) => setColorRate(e.target.value)}
              placeholder="10.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duplex Discount (per sheet)"
              value={duplexDiscount}
              onChange={(e) => setDuplexDiscount(e.target.value)}
              placeholder="0.50"
            />
            <Input
              label="Minimum Order Amount"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="1.00"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-mono">Backend is authoritative</span>
            <Button type="submit" variant="primary" size="md">
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved Changes!" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
