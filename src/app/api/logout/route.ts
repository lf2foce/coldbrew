import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";
import { isBrokerSession, SESSION_COOKIE, cookieOptions, cungNguonGoc } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Đăng xuất cũng là hành động ghi: không kiểm thì site khác ép người ta đăng
  // xuất liên tục được. Phiền chứ không nguy hiểm, nhưng chặn thì rẻ.
  if (!cungNguonGoc(req)) {
    return NextResponse.json({ error: "Nguồn gốc không hợp lệ" }, { status: 403 });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (isBrokerSession(token)) {
    await fetch(`${backendUrl()}/api/v1/coldbrew/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Coldbrew-Host": req.nextUrl.hostname,
      },
      cache: "no-store",
    }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
