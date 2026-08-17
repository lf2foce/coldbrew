import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { viVN } from "@clerk/localizations";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// Title đọc từ BRAND — tuyệt đối không hardcode tên nền tảng ở đây. Đây là app
// giao cho khách của agency chạy dưới domain của họ (shadow).
export const metadata: Metadata = {
  title: BRAND.name,
  description: "Hộp thư chăm sóc khách hàng",
};

// Ghi đè các chuỗi lộ tên Clerk-app ("Sign in to Phe Nau" lấy từ applicationName
// của Clerk instance — instance này dùng chung với dashboard chính nên KHÔNG đổi
// được ở Dashboard; phải đè bằng localization tại từng app).
const localization = {
  ...viVN,
  signIn: {
    ...viVN.signIn,
    start: {
      ...viVN.signIn?.start,
      title: "Đăng nhập",
      subtitle: "Đăng nhập để xem hộp thư của bạn",
    },
  },
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
