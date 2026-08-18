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

export type Conversation = {
  id: string;
  title: string | null;
  platform: string | null;
  status: string | null;
  message_count: number | null;
  updated_at: string;
  reply_mode_override?: ReplyMode;
  /** Số tin CHƯA ĐỌC — backend chưa trả trường này; mock có để dựng badge.
   *  Dữ liệu thật thiếu thì badge không hiện. Đừng suy từ message_count. */
  unread?: number;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "human_agent";
  content: string;
  created_at: string;
};

/** Nháp trợ lý soạn khi hội thoại ở chế độ "advisor". */
export type Draft = {
  id: string;
  content: string;
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
  fallback_rate: number;
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
