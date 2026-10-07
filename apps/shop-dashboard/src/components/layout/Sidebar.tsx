import React from "react";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Printer,
  PackageCheck,
  CreditCard,
  BarChart3,
  Tag,
  QrCode,
  Settings,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "queue"
  | "orders"
  | "pickup"
  | "printers"
  | "agents"
  | "analytics"
  | "payments"
  | "pricing"
  | "audit"
  | "qr"
  | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  shopName: string;
  operatorName: string;
  onLogout: () => void;
  waitingQueueCount?: number;
  pickupReadyCount?: number;
  availableShops?: Array<{ id: string; name: string; slug: string; is_queue_paused?: boolean }>;
  selectedShopId?: string | null;
  onSelectShop?: (shopId: string) => void;
}

export function Sidebar({
  currentTab,
  onTabChange,
  shopName,
  operatorName,
  onLogout,
  waitingQueueCount = 0,
  pickupReadyCount = 0,
  availableShops = [],
  selectedShopId = null,
  onSelectShop,
}: SidebarProps) {
  const navItems = [
    {
      id: "overview" as NavTab,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "queue" as NavTab,
      label: "Active Queue",
      icon: Layers,
      badge: waitingQueueCount > 0 ? waitingQueueCount : undefined,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: "pickup" as NavTab,
      label: "Pickup Station",
      icon: PackageCheck,
      badge: pickupReadyCount > 0 ? pickupReadyCount : undefined,
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "orders" as NavTab,
      label: "Orders",
      icon: FileText,
    },
    {
      id: "printers" as NavTab,
      label: "Printers & Devices",
      icon: Printer,
    },
    {
      id: "analytics" as NavTab,
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "payments" as NavTab,
      label: "Payments",
      icon: CreditCard,
    },
    {
      id: "pricing" as NavTab,
      label: "Pricing Rules",
      icon: Tag,
    },
    {
      id: "audit" as NavTab,
      label: "Audit Logs",
      icon: ShieldCheck,
    },
    {
      id: "qr" as NavTab,
      label: "Storefront QR",
      icon: QrCode,
    },
    {
      id: "settings" as NavTab,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs tracking-wider">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
              HEDS
            </span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              Print Automation
            </span>
          </div>
        </div>

        {/* Shop Selector Context */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Store
            </span>
            {availableShops.length > 1 && (
              <span className="text-[10px] text-blue-600 font-medium">
                {availableShops.length} stores
              </span>
            )}
          </div>
          {availableShops.length > 1 ? (
            <select
              value={selectedShopId || ""}
              onChange={(e) => onSelectShop && onSelectShop(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs font-medium"
            >
              {availableShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_queue_paused ? "• Paused" : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs font-semibold text-slate-800 truncate">
              {shopName || "Campus Xerox & Print Hub"}
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-210px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-blue-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      item.badgeColor || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Operator Footer Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
            {operatorName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{operatorName}</p>
            <p className="text-[11px] text-slate-500 truncate">Operator</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
