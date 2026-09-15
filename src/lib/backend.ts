/**
 * URL backend Phê Nâu mà SERVER Coldbrew gọi thẳng (BFF, callback, logout, chat).
 * Trình duyệt không bao giờ thấy URL này.
 *
 * Nên trỏ thẳng Render (`https://phenau-v3.onrender.com`) hoặc custom domain gắn vào
 * Render — KHÔNG trỏ `https://phenau.com/api/py`: thêm một chặng Vercel, SSE có thể
 * bị đệm, và đường dẫn khác (`/api/py/v1` thay vì `/api/v1`).
 *
 * Gọi lúc xử lý request, không đọc ở module scope: `next build` chạy với
 * NODE_ENV=production mà có thể chưa có env ⇒ ném ở module là gãy build.
 */
export function backendUrl(): string {
  const url = (process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (url) return url;
  // Bản trước rơi âm thầm về localhost:8000 ⇒ quên set env trên Vercel là mọi request
  // chết kiểu "fetch failed" khó đoán. Production phải nói thẳng thiếu gì.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Thiếu BACKEND_URL cho Coldbrew (đặt trong env của deployment)");
  }
  return "http://localhost:8000";
}
