import { SignInClient } from "./sign-in-client";

export default function SignInPage() {
  const authEnabled = Boolean(process.env.COLDBREW_AUTH_URL?.trim());
  // App cũ chưa có auth URL vẫn dùng password. Khi có identity bridge, legacy
  // chỉ hiện nếu operator chủ động bật canary flag.
  const legacyEnabled = !authEnabled || process.env.ALLOW_LEGACY_PASSWORD_LOGIN === "1";
  return <SignInClient authEnabled={authEnabled} legacyEnabled={legacyEnabled} />;
}
