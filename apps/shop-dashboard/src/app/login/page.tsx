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
          setError("Invalid email or password. Please verify your credentials.");
        } else if (err.code === "NETWORK_ERROR" || err.code === "BACKEND_UNAVAILABLE" || err.status === 503) {
          setError("Unable to connect to HEDS service. Please check your network or ensure the backend is running.");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-sm">
        {/* Brand Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs tracking-wider">
              H
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              HEDS
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Shop Operations</h1>
          <p className="text-xs text-slate-500">
            Sign in to access your print queue, counter controls, and printers.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full justify-center h-10 text-sm font-semibold"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1 text-center">
          <p className="font-medium text-slate-700">Default Credentials:</p>
          <p className="font-mono text-slate-600">operator@campus-xerox.local / operator123</p>
        </div>
      </div>
    </div>
  );
}
