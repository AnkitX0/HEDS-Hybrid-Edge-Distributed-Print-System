import React from "react";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Printer,
  Cpu,
  Tag,
  ShieldCheck,
  QrCode,
  Settings,
  LogOut,
  User,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "queue"
  | "orders"
  | "printers"
  | "agents"
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
  availableShops = [],
  selectedShopId = null,
  onSelectShop,
}: SidebarProps) {
  const navSections = [
    {
      group: "OPERATIONS",
      items: [
        { id: "overview" as NavTab, label: "Overview", icon: LayoutDashboard },
        {
          id: "queue" as NavTab,
          label: "Active Queue",
          icon: Layers,
          badge: waitingQueueCount > 0 ? waitingQueueCount : undefined,
        },
        { id: "orders" as NavTab, label: "All Orders", icon: FileText },
      ],
    },
    {
      group: "INFRASTRUCTURE",
      items: [
        { id: "printers" as NavTab, label: "Printers", icon: Printer },
        { id: "agents" as NavTab, label: "Edge Agents", icon: Cpu },
      ],
    },
    {
      group: "BUSINESS",
      items: [{ id: "pricing" as NavTab, label: "Pricing Rules", icon: Tag }],
    },
    {
      group: "SYSTEM",
      items: [
        { id: "audit" as NavTab, label: "Audit Logs", icon: ShieldCheck },
        { id: "qr" as NavTab, label: "Shop QR Access", icon: QrCode },
        { id: "settings" as NavTab, label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-800/80">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider">
            H
          </div>
          <div>
            <span className="font-semibold text-xs tracking-tight text-slate-100 block">
              HEDS
            </span>
            <span className="text-[10px] text-slate-400 block leading-none">
              Print Orchestration
            </span>
          </div>
        </div>

        {/* Shop Selector Context */}
        <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Shop
            </span>
            {availableShops.length > 1 && (
              <span className="text-[9px] text-blue-400 font-mono">
                {availableShops.length} stores
              </span>
            )}
          </div>
          {availableShops.length > 1 ? (
            <select
              value={selectedShopId || ""}
              onChange={(e) => onSelectShop && onSelectShop(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {availableShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_queue_paused ? "• Paused" : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs font-medium text-slate-200 truncate">
              {shopName || "Loading shop..."}
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="p-2 space-y-4 pt-3 overflow-y-auto">

          {navSections.map((section) => (
            <div key={section.group} className="space-y-0.5">
              <span className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {section.group}
              </span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Operator Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{operatorName}</p>
            <p className="text-[10px] text-slate-500 truncate">{shopName}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition-colors"
        >
          <LogOut className="w-3 h-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
