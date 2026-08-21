/**
 * Kiểu dữ liệu KHỚP phản hồi backend (bảng hợp đồng trong README).
 * Để riêng khỏi `mock.ts` vì dữ liệu thật cũng dùng chung — mock chỉ là một
 * nguồn cấp, không phải nơi định nghĩa hình dạng.
 */

/** null = theo mặc định của kênh; ba giá trị còn lại là ghi đè cho riêng hội thoại.
 *  Khớp `Literal["auto_send","advisor","off"]` ở backend. */
export type ReplyMode = "auto_send" | "advisor" | "off" | null;

export const REPLY_MODES: { value: Exclude<ReplyMode, null>; label: string; hint: string }[] = [
  { value: "auto_send", label: "Tự động trả lời", hint: "Trợ lý trả lời khách ngay, không cần duyệt" },
  { value: "advisor", label: "Soạn nháp chờ duyệt", hint: "Trợ lý soạn sẵn, nhân viên bấm gửi" },
  { value: "off", label: "Tắt trợ lý", hint: "Chỉ nhân viên trả lời, trợ lý im lặng" },
];

/** Nhãn NGUỒN hội thoại — một bản duy nhất cho cả app.
 *
 * Trước đây mỗi panel tự chép một bản và ba bản đã lệch nhau: cùng một hội thoại,
 * Hộp thư ghi "Website" còn Yêu cầu khách ghi "Nội bộ". Người trực đọc hai tab
 * tưởng hai nguồn khác nhau.
 *
 * Lưu ý `web` KHÔNG phải website: đó là chat từ dashboard/app nội bộ, tức nhân viên
 * đang thử bot. Website thật là `web_public` (widget nhúng). Đặt tên nhầm chỗ này
 * là lý do bản ở Hộp thư ghi "Website".
 */
export const NHAN_NGUON: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  zalo: "Zalo OA",
  lark: "Lark",
  telegram: "Telegram",
  phechat: "PheChat",
  web: "Chat thử",
  web_public: "Widget website",
  external_api: "API ngoài",
};

/** Nguồn lạ thì trả về chính mã của nó — thà hiện "tiktok" còn hơn hiện trống trơn
 *  rồi người đọc tưởng hội thoại không có nguồn. */
export function nhanNguon(p: string | null | undefined): string {
  if (!p) return "Không rõ nguồn";
  return NHAN_NGUON[p] ?? p;
}

export type Conversation = {
  id: string;
  /** Tên THÔ do nền tảng đặt lúc tạo hội thoại — thường là "New conversation" và
   *  không bao giờ được cập nhật. ĐỪNG hiện trường này. */
  title: string | null;
  /** Tên khách đã phân giải (từ hồ sơ Facebook/Zalo). Đây mới là thứ hiện lên.
   *  Bản trước hiện `title` nên phần lớn hội thoại đọc ra "New conversation" —
   *  người trực không phân biệt nổi khách nào với khách nào. */
  display_title?: string | null;
  platform: string | null;
  status: string | null;
  message_count: number | null;
  updated_at: string;
  reply_mode_override?: ReplyMode;
  /** Backend trả CỜ chưa-đọc, không phải số đếm. Ghi chú cũ bảo "backend chưa trả
   *  trường này" là sai — nó có, chỉ khác tên và khác kiểu. */
  has_unread?: boolean;
  has_pending_draft?: boolean;
};

/** Một nguồn trợ lý đã dựa vào. `source_id` chính là con số trong dấu `[1]` giữa câu
 *  trả lời — nối hai thứ này lại thì bấm vào chip là biết câu đó lấy từ đâu. */
export type Citation = {
  source_id: number;
  filename?: string;
  page?: number | null;
  score?: number | null;
  source_path?: string | null;
  source_links?: { file_url?: string | null; folder_url?: string | null };
  /** Metadata của node embedding. Chứa danh tính TỆP (`file_id` do file_processor
   *  gắn, `drive_file_id`/`source_file_id` do google_drive_sync gắn) — thứ dùng để
   *  gom nhiều đoạn cùng một tài liệu. Kiểu mở vì đây là túi tuỳ nguồn nạp. */
  metadata?: Record<string, unknown> | null;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "human_agent";
  content: string;
  created_at: string;
  /** Backend trả nguyên cột `metadata` của tin. Nguồn nằm ở `metadata.citations` —
   *  có sẵn khi tải lại hội thoại; còn lúc đang chat thì tới qua sự kiện SSE
   *  `citations_updated` (nguồn chỉ biết được SAU khi trả lời xong). */
  metadata?: { citations?: Citation[] } | null;
};

/** Nháp trợ lý soạn khi hội thoại ở chế độ "advisor". */
export type Draft = {
  id: string;
  /** Nội dung trợ lý soạn. Backend đặt tên `draft_content`, KHÔNG phải `content` —
   *  bản trước khai `content` nên mọi thẻ nháp hiện ra rỗng trơn: có nút "Duyệt &
   *  gửi" mà không thấy gửi cái gì. TypeScript không bắt được vì kiểu này do mình
   *  tự khai, không sinh từ backend. */
  draft_content: string;
  /** Bản người thật sửa lại; có thì hiện cái này thay cho draft_content. */
  edited_content?: string | null;
  /** Nguồn trợ lý dựa vào khi soạn nháp — backend trả sẵn (`_draft_to_dict`). Người
   *  duyệt cần thấy để biết nháp này có căn cứ hay bịa, TRƯỚC khi bấm gửi cho khách. */
  citations?: Citation[];
  status?: string;
  created_at: string;
};

export type TaskStatus = "active" | "running" | "paused" | "done" | "cancelled";

export type RecurrenceRule = {
  kind?: "minutely" | "hourly" | "daily" | "weekly";
  time?: string;
  weekdays?: number[];
  interval?: number;
};

export type AgentTask = {
  id: string;
  instruction: string;
  recurrence_rule: RecurrenceRule;
  next_run_at: string | null;
  status: TaskStatus;
  last_error: string | null;
  updated_at: string;
};

const WEEKDAY = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Quy tắc lặp → câu tiếng Việt đọc được. Ẩn cấu trúc JSON khỏi người dùng cuối. */
export function describeRule(r: RecurrenceRule): string {
  const at = r.time ? ` lúc ${r.time}` : "";
  const n = r.interval && r.interval > 1 ? r.interval : null;
  switch (r.kind) {
    case "minutely":
      return `Mỗi ${n ?? 1} phút`;
    case "hourly":
      return `Mỗi ${n ?? 1} giờ`;
    case "weekly": {
      const days = (r.weekdays ?? []).map((d) => WEEKDAY[d]).filter(Boolean).join(", ");
      return `Hằng tuần${days ? ` ${days}` : ""}${at}`;
    }
    case "daily":
    default:
      return n ? `Mỗi ${n} ngày${at}` : `Hằng ngày${at}`;
  }
}

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed", "cancelled"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Nhãn khớp `TICKET_STATUS_LABEL` bên mobile — hai app nói cùng một thứ tiếng. */
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã xong",
  closed: "Đã đóng",
  cancelled: "Đã huỷ",
};

/** Yêu cầu chăm sóc khách (customer service request) — khớp `Ticket` của mobile. */
export type Ticket = {
  id: string;
  conversation_id: string | null;
  platform: string;
  request_code: string;
  request_type: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  summary: string;
  assigned_to_name: string;
  created_at: string;
};

/** Câu hỏi trợ lý phục vụ chưa trọn — nguồn `GET /business/agents/{id}/quality`.
 *  no_answer      → kho tri thức không có nội dung liên quan (trượt hẳn)
 *  weak_grounding → có trả lời nhưng căn cứ yếu (trượt nhẹ)
 *  disliked       → trả lời rồi nhưng khách bấm 👎 */
export type FailedQuestion = {
  question: string;
  answer: string;
  kind: "no_answer" | "weak_grounding" | "disliked";
  count: number;
  conversation_id?: string | null;
  message_id?: string | null;
};

export type AgentQuality = {
  days: number;
  total_questions: number;
  feedback: Record<string, number>;
  kb_gap_count: number;
  catalog_miss_count: number;
  /** null = chưa đo được lần nào sau khi bật đếm mẫu số. PHẢI ẩn con số, đừng
   *  hiện 0% — "chưa biết" khác hẳn "0% hỏng". */
  fallback_rate: number | null;
  /** Mốc bắt đầu đo được tỉ lệ (ISO). null = chưa có. */
  measured_since?: string | null;
  /** Số lượt thực sự truy vấn tri thức — mẫu số của fallback_rate. */
  kb_query_count?: number;
  top_failed_questions: FailedQuestion[];
};

export const FAILED_KIND: Record<FailedQuestion["kind"], { label: string; bg: string; fg: string }> = {
  no_answer: { label: "Không trả lời được", bg: "#fff4d6", fg: "#8a6100" },
  weak_grounding: { label: "Căn cứ yếu", bg: "#e3f0ff", fg: "#1b5fa8" },
  disliked: { label: "Bị chê 👎", bg: "#ffe6e4", fg: "#a33a33" },
};

/** Luật vá gắn ở tầng agent — đè lên prompt gốc, áp cho mọi kênh.
 *  Đọc/ghi qua `agent_config_json.prompt_hotfix` (PATCH /agents/{id}). */
export type PromptHotfix = { text: string; updated_at?: string; updated_by?: string };

export const HOTFIX_MAX_CHARS = 2000;

export type AgentDetail = {
  id: string;
  name: string;
  agent_config_json?: Record<string, unknown> | null;
};

/** Kênh đã nối (Facebook page, Zalo OA…). `config_json.runtime.auto_reply_enabled`
 *  là MẶC ĐỊNH cho hội thoại tương lai của kênh đó:
 *    true / vắng mặt → trợ lý tự trả lời
 *    false           → trợ lý chỉ soạn nháp, người bấm gửi
 *  Xem `resolve_effective_reply_mode`: ghi đè của từng hội thoại thắng trước,
 *  không có ghi đè thì rơi về cờ này. */
export type Integration = {
  id: string;
  agent_id: string | null;
  platform: string;
  external_app_id: string;
  status: string;
  config_json?: { runtime?: { auto_reply_enabled?: boolean | null }; meta?: { name?: string } };
};

/** Nền tảng có endpoint đổi cờ auto-reply. Các nền tảng khác chỉ đọc được. */
export const AUTO_REPLY_EDITABLE = new Set(["facebook", "instagram"]);

/** Kênh trò chuyện — lọc bỏ ad_partner, email… vốn không phải nơi khách nhắn. */
export const CHAT_PLATFORMS = new Set(["facebook", "instagram", "zalo", "lark", "telegram", "web"]);

/** Một tin khớp khi tìm nội dung — `GET /conversations/search`. */
export type SearchHit = { conversation_id: string; message_id: string; snippet: string };

/** Một kênh chat neo vào agent. Backend trả DTO tối giản — KHÔNG có config_json
 *  (trong đó là page_access_token). */
export type Kenh = {
  id: string;
  platform: string;
  status: string;
  label: string;
  /** BA nấc — đây mới là trường nên đọc. `auto_reply_enabled` không phân biệt được
   *  "soạn nháp chờ duyệt" với "im hẳn": cả hai đều là false. */
  reply_mode?: Exclude<ReplyMode, null>;
  /** Giữ cho tương thích ngược. ĐỪNG dùng để hiện trạng thái — xem `reply_mode`. */
  auto_reply_enabled: boolean;
  /** Mức KÊNH chỉ đổi được cho Meta; Zalo hiện chỉ đọc. */
  editable: boolean;
};

/** Nấc hiện hành của một kênh. Backend cũ chưa trả `reply_mode` thì suy từ cờ boolean
 *  — suy được "tự gửi" hay "không tự gửi", nhưng KHÔNG suy được "im hẳn", nên nấc đó
 *  chỉ hiện khi backend nói rõ. Đoán bừa ở đây thì màn hình báo trợ lý im trong khi
 *  nó vẫn đang soạn nháp. */
export function nacCuaKenh(k: Kenh): Exclude<ReplyMode, null> {
  return k.reply_mode ?? (k.auto_reply_enabled ? "auto_send" : "advisor");
}

/** "Tôi là ai, với quyền gì" — `GET /users/me/principal`.
 *
 * `auth_source` phân biệt hai loại principal: `clerk` là người thật đăng nhập,
 * `app_key` là khoá API của app này đóng vai. Với coldbrew thì luôn là `app_key`,
 * nên VAI hiện lên là quyền của KHOÁ chứ không phải của người đang ngồi trước máy
 * — nói nhầm chỗ này thì người trực tưởng bị giới hạn cá nhân. */
export type Principal = {
  auth_source: "clerk" | "app_key";
  role: string | null;
  email: string | null;
  name: string | null;
  agent_id: string | null;
  scopes: string[];
};

/** Nhãn tiếng Việt cho từng quyền. Thiếu quyền là màn hình lặng lẽ mất một mục —
 *  bày danh sách ra để người trực tự soi được vì sao không thấy cái mình cần. */
export const NHAN_QUYEN: Record<string, string> = {
  // ── App hộp thư (runbook 36) ──
  "inbox:read": "Xem hộp thư",
  "inbox:reply": "Trả lời khách",
  "inbox:reply_mode": "Đổi nấc trả lời của hội thoại",
  "drafts:read": "Xem nháp trợ lý",
  "drafts:approve": "Duyệt / sửa nháp",
  "tickets:read": "Xem yêu cầu khách",
  "tickets:write": "Đổi trạng thái yêu cầu",
  "quality:read": "Xem chất lượng trợ lý",
  "channels:read": "Xem kênh đã nối",
  "channels:auto_reply": "Đổi nấc trả lời của kênh",
  "agent:read": "Xem cấu hình trợ lý",
  "agent:config:write": "Sửa luật bổ sung",
  "chat:test": "Chat thử với trợ lý",
  // ── Quyền của các loại key khác cùng hệ (đối tác, webhook) ──
  // Có mặt ở đây để key nào lỡ mang chúng thì màn hình vẫn đọc ra tiếng Việt, thay
  // vì phun mã thô cho người trực.
  "messages:read": "Đọc tin nhắn (API đối tác)",
  "messages:send": "Gửi tin nhắn (API đối tác)",
  "customers:read": "Xem khách hàng",
  "threads:read": "Đọc luồng hội thoại",
  "effectiveness:read": "Xem hiệu quả",
  "analytics:workspace:ask": "Hỏi dữ liệu workspace",
  "webhooks:manage": "Quản lý webhook",
};

export const NHAN_VAI: Record<string, string> = {
  owner: "Toàn quyền",
  admin: "Quản trị",
  editor: "Chỉnh sửa",
  viewer: "Chỉ xem",
};
