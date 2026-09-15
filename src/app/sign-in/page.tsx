import { legacyLoginEnabled } from "@/lib/session";
import { SignInClient } from "./sign-in-client";

const THONG_BAO: Record<string, string> = {
  session_expired: "Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.",
  invalid_state: "Liên kết đăng nhập không hợp lệ hoặc đã được mở ở trình duyệt khác. Vui lòng bấm Đăng nhập lại.",
  expired_code: "Mã đăng nhập đã hết hạn hoặc đã được dùng. Vui lòng thử lại.",
  invalid_code: "Liên kết đăng nhập không hợp lệ.",
  invalid_session: "Không tạo được phiên đăng nhập. Vui lòng thử lại.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Cổng Phê Nâu luôn có. Form mật khẩu chỉ hiện khi deployment còn APP_PASSWORD.
  const legacyEnabled = legacyLoginEnabled();
  const error = (await searchParams).error;
  return (
    <SignInClient
      legacyEnabled={legacyEnabled}
      thongBao={error ? THONG_BAO[error] ?? "" : ""}
    />
  );
}
