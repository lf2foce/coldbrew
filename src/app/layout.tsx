import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { BRAND } from "@/lib/brand";
import { localization } from "@/lib/clerk-localization";
import "./globals.css";

// Title đọc từ BRAND — tuyệt đối không hardcode tên nền tảng ở đây. Đây là app
// giao cho khách của agency chạy dưới domain của họ (shadow).
export const metadata: Metadata = {
  title: BRAND.name,
  description: "Hộp thư chăm sóc khách hàng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={localization}
      appearance={{
        variables: { colorPrimary: BRAND.accent },
        elements: {
          // Tài khoản do agency cấp tay → không OAuth, không tự đăng ký.
          socialButtons: { display: "none" },
          dividerRow: { display: "none" },
          footerAction: { display: "none" },
        },
      }}
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/inbox"
    >
      <html lang="vi">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
