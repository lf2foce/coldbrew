import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Chặn quyền Ở ĐÂY, không ở proxy.
 *
 * Clerk đã deprecate `createRouteMatcher`: khớp-theo-đường-dẫn dễ lệch với cách
 * Next định tuyến, để lọt tài nguyên tưởng đã khoá. Cách họ khuyến nghị là kiểm
 * ngay tại nơi đọc dữ liệu — layout này bọc mọi trang trong /inbox.
 */
export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NEXT_PUBLIC_MOCK !== "1") {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");
  }
  return <>{children}</>;
}
