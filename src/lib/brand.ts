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

/**
 * Workspace chứa agent. BẮT BUỘC khi tài khoản đăng nhập thuộc NHIỀU workspace:
 * backend mặc định bind vào workspace CHÍNH của user, nên gọi agent ở workspace
 * khác sẽ bị RLS trả rỗng — không lỗi, không cảnh báo, chỉ trống trơn.
 * (Đã dính 18/08/2026: tài khoản thuộc 7 workspace, agent ở workspace thứ hai.)
 */
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "";
