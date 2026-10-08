import React from "react";
import {
  LayoutDashboard,
  Layers,
  FileText,
  CheckSquare,
  Printer,
  BarChart3,
  CreditCard,
  Tag,
  ShieldCheck,
  QrCode,
  Settings,
  LogOut,
  Search,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type TabType =
  | "overview"
  | "queue"
  | "orders"
  | "pickup"
  | "printers"
  | "analytics"
  | "payments"
  | "pricing"
  | "audit"
  | "qr"
  | "settings";

interface SidebarLayoutProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  shopData: any;
  onlinePrintersCount?: number;
  totalPrintersCount?: number;
  onLogout: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  actionMessage: string | null;
  onDismissMessage: () => void;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activeTab,
  setActiveTab,
  shopData,
  onlinePrintersCount = 2,
  totalPrintersCount = 3,
  onLogout,
  searchQuery = "",
  onSearchChange,
  actionMessage,
  onDismissMessage,
  children,
}) => {
  const navSections = [
    {
      section: "OVERVIEW",
      items: [
        { id: "overview" as TabType, label: "Overview", icon: LayoutDashboard },
        { id: "queue" as TabType, label: "Queue", icon: Layers },
        { id: "orders" as TabType, label: "Orders", icon: FileText },
        { id: "pickup" as TabType, label: "Pickup", icon: CheckSquare },
        { id: "printers" as TabType, label: "Printers & Devices", icon: Printer },
        { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      section: "BUSINESS",
      items: [
        { id: "payments" as TabType, label: "Payments", icon: CreditCard },
        { id: "pricing" as TabType, label: "Pricing", icon: Tag },
      ],
    },
    {
      section: "SYSTEM",
      items: [
        { id: "audit" as TabType, label: "Audit Logs", icon: ShieldCheck },
        { id: "qr" as TabType, label: "Storefront QR", icon: QrCode },
        { id: "settings" as TabType, label: "Settings", icon: Settings },
      ],
    },
  ];

  const getPageTitle = (tab: TabType) => {
    switch (tab) {
      case "overview": return "Overview";
      case "queue": return "Print Queue";
      case "orders": return "Orders";
      case "pickup": return "Counter Pickup";
      case "printers": return "Printers & Devices";
      case "analytics": return "Analytics";
      case "payments": return "Payments";
      case "pricing": return "Pricing Configuration";
      case "audit": return "Audit Logs";
      case "qr": return "Storefront QR Poster";
      case "settings": return "Shop Settings";
      default: return "Dashboard";
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 text-slate-700">
        {/* Top Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center font-mono font-bold text-white text-xs shadow-xs">
            H
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 tracking-tight uppercase">HEDS</h1>
            <p className="text-[10px] text-slate-500 font-mono">Print Automation</p>
          </div>
        </div>

        {/* Active Store Indicator */}
        <div className="mx-3 mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-md space-y-1">
          <div className="text-[10px] font-mono font-semibold uppercase text-slate-400">STORE</div>
          <div className="text-xs font-semibold text-slate-900 truncate">
            {shopData?.name || "Campus Xerox & Print Hub"}
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono font-medium text-emerald-700 uppercase">
              {shopData?.is_queue_paused ? "PAUSED" : "ONLINE"}
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto text-xs">
          {navSections.map((sec) => (
            <div key={sec.section} className="space-y-1">
              <span className="text-[10px] font-mono font-semibold text-slate-400 px-2 tracking-wider">
                {sec.section}
              </span>
              <div className="space-y-0.5 mt-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-md transition-colors text-xs font-medium ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Operator User Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-900 truncate">Amit Kumar</p>
              <p className="text-[10px] text-slate-500 truncate">Shop Operator</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-slate-900">{getPageTitle(activeTab)}</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Quick Search */}
            {onSearchChange && (
              <div className="relative w-64 hidden sm:block">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search orders, tokens, documents..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            )}

            {/* Hardware Status */}
            <div className="hidden md:flex items-center gap-2 text-xs border-l border-slate-200 pl-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">OPEN</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-mono">
                {onlinePrintersCount}/{totalPrintersCount} printers online
              </span>
            </div>
          </div>
        </header>

        {/* Action Toast Banner */}
        {actionMessage && (
          <div className="bg-slate-900 text-white px-6 py-2.5 text-xs flex items-center justify-between shrink-0">
            <span>{actionMessage}</span>
            <button onClick={onDismissMessage} className="text-slate-400 hover:text-white font-bold ml-4">
              &times;
            </button>
          </div>
        )}

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
