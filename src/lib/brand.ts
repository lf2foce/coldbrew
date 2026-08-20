/**
 * MỌI thứ theo-khách nằm ở ĐÂY và env — code còn lại không được nhắc tên khách
 * hay tên Phê Nâu. Onboard khách mới = đổi env trên Vercel, không sửa code.
 *
 * NEXT_PUBLIC_AGENT_ID: app chỉ HIỂN THỊ hộp thư của agent này. API phía sau là
 * tài khoản tenant thật (Clerk) nên trả được nhiều agent — việc thu hẹp là ở UI,
 * theo quyết định đã chốt 18/08/2026: "thấy tất cả, hiển thị một".
 */
export const BRAND = {
  // Tên hiện trên tab trình duyệt + màn đăng nhập. KHÔNG mặc định "Phê Nâu" —
  // để trống thì hiện chữ trung tính, tránh lộ thương hiệu khi quên set env.
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Hộp thư",
  // Màu nhấn (nút, viền focus).
  accent: process.env.NEXT_PUBLIC_BRAND_ACCENT || "#1F4470",
};

export const AGENT_ID = process.env.NEXT_PUBLIC_AGENT_ID || "";

// TENANT_ID đã bỏ: workspace nay lấy TỪ API KEY ở phía server, client không khai
// nữa. Nhờ vậy cũng hết được cái bẫy cũ — dán nhầm id của DB dev lên production
// thì hộp thư trống trơn mà không báo lỗi gì.
