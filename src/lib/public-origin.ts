/**
 * Origin / hostname CÔNG KHAI của request — cái trình duyệt thật sự gõ (chatbot.khach.vn).
 *
 * Vì sao không dùng `req.nextUrl` / `req.url`: trên Vercel chúng đúng, nhưng tự host bằng
 * `output: "standalone"` sau Traefik (Dokploy, từ 16/10/2026) thì route handler dựng URL từ
 * địa chỉ server lắng nghe — `HOSTNAME=0.0.0.0`, cổng 3000. Đo 17/10/2026 trên BDSRadar:
 * `return_url` đăng nhập thành `https://0.0.0.0:3000/auth/callback` và `X-Coldbrew-Host`
 * thành `0.0.0.0` ⇒ backend thấy hostname lệch phiên broker ⇒ hộp thư 401, kẹt "Đang tải…".
 * (Middleware `proxy.ts` không dính: nó nhận đúng host.)
 *
 * Nguồn: `X-Forwarded-Host` / `X-Forwarded-Proto` (Traefik và Vercel đều ghi), rồi `Host`,
 * cuối cùng mới tới `nextUrl`. Tin header ở đây không mở thêm cửa: hostname chỉ dùng để GẮN
 * phiên broker vào đúng domain — backend vẫn kiểm hash, hạn, membership và hostname đã đăng ký
 * của tenant; trình duyệt nạn nhân cũng không gửi được Host giả.
 */

type RequestLike = { headers: Headers; nextUrl: URL };

const HOST_RE = /^[a-z0-9.-]+(:\d{1,5})?$/i;

function firstValue(raw: string | null): string {
  return (raw || "").split(",")[0].trim();
}

/** host kèm cổng nếu có, vd `chatbot.khach.vn` hoặc `localhost:3001`. */
export function publicHost(req: RequestLike): string {
  const host = firstValue(req.headers.get("x-forwarded-host")) || firstValue(req.headers.get("host"));
  return HOST_RE.test(host) ? host.toLowerCase() : req.nextUrl.host;
}

/** Chỉ tên miền, không cổng — đúng thứ phiên broker gắn vào (`X-Coldbrew-Host`). */
export function publicHostname(req: RequestLike): string {
  return publicHost(req).replace(/:\d+$/, "");
}

export function publicOrigin(req: RequestLike): string {
  const proto = firstValue(req.headers.get("x-forwarded-proto")).toLowerCase();
  const scheme = proto === "http" || proto === "https" ? proto : req.nextUrl.protocol.replace(/:$/, "");
  return `${scheme}://${publicHost(req)}`;
}

/** Thay cho `new URL(path, req.url)` khi redirect trong route handler. */
export function publicUrl(path: string, req: RequestLike): URL {
  return new URL(path, publicOrigin(req));
}
