import { NextResponse } from "next/server";
import { getSessionToken, setSessionCookie } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const res = await fetch(`${API_URL}/auth/switch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  await setSessionCookie(data.token);
  return NextResponse.json({ ok: true, tenant: data.tenant });
}
