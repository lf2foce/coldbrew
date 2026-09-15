import { NextRequest, NextResponse } from "next/server";

import { callbackReturnUrl, newState, STATE_COOKIE, stateCookieOptions, STATE_TTL_SECONDS } from "@/lib/oauth-state";

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
  const state = newState();
  authUrl.searchParams.set("return_url", callbackReturnUrl(req.nextUrl.origin, state));
  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, stateCookieOptions(STATE_TTL_SECONDS));
  return res;
}
