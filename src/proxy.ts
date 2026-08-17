import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 đổi quy ước `middleware.ts` → `proxy.ts` (bản cũ vẫn chạy nhưng đã
 * cảnh báo deprecated). Frontend chính của phenau cũng đã ở `src/proxy.ts`.
 *
 * Ở đây CHỈ gắn ngữ cảnh phiên Clerk. KHÔNG chặn quyền theo đường dẫn:
 * `createRouteMatcher` đã bị Clerk deprecate vì khớp-theo-path dễ lệch với cách
 * Next định tuyến, để lọt tài nguyên tưởng đã khoá. Việc chặn nằm ở
 * `app/inbox/layout.tsx` — ngay chỗ đọc dữ liệu.
 */
const clerk = clerkMiddleware();

export default function proxy(req: NextRequest, ev: unknown) {
  // MOCK: bỏ qua Clerk hoàn toàn. Cần thiết vì chạy local có thể chưa cấu hình
  // Clerk key — bật auth lúc đó là app chết ngay, không xem được gì.
  if (process.env.NEXT_PUBLIC_MOCK === "1") return NextResponse.next();
  // @ts-expect-error — kiểu event của Clerk không export ra ngoài
  return clerk(req, ev);
}

export const config = {
  // Bỏ qua static + /api/py (proxy về backend — backend tự xác thực bằng
  // cookie/headers, chặn ở đây thì SSE đứt).
  matcher: ["/((?!_next|api/py|.*\\.(?:ico|png|svg|jpg|css|js)).*)"],
};
