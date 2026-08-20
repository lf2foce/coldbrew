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

/** Dấu vân tay của mật khẩu hiện hành — 12 ký tự hex đầu của HMAC.
 *
 *  Có mặt để ĐỔI MẬT KHẨU LÀ ĐUỔI ĐƯỢC NGƯỜI RA. Bản đầu chỉ ký `<hết hạn>`, nên
 *  chữ ký chỉ phụ thuộc SESSION_SECRET: đổi APP_PASSWORD xong, cookie đã phát vẫn
 *  sống trọn 12 giờ. Mà đổi mật khẩu chính là cách duy nhất thu hồi quyền ở mô hình
 *  mật khẩu dùng chung (nhân viên nghỉ việc) — thu hồi mà không hiệu lực ngay thì
 *  coi như không thu hồi.
 *
 *  Chỉ lưu vân tay chứ không lưu mật khẩu: cookie nằm ở máy khách. */
async function vanTayMatKhau(): Promise<string> {
  return (await sign(`pw:${process.env.APP_PASSWORD || ""}`)).slice(0, 12);
}

/** Chuỗi cookie: `<hết hạn>.<vân tay mật khẩu>.<chữ ký>`. Cả hạn LẪN vân tay nằm
 *  trong phần được ký nên client không tự nới hạn, cũng không tự vá vân tay. */
export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${exp}.${await vanTayMatKhau()}`;
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
  const [expStr, vanTay] = payload.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  // Mật khẩu đã đổi → vân tay lệch → mọi phiên cũ chết ngay lập tức.
  return vanTay === (await vanTayMatKhau());
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

/**
 * Chặn CSRF: request GHI phải đến từ chính origin của app.
 *
 * `sameSite=lax` chưa đủ. Nó chặn cross-SITE, mà "site" tính theo eTLD+1 — nên một
 * subdomain khác của chính khách (`blog.khachhang.vn`, thường do WordPress dựng và
 * hay bị chiếm) vẫn là SAME-site, cookie vẫn được gửi kèm. Kẻ chiếm subdomain đó
 * gửi form POST sang app là thao tác được dưới danh nghĩa người đang đăng nhập.
 *
 * So sánh `Origin` với host thật của request. Thiếu `Origin` (một số client cũ)
 * thì fallback sang `Referer`; không có cả hai → từ chối, vì trình duyệt hiện đại
 * LUÔN gửi Origin cho request ghi.
 */
export function cungNguonGoc(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
