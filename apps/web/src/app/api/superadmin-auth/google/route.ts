import { NextResponse } from "next/server";
import { setSuperAdminSessionCookie } from "@/lib/superadmin-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${API_URL}/superadmin/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  await setSuperAdminSessionCookie(data.token);
  return NextResponse.json({ ok: true });
}
