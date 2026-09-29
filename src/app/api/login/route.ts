/**
 * Cổng đăng nhập — một tài khoản dùng chung cho cả workspace của khách.
 *
 * Đây KHÔNG phải hệ tài khoản (xem runbook 36 §6 "rủi ro đã chấp nhận"): không
 * thu hồi được theo từng người, và mọi thao tác ghi sổ dưới danh tính của API key.
 * Đổi lại nó bỏ hẳn được ràng buộc một-Clerk-instance-một-domain.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  cungNguonGoc,
  legacyLoginEnabled,
  requiresUsername,
  thongTinDangNhapDung,
} from "@/lib/session";

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

export async function POST(req: NextRequest) {
  if (!legacyLoginEnabled()) {
    return NextResponse.json({ error: "Đăng nhập mật khẩu đã tắt" }, { status: 410 });
  }
  const doiTen = requiresUsername();

  if (!cungNguonGoc(req)) {
    return NextResponse.json({ error: "Nguồn gốc không hợp lệ" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (quaNhieuLan(ip)) {
    return NextResponse.json(
      { error: "Sai quá nhiều lần. Thử lại sau 10 phút." },
      { status: 429 },
    );
  }

  const than = await req.json().catch(() => ({}));
  const password = typeof than?.password === "string" ? than.password : "";
  const username = typeof than?.username === "string" ? than.username : "";

  if (!thongTinDangNhapDung(username, password)) {
    ghiNhanLanSai(ip);
    // Chậm lại một nhịp: dò mật khẩu qua mạng chậm hơn hẳn khi mỗi lần sai tốn 400ms.
    await new Promise((r) => setTimeout(r, 400));
    // MỘT thông báo cho cả hai ca: nói "sai mật khẩu" tức là đã xác nhận username đúng.
    return NextResponse.json(
      { error: doiTen ? "Tài khoản hoặc mật khẩu không đúng" : "Mật khẩu không đúng" },
      { status: 401 },
    );
  }

  // Vào được thì xoá lịch sử sai của IP. Không xoá thì người gõ nhầm 7 lần, vào
  // đúng, rồi lỡ tay sai thêm một lần nữa là bị khoá 10 phút — trong khi họ vừa
  // chứng minh mình biết mật khẩu.
  HITS.delete(ip);

  const { value, maxAge } = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, value, cookieOptions(maxAge));
  return res;
}
