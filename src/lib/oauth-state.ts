/**
 * `state` cho luồng đăng nhập qua cổng Phê Nâu.
 *
 * Không có state thì một người cùng workspace gửi link `/auth/callback?code=<mã của
 * mình>` là nạn nhân bị đăng nhập THÀNH người đó (login CSRF) — mọi tin họ trả lời
 * sau đó ghi dưới tên kẻ gửi. State nằm trong cookie httpOnly của CHÍNH trình duyệt
 * bấm "Đăng nhập", và nằm luôn trong return_url mà backend ràng buộc với mã ⇒ mã
 * phát cho trình duyệt khác không đổi được ở đây.
 */

export const STATE_COOKIE = "cb_oauth_state";
export const STATE_TTL_SECONDS = 10 * 60;

export function newState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** return_url gửi cho cổng đăng nhập. Callback phải dựng LẠI đúng chuỗi này khi
 *  exchange, vì backend so khớp nguyên văn return_url đã lưu cùng mã. */
export function callbackReturnUrl(origin: string, state: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("state", state);
  return url.toString();
}

export function stateMatches(fromQuery: string | null | undefined, fromCookie: string | undefined): boolean {
  if (!fromQuery || !fromCookie || fromQuery.length !== fromCookie.length) return false;
  let diff = 0;
  for (let i = 0; i < fromQuery.length; i++) diff |= fromQuery.charCodeAt(i) ^ fromCookie.charCodeAt(i);
  return diff === 0;
}

export function stateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: cookie vẫn đi kèm lượt điều hướng top-level GET từ cổng đăng nhập về.
    sameSite: "lax" as const,
    path: "/auth/callback",
    maxAge,
  };
}
