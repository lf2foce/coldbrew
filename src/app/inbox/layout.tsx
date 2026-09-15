import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { brokerSessionAlive } from "@/lib/broker-session";
import { hasUsableSession, isBrokerSession, SESSION_COOKIE } from "@/lib/session";

/**
 * Chặn quyền Ở ĐÂY — ngay chỗ đọc dữ liệu, không ở proxy.
 *
 * Khớp-theo-đường-dẫn ở tầng proxy dễ lệch với cách Next định tuyến và để lọt tài
 * nguyên tưởng đã khoá; layout này bọc mọi trang trong /inbox nên không lệch được.
 *
 * Phiên broker: hình dạng đúng chưa đủ — hết hạn/bị thu hồi/domain bị khoá thì bản đầu
 * vẫn mở khung trống rồi mọi ô báo lỗi. Hỏi backend; 401 ⇒ /auth/expired xoá cookie
 * (layout không set cookie được) rồi về /sign-in.
 */
export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_MOCK !== "1") {
    const raw = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!(await hasUsableSession(raw))) redirect("/sign-in");
    if (isBrokerSession(raw)) {
      const hostname = ((await headers()).get("host") || "").split(":")[0];
      if (!(await brokerSessionAlive(raw, hostname))) redirect("/auth/expired");
    }
  }
  return <>{children}</>;
}
