/**
 * MỘT biến cho mọi đường từ server Coldbrew sang Phê Nâu: `PHENAU_URL` (chỉ origin, tuỳ chọn).
 *
 *   API            = `${PHENAU_URL}/api/py/v1/...`   (rewrite của phenau_v3 → FastAPI)
 *   Cổng đăng nhập = `${PHENAU_URL}/coldbrew/authorize`
 *
 * Mặc định: production `https://phenau.com`, dev `http://localhost:3000` (frontend Phê Nâu
 * local tự rewrite sang FastAPI :8000). Host backend thật chỉ nằm trong env của frontend
 * Phê Nâu. Coldbrew KHÔNG tự khai rewrite trong next.config — BFF + allowlist vẫn là cửa
 * duy nhất. Đo 15/09/2026: qua phenau.com/api/py backend nhận đủ `Authorization` +
 * `X-Coldbrew-Host`.
 *
 * Đọc lúc xử lý request, không ở module scope: `next build` có thể chưa có env.
 */
export function phenauOrigin(): string {
  const raw = (process.env.PHENAU_URL || "").trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? "https://phenau.com" : "http://localhost:3000";
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`PHENAU_URL không hợp lệ: ${raw}`);
  }
  if (url.pathname.replace(/\/+$/, "")) {
    // Có path (vd .../api/py) ⇒ ghép tiếp thành /api/py/api/py ⇒ 404. Báo thẳng.
    throw new Error(`PHENAU_URL chỉ là origin (vd https://phenau.com), không kèm path: ${raw}`);
  }
  return url.origin;
}

/** `path` bắt đầu bằng `/v1/` — cùng dạng đường trong allowlist. */
export function backendApiUrl(path: string): string {
  if (!path.startsWith("/v1/")) throw new Error(`Đường API phải bắt đầu bằng /v1/: ${path}`);
  return `${phenauOrigin()}/api/py${path}`;
}

export function authorizeUrl(): URL {
  return new URL("/coldbrew/authorize", phenauOrigin());
}
