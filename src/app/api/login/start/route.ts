import { NextRequest, NextResponse } from "next/server";

import { publicOrigin, publicUrl } from "@/lib/public-origin";

import { authorizeUrl } from "@/lib/backend";
import { legacyLoginEnabled } from "@/lib/session";
import { callbackReturnUrl, newState, STATE_COOKIE, stateCookieOptions, STATE_TTL_SECONDS } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  // Deployment còn mật khẩu chung thì không mở luồng tài khoản (nút đã ẩn; gõ thẳng URL
  // cũng không đi sang phenau.com để nhận lỗi "domain chưa xác minh").
  if (legacyLoginEnabled()) {
    return NextResponse.redirect(publicUrl("/sign-in", req));
  }
  const url = authorizeUrl();
  const state = newState();
  url.searchParams.set("return_url", callbackReturnUrl(publicOrigin(req), state));
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, stateCookieOptions(STATE_TTL_SECONDS));
  return res;
}
