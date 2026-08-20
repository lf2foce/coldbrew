"use client";

/**
 * Gọi backend qua BFF proxy `/api/py/*`. Client KHÔNG mang token nào cả.
 *
 * Trước đây mỗi request phải gắn `Authorization: Bearer <token Clerk>` và
 * `X-Phenau-Tenant-Id`. Giờ cả hai biến mất khỏi trình duyệt: proxy ở server tự
 * gắn API key, mà key đã khoá sẵn tenant + agent nên cũng không cần khai workspace.
 *
 * Điều đó có nghĩa: **không còn bí mật nào nằm trong bundle tải về máy khách**.
 * Thứ duy nhất trình duyệt cầm là cookie phiên đã ký — mất nó cũng chỉ mất quyền
 * vào app, không lộ đường vào backend.
 *
 * (Đi qua proxy nên KHÔNG cần mở CORS ở backend — trình duyệt chỉ nói chuyện với
 * chính origin của app.)
 */

export const API_PREFIX = "/api/py/v1";

/** Giữ lại chữ ký cũ để chỗ gọi không phải sửa: nay không có header xác thực nào
 *  cần gắn ở client. Cookie phiên trình duyệt tự gửi kèm. */
export async function authHeaders(): Promise<Record<string, string>> {
  return {};
}

export function makeApi() {
  return async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    for (const [k, v] of Object.entries(await authHeaders())) headers.set(k, v);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(`${API_PREFIX}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // 204 hoặc thân rỗng → đừng ép JSON.parse chuỗi rỗng.
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  };
}

/**
 * Gọi endpoint SSE và ĐỌC DẦN, gọi `onEvent` cho từng sự kiện ngay khi tới.
 *
 * Vì sao không dùng `res.text()`: nó chờ trọn phản hồi rồi mới trả về, nên chat
 * thử đứng im 5–10 giây rồi cả đoạn nhảy ra một lần — trong khi backend đã bắn
 * từng mảnh `delta` ngay từ giây đầu. Đọc dần thì chữ chạy như ChatGPT.
 */
export function makeStreamApi() {
  /** `path` bắt đầu bằng "/api/" thì gọi thẳng (route handler của app);
   *  còn lại thì ghép tiền tố proxy `/api/py/v1`. */
  return async function stream(
    path: string,
    init: RequestInit,
    onEvent: (ev: Record<string, unknown>) => void,
  ): Promise<void> {
    const headers = new Headers(init.headers);
    for (const [k, v] of Object.entries(await authHeaders())) headers.set(k, v);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const url = path.startsWith("/api/") ? path : `${API_PREFIX}${path}`;
    const res = await fetch(url, { ...init, headers });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`.trim());
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Giữ lại mảnh cuối: gói tin có thể cắt giữa một dòng, ghép tiếp vòng sau.
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch {
          /* dòng hỏng — bỏ, đừng làm đứt cả stream */
        }
      }
    }
  };
}
