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
 * (Cũng vì đi qua proxy nên KHÔNG cần mở CORS ở backend — trình duyệt chỉ nói
 * chuyện với chính origin của app.)
 */

import { TENANT_ID } from "./brand";

type Getter = () => Promise<string | null>;

export function makeApi(getToken: Getter) {
  return async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (TENANT_ID) headers.set("X-Phenau-Tenant-Id", TENANT_ID);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(`/api/py/v1${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // 204 hoặc thân rỗng → đừng ép JSON.parse chuỗi rỗng.
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  };
}

/** Bản trả về text thô — dùng cho endpoint SSE (chat). */
export function makeRawApi(getToken: Getter) {
  return async function raw(path: string, init?: RequestInit): Promise<string> {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (TENANT_ID) headers.set("X-Phenau-Tenant-Id", TENANT_ID);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(`/api/py/v1${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
}
