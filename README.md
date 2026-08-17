# coldbrew

Hộp thư chăm sóc khách hàng — **app giao cho khách**, chạy dưới **domain của khách**.
Không mang thương hiệu nhà cung cấp: tên, màu, agent đều đọc từ biến môi trường.

Repo này **độc lập với backend**. Nó là một client mỏng: chỉ HTML/JS + một proxy,
không có database, không có business logic. Gửi repo này cho đối tác không hé lộ gì
về backend ngoài danh sách endpoint dưới đây.

## Chạy

```bash
cp .env.example .env.local     # điền giá trị
pnpm install
pnpm dev                       # http://localhost:3100
```

## Biến môi trường

| Biến | Bắt buộc | Việc |
|---|---|---|
| `BACKEND_URL` | ✅ | Gốc API. **Cố định lúc BUILD** — xem cảnh báo dưới |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk (client) |
| `CLERK_SECRET_KEY` | ✅ | Clerk (server) |
| `NEXT_PUBLIC_AGENT_ID` | ✅ | Agent duy nhất app này hiển thị |
| `NEXT_PUBLIC_BRAND_NAME` | ✅ | Tên hiện trên tab + màn đăng nhập |
| `NEXT_PUBLIC_BRAND_ACCENT` | | Màu nhấn, mặc định `#1F4470` |

> ⚠ **`BACKEND_URL` được cố định lúc `next build`**, không đọc lại lúc chạy.
> Đổi env xong phải **build lại / redeploy**. Trên Vercel: set env **trước** lần
> deploy đầu, nếu không proxy sẽ trỏ `localhost:8000`.

`NEXT_PUBLIC_*` bị nhúng vào bundle tải về máy khách — **không đặt secret ở đó**.
`BACKEND_URL` và `CLERK_SECRET_KEY` không có tiền tố đó nên ở lại server.

## Tài khoản cho khách

Không có màn đăng ký. Tài khoản do bên vận hành tạo tay:

1. Clerk Dashboard → Users → **Create user** (email + password, không gửi mail mời)
2. Mời user đó vào workspace của khách với vai `editor`
3. Đưa email + password cho khách

## Hợp đồng với backend

App chỉ gọi các đường dưới đây, qua proxy `/api/py/*` → `${BACKEND_URL}/api/*`.
Backend đổi hình dạng phản hồi ở bất kỳ dòng nào trong bảng này là app vỡ — đây là
**bề mặt duy nhất** cần kiểm khi nâng cấp backend.

| Đường | Dùng ở |
|---|---|
| `GET /v1/conversations?agent_id&scope&limit&offset` | danh sách hộp thư |
| `GET /v1/conversations/{id}` | mở một hội thoại |
| `GET /v1/conversations/{id}/messages` | đọc tin |
| `POST /v1/conversations/{id}/reply` | người thật trả lời |
| `POST /v1/conversations/{id}/reply-mode` | bật/tắt bot cho hội thoại |
| `POST /v1/conversations/{id}/mark-read` | đánh dấu đã đọc |
| `GET /v1/conversations/{id}/drafts` | nháp bot đề xuất |
| `POST /v1/conversations/{id}/drafts/{draftId}/{approve\|dismiss\|edit-and-send}` | xử lý nháp |
| `GET /v1/conversations/{id}/events` | realtime (SSE, phải đi qua proxy) |
| `GET /v1/agents/{id}/tickets` | tab Yêu cầu khách (envelope `{items,total}`) |
| `PATCH /v1/agents/{id}/tickets/{tid}` | đổi trạng thái ticket |
| `GET /v1/business/agents/{id}/quality` | tab Trợ lý còn yếu |
| `POST /v1/agents/{id}/chat` | tab Chat thử (SSE) |

Xác thực: **`Authorization: Bearer <token Clerk>`** — backend KHÔNG đọc cookie phiên,
thiếu header là 401 sạch mọi endpoint. Kèm **`X-Phenau-Tenant-Id`** khi tài khoản
thuộc nhiều workspace, nếu không RLS trả rỗng câm (không lỗi, chỉ trống trơn).

## Bốn tab

| Tab | Nguồn |
|---|---|
| Hộp thư | `/conversations?scope=all` — hội thoại khách |
| Yêu cầu khách | `/agents/{id}/tickets` — kanban khi màn ≥1100px |
| Trợ lý còn yếu | `/business/agents/{id}/quality` — câu hỏi trượt, bấm để mở hội thoại |
| Chat thử | `/conversations?scope=mine` + `/agents/{id}/chat` |

Cài đặt nằm ở đáy rail.

## Giới hạn đã biết

**Không tắt được trợ lý cho hội thoại tương lai.** `resolve_effective_reply_mode`
chỉ đọc ghi đè của TỪNG hội thoại và cờ `auto_reply_enabled` của TỪNG kênh (chỉ
Meta có endpoint đổi). Không có "chế độ mặc định" ở mức agent.

Nên tab Cài đặt áp chế độ cho mọi hội thoại ĐANG CÓ, và nói thẳng giới hạn đó
trên màn hình. Muốn tắt hẳn cho cả về sau cần sửa backend: thêm
`agent_config_json.default_reply_mode` rồi cho `resolve_effective_reply_mode`
đọc nó — nhưng hàm đó có **6 nơi gọi**, là lõi dùng chung, phải bàn trước khi sửa.

**`unread` chưa có ở backend** — badge số chỉ hiện với dữ liệu mock.

## Thu hẹp về một agent

App truyền `agent_id` vào truy vấn, **backend lọc ở SQL**. API có thể trả nhiều
agent nếu tài khoản thuộc workspace nhiều agent, nhưng app chỉ hỏi đúng một.
Đây là quyết định về hiển thị, không phải về bảo mật — muốn cô lập thật thì phải
làm ở tầng backend.

## Triển khai

Vercel → import repo → set env → deploy. Sau đó Domains → thêm domain của khách.
Một khách một Vercel project, cùng repo, khác env.
