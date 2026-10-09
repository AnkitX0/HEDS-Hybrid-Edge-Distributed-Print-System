/**
 * HEDS Student QR Client - Centralized API Client
 *
 * Communicates with HEDS backend via /api proxy route.
 * Provides safe response parsing, unified error normalization,
 * and robust network failure handling.
 */

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function safeParseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  let payload: any = null;

  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    const rawText = await res.text().catch(() => "");
    if (!res.ok) {
      if (res.status >= 500) {
        throw new ApiError(
          res.status,
          "SERVER_ERROR",
          "The print server encountered a temporary error. Please try again shortly."
        );
      }
      if (res.status === 404) {
        throw new ApiError(404, "NOT_FOUND", "The requested shop or order was not found.");
      }
      throw new ApiError(
        res.status,
        "REQUEST_FAILED",
        rawText.trim() ? rawText.substring(0, 200) : `Request failed with status ${res.status}`
      );
    }
    return rawText as unknown as T;
  }

  if (!res.ok) {
    let errorCode = "REQUEST_FAILED";
    let errorMessage = `Request failed with status ${res.status}`;
    let details: any = undefined;

    if (payload) {
      if (typeof payload.detail === "string") {
        errorMessage = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        errorCode = "VALIDATION_ERROR";
        errorMessage = payload.detail.map((d: any) => {
          const loc = Array.isArray(d.loc) ? d.loc.filter((p: any) => p !== "body").join(".") : "";
          const msg = d.msg || "Invalid value";
          return loc ? `${loc}: ${msg}` : msg;
        }).join("; ");
        details = payload.detail;
      } else if (payload.error) {
        errorCode = payload.error.code || errorCode;
        errorMessage = payload.error.message || errorMessage;
        details = payload.error.details;
      }
    }

    if (res.status === 401) errorCode = "UNAUTHORIZED";
    if (res.status === 403) errorCode = "FORBIDDEN";
    if (res.status === 404) errorCode = "NOT_FOUND";
    if (res.status === 409) errorCode = "CONFLICT";
    if (res.status === 422) errorCode = "VALIDATION_ERROR";
    if (res.status >= 500) errorCode = "SERVER_ERROR";

    throw new ApiError(res.status, errorCode, errorMessage, details);
  }

  return payload as T;
}

export const apiClient = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = 25000, headers, ...restOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        ...restOptions,
        headers: {
          ...headers,
        },
        signal: controller.signal,
      });

      return await safeParseResponse<T>(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (err.name === "AbortError") {
        throw new ApiError(408, "TIMEOUT", "The request timed out. Please check your connection and retry.");
      }
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Cannot connect to HEDS service. Please check your connection or server status."
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  async post<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {};
    let formattedBody: any = undefined;

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      formattedBody = JSON.stringify(body);
    }

    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      headers: { ...headers, ...(options.headers as any) },
      body: formattedBody,
    });
  },

  async upload<T>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
    });
  },

  async put<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {};
    let formattedBody: any = undefined;

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      formattedBody = JSON.stringify(body);
    }

    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      headers: { ...headers, ...(options.headers as any) },
      body: formattedBody,
    });
  },

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

/**
 * Normalizes any error object, string, FastAPI detail, or network failure
 * into a human-readable, diagnostic-safe error message. Never returns "[object Object]".
 */
export function formatApiError(err: unknown, fallbackMessage = "An unexpected error occurred"): string {
  if (!err) return fallbackMessage;

  if (typeof err === "string") {
    const trimmed = err.trim();
    if (trimmed && trimmed !== "[object Object]") return trimmed;
    return fallbackMessage;
  }

  if (err instanceof ApiError) {
    return err.message;
  }

  if (err instanceof Error) {
    if (err.message && err.message !== "[object Object]") {
      return err.message;
    }
  }

  // Handle object payload with 'detail' (FastAPI)
  if (typeof err === "object" && err !== null) {
    const record = err as Record<string, any>;
    if (typeof record.detail === "string") {
      return record.detail;
    }
    if (Array.isArray(record.detail)) {
      const messages = record.detail.map((item: any) => {
        if (!item || typeof item !== "object") return String(item);
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((p: any) => p !== "body").join(".")
          : "";
        const msg = item.msg || item.message || "Invalid value";
        return loc ? `${loc}: ${msg}` : msg;
      });
      return messages.length > 0 ? messages.join("; ") : fallbackMessage;
    }
    if (record.error && typeof record.error === "object") {
      if (typeof record.error.message === "string") return record.error.message;
    }
    if (typeof record.message === "string" && record.message !== "[object Object]") {
      return record.message;
    }
  }

  return fallbackMessage;
}
