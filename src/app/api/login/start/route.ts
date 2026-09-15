import { NextRequest, NextResponse } from "next/server";

import { authorizeUrl } from "@/lib/backend";
import { callbackReturnUrl, newState, STATE_COOKIE, stateCookieOptions, STATE_TTL_SECONDS } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  const url = authorizeUrl();
  const state = newState();
  url.searchParams.set("return_url", callbackReturnUrl(req.nextUrl.origin, state));
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, stateCookieOptions(STATE_TTL_SECONDS));
  return res;
}
