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

Password sống ở **Clerk**, membership sống ở **phenau** — hai hệ khác nhau, và
phenau không bao giờ giữ password. Thứ tự BẮT BUỘC:

1. **Clerk** Dashboard → Users → **Create user** (email + password, không gửi mail mời)
2. **Cho tài khoản đó đăng nhập một lần** (coldbrew hoặc dashboard chính) — đây là
   bước hay bị bỏ sót, xem lý do dưới
3. **phenau** → workspace của khách → Thêm thành viên bằng email, vai `editor`
4. Đưa email + password cho khách

Vì sao bước 2: `add_member_by_email` tra bảng `users` của phenau theo email và
**ném lỗi `User with this email has not registered yet`** nếu chưa có. Bản ghi đó
chỉ sinh ra khi (a) webhook Clerk `user.created` chạy, hoặc (b) user đăng nhập lần
đầu. Ở local webhook không gọi tới được `localhost:8000` → tạo user ở Clerk xong mà
add member vẫn báo "chưa đăng ký". Đăng nhập một lần là xong.

Hệ quả bước 2: lần đăng nhập đầu **tự cấp cho user một workspace cá nhân trống**
(`upsert_user_and_tenant`). Nên sau bước 3 user thuộc 2 workspace, và backend mặc
định bind vào workspace CHÍNH (cái trống) → đây chính là lý do
`NEXT_PUBLIC_TENANT_ID` bắt buộc, thiếu là hộp thư trống trơn không báo lỗi.

Đường khác — `POST /tenants/me/members/bulk-invite` — nhận cả email chưa có tài
khoản (ghi `pending_invites` + gửi Clerk Invitation, webhook attach sau). Nhưng
đường đó để **khách tự đặt password** qua link mời, ngược với mô hình ở đây là
agency cấp sẵn tài khoản.

⚠ **Password chỉ đăng nhập được nếu instance bật nó làm first factor.** Clerk tách
hai thứ: *có* password (`password.enabled`, bắt buộc lúc tạo user) và *đăng nhập
bằng* password (`password.used_for_first_factor`). Bật cái sau ở Dashboard →
User & authentication → toggle **Password**. Không bật thì màn đăng nhập chỉ hỏi
email rồi gửi mã OTP, dù user đã có password.

Instance dev (`pk_test`) dùng CHUNG với frontend chính → bật là cả hai đổi theo,
nhưng chỉ ở dev. **Instance production (`pk_live`) có bộ settings RIÊNG** — deploy
cho khách xong phải bật lại bên đó, nếu không màn đăng nhập thật vẫn là OTP.

Kiểm trạng thái thật (giao diện Dashboard và API từng nói ngược nhau: `auth_config
.first_factors` có `password` trong khi `attributes.password.used_for_first_factor`
là `false` — tin bước đăng nhập thật, đừng tin một trường):

```bash
PK=$(grep NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY .env.local | cut -d= -f2)
B=$(echo -n "$PK" | sed 's/^pk_test_//;s/^pk_live_//')
while [ $(( ${#B} % 4 )) -ne 0 ]; do B="${B}="; done
curl -s "https://$(echo -n "$B" | base64 -d | tr -d '$')/v1/environment" \
  | node -pe 'const a=JSON.parse(require("fs").readFileSync(0)).user_settings.attributes; \
      `password first-factor: ${a.password.used_for_first_factor}\nemail: ${a.email_address.first_factors}`'
```

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
| `GET /v1/conversations/search?agent_id&q` | tìm theo nội dung tin (`agent_id` BẮT BUỘC, `q` ≥2 ký tự) |
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

## Hai tầng quyết định trợ lý trả lời thế nào

`resolve_effective_reply_mode` đọc theo thứ tự:

1. **Ghi đè của TỪNG hội thoại** (`conversations.reply_mode_override`) — đặt ở
   tab Hộp thư. Ba nấc: `auto_send` · `advisor` · `off`.
2. Không có ghi đè → **mặc định của KÊNH**
   (`integration.config_json.runtime.auto_reply_enabled`) — đặt ở tab Cài đặt.
   Chỉ hai nấc: bật = tự trả lời, tắt = soạn nháp chờ duyệt.

Nên **không có nấc "im hẳn" ở mức kênh** — muốn trợ lý không cả soạn nháp thì
phải đặt riêng cho hội thoại đó. Màn Cài đặt nói thẳng điều này.

Đổi cờ kênh: `POST /integrations/meta/set-auto-reply` — **chỉ Facebook/Instagram**.
Kênh khác hiện read-only.

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

⚠ `PATCH /agents/{id}` thay **cả** `agent_config_json` — phải đọc lại rồi ghi đè
nguyên object, gửi thiếu khoá là xoá mất cấu hình khác (`voucher_context`,
`strict_grounding`, `rendering`…).

## SSE phải đi qua route handler, KHÔNG qua rewrite

`next.config.ts` rewrite đi bằng `fetch()` của Node, mà `fetch()` **đệm** phản
hồi: backend bắn từng mảnh `delta` ngay từ giây đầu nhưng trình duyệt chỉ nhận
được khi stream đóng → chữ hiện một cục sau 5–10 giây, dù client đã đọc bằng
`getReader()`.

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

Vercel → import repo → set env → deploy. Sau đó Domains → thêm domain của khách.
Một khách một Vercel project, cùng repo, khác env.
