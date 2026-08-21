/**
 * Allowlist của BFF proxy — tách khỏi route handler để TEST ĐƯỢC.
 *
 * Nằm trong route thì muốn kiểm phải dựng cả Next; tách ra thì `node --test` gọi
 * thẳng được, nên hàng rào này có test đi kèm thay vì chỉ có lời hứa.
 *
 * Danh sách phải khớp bảng "Hợp đồng với backend" trong README.
 */

/** Mỗi mục: [method, mẫu đường]. `:x` khớp đúng MỘT đoạn, không khớp dấu `/`. */
export const ALLOWLIST: [string, string][] = [
  // ── Hộp thư ───────────────────────────────────────────────────────────────
  ["GET",   "/v1/conversations"],
  ["GET",   "/v1/conversations/search"],
  ["GET",   "/v1/conversations/facets"],
  ["GET",   "/v1/conversations/:conv"],
  ["GET",   "/v1/conversations/:conv/messages"],
  ["GET",   "/v1/conversations/:conv/messages/:msg"],
  ["GET",   "/v1/conversations/:conv/events"],
  ["POST",  "/v1/conversations/:conv/reply"],
  ["POST",  "/v1/conversations/:conv/reply-mode"],
  ["POST",  "/v1/conversations/:conv/mark-read"],
  // ── Nháp trợ lý ───────────────────────────────────────────────────────────
  ["GET",   "/v1/conversations/:conv/drafts"],
  ["POST",  "/v1/conversations/:conv/drafts/:draft/approve"],
  ["POST",  "/v1/conversations/:conv/drafts/:draft/dismiss"],
  ["POST",  "/v1/conversations/:conv/drafts/:draft/edit-and-send"],
  // ── Yêu cầu khách ─────────────────────────────────────────────────────────
  ["GET",   "/v1/agents/:agent/tickets"],
  ["PATCH", "/v1/agents/:agent/tickets/:ticket"],
  // ── Trợ lý còn yếu ────────────────────────────────────────────────────────
  ["GET",   "/v1/business/agents/:agent/quality"],
  // ── Cài đặt: đọc agent + ghi luật vá ──────────────────────────────────────
  // PUT chứ không PATCH: agents.py chỉ có @router.put. Bản trước gọi PATCH nên
  // luật vá chưa bao giờ lưu được, mọi lần bấm đều 405.
  ["GET",   "/v1/agents/:agent"],
  ["PUT",   "/v1/agents/:agent"],
  // Kênh của CHÍNH agent này. Không dùng /integrations/* — hai đường đó thao tác
  // theo tenant nên app khách sẽ thấy và chỉnh được kênh của agent khác.
  ["GET",   "/v1/agents/:agent/channels"],
  // "Tôi là ai, với quyền gì" — chỉ trả vai + danh sách quyền để HIỆN, không trả
  // khoá cũng không trả tenant_id.
  ["GET",   "/v1/users/me/principal"],
  ["POST",  "/v1/agents/:agent/channels/:integration/auto-reply"],
];

export function khop(method: string, path: string): boolean {
  const doan = path.split("/");
  return ALLOWLIST.some(([m, mau]) => {
    if (m !== method) return false;
    const mauDoan = mau.split("/");
    if (mauDoan.length !== doan.length) return false;
    return mauDoan.every((p, i) => (p.startsWith(":") ? doan[i] !== "" : p === doan[i]));
  });
}



/** Số đường được mở — test đối chiếu với bảng trong README để hai bên không lệch. */
export const ALLOWLIST_LEN = ALLOWLIST.length;
