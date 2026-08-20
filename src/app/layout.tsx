import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// Title đọc từ BRAND — tuyệt đối không hardcode tên nền tảng ở đây. Đây là app
// giao cho khách của agency chạy dưới domain của họ (shadow).
export const metadata: Metadata = {
  title: BRAND.name,
  description: "Hộp thư chăm sóc khách hàng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
