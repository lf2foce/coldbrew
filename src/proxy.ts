import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Next.js 16 đổi quy ước `middleware.ts` → `proxy.ts`.
 *
 * Đây là lớp CHUYỂN HƯỚNG cho đẹp mắt, KHÔNG phải lớp bảo vệ: nó chỉ nhìn cookie
 * rồi đá người chưa đăng nhập về /sign-in, tránh chớp một nhịp giao diện trống.
 * Chặn thật nằm ở hai chỗ đọc dữ liệu: `app/inbox/layout.tsx` (trang) và BFF
 * proxy `api/py/[...path]` (dữ liệu). Mất lớp này thì xấu, không hở.
 */
export default async function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_MOCK === "1") return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok && req.nextUrl.pathname.startsWith("/inbox")) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\.(?:ico|png|svg|jpg|css|js)).*)"],
};
