"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Printer,
  Cpu,
  Plus,
  Trash2,
  RefreshCw,
  Power,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api/client";

interface SettingsViewProps {
  shopData: any;
}

interface PrinterItem {
  id: string;
  name: string;
  adapter_type: string;
  status: string;
  capabilities: {
    color?: boolean;
    duplex?: boolean;
    paper_sizes?: string[];
    model?: string;
    manufacturer?: string;
    address?: string;
  };
  agent_name?: string;
  current_job_id?: string;
  last_error?: string;
}

interface AgentItem {
  id: string;
  name: string;
  hostname: string;
  os_info: string;
  version: string;
  status: string;
  last_heartbeat_at?: string;
  printer_count: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ shopData }) => {
  // General Shop Information
  const [shopName, setShopName] = useState(shopData?.name || "Campus Xerox & Print Hub");
  const [shopSlug, setShopSlug] = useState(shopData?.slug || "campus-xerox");
  const [contactEmail, setContactEmail] = useState("operator@campus-xerox.local");
  const [contactPhone, setContactPhone] = useState("+91 98765 43210");
  const [shopAddress, setShopAddress] = useState("North Campus Building 2, Ground Floor");
  const [openingHours, setOpeningHours] = useState("08:00 AM");
  const [closingHours, setClosingHours] = useState("09:00 PM");
  const [isQueuePaused, setIsQueuePaused] = useState(Boolean(shopData?.is_queue_paused));
  const [generalSaved, setGeneralSaved] = useState(false);

  // Printers List & Add Form
  const [printers, setPrinters] = useState<PrinterItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

  // New Printer Form State
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState("");
  const [newManufacturer, setNewManufacturer] = useState("HP");
  const [newModel, setNewModel] = useState("LaserJet Pro 4004");
  const [newConnectionType, setNewConnectionType] = useState<"MOCK" | "CUPS" | "IPP">("MOCK");
  const [newAddress, setNewAddress] = useState("");
  const [newPaperSizes, setNewPaperSizes] = useState("A4");
  const [newColorSupport, setNewColorSupport] = useState(false);
  const [newDuplexSupport, setNewDuplexSupport] = useState(true);
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);

  // Active Job Deletion Warning Modal State
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const fetchPrintersAndAgents = async () => {
    setIsLoadingPrinters(true);
    try {
      const [printersRes, agentsRes, settingsRes] = await Promise.all([
        apiClient.get<PrinterItem[]>("/api/v1/shop/printers").catch(() => []),
        apiClient.get<AgentItem[]>("/api/v1/shop/agents").catch(() => []),
        apiClient.get<any>("/api/v1/shop/settings").catch(() => null),
      ]);
      setPrinters(printersRes || []);
      setAgents(agentsRes || []);
      if (settingsRes) {
        setShopName(settingsRes.name || shopName);
        setShopSlug(settingsRes.slug || shopSlug);
        setIsQueuePaused(Boolean(settingsRes.is_queue_paused));
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  useEffect(() => {
    fetchPrintersAndAgents();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put("/api/v1/shop/settings", {
        name: shopName,
        is_queue_paused: isQueuePaused,
      });
      setGeneralSaved(true);
      setTimeout(() => setGeneralSaved(false), 2500);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim()) return;

    setIsAddingPrinter(true);
    try {
      await apiClient.post("/api/v1/shop/printers", {
        name: newPrinterName.trim(),
        adapter_type: newConnectionType,
        manufacturer: newManufacturer,
        model: newModel,
        address: newAddress,
        paper_sizes: newPaperSizes.split(",").map((s) => s.trim().toUpperCase()),
        color_supported: newColorSupport,
        duplex_supported: newDuplexSupport,
      });
      setNewPrinterName("");
      setShowAddPrinter(false);
      await fetchPrintersAndAgents();
    } catch (err: any) {
      alert(`Failed to add printer: ${err.message}`);
    } finally {
      setIsAddingPrinter(false);
    }
  };

  const handleTestPrint = async (printerId: string, printerName: string) => {
    try {
      const res = await apiClient.post<any>(`/api/v1/shop/printers/${printerId}/test-print`);
      alert(`Diagnostics test page queued for ${printerName} (Order: ${res.order_number})`);
    } catch (err: any) {
      alert(`Test print error: ${err.message}`);
    }
  };

  const handleReconnectPrinter = async (printerId: string) => {
    try {
      await apiClient.post(`/api/v1/shop/printers/${printerId}/reconnect`);
      await fetchPrintersAndAgents();
    } catch (err: any) {
      alert(`Reconnect error: ${err.message}`);
    }
  };

  const handleTogglePrinterStatus = async (p: PrinterItem) => {
    const nextStatus = p.status === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await apiClient.put(`/api/v1/shop/printers/${p.id}`, { status: nextStatus });
      await fetchPrintersAndAgents();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
  };

  const handleDeletePrinter = async (p: PrinterItem, force: boolean = false) => {
    try {
      await apiClient.delete(`/api/v1/shop/printers/${p.id}${force ? "?force=true" : ""}`);
      setDeleteWarning(null);
      await fetchPrintersAndAgents();
    } catch (err: any) {
      // Check if error contains active jobs warning
      if (err.message && err.message.includes("active job")) {
        setDeleteWarning(
          `Printer '${p.name}' currently has active jobs in the print queue. Would you like to disable the printer or force cancel active jobs?`
        );
      } else {
        alert(err.message || "Failed to remove printer.");
      }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Shop Administration</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure store information, connected hardware, and edge agents</p>
      </div>

      {/* SECTION 1: GENERAL SHOP CONFIGURATION */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">General Information</h3>
          </div>
        }
      >
        <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. North Campus Xerox"
            />
            <Input
              label="Shop URL Slug"
              value={shopSlug}
              disabled
              placeholder="campus-xerox"
            />
            <Input
              label="Contact Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="operator@campus.edu"
            />
            <Input
              label="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
            <div className="sm:col-span-2">
              <Input
                label="Physical Address / Counter Location"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="Building name, Floor, Room"
              />
            </div>
            <Input
              label="Opening Hours"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
            />
            <Input
              label="Closing Hours"
              value={closingHours}
              onChange={(e) => setClosingHours(e.target.value)}
            />
          </div>

          {/* Shop Status Toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 block">Queue Status</span>
              <span className="text-[11px] text-slate-500">
                {isQueuePaused ? "Queue is paused (no new orders accepted)" : "Queue is active and accepting student orders"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsQueuePaused(!isQueuePaused)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                isQueuePaused
                  ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
              }`}
            >
              {isQueuePaused ? "PAUSED" : "ACTIVE"}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-mono">HEDS v0.1.0 Multi-Tenant Engine</span>
            <Button type="submit" variant="primary" size="md">
              <Save className="w-3.5 h-3.5" />
              {generalSaved ? "Saved Successfully!" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: PRINTERS ADMINISTRATION */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Hardware Printers ({printers.length})
              </h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddPrinter(!showAddPrinter)}
              className="text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddPrinter ? "Cancel" : "Add Printer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Add Printer Form */}
          {showAddPrinter && (
            <form onSubmit={handleAddPrinter} className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3 text-xs mb-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">New Printer Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Printer Name"
                  value={newPrinterName}
                  onChange={(e) => setNewPrinterName(e.target.value)}
                  placeholder="e.g. Counter HP LaserJet"
                  required
                />
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Connection Type</label>
                  <select
                    value={newConnectionType}
                    onChange={(e: any) => setNewConnectionType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-mono"
                  >
                    <option value="MOCK">MOCK (Virtual Development)</option>
                    <option value="CUPS">CUPS (Native Linux/Mac)</option>
                    <option value="IPP">IPP (Network Direct)</option>
                  </select>
                </div>
                <Input
                  label="Manufacturer"
                  value={newManufacturer}
                  onChange={(e) => setNewManufacturer(e.target.value)}
                  placeholder="e.g. HP, Xerox, Canon"
                />
                <Input
                  label="Model"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. LaserJet Pro 4004"
                />
                <Input
                  label="Printer IP / Network Address (if IPP)"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="ipp://192.168.1.50/printers/hp"
                />
                <Input
                  label="Supported Paper Sizes (comma separated)"
                  value={newPaperSizes}
                  onChange={(e) => setNewPaperSizes(e.target.value)}
                  placeholder="A4, A3, LETTER"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newColorSupport}
                    onChange={(e) => setNewColorSupport(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Color Printing Supported</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDuplexSupport}
                    onChange={(e) => setNewDuplexSupport(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Duplex (2-sided) Supported</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button size="sm" variant="outline" type="button" onClick={() => setShowAddPrinter(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" isLoading={isAddingPrinter}>
                  Save Printer
                </Button>
              </div>
            </form>
          )}

          {/* Delete Warning Notice */}
          {deleteWarning && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Active Jobs Detected
              </div>
              <p className="text-rose-700">{deleteWarning}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setDeleteWarning(null)}>
                  Keep Printer
                </Button>
              </div>
            </div>
          )}

          {/* Printers List */}
          {printers.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No printers connected.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {printers.map((p) => (
                <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <Badge variant={p.status === "ONLINE" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {p.adapter_type}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-3">
                      <span>{p.capabilities?.color ? "Color & B/W" : "Monochrome"}</span>
                      <span>&bull;</span>
                      <span>{p.capabilities?.duplex ? "Duplex" : "Single-sided"}</span>
                      <span>&bull;</span>
                      <span>Sizes: {(p.capabilities?.paper_sizes || ["A4"]).join(", ")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestPrint(p.id, p.name)}
                      className="text-[11px]"
                    >
                      Test Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReconnectPrinter(p.id)}
                      className="text-[11px]"
                    >
                      Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePrinterStatus(p)}
                      className="text-[11px]"
                    >
                      {p.status === "ONLINE" ? "Disable" : "Enable"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeletePrinter(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove printer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* SECTION 3: EDGE AGENT TELEMETRY */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Edge Agent Diagnostics</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchPrintersAndAgents}
              className="text-xs flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrinters ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          {agents.length === 0 ? (
            <div className="py-4 text-center text-slate-500">
              <p>No active edge agent registered.</p>
              <p className="text-[11px] text-slate-400 mt-1">Start local print agent on the shop counter machine.</p>
            </div>
          ) : (
            agents.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono">{a.name}</span>
                    <Badge variant={a.status === "ONLINE" ? "success" : "warning"}>{a.status}</Badge>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">v{a.version}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">HOST / OS</span>
                    <span>{a.hostname || "localhost"} ({a.os_info || "Linux"})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ATTACHED PRINTERS</span>
                    <span>{a.printer_count} devices</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">HEARTBEAT</span>
                    <span>Active telemetry</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">QUEUE PROTOCOL</span>
                    <span>Durable SQLite</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
