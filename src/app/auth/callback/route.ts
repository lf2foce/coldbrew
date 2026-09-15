import { NextRequest, NextResponse } from "next/server";

import { cookieOptions, SESSION_COOKIE } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() || "";
  if (!code.startsWith("cb_code_")) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid_code", req.url));
  }
  const hostname = req.nextUrl.hostname;
  const result = await fetch(`${BACKEND_URL}/api/v1/coldbrew/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ code, hostname, return_url: new URL("/auth/callback", req.nextUrl.origin).toString() }),
    cache: "no-store",
  });
  if (!result.ok) {
    return NextResponse.redirect(new URL("/sign-in?error=expired_code", req.url));
  }
  const data = (await result.json()) as { session_token?: string; expires_in?: number };
  if (!data.session_token || !data.expires_in) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid_session", req.url));
  }
  const response = NextResponse.redirect(new URL("/inbox", req.url));
  response.cookies.set(SESSION_COOKIE, data.session_token, cookieOptions(data.expires_in));
  return response;
}
