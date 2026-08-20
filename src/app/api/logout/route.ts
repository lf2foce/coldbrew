import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, cungNguonGoc } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Đăng xuất cũng là hành động ghi: không kiểm thì site khác ép người ta đăng
  // xuất liên tục được. Phiền chứ không nguy hiểm, nhưng chặn thì rẻ.
  if (!cungNguonGoc(req)) {
    return NextResponse.json({ error: "Nguồn gốc không hợp lệ" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
