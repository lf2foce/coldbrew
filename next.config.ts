import type { NextConfig } from "next";

/**
 * coldbrew — app hộp thư giao cho KHÁCH của agency, chạy dưới domain của khách.
 *
 * Vì sao là project riêng thay vì route trong `frontend/`: frontend chính mang
 * thương hiệu Phê Nâu (title, sidebar, Clerk full dashboard). Tách project thì
 * không phải đi gỡ thương hiệu từng ngóc ngách, và không sợ sửa nhầm cái đang chạy.
 *
 * Proxy `/api/py`: browser gọi cùng origin (cookie Clerk đi kèm), Next chuyển
 * tiếp về backend. Nhờ vậy SSE (EventSource KHÔNG set được header) vẫn xác thực
 * được — đúng cơ chế dashboard đang chạy.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    // ⚠ Giá trị này được CỐ ĐỊNH lúc BUILD, không đọc lại lúc chạy. Đổi env rồi
    // `start` lại là vô ích — phải build lại / redeploy. Đã dính 18/08/2026:
    // env đã đúng mà proxy vẫn gọi localhost:8000 vì build trước khi sửa env.
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/py/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
