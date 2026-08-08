import { NextResponse } from "next/server";

// TikTok's share-sheet "Copy link" gives a short vm.tiktok.com/vt.tiktok.com
// URL carrying an opaque redirect code, not the video ID our embed needs.
// This follows that redirect server-side (avoiding a browser CORS request to
// TikTok) and hands back the canonical tiktok.com/@user/video/<id> URL.
// Restricted to tiktok.com hosts so this can't be used as an open fetch proxy.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ message: "That doesn't look like a valid link" }, { status: 400 });
  }
  if (!parsed.hostname.endsWith("tiktok.com")) {
    return NextResponse.json({ message: "Only tiktok.com links can be resolved" }, { status: 400 });
  }

  try {
    const res = await fetch(url, { redirect: "follow" });
    return NextResponse.json({ resolvedUrl: res.url });
  } catch {
    return NextResponse.json({ message: "Couldn't resolve this link" }, { status: 502 });
  }
}
