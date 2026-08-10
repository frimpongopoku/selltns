import { NextResponse } from "next/server";
import { getSuperAdminSessionToken } from "@/lib/superadmin-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

// Mirrors app/api/admin/[...path]/route.ts exactly, just reads the
// superadmin_session cookie and targets the Nest API's /superadmin/* routes
// instead — see that file's comment for the full "why a proxy" rationale.
async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const token = await getSuperAdminSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 });
  }

  const { search } = new URL(request.url);
  const targetUrl = `${API_URL}/superadmin/${path.join("/")}${search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "DELETE";

  const res = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
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
