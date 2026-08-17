/**
 * Chế độ MOCK — bật bằng `NEXT_PUBLIC_MOCK=1`.
 *
 * Vì sao cần: DB dev có 0 hội thoại, nên đăng nhập thật xong màn hình vẫn trắng,
 * không nhìn ra bố cục đúng hay sai.
 *
 * Bối cảnh lấy từ `backend/scripts/seed_bds_demo.py` (sandbox BĐS): dự án
 * Riverside / Sun Vũng Tàu, ngân sách 2–5 tỷ, nhu cầu Đầu tư / Mua để ở, loại
 * yêu cầu pháp lý và tư vấn chung. KHÔNG đọc thẳng data seed đó vì nó tạo
 * *ticket* chứ không tạo tin nhắn, và tên khách là placeholder ("Khách Legal A").
 *
 * Hai luật để mock không đi nhầm ra thật:
 *  1. Chỉ bật khi env nói bật — mặc định TẮT.
 *  2. Bật là UI phải hiện cảnh báo. Không có mock im lặng.
 *
 * Hình dạng dữ liệu phải KHỚP phản hồi backend (bảng hợp đồng trong README) —
 * mock lệch kiểu thì UI chạy ở mock mà vỡ ở thật.
 */

export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

import type { AgentQuality, AgentTask, Conversation, Draft, Message, Ticket } from "./types";

export type { AgentQuality, AgentTask, Conversation, Draft, Message, Ticket };

// Giờ cố định, KHÔNG dùng Date.now(): render server và client lệch nhau → React
// kêu hydration mismatch.
export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "c1", title: "Chị Mai Anh", platform: "facebook", status: "open", message_count: 8, updated_at: "2026-08-18T09:02:00.000Z" },
  { id: "c2", title: "Anh Đức Thắng", platform: "zalo", status: "open", message_count: 6, updated_at: "2026-08-18T08:20:00.000Z" },
  { id: "c3", title: "Chị Ngọc Hà", platform: "facebook", status: "pending", message_count: 3, unread: 1, reply_mode_override: "advisor", updated_at: "2026-08-18T07:05:00.000Z" },
  { id: "c4", title: "Anh Quốc Hưng", platform: "web", status: "open", message_count: 7, updated_at: "2026-08-17T16:40:00.000Z" },
  { id: "c5", title: "Chị Thu Trang", platform: "zalo", status: "open", message_count: 4, reply_mode_override: "off", updated_at: "2026-08-17T11:15:00.000Z" },
  { id: "c6", title: "Khách chưa để lại tên", platform: "facebook", status: "pending", message_count: 2, unread: 2, updated_at: "2026-08-16T20:30:00.000Z" },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: "1", role: "user", content: "Chào shop, dự án Riverside còn căn 2PN nào không ạ?", created_at: "2026-08-18T08:30:00.000Z" },
    { id: "2", role: "assistant", content: "Dạ chào anh/chị ạ. Riverside hiện còn một số căn 2PN diện tích 62–68m². Anh/chị đang tìm để ở hay để đầu tư ạ?", created_at: "2026-08-18T08:31:00.000Z" },
    { id: "3", role: "user", content: "Mình mua để ở. Tầm 2 tỷ có căn nào không em?", created_at: "2026-08-18T08:40:00.000Z" },
    { id: "4", role: "assistant", content: "Dạ tầm 2 tỷ thì có căn 62m² hướng Đông Nam ạ. Em gửi anh/chị mặt bằng và bảng giá chi tiết nhé?", created_at: "2026-08-18T08:41:00.000Z" },
    { id: "5", role: "user", content: "Ok em gửi giúp. Mà nhà mẫu xem được cuối tuần không?", created_at: "2026-08-18T08:52:00.000Z" },
    { id: "6", role: "assistant", content: "Dạ nhà mẫu mở cả thứ 7 và Chủ nhật ạ. Anh/chị để lại số điện thoại để bên em giữ lịch xem nhà nhé?", created_at: "2026-08-18T08:53:00.000Z" },
    { id: "7", role: "user", content: "0912 345 678", created_at: "2026-08-18T09:00:00.000Z" },
    { id: "8", role: "human_agent", content: "Dạ em đã ghi nhận số của chị Mai Anh. Chuyên viên khu Riverside sẽ gọi xác nhận lịch trong hôm nay ạ.", created_at: "2026-08-18T09:02:00.000Z" },
  ],
  c2: [
    { id: "1", role: "user", content: "Sun Vũng Tàu giờ giá bao nhiêu 1 căn rồi bạn?", created_at: "2026-08-18T08:00:00.000Z" },
    { id: "2", role: "assistant", content: "Dạ Sun Vũng Tàu hiện có các căn từ 5 tỷ trở lên tuỳ view và tầng ạ. Anh quan tâm căn hướng biển hay hướng thành phố?", created_at: "2026-08-18T08:02:00.000Z" },
    { id: "3", role: "user", content: "Hướng biển. Mình mua đầu tư cho thuê thôi", created_at: "2026-08-18T08:09:00.000Z" },
    { id: "4", role: "assistant", content: "Dạ với mục đích đầu tư thì căn hướng biển tầng cao đang được khách thuê ưa chuộng nhất ạ. Em gửi anh bảng dòng tiền cho thuê tham khảo nhé?", created_at: "2026-08-18T08:11:00.000Z" },
    { id: "5", role: "user", content: "Ừ gửi đi", created_at: "2026-08-18T08:18:00.000Z" },
    { id: "6", role: "assistant", content: "Dạ vâng, anh cho em xin số điện thoại để gửi tài liệu qua Zalo ạ.", created_at: "2026-08-18T08:20:00.000Z" },
  ],
  c3: [
    { id: "1", role: "user", content: "Cho hỏi căn hộ này sổ đỏ hay sổ hồng vậy?", created_at: "2026-08-18T07:00:00.000Z" },
    { id: "2", role: "assistant", content: "Dạ căn hộ tại dự án được cấp sổ hồng riêng từng căn ạ.", created_at: "2026-08-18T07:02:00.000Z" },
    { id: "3", role: "user", content: "Thế đã có sổ chưa hay còn chờ?", created_at: "2026-08-18T07:05:00.000Z" },
  ],
  c4: [
    { id: "1", role: "user", content: "Mình đang tìm căn 3PN khu Riverside, ngân sách khoảng 3 tỷ", created_at: "2026-08-17T15:50:00.000Z" },
    { id: "2", role: "assistant", content: "Dạ 3 tỷ ở Riverside hiện phù hợp với căn 3PN 84m² ạ. Anh cần nhận nhà ngay hay chờ bàn giao đợt sau?", created_at: "2026-08-17T15:52:00.000Z" },
    { id: "3", role: "user", content: "Nhận ngay càng tốt, mình cần chuyển vào tháng 10", created_at: "2026-08-17T16:01:00.000Z" },
    { id: "4", role: "assistant", content: "Dạ có 2 căn đã hoàn thiện, bàn giao trong tháng 9 ạ. Em đặt lịch cho anh xem thực tế nhé?", created_at: "2026-08-17T16:03:00.000Z" },
    { id: "5", role: "user", content: "Được. Chiều thứ 5 mình rảnh", created_at: "2026-08-17T16:20:00.000Z" },
    { id: "6", role: "assistant", content: "Dạ em ghi nhận chiều thứ 5. Anh cho em xin số điện thoại để chuyên viên xác nhận ạ.", created_at: "2026-08-17T16:22:00.000Z" },
    { id: "7", role: "user", content: "0987 654 321", created_at: "2026-08-17T16:40:00.000Z" },
  ],
  c5: [
    { id: "1", role: "user", content: "Bên mình có hỗ trợ vay ngân hàng không?", created_at: "2026-08-17T11:00:00.000Z" },
    { id: "2", role: "assistant", content: "Dạ có ạ, dự án liên kết ngân hàng hỗ trợ vay tới 70% giá trị căn hộ.", created_at: "2026-08-17T11:02:00.000Z" },
    { id: "3", role: "user", content: "Lãi suất thế nào em?", created_at: "2026-08-17T11:12:00.000Z" },
    { id: "4", role: "assistant", content: "Dạ mức lãi suất thay đổi theo từng đợt của ngân hàng ạ. Anh/chị để lại số điện thoại để chuyên viên báo mức đang áp dụng nhé?", created_at: "2026-08-17T11:15:00.000Z" },
  ],
  c6: [
    { id: "1", role: "user", content: "còn căn nào không", created_at: "2026-08-16T20:28:00.000Z" },
    { id: "2", role: "assistant", content: "Dạ chào anh/chị, bên em còn căn ở cả Riverside và Sun Vũng Tàu ạ. Anh/chị đang quan tâm khu nào ạ?", created_at: "2026-08-16T20:30:00.000Z" },
  ],
};

/** Nháp trợ lý soạn sẵn — chỉ có ở hội thoại đang để chế độ "advisor". */
export const MOCK_DRAFTS: Record<string, Draft[]> = {
  c3: [
    {
      id: "d1",
      content:
        "Dạ sổ hồng của dự án đang trong quá trình cấp cho từng căn ạ. Anh/chị để lại số điện thoại để bộ phận pháp lý báo tiến độ chính xác nhé?",
      created_at: "2026-08-18T07:06:00.000Z",
    },
  ],
};

export const MOCK_TASKS: AgentTask[] = [
  {
    id: "t1",
    instruction: "Tổng hợp khách quan tâm Riverside trong ngày, gửi báo cáo cuối giờ chiều",
    recurrence_rule: { kind: "daily", time: "17:30" },
    next_run_at: "2026-08-18T10:30:00.000Z",
    status: "active",
    last_error: null,
    updated_at: "2026-08-18T02:00:00.000Z",
  },
  {
    id: "t2",
    instruction: "Nhắc lại khách đã để số nhưng chưa đặt lịch xem nhà mẫu",
    recurrence_rule: { kind: "weekly", time: "09:00", weekdays: [2, 5] },
    next_run_at: "2026-08-19T02:00:00.000Z",
    status: "active",
    last_error: null,
    updated_at: "2026-08-17T09:00:00.000Z",
  },
  {
    id: "t3",
    instruction: "Báo cáo tổng hợp câu hỏi pháp lý chưa trả lời được",
    recurrence_rule: { kind: "weekly", time: "08:00", weekdays: [1] },
    next_run_at: null,
    status: "paused",
    last_error: null,
    updated_at: "2026-08-15T08:00:00.000Z",
  },
  {
    id: "t4",
    instruction: "Đồng bộ khách mới từ quảng cáo Facebook sang bảng theo dõi",
    recurrence_rule: { kind: "hourly", interval: 4 },
    next_run_at: "2026-08-18T12:00:00.000Z",
    status: "active",
    last_error: "Lần chạy trước lỗi: hết hạn token quảng cáo",
    updated_at: "2026-08-18T08:00:00.000Z",
  },
];

export const MOCK_TICKETS: Ticket[] = [
  { id: "k1", conversation_id: "c1", platform: "facebook", request_code: "YC-1042", request_type: "Xem nhà mẫu", status: "open", customer_name: "Chị Mai Anh", customer_phone: "0912 345 678", summary: "Hẹn xem căn 2PN Riverside cuối tuần", assigned_to_name: "", created_at: "2026-08-18T09:02:00.000Z" },
  { id: "k2", conversation_id: "c4", platform: "web", request_code: "YC-1041", request_type: "Xem nhà mẫu", status: "in_progress", customer_name: "Anh Quốc Hưng", customer_phone: "0987 654 321", summary: "Xem căn 3PN đã hoàn thiện, chiều thứ 5", assigned_to_name: "Ngọc Anh", created_at: "2026-08-17T16:40:00.000Z" },
  { id: "k3", conversation_id: "c3", platform: "facebook", request_code: "YC-1040", request_type: "Pháp lý", status: "open", customer_name: "Chị Ngọc Hà", customer_phone: "", summary: "Hỏi tiến độ cấp sổ hồng", assigned_to_name: "", created_at: "2026-08-18T07:05:00.000Z" },
  { id: "k4", conversation_id: "c5", platform: "zalo", request_code: "YC-1039", request_type: "Vay vốn", status: "in_progress", customer_name: "Chị Thu Trang", customer_phone: "", summary: "Cần báo lãi suất vay đang áp dụng", assigned_to_name: "Minh Tú", created_at: "2026-08-17T11:15:00.000Z" },
  { id: "k5", conversation_id: "c2", platform: "zalo", request_code: "YC-1038", request_type: "Đầu tư", status: "resolved", customer_name: "Anh Đức Thắng", customer_phone: "0903 111 222", summary: "Đã gửi bảng dòng tiền cho thuê Sun Vũng Tàu", assigned_to_name: "Ngọc Anh", created_at: "2026-08-18T08:20:00.000Z" },
];

export const MOCK_QUALITY: AgentQuality = {
  days: 30,
  total_questions: 214,
  feedback: { positive: 38, negative: 9, neutral: 167, total: 214 },
  kb_gap_count: 17,
  catalog_miss_count: 3,
  fallback_rate: 0.079,
  top_failed_questions: [
    { question: "Phí bảo trì hằng tháng của Riverside là bao nhiêu?", answer: "", kind: "no_answer", count: 6, conversation_id: "c1" },
    { question: "Dự án đã có giấy phép xây dựng chưa?", answer: "Dạ dự án đang hoàn thiện thủ tục pháp lý ạ.", kind: "weak_grounding", count: 4, conversation_id: "c3" },
    { question: "Chỗ đậu ô tô có tính thêm tiền không?", answer: "", kind: "no_answer", count: 4 },
    { question: "Bao giờ bàn giao căn 3PN tầng cao?", answer: "Dạ dự kiến quý sau ạ.", kind: "disliked", count: 3, conversation_id: "c4" },
    { question: "Ngân hàng nào đang cho vay dự án này?", answer: "Dạ dự án có liên kết ngân hàng hỗ trợ vay ạ.", kind: "weak_grounding", count: 3, conversation_id: "c5" },
    { question: "Mật độ xây dựng của khu Sun Vũng Tàu?", answer: "", kind: "no_answer", count: 2 },
  ],
};
