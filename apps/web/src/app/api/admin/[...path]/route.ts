import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

// Same-origin proxy for every admin-only API call. The session JWT lives in
// an httpOnly cookie (see lib/session.ts) so client components can't read
// it and attach it as a header themselves — this route reads the cookie
// server-side and forwards the request to the Nest API with a Bearer
// header instead. Mirrors the pattern already used by
// app/api/auth/{google,switch,spaces}/route.ts, generalized to any path so
// lib/api.ts's adminRequest() has one proxy to call for every admin action.
async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 });
  }

  const { search } = new URL(request.url);
  const targetUrl = `${API_URL}/${path.join("/")}${search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "DELETE";

  const res = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Required by Node's fetch when streaming a request body through.
    ...(hasBody ? { duplex: "half" } : {}),
    cache: "no-store",
  } as RequestInit);

  const responseHeaders = new Headers();
  const resContentType = res.headers.get("content-type");
  if (resContentType) responseHeaders.set("content-type", resContentType);

  const body = await res.arrayBuffer();
  return new NextResponse(body, { status: res.status, headers: responseHeaders });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function POST(request: Request, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function PATCH(request: Request, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function DELETE(request: Request, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
