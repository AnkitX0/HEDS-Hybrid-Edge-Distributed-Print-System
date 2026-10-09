import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path ? params.path.join("/") : "";
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${path}${search}`;

  const headers = new Headers();
  request.headers.forEach((val, key) => {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection"].includes(lowerKey)) {
      headers.set(key, val);
    }
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    const bodyBuffer = await request.arrayBuffer();
    if (bodyBuffer.byteLength > 0) {
      init.body = bodyBuffer;
    }
  }

  try {
    const upstreamRes = await fetch(targetUrl, init);

    const isSse = upstreamRes.headers.get("content-type")?.includes("text/event-stream");
    if (isSse) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const dataBuffer = await upstreamRes.arrayBuffer();
    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(lower)) {
        responseHeaders.set(key, val);
      }
    });

    return new Response(dataBuffer, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, error.message);
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "Cannot connect to HEDS backend service. Please verify BACKEND_URL is configured and the backend is running.",
        },
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
