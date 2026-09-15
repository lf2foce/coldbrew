import { NextResponse, type NextRequest } from "next/server";
import { hasUsableSession, SESSION_COOKIE } from "@/lib/session";

/**
 * Next.js 16 đổi quy ước `middleware.ts` → `proxy.ts`.
 *
 * Đây là lớp CHUYỂN HƯỚNG lạc quan cho đẹp mắt, KHÔNG phải lớp bảo vệ: chỉ nhìn cookie
 * rồi đá người chưa đăng nhập về /sign-in. Theo tài liệu Next 16, Proxy không dành cho
 * fetch dữ liệu ⇒ việc hỏi backend "phiên broker còn sống không" nằm ở
 * `app/inbox/layout.tsx`. Chặn dữ liệu thật nằm ở BFF proxy `api/py/[...path]`.
 *
 * Chỉ chạm /inbox: trang khác (nhất là /sign-in) không được phụ thuộc vào việc kiểm
 * cookie — kiểm cookie mà lỗi thì người dùng vẫn phải vào được trang đăng nhập.
 */
export default async function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_MOCK === "1") return NextResponse.next();
  if (!req.nextUrl.pathname.startsWith("/inbox")) return NextResponse.next();
  const ok = await hasUsableSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\.(?:ico|png|svg|jpg|css|js)).*)"],
};
