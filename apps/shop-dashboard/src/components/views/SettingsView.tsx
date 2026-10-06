"use client";

import React from "react";
import { Pause, Play, Shield, HardDrive, Clock, Lock } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface SettingsViewProps {
  shopName: string;
  shopSlug: string;
  isQueuePaused: boolean;
  onTogglePause: () => Promise<void>;
  operatorEmail: string;
  userRole: string;
}

export function SettingsView({
  shopName,
  shopSlug,
  isQueuePaused,
  onTogglePause,
  operatorEmail,
  userRole,
}: SettingsViewProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Shop System Settings</h2>
        <p className="text-xs text-slate-400">
          Operational controls, queue availability toggles, and security retention policies.
        </p>
      </div>

      {/* Queue Availability Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Shop Queue Intake</h3>
            <p className="text-xs text-slate-400 mt-1">
              Temporarily prevent new student submissions if paper runs out or maintenance is ongoing. Active spooled jobs continue processing.
            </p>
          </div>
          <Badge variant={isQueuePaused ? "warning" : "success"}>
            {isQueuePaused ? "QUEUE PAUSED" : "ACCEPTING ORDERS"}
          </Badge>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button
            variant={isQueuePaused ? "primary" : "secondary"}
            size="sm"
            onClick={onTogglePause}
            className="flex items-center gap-2"
          >
            {isQueuePaused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Order Intake</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Order Intake</span>
              </>
            )}
          </Button>
          <span className="text-[11px] text-slate-500">
            {isQueuePaused
              ? "Students attempting to upload will receive a friendly shop paused notice."
              : "Shop is currently accepting student uploads."}
          </span>
        </div>
      </div>

      {/* Privacy and Retention Policy */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Privacy & Ephemeral Storage</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          HEDS enforces student privacy at the infrastructure layer:
        </p>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
          <li>
            <strong className="text-slate-200">Pickup Hold:</strong> Printed documents remain in the physical collection tray until the operator enters the 6-digit student Pickup OTP code.
          </li>
          <li>
            <strong className="text-slate-200">Ephemeral Cleanup:</strong> Original uploaded documents and rendered raster spool files are automatically purged 24 hours after completion.
          </li>
          <li>
            <strong className="text-slate-200">Authoritative Pricing:</strong> All per-page costs are calculated server-side. No client-side price tampering is possible.
          </li>
        </ul>
      </div>

      {/* Session Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">Operator Session</h3>
        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <span className="text-[11px] text-slate-400 block">Authenticated User</span>
            <span className="text-slate-200 font-mono text-xs">{operatorEmail || "operator@campus-xerox.local"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">System Role</span>
            <span className="text-slate-200 font-medium">{userRole || "SHOP_OPERATOR"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Shop Handle</span>
            <span className="text-slate-200 font-mono text-xs">{shopSlug || "campus-xerox"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Shop Name</span>
            <span className="text-slate-200 font-medium">{shopName || "Campus Xerox & Print Hub"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
