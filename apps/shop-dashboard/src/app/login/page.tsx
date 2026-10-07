"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { apiClient, ApiError } from "@/lib/api/client";

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("operator@campus-xerox.local");
  const [password, setPassword] = useState("operator123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.post<LoginResponse>("/api/v1/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });

      localStorage.setItem("heds_token", data.access_token);
      localStorage.setItem("heds_user_role", data.role);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.code === "UNAUTHORIZED") {
          setError("Invalid email or password. Please check your credentials.");
        } else if (err.code === "NETWORK_ERROR" || err.code === "BACKEND_UNAVAILABLE" || err.status === 503) {
          setError("Cannot connect to HEDS server. Please check your network or ensure the backend is running.");
        } else if (err.status >= 500) {
          setError("Something went wrong on the server. Please try again.");
        } else {
          setError(err.message || "Failed to authenticate session.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-md p-6 space-y-5">
        {/* Brand Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider">
              H
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-100">
              HEDS
            </span>
          </div>
          <h1 className="text-base font-semibold text-slate-100">Shop Operations Console</h1>
          <p className="text-xs text-slate-400">
            Sign in to manage print dispatch, queue leases, and pickups.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <Input
            label="Operator Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-950"
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-950"
            autoComplete="current-password"
          />

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full justify-center"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </Button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
          <p className="font-medium text-slate-400">Pre-seeded Local Accounts:</p>
          <p>Operator: <span className="font-mono text-slate-300">operator@campus-xerox.local</span> / <span className="font-mono text-slate-300">operator123</span></p>
          <p>Admin: <span className="font-mono text-slate-300">admin@campus-xerox.local</span> / <span className="font-mono text-slate-300">admin123</span></p>
        </div>
      </div>
    </div>
  );
}
