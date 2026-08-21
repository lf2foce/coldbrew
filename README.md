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
pnpm dev                       # http://localhost:3005
```

## Biến môi trường

| Biến | Bắt buộc | Việc |
|---|---|---|
| `BACKEND_URL` | ✅ | Gốc API. **Cố định lúc BUILD** — xem cảnh báo dưới |
| `PHENAU_API_KEY` | ✅ | Key của workspace khách, đã gắn cứng tenant + agent |
| `APP_PASSWORD` | ✅ | Mật khẩu vào app, **dùng chung** cả workspace |
| `SESSION_SECRET` | ✅ | Ký cookie phiên, ≥32 ký tự, mỗi khách một giá trị |
| `NEXT_PUBLIC_AGENT_ID` | ✅ | Agent app hiển thị (khớp agent trong key) |
| `NEXT_PUBLIC_BRAND_NAME` | ✅ | Tên hiện trên tab + màn đăng nhập |
| `NEXT_PUBLIC_BRAND_ACCENT` | | Màu nhấn, mặc định `#1F4470` |

> ⚠ **`BACKEND_URL` được cố định lúc `next build`**, không đọc lại lúc chạy.
> Đổi env xong phải **build lại / redeploy**. Trên Vercel: set env **trước** lần
> deploy đầu, nếu không proxy sẽ trỏ `localhost:8000`.

`NEXT_PUBLIC_*` bị nhúng vào bundle tải về máy khách — **không đặt secret ở đó**.
`BACKEND_URL` và `CLERK_SECRET_KEY` không có tiền tố đó nên ở lại server.

## Đăng nhập

**Một mật khẩu dùng chung cho cả workspace của khách** (`APP_PASSWORD`), không có
hệ tài khoản riêng từng người.

Vì sao không Clerk: một Clerk production instance chỉ phục vụ **đúng một domain** —
đo 18/08/2026, origin `app.hdx.vn` → `origin_invalid`, mà subdomain cũng
→ `subdomain_not_allowed`. App này chạy dưới domain của từng khách nên Clerk chỉ
dùng được nếu mỗi khách một Clerk app, kéo theo bẫy hai hàng `users` khi cùng một
email đăng nhập ở hai instance. Chi tiết: runbook 36 bên `phenau_v3`.

Cái giá đã chấp nhận, biết trước chứ không phải sót:

| | hệ quả | khi nào phải xử lý |
|---|---|---|
| Mật khẩu dùng chung | không thu hồi được theo từng người — nhân viên nghỉ thì đổi mật khẩu cho tất cả | khách >5 người trực |
| Một danh tính | duyệt nháp / chia ticket / `scope=mine` chung một người | khi cần truy vết ai làm gì |

Cookie phiên **được ký HMAC-SHA256** bằng `SESSION_SECRET`, `httpOnly` + `sameSite=lax`,
hạn 12 giờ. Kiểu "so mật khẩu xong set `logged_in=1`" là vô nghĩa — ai cũng tự đặt
cookie đó trong DevTools.

Trong phần được ký có **cả hạn lẫn dấu vân tay của `APP_PASSWORD`**, nên **đổi mật
khẩu là mọi phiên đang mở chết ngay**. Không có vân tay đó thì đổi mật khẩu chẳng
đuổi được ai: cookie đã phát vẫn sống trọn 12 giờ — mà đổi mật khẩu chính là cách
duy nhất thu hồi quyền ở mô hình dùng chung.

Chặn dò mật khẩu: 8 lần sai / 10 phút theo IP, mỗi lần sai chậm 400ms; vào đúng thì
xoá lịch sử sai của IP đó.

Mọi request **ghi** phải cùng `Origin` với app. `sameSite=lax` chưa đủ: nó chặn
cross-SITE tính theo eTLD+1, nên `blog.khachhang.vn` — thường là WordPress và hay bị
chiếm — vẫn same-site và cookie vẫn được gửi kèm.

Phản hồi chứa dữ liệu khách đều mang `Cache-Control: private, no-store`, để bấm Back
sau khi đăng xuất không thấy lại hộp thư.

Hàng rào có test: `pnpm test` (13 ca — allowlist chặn mặc định, không khớp tiền tố,
đổi mật khẩu giết phiên cũ, chặn subdomain).

## Hợp đồng với backend

App chỉ gọi các đường dưới đây, qua **BFF proxy** `src/app/api/py/[...path]/route.ts`.
Danh sách này CHÍNH LÀ allowlist trong file đó — thêm đường mới phải sửa cả hai chỗ.
Backend đổi hình dạng phản hồi ở bất kỳ dòng nào trong bảng này là app vỡ — đây là
**bề mặt duy nhất** cần kiểm khi nâng cấp backend.

| Đường | Dùng ở |
|---|---|
| `GET /v1/conversations?agent_id&scope&limit&offset` | danh sách hộp thư |
| `GET /v1/conversations/{id}` | mở một hội thoại |
| `GET /v1/conversations/{id}/messages` | đọc tin |
| `GET /v1/conversations/{id}/messages/{msgId}` | nhảy tới đúng một tin (deep-link từ tab Quản lý thông tin) |
| `POST /v1/conversations/{id}/reply` | người thật trả lời |
| `POST /v1/conversations/{id}/reply-mode` | bật/tắt bot cho hội thoại |
| `POST /v1/conversations/{id}/mark-read` | đánh dấu đã đọc |
| `GET /v1/conversations/{id}/drafts` | nháp bot đề xuất |
| `POST /v1/conversations/{id}/drafts/{draftId}/{approve\|dismiss\|edit-and-send}` | xử lý nháp |
| `GET /v1/conversations/{id}/events` | realtime (SSE, phải đi qua proxy) |
| `GET /v1/conversations/search?agent_id&q` | tìm theo nội dung tin (`agent_id` BẮT BUỘC, `q` ≥2 ký tự) |
| `GET /v1/agents/{id}/tickets` | tab Yêu cầu khách (envelope `{items,total}`) |
| `PATCH /v1/agents/{id}/tickets/{tid}` | đổi trạng thái ticket |
| `GET /v1/conversations/facets` | đếm theo kênh cho chip lọc |
| `GET /v1/business/agents/{id}/quality?days&platforms` | tab Quản lý thông tin (`platforms` lặp lại cho từng nguồn) |
| `GET /v1/agents/{id}` | đọc cấu hình agent |
| `PUT /v1/agents/{id}` | ghi luật vá (PUT, backend không có PATCH) |
| `GET /v1/agents/{id}/channels` | kênh của agent + nấc trả lời |
| `POST /v1/agents/{id}/channels/{integrationId}/auto-reply` | đổi nấc kênh (`{mode}`; vẫn nhận `{enabled}` cũ) |
| `GET /v1/users/me/principal` | vai + quyền của tài khoản đang đăng nhập |
| `POST /v1/agents/{id}/chat` | tab Chat thử (SSE, qua route riêng — KHÔNG qua proxy) |

Xác thực: **`Authorization: Bearer <PHENAU_API_KEY>`**, do BFF proxy gắn ở server.
Trình duyệt không cầm key, cũng không khai workspace — key đã gắn cứng tenant + agent.
Nghĩa là **không còn bí mật nào trong bundle tải về máy khách**.

## Bốn tab

| Tab | Nguồn |
|---|---|
| Hộp thư | `/conversations?scope=all` — hội thoại khách |
| Yêu cầu khách | `/agents/{id}/tickets` — kanban khi màn ≥1100px |
| Quản lý thông tin | `/business/agents/{id}/quality` — câu hỏi trượt, bấm để mở hội thoại |
| Chat thử | `/conversations?scope=mine` + `/agents/{id}/chat` |

Cài đặt nằm ở đáy rail.

## Hai tầng quyết định trợ lý trả lời thế nào

`resolve_effective_reply_mode` đọc theo thứ tự:

1. **Ghi đè của TỪNG hội thoại** (`conversations.reply_mode_override`) — đặt ở
   tab Hộp thư. Ba nấc: `auto_send` · `advisor` · `off`.
2. Không có ghi đè → **mặc định của KÊNH**
   (`integration.config_json.runtime.auto_reply_enabled`) — đặt ở tab Cài đặt.
   Chỉ hai nấc: bật = tự trả lời, tắt = soạn nháp chờ duyệt.

Nên **không có nấc "im hẳn" ở mức kênh** — muốn trợ lý không cả soạn nháp thì
phải đặt riêng cho hội thoại đó. Màn Cài đặt nói thẳng điều này.

Mức KÊNH **không chỉnh được từ app này** — mục đó đã gỡ khỏi tab Cài đặt. Hai
endpoint `/integrations/*` thao tác theo tenant và không nhận `agent_id`, nên chốt
khoá-key-theo-agent của backend không với tới: trong workspace nhiều agent, key của
agent này sẽ liệt kê được mọi kênh của tenant. Đổi mặc định kênh thì làm ở dashboard
chính; khách vẫn tắt/bật trợ lý cho từng hội thoại.

## Giới hạn đã biết

**`unread` chưa có ở backend** — badge số chỉ hiện với dữ liệu mock.

## Luật vá (hotfix)

Ô soạn ở tab Cài đặt ghi vào `agent_config_json.prompt_hotfix`; backend ghép nó
vào **cuối** prompt lúc chạy (`chat_runtime_prompt._append_hotfix`), sau cả khối
`[[ADDITIONAL_PAGE_CONTEXT]]` của kênh — luật vá phải đè được luật cũ.

Vì sao ở tầng agent chứ không dùng lại `prompt_override` của integration:
`prompt_override` sống trong `integration.config_json`, mà OAuth kết nối lại kênh
GHI ĐÈ cả config (chỉ khoá `meta` được giữ) → luật vá sẽ biến mất im lặng sau một
lần khách nối lại Fanpage. Nó cũng gắn theo kênh, nên 5 Fanpage phải vá 5 lần.

Trần 2.000 ký tự: đây là chỗ sửa nhanh vài dòng, không phải prompt thứ hai.

⚠ `PUT /agents/{id}` thay **cả** `agent_config_json` — phải đọc lại rồi ghi đè
nguyên object, gửi thiếu khoá là xoá mất cấu hình khác (`voucher_context`,
`strict_grounding`, `rendering`…).

## SSE phải đi qua route handler, KHÔNG qua rewrite

Không còn rewrite nào trong `next.config.ts` — mọi đường đi qua BFF proxy.
(Ghi chú cũ ở đây nói `fetch()` của Node đệm phản hồi; đo lại 19/08/2026 bằng backend
giả bắn 5 sự kiện cách nhau 700ms thì KHÔNG đệm. Vẫn giữ route riêng cho chat vì nó
dùng `node:http` và chủ động set header chống đệm.)

Nên chat thử gọi `src/app/api/chat/[agentId]/route.ts` — dùng `node:http` đẩy
từng chunk, kèm `X-Accel-Buffering: no` để proxy phía trước cũng không đệm lại.
Đây đúng cách dashboard chính làm.

Endpoint đọc (`/conversations/*`) thì rewrite bình thường là đủ.

## Realtime

`lib/use-conversation-stream.ts`, chép pattern của `messages-page-client.tsx`:
`fetch` + `getReader()` (KHÔNG `EventSource` — nó không set được header), sự kiện
chỉ mang `{id, role}` nên phải gọi lấy tin đầy đủ, dedupe theo `id` **và** theo
bản lạc quan `tmp-…` trùng nội dung, `AbortController` huỷ khi đổi hội thoại,
backoff 1→15s, `mark-read` throttle 10s.

## Thu hẹp về một agent

App truyền `agent_id` vào truy vấn, **backend lọc ở SQL**. API có thể trả nhiều
agent nếu tài khoản thuộc workspace nhiều agent, nhưng app chỉ hỏi đúng một.
Đây là quyết định về hiển thị, không phải về bảo mật — muốn cô lập thật thì phải
làm ở tầng backend.

## Triển khai

Vercel → import repo → set env (**gồm `PHENAU_API_KEY`, `APP_PASSWORD`, `SESSION_SECRET`**) → deploy.
Sau đó Domains → thêm domain của khách. Không cần cấu hình gì ở Clerk, cũng không
cần thêm origin nào vào CORS của backend.
Một khách một Vercel project, cùng repo, khác env.
