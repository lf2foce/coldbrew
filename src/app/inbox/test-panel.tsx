"use client";

/**
 * Chat THỬ với trợ lý — hỏi để xem nó trả lời thế nào, KHÔNG đụng khách thật.
 *
 * Vì sao tách hẳn khỏi hộp thư: nhân viên cần thử "khách hỏi câu này thì bot đáp
 * gì" trước khi bật tự động trả lời. Thử ngay trong hội thoại khách thì tin thử
 * bay thẳng sang Facebook của họ.
 *
 * BỐ CỤC HAI KHUNG như route chat của dashboard: danh sách phiên bên trái, nội
 * dung bên phải. Phiên lấy bằng `GET /conversations?agent_id=…&scope=mine` —
 * `scope=mine` là phiên của CHÍNH người đang đăng nhập, khác `scope=all` (hội
 * thoại khách) mà hộp thư dùng. Cùng endpoint, khác scope.
 *
 * Gửi qua route handler `/api/chat/{id}` chứ KHÔNG qua rewrite `/api/py`:
 * rewrite đi bằng `fetch()` của Node, mà `fetch()` ĐỆM phản hồi nên chữ hiện
 * một cục sau 5–10 giây. Route handler dùng `node:http` đẩy từng chunk.
 *
 * Nó gọi tiếp `POST /agents/{id}/chat` (đường đã đăng nhập). Agent demo để
 * visibility `internal` nên `/public/agents/...` trả 404 — không dùng được.
 */

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_ID } from "@/lib/brand";
import { MOCK } from "@/lib/mock";
import { Composer } from "@/components/composer";
import { makeApi, makeStreamApi } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function TestPanel() {
  const { getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);
  const stream = useMemo(() => makeStreamApi(getToken), [getToken]);

  const [sessions, setSessions] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    if (MOCK || !AGENT_ID) {
      setSessions([]);
      return;
    }
    try {
      const qs = new URLSearchParams({ agent_id: AGENT_ID, scope: "mine", limit: "30" });
      setSessions(await api<Conversation[]>(`/conversations?${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSessions([]);
    }
  }, [api]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const openSession = useCallback(
    async (id: string) => {
      setActiveId(id);
      setMessages([]);
      setError(null);
      try {
        setMessages(await api<Message[]>(`/conversations/${id}/messages`));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [api],
  );

  const newSession = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(async () => {
    const content = draft.trim();
    if (!content || busy) return;
    setDraft("");
    setError(null);
    setMessages((p) => [
      ...p,
      { id: `u-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() },
    ]);
    setBusy(true);

    if (MOCK) {
      setTimeout(() => {
        setMessages((p) => [
          ...p,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "(chế độ mock) Tắt NEXT_PUBLIC_MOCK để chat với trợ lý thật.",
            created_at: new Date().toISOString(),
          },
        ]);
        setBusy(false);
      }, 400);
      return;
    }

    try {
      // Có `conversation_id` thì nói tiếp phiên cũ; không có thì backend mở phiên mới.
      const body: Record<string, string> = { message: content };
      if (activeId) body.conversation_id = activeId;
      // Bong bóng rỗng dựng TRƯỚC, rồi mỗi mảnh `delta` nối thêm vào — chữ chạy
      // dần thay vì hiện một cục sau 10 giây.
      const replyId = `a-${Date.now()}`;
      let acc = "";
      let newConvId: string | null = null;
      setMessages((p) => [
        ...p,
        { id: replyId, role: "assistant", content: "", created_at: new Date().toISOString() },
      ]);

      await stream(`/api/chat/${AGENT_ID}`, { method: "POST", body: JSON.stringify(body) }, (ev) => {
        if (ev.type === "delta") {
          acc += String(ev.content ?? "");
          setMessages((p) => p.map((m) => (m.id === replyId ? { ...m, content: acc } : m)));
        } else if (ev.type === "conversation" && ev.conversation_id) {
          newConvId = String(ev.conversation_id);
        }
      });

      if (!acc.trim()) {
        setMessages((p) =>
          p.map((m) => (m.id === replyId ? { ...m, content: "(trợ lý không trả lời)" } : m)),
        );
      }
      if (newConvId && !activeId) {
        setActiveId(newConvId);
        void loadSessions();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [draft, busy, activeId, stream, loadSessions]);

  return (
    <div className="flex h-full min-w-0 flex-1">
      {/* ── Danh sách phiên ── */}
      <aside
        className="hidden w-[280px] shrink-0 flex-col border-r bg-[var(--wa-panel)] lg:flex"
        style={{ borderColor: "var(--wa-border-strong)" }}
      >
        <header className="flex h-[60px] shrink-0 items-center justify-between px-4">
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Phiên thử
          </h3>
          <button
            onClick={newSession}
            title="Phiên mới"
            aria-label="Phiên mới"
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/5"
            style={{ color: "#54656f" }}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sessions === null && (
            <p className="p-3 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
              Đang tải…
            </p>
          )}
          {sessions?.length === 0 && (
            <p className="p-3 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
              Chưa có phiên nào. Hỏi một câu là tạo phiên mới.
            </p>
          )}
          {sessions?.map((c) => {
            const on = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => void openSession(c.id)}
                className="w-full border-b px-3 py-2.5 text-left transition"
                style={{
                  borderColor: "var(--wa-border)",
                  background: on ? "var(--wa-panel-head)" : undefined,
                }}
              >
                <p className="truncate text-[14px]" style={{ color: "var(--wa-text)" }}>
                  {c.title || "Phiên không tên"}
                </p>
                <p className="text-[12px]" style={{ color: "var(--wa-text-soft)" }}>
                  {c.message_count ?? 0} tin · {timeOnly(c.updated_at)}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Nội dung ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-[60px] shrink-0 items-center gap-3 px-4"
          style={{ background: "var(--wa-chrome)" }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: "var(--wa-teal)" }}
          >
            <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M12 3l1.9 4.3 4.6.5-3.4 3.1.9 4.6L12 13.3 8 15.5l.9-4.6L5.5 7.8l4.6-.5L12 3z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px]" style={{ color: "var(--wa-text)" }}>
              Chat thử với trợ lý
            </span>
            <span className="block text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
              Khách không nhìn thấy đoạn chat này
            </span>
          </span>
          <button
            onClick={newSession}
            className="rounded-full px-3 py-[5px] text-[13px] font-medium lg:hidden"
            style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
          >
            Phiên mới
          </button>
        </header>

        <div className="wa-doodle min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-[6%]">
          {messages.length === 0 && (
            <p className="mt-6 text-center text-[14px]" style={{ color: "var(--wa-text-soft)" }}>
              Thử hỏi như một khách hàng để xem trợ lý trả lời thế nào.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.role === "user";
            return (
              <div key={m.id} className={`mt-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-lg px-[9px] py-[6px] shadow-sm md:max-w-[65%]"
                  style={{ background: mine ? "var(--wa-out)" : "var(--wa-panel)" }}
                >
                  {m.content ? (
                    <p className="whitespace-pre-wrap text-[14.2px] leading-[19px]" style={{ color: "var(--wa-text)" }}>
                      {m.content}
                    </p>
                  ) : (
                    // Bong bóng đã dựng nhưng chữ chưa tới: ba chấm nhấp nháy NGAY
                    // TRONG bong bóng. Làm chỉ báo thành khối riêng thì lúc chữ bắt
                    // đầu chạy sẽ thấy hai khối cùng lúc.
                    <span className="flex items-center gap-1 px-1 py-[5px]" aria-label="Trợ lý đang soạn">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-[7px] w-[7px] animate-bounce rounded-full"
                          style={{ background: "var(--wa-text-soft)", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {error && (
            <p className="mt-2 text-center text-[13px] text-red-700">Lỗi gọi trợ lý: {error}</p>
          )}
          <div ref={endRef} />
        </div>

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => void send()}
          placeholder="Hỏi thử một câu…"
          disabled={busy}
        />
      </div>
    </div>
  );
}
