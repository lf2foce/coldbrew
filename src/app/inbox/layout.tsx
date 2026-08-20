import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Chặn quyền Ở ĐÂY — ngay chỗ đọc dữ liệu, không ở proxy.
 *
 * Khớp-theo-đường-dẫn ở tầng proxy dễ lệch với cách Next định tuyến và để lọt tài
 * nguyên tưởng đã khoá; layout này bọc mọi trang trong /inbox nên không lệch được.
 */
export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_MOCK !== "1") {
    const store = await cookies();
    if (!(await verifySession(store.get(SESSION_COOKIE)?.value))) redirect("/sign-in");
  }
  return <>{children}</>;
}
