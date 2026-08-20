/**
 * Phiên đăng nhập của app shadow — cookie TỰ KÝ, không dùng Clerk.
 *
 * Vì sao không Clerk: một Clerk production instance chỉ phục vụ ĐÚNG một domain
 * (đo 18/08/2026: domain khách → `origin_invalid`, subdomain cũng
 * → `subdomain_not_allowed`). App này chạy dưới domain của từng khách nên Clerk
 * không dùng được. Chi tiết: runbook 36 bên phenau_v3.
 *
 * ⚠ Cookie PHẢI được ký. Kiểu "so mật khẩu xong set `logged_in=1`" là vô nghĩa:
 * ai cũng tự đặt cookie đó trong DevTools rồi vào thẳng, không cần biết mật khẩu.
 * Ở đây cookie mang chữ ký HMAC-SHA256 bằng secret chỉ có ở server.
 *
 * Đây KHÔNG phải hệ tài khoản: cả nhà dùng chung một mật khẩu, nên cookie chỉ
 * trả lời đúng một câu "người này đã qua cổng chưa". Mọi thao tác gửi tới backend
 * đều đi dưới danh tính của API key.
 */

const COOKIE = "cb_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 giờ — hết ca là phải đăng nhập lại

function secret(): string {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 32) {
    // Thà chết lúc khởi động còn hơn chạy với chữ ký đoán được.
    throw new Error("SESSION_SECRET phải có ít nhất 32 ký tự");
  }
  return s;
}

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

/** Chuỗi cookie: `<hết hạn>.<chữ ký>`. Hạn nằm TRONG phần được ký nên client
 *  không tự nới hạn được. */
export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(exp);
  return { value: `${payload}.${await sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export async function verifySession(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = raw.slice(0, dot);
  const got = raw.slice(dot + 1);
  const want = await sign(payload);
  // So sánh thời-gian-hằng-định: `===` trên chuỗi thoát sớm ở byte đầu khác nhau,
  // đủ để dò dần từng ký tự chữ ký.
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  if (diff !== 0) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export const SESSION_COOKIE = COOKIE;

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,             // JS trong trang không đọc được → XSS không lấy được phiên
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,   // chặn CSRF từ site khác, vẫn cho điều hướng bình thường
    path: "/",
    maxAge,
  };
}
