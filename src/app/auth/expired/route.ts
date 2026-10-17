import { NextRequest, NextResponse } from "next/server";

import { publicHostname, publicUrl } from "@/lib/public-origin";

import { brokerSessionAlive } from "@/lib/broker-session";
import { cookieOptions, hasUsableSession, isBrokerSession, SESSION_COOKIE } from "@/lib/session";

/**
 * Xoá cookie phiên broker ĐÃ CHẾT rồi về /sign-in. GET được vì layout chỉ redirect được.
 *
 * Chống ép-đăng-xuất: site khác dẫn người dùng tới đây cũng không xoá được phiên CÒN
 * SỐNG — route tự hỏi lại backend và chỉ xoá khi backend nói 401.
 */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const conSong = isBrokerSession(raw)
    ? await brokerSessionAlive(raw, publicHostname(req))
    : await hasUsableSession(raw); // cookie mật khẩu còn hợp lệ cũng không bị xoá qua GET
  if (conSong) {
    return NextResponse.redirect(publicUrl("/inbox", req));
  }
  const res = NextResponse.redirect(publicUrl("/sign-in?error=session_expired", req));
  if (raw) res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
