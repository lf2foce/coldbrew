"use client";

/**
 * Nghe tin nhắn mới của MỘT hội thoại qua SSE — chép cách dashboard chính làm
 * (`messages-page-client.tsx`), kèm lý do từng chi tiết:
 *
 *  · Dùng `fetch` + `getReader()` chứ KHÔNG `EventSource`. `EventSource` không
 *    set được header, mà backend cần `Authorization: Bearer` (+ tenant header).
 *
 *  · Sự kiện chỉ mang `{id, role}` — Postgres NOTIFY giới hạn 8KB nên payload
 *    cố ý tối giản. Nhận id xong phải gọi lấy tin đầy đủ.
 *
 *  · Dedupe theo `id`: tin mình vừa gửi đã nằm trong danh sách (cập nhật lạc
 *    quan), sự kiện SSE về sau sẽ nhân đôi nếu không lọc.
 *
 *  · `AbortController` huỷ khi đổi hội thoại hoặc rời trang. Bỏ bước này là rò
 *    kết nối — mỗi lần bấm sang cuộc khác lại để lại một stream sống, chạy một
 *    ngày mới lộ.
 *
 *  · Backoff khi đứt: server đóng sạch thì nối lại nhanh, lỗi liên tiếp thì giãn
 *    dần tới 15s, tránh quay vòng nện backend khi mạng hỏng.
 */

import { useEffect, useRef } from "react";
import { API_PREFIX, authHeaders } from "./api";
import type { Message } from "./types";

const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

export function useConversationStream({
  conversationId,
  enabled,
  api,
  onMessage,
  onUserMessage,
}: {
  conversationId: string | null;
  enabled: boolean;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  onMessage: (m: Message) => void;
  onUserMessage?: () => void;
}) {
  // Giữ callback trong ref: đổi hàm (mỗi lần render) không được kéo theo mở
  // lại stream, nếu không cứ mỗi tin về là ngắt–nối một vòng.
  const onMessageRef = useRef(onMessage);
  const onUserRef = useRef(onUserMessage);
  const apiRef = useRef(api);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onUserRef.current = onUserMessage;
    apiRef.current = api;
  });

  useEffect(() => {
    if (!enabled || !conversationId) return;

    const ac = new AbortController();
    let cancelled = false;
    let attempt = 0;
    let lastMarkRead = 0;

    const run = async () => {
      while (!cancelled) {
        if (attempt > 0) {
          await new Promise((r) =>
            setTimeout(r, BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]),
          );
          if (cancelled) return;
        }

        let res: Response;
        try {
          res = await fetch(`${API_PREFIX}/conversations/${conversationId}/events`, {
            headers: await authHeaders(),
            signal: ac.signal,
          });
        } catch {
          if (cancelled) return;
          attempt += 1;
          continue;
        }
        if (!res.ok || !res.body) {
          attempt += 1;
          continue;
        }
        attempt = 0; // nối được → xoá backoff

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let closedCleanly = false;

        try {
          while (!cancelled) {
            const { value, done } = await reader.read();
            if (done) {
              closedCleanly = true;
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              let ev: { id?: string; role?: string };
              try {
                ev = JSON.parse(line.slice(6));
              } catch {
                continue; // dòng hỏng — bỏ, đừng làm đứt cả stream
              }
              if (!ev.id) continue;
              const full = await apiRef.current<Message>(
                `/conversations/${conversationId}/messages/${ev.id}`,
              ).catch(() => null);
              if (!full || cancelled) continue;
              onMessageRef.current(full);
              if (full.role === "user") {
                onUserRef.current?.();
                // Chặn dồn: khách nhắn liên tiếp 10 tin thì không gọi mark-read
                // 10 lần.
                const now = Date.now();
                if (now - lastMarkRead > 10_000) {
                  lastMarkRead = now;
                  void apiRef.current(`/conversations/${conversationId}/mark-read`, {
                    method: "POST",
                  }).catch(() => undefined);
                }
              }
            }
          }
        } catch {
          /* stream lỗi — vòng ngoài nối lại */
        }
        if (!cancelled && closedCleanly) attempt = 1;
      }
    };

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [conversationId, enabled]);
}
