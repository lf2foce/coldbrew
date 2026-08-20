/**
 * Cổng đăng nhập — một mật khẩu dùng chung cho cả workspace của khách.
 *
 * Đây KHÔNG phải hệ tài khoản (xem runbook 36 §6 "rủi ro đã chấp nhận"): không
 * thu hồi được theo từng người, và mọi thao tác ghi sổ dưới danh tính của API key.
 * Đổi lại nó bỏ hẳn được ràng buộc một-Clerk-instance-một-domain.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, createSession } from "@/lib/session";

/** Chặn dò mật khẩu. Một mật khẩu dùng chung, không giới hạn số lần thử, đứng
 *  trước một API key — đó là cánh cửa dò được. Đếm theo IP, cửa sổ trượt.
 *
 *  Bộ đếm nằm trong RAM: mất khi redeploy, và mỗi instance đếm riêng. Chấp nhận
 *  cho app một khách; muốn chắc hơn thì phải đếm ở nơi dùng chung. */
const HITS = new Map<string, number[]>();
const MAX_LAN = 8;
const CUA_SO_MS = 10 * 60 * 1000;

function quaNhieuLan(ip: string): boolean {
  const now = Date.now();
  const gan_day = (HITS.get(ip) ?? []).filter((t) => now - t < CUA_SO_MS);
  HITS.set(ip, gan_day);
  if (HITS.size > 5000) HITS.clear(); // chặn phình bộ nhớ khi bị rải IP
  return gan_day.length >= MAX_LAN;
}

function ghiNhanLanSai(ip: string): void {
  HITS.set(ip, [...(HITS.get(ip) ?? []), Date.now()]);
}

function bangNhau(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const matKhauThat = process.env.APP_PASSWORD || "";
  if (!matKhauThat) {
    return NextResponse.json({ error: "Chưa cấu hình APP_PASSWORD" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (quaNhieuLan(ip)) {
    return NextResponse.json(
      { error: "Sai quá nhiều lần. Thử lại sau 10 phút." },
      { status: 429 },
    );
  }

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !bangNhau(password, matKhauThat)) {
    ghiNhanLanSai(ip);
    // Chậm lại một nhịp: dò mật khẩu qua mạng chậm hơn hẳn khi mỗi lần sai tốn 400ms.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Mật khẩu không đúng" }, { status: 401 });
  }

  const { value, maxAge } = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, value, cookieOptions(maxAge));
  return res;
}
