/**
 * BFF proxy — cửa DUY NHẤT từ trình duyệt xuống backend phenau.
 *
 * Thay cho rewrite wildcard `/api/py/:path*` của bản trước. Rewrite đó chuyển
 * tiếp MỌI đường và không chèn được gì, nên với mô hình API key nó hỏng theo hai
 * hướng cùng lúc: hoặc request đi ra không mang key, hoặc phải nhét key xuống
 * browser cho client tự gắn — mà key nằm ở browser thì coi như đã lộ.
 *
 * Ở đây route handler làm ba việc rewrite không làm được:
 *   1. kiểm cookie phiên đã ký — chưa qua cổng thì 401, không chạm tới backend
 *   2. đối chiếu ALLOWLIST — chỉ 19 đường coldbrew thật sự dùng
 *   3. gắn API key ở SERVER — key không bao giờ rời khỏi tiến trình này
 *
 * ⚠ Allowlist liệt kê TƯỜNG MINH, chặn mặc định. Đừng khớp tiền tố:
 * `startsWith("/conversations")` cho lọt cả `/conversations/../tenants`.
 */

import { NextRequest, NextResponse } from "next/server";
import { ALLOWLIST_LEN, khop } from "@/lib/allowlist";
import { SESSION_COOKIE, cungNguonGoc, verifySession } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function chuyenTiep(req: NextRequest, path: string[]) {
  if (!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (req.method !== "GET" && !cungNguonGoc(req)) {
    return NextResponse.json({ error: "Nguồn gốc không hợp lệ" }, { status: 403 });
  }

  // Chuẩn hoá rồi mới đối chiếu: `..` và `//` phải bị triệt TRƯỚC khi so allowlist,
  // không thì `/v1/conversations/../tenants/me` lọt qua rồi mới thành đường khác.
  const raw = "/" + path.join("/");
  const duong = new URL(raw, "http://x").pathname;
  if (duong !== raw || duong.includes("..")) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ" }, { status: 400 });
  }
  if (!khop(req.method, duong)) {
    return NextResponse.json({ error: "Đường dẫn không được mở" }, { status: 403 });
  }

  const apiKey = process.env.PHENAU_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình PHENAU_API_KEY" }, { status: 500 });
  }

  const url = new URL(`/api${duong}`, BACKEND_URL);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", req.headers.get("Accept") || "application/json");
  const ct = req.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual",
  });

  const out = new NextResponse(res.body, { status: res.status });
  const resCt = res.headers.get("Content-Type");
  if (resCt) out.headers.set("Content-Type", resCt);
  // Mọi phản hồi qua đây đều là dữ liệu khách hàng của khách. `private, no-store`
  // để trình duyệt lẫn CDN không giữ lại hộp thư sau khi người dùng đăng xuất —
  // bấm Back sau logout không được phép thấy tin nhắn.
  out.headers.set("Cache-Control", "private, no-store");

  // SSE (/events) đi chung đường này. Comment cũ trong repo bảo rewrite/fetch của
  // Node ĐỆM phản hồi, nhưng đo lại ngày 19/08/2026 bằng backend giả bắn 5 sự kiện
  // cách nhau 700ms thì cả hai đường đều chảy đúng nhịp — không đệm. Vẫn chuyển
  // tiếp header chống đệm để proxy phía trước (Vercel/nginx) đừng gom lại.
  if (resCt?.includes("text/event-stream")) {
    out.headers.set("Cache-Control", "no-cache, no-transform");
    out.headers.set("Connection", "keep-alive");
    out.headers.set("X-Accel-Buffering", "no");
  }
  return out;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return chuyenTiep(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return chuyenTiep(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return chuyenTiep(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return chuyenTiep(req, (await ctx.params).path);
}
