import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authBase = (process.env.COLDBREW_AUTH_URL || "").trim();
  if (!authBase) {
    return NextResponse.json({ error: "Chưa cấu hình COLDBREW_AUTH_URL" }, { status: 503 });
  }
  let authUrl: URL;
  try {
    authUrl = new URL("/coldbrew/authorize", authBase);
  } catch {
    return NextResponse.json({ error: "COLDBREW_AUTH_URL không hợp lệ" }, { status: 500 });
  }
  const returnUrl = new URL("/auth/callback", req.nextUrl.origin);
  authUrl.searchParams.set("return_url", returnUrl.toString());
  return NextResponse.redirect(authUrl);
}
