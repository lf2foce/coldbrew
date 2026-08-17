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
 * Gửi qua `POST /agents/{id}/chat` (đường đã đăng nhập). Agent demo để
 * visibility `internal` nên `/public/agents/...` trả 404 — không dùng được.
 */

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_ID } from "@/lib/brand";
import { MOCK } from "@/lib/mock";
import { Composer } from "@/components/composer";
import { makeApi, makeRawApi } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function TestPanel() {
  const { getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);
  const raw = useMemo(() => makeRawApi(getToken), [getToken]);

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
      const text = await raw(`/agents/${AGENT_ID}/chat`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Endpoint trả SSE: gom mảnh `delta`, và bắt `conversation` để nhớ phiên mới.
      const parts: string[] = [];
      let newConvId: string | null = null;
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "delta") parts.push(String(ev.content ?? ""));
          else if (ev.type === "conversation" && ev.conversation_id) {
            newConvId = String(ev.conversation_id);
          }
        } catch {
          /* dòng không phải JSON — bỏ qua */
        }
      }
      setMessages((p) => [
        ...p,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: parts.join("").trim() || "(trợ lý không trả lời)",
          created_at: new Date().toISOString(),
        },
      ]);
      if (newConvId && !activeId) {
        setActiveId(newConvId);
        void loadSessions();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [draft, busy, activeId, raw, loadSessions]);

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
                  <p className="whitespace-pre-wrap text-[14.2px] leading-[19px]" style={{ color: "var(--wa-text)" }}>
                    {m.content}
                  </p>
                </div>
              </div>
            );
          })}
          {busy && (
            <div className="mt-2 flex justify-start">
              <div className="rounded-lg px-3 py-2 shadow-sm" style={{ background: "var(--wa-panel)" }}>
                <span className="text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
                  Trợ lý đang soạn…
                </span>
              </div>
            </div>
          )}
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
