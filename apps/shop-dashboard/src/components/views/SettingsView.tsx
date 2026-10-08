import React, { useState } from "react";
import { Settings, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SettingsViewProps {
  shopData: any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ shopData }) => {
  const [shopName, setShopName] = useState(shopData?.name || "Campus Xerox & Print Hub");
  const [contactEmail, setContactEmail] = useState("operator@campus-xerox.local");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Shop Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage store information and general options</p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <Input
            label="Print Shop Name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />

          <Input
            label="Operator Contact Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-mono">HEDS v0.1.0 Config</span>
            <Button type="submit" variant="primary" size="md">
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved Settings!" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
