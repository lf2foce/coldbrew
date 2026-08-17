"use client";

/**
 * Gọi backend qua proxy `/api/py/*` KÈM token Clerk.
 *
 * Vì sao phải gắn `Authorization` chứ không trông vào cookie: proxy của Next là
 * rewrite server→server, và backend xác thực bằng Bearer token chứ không đọc
 * cookie phiên. Bỏ header này là **mọi** request trả 401 — đã dính đúng thế
 * 18/08/2026, log backend đỏ rực toàn 401 trong khi trình duyệt vẫn đang đăng
 * nhập bình thường.
 *
 * `X-Phenau-Tenant-Id` cũng bắt buộc khi tài khoản thuộc nhiều workspace: thiếu
 * nó thì backend bind vào workspace CHÍNH và RLS trả rỗng câm — không lỗi,
 * không cảnh báo, chỉ trống trơn.
 *
 * (Đi qua proxy nên KHÔNG cần mở CORS ở backend — trình duyệt chỉ nói chuyện
 * với chính origin của app.)
 */

import { TENANT_ID } from "./brand";

type Getter = () => Promise<string | null>;

export const API_PREFIX = "/api/py/v1";

/** Header xác thực dùng chung. Tách riêng vì SSE cần tự `fetch` (phải đọc
 *  stream) nhưng vẫn phải mang đúng bộ header — nhân bản logic token ra hai nơi
 *  là kiểu bug sửa một chỗ quên chỗ kia. */
export async function authHeaders(getToken: Getter): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  const token = await getToken().catch(() => null);
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (TENANT_ID) h["X-Phenau-Tenant-Id"] = TENANT_ID;
  return h;
}

export function makeApi(getToken: Getter) {
  return async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    for (const [k, v] of Object.entries(await authHeaders(getToken))) headers.set(k, v);
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

/** Bản trả về text thô — dùng cho endpoint SSE một-lần (chat thử). */
export function makeRawApi(getToken: Getter) {
  return async function raw(path: string, init?: RequestInit): Promise<string> {
    const headers = new Headers(init?.headers);
    for (const [k, v] of Object.entries(await authHeaders(getToken))) headers.set(k, v);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(`${API_PREFIX}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
}
