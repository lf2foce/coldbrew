import { NextRequest, NextResponse } from "next/server";

import { backendUrl } from "@/lib/backend";
import { callbackReturnUrl, STATE_COOKIE, stateCookieOptions, stateMatches } from "@/lib/oauth-state";
import { cookieOptions, SESSION_COOKIE } from "@/lib/session";

function veDangNhap(req: NextRequest, error: string) {
  const res = NextResponse.redirect(new URL(`/sign-in?error=${error}`, req.url));
  res.cookies.set(STATE_COOKIE, "", stateCookieOptions(0));
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() || "";
  if (!code.startsWith("cb_code_")) {
    return veDangNhap(req, "invalid_code");
  }
  // State phải khớp cookie của CHÍNH trình duyệt đã bấm "Đăng nhập" (xem oauth-state.ts).
  const state = req.nextUrl.searchParams.get("state");
  if (!stateMatches(state, req.cookies.get(STATE_COOKIE)?.value)) {
    return veDangNhap(req, "invalid_state");
  }
  const result = await fetch(`${backendUrl()}/api/v1/coldbrew/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      code,
      hostname: req.nextUrl.hostname,
      return_url: callbackReturnUrl(req.nextUrl.origin, state as string),
    }),
    cache: "no-store",
  });
  if (!result.ok) {
    return veDangNhap(req, "expired_code");
  }
  const data = (await result.json()) as { session_token?: string; expires_in?: number };
  if (!data.session_token || !data.expires_in) {
    return veDangNhap(req, "invalid_session");
  }
  const response = NextResponse.redirect(new URL("/inbox", req.url));
  response.cookies.set(SESSION_COOKIE, data.session_token, cookieOptions(data.expires_in));
  response.cookies.set(STATE_COOKIE, "", stateCookieOptions(0));
  return response;
}
