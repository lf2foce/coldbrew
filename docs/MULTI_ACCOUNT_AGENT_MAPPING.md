# Thiết kế: Multi-Account & Phân quyền hiển thị theo Agent trong Coldbrew

**Trạng thái (14/09/2026):** **PROPOSAL / DRAFT**  
**Tham chiếu:** `phenau_v3/docs/architecture/124-coldbrew-multi-account-agent-mapping.md`  

---

## 1. Mục tiêu

1. **Tuân thủ chuẩn ATTT:** Chuyển cổng đăng nhập từ 1 mật khẩu chung sang cặp **Email + Mật khẩu (tối thiểu 12 ký tự)**, có chống brute-force để đảm bảo định danh và lưu vết kiểm toán (Audit Trail).
2. **Hỗ trợ Multi-Account / Multi-Agent:** Cùng 1 instance Coldbrew có thể phục vụ nhiều tài khoản, mỗi tài khoản map với một Agent riêng (hoặc một nhóm Agent).
3. **Phân quyền hiển thị tính năng Ads (Per-Account Ads Toggle):**
   * Tài khoản Quản lý: Có quyền xem Ads $\rightarrow$ Hiện tab Báo cáo doanh thu & CPL/ROAS (`show_ads: true`).
   * Tài khoản Nhân viên (CSKH): Không được xem chi phí quảng cáo $\rightarrow$ Ẩn hoàn toàn tab Báo cáo (`show_ads: false`), chỉ dùng Hộp thư và Yêu cầu khách.
   * **Mặc định an toàn (Default Off):** `ENABLE_INSIGHT_REPORT` mặc định = 0 (TẮT), chỉ bật khi cấu hình = 1.

---

## 2. Mô hình cấu hình đề xuất (`ACCOUNTS_JSON`)

Trong biến môi trường server-side của Coldbrew:

```json
[
  {
    "email": "quanly@namdigital.vn",
    "password_hash": "$2b$12$...",
    "agent_id": "125939f1-bdb6-416b-8add-1e9cbe6c2165",
    "agent_name": "Reti BĐS",
    "api_key": "phin_live_...",
    "show_ads": true
  },
  {
    "email": "cskh@namdigital.vn",
    "password_hash": "$2b$12$...",
    "agent_id": "125939f1-bdb6-416b-8add-1e9cbe6c2165",
    "agent_name": "Reti BĐS",
    "api_key": "phin_live_...",
    "show_ads": false
  }
]
```

---

## 3. Luồng hoạt động

1. **Đăng nhập:** Người dùng nhập Email + Mật khẩu. Server xác thực và ký Session Cookie (HMAC-SHA256) chứa `{ email, agent_id, show_ads }`.
2. **Giao diện:** `rail.tsx` đọc `session.show_ads` để quyết định có render tab Báo cáo hay không.
3. **Proxy BFF:** Lấy đúng `api_key` của tài khoản đó kẹp vào header khi gọi xuống Phê Nâu (`https://phenau.com/api/v1/...`). Trình duyệt không bao giờ thấy API Key.
