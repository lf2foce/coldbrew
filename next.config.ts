import type { NextConfig } from "next";

/**
 * coldbrew — app hộp thư giao cho KHÁCH của agency, chạy dưới domain của họ.
 *
 * KHÔNG có rewrite ở đây nữa. Bản trước dùng `/api/py/:path*` →
 * `${BACKEND_URL}/api/:path*`, tức mở TOÀN BỘ 39 router của backend cho bất kỳ ai
 * qua được cổng đăng nhập, và không chèn được gì vào request. Với mô hình API key
 * nó hỏng theo hai hướng cùng lúc: hoặc request đi ra không mang key, hoặc phải
 * nhét key xuống browser — mà key ở browser thì coi như đã lộ.
 *
 * Thay bằng BFF proxy `src/app/api/py/[...path]/route.ts`: kiểm cookie phiên,
 * đối chiếu allowlist 19 đường, rồi mới gắn key ở phía server.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
