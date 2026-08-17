"use client";

/**
 * Hộp thư theo ngôn ngữ thiết kế WhatsApp Web bản mới, cộng hai thứ WhatsApp
 * không có vì đây là hộp thư CÓ TRỢ LÝ:
 *   · Chế độ trả lời từng hội thoại (tự trả lời / soạn nháp chờ duyệt / tắt)
 *   · Công việc định kỳ của trợ lý
 *
 * Màn hẹp chỉ hiện MỘT khung — chọn hội thoại là sang khung chat, có nút quay
 * lại. Không dùng thư viện điều hướng: một biến state là đủ.
 *
 * Thu hẹp theo agent nằm ở tham số `agent_id` — backend lọc ở SQL, không phải
 * UI lọc tay.
 */

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";
import { MOCK, MOCK_CONVERSATIONS, MOCK_DRAFTS, MOCK_MESSAGES } from "@/lib/mock";
import type { Conversation, Draft, Message, ReplyMode } from "@/lib/types";
import { Avatar, DotsIcon, IconBtn, Ticks } from "@/components/ui";
import { ReplyModeChip, ReplyModeSheet } from "@/components/reply-mode-sheet";
import { Rail, type RailTab } from "@/components/rail";
import { Composer } from "@/components/composer";
import { TicketsPanel } from "./tickets-panel";
import { TestPanel } from "./test-panel";
import { QualityPanel } from "./quality-panel";
import { SettingsPanel } from "./settings-panel";
import { makeApi } from "@/lib/api";

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  zalo: "Zalo",
  lark: "Lark",
  web: "Website",
  instagram: "Instagram",
};

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Giờ nếu hôm nay · "Hôm qua" · còn lại ngày/tháng — đúng nếp app nhắn tin. */
function listStamp(iso: string, now: Date): string {
  const d = new Date(iso);
  const y = new Date(now.getTime() - 86_400_000);
  if (sameDay(d, now)) return timeOnly(iso);
  if (sameDay(d, y)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const y = new Date(now.getTime() - 86_400_000);
  if (sameDay(d, now)) return "Hôm nay";
  if (sameDay(d, y)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Filter = "all" | "unread";

export default function InboxPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);
  const [convs, setConvs] = useState<Conversation[] | null>(MOCK ? MOCK_CONVERSATIONS : null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [composer, setComposer] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<RailTab>("chat");
  const [sending, setSending] = useState(false);
  // Mốc thời gian chốt SAU khi mount: dùng ngay lúc render đầu thì server và
  // client ra hai kết quả khác nhau → hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setNow(new Date()), []);

  const loadConvs = useCallback(async () => {
    if (MOCK) return;
    setError(null);
    try {
      const qs = new URLSearchParams({ scope: "all", limit: "50" });
      if (AGENT_ID) qs.set("agent_id", AGENT_ID);
      // `api()` tự gắn Authorization: Bearer — xem lib/api.ts. Backend KHÔNG đọc
      // cookie phiên, thiếu header là 401 sạch mọi endpoint.
      setConvs(await api<Conversation[]>(`/conversations?${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api]);

  const openConv = useCallback(async (id: string) => {
    setActiveId(id);
    setMessages(null);
    setDrafts([]);
    if (MOCK) {
      setMessages(MOCK_MESSAGES[id] ?? []);
      setDrafts(MOCK_DRAFTS[id] ?? []);
      return;
    }
    try {
      setMessages(await api<Message[]>(`/conversations/${id}/messages`));
      // Nháp hỏng thì vẫn cho đọc tin — đừng để một endpoint phụ chặn cả màn.
      setDrafts(await api<Draft[]>(`/conversations/${id}/drafts`).catch(() => []));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages([]);
    }
  }, [api]);

  useEffect(() => {
    void loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, drafts]);

  const active = convs?.find((c) => c.id === activeId) ?? null;

  /** Đổi chế độ trả lời của hội thoại đang mở. Cập nhật lạc quan để bấm là thấy. */
  const setReplyMode = useCallback(
    async (mode: ReplyMode) => {
      if (!activeId) return;
      const before = active?.reply_mode_override ?? null;
      setConvs((prev) =>
        prev?.map((c) => (c.id === activeId ? { ...c, reply_mode_override: mode } : c)) ?? prev,
      );
      if (MOCK) return;
      try {
        await api(`/conversations/${activeId}/reply-mode`, {
          method: "POST",
          body: JSON.stringify({ reply_mode_override: mode }),
        });
      } catch (e) {
        setConvs((prev) =>
          prev?.map((c) => (c.id === activeId ? { ...c, reply_mode_override: before } : c)) ?? prev,
        );
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [activeId, active, api],
  );

  /** Duyệt nháp: gửi nguyên văn, hoặc sửa rồi gửi nếu ô soạn đang có chữ. */
  const approveDraft = useCallback(
    async (d: Draft) => {
      if (!activeId) return;
      const edited = composer.trim();
      const path = edited
        ? `/conversations/${activeId}/drafts/${d.id}/edit-and-send`
        : `/conversations/${activeId}/drafts/${d.id}/approve`;
      setDrafts((p) => p.filter((x) => x.id !== d.id));
      setComposer("");
      if (MOCK) {
        setMessages((p) => [
          ...(p ?? []),
          {
            id: `sent-${d.id}`,
            role: "human_agent",
            content: edited || d.content,
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
      try {
        await api(path, { method: "POST", body: edited ? JSON.stringify({ content: edited }) : undefined });
        await openConv(activeId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [activeId, composer, openConv, api],
  );

  const dismissDraft = useCallback(
    async (d: Draft) => {
      if (!activeId) return;
      setDrafts((p) => p.filter((x) => x.id !== d.id));
      if (MOCK) return;
      try {
        await api(`/conversations/${activeId}/drafts/${d.id}/dismiss`, { method: "POST" });
      } catch {
        /* bỏ nháp lỗi thì thôi — không đáng chặn người dùng */
      }
    },
    [activeId, api],
  );

  const sendReply = useCallback(async () => {
    const content = composer.trim();
    if (!content || !activeId) return;
    setSending(true);
    setComposer("");
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "human_agent",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...(p ?? []), optimistic]);
    if (MOCK) {
      setSending(false);
      return;
    }
    try {
      await api(`/conversations/${activeId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    } catch (e) {
      setMessages((p) => p?.filter((m) => m.id !== optimistic.id) ?? p);
      setComposer(content);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [composer, activeId, api]);

  const shown = useMemo(() => {
    if (!convs) return null;
    const q = query.trim().toLowerCase();
    let list = convs;
    if (filter === "unread") list = list.filter((c) => (c.unread ?? 0) > 0 || c.status === "pending");
    if (q) list = list.filter((c) => (c.title || "").toLowerCase().includes(q));
    return list;
  }, [convs, query, filter]);

  /** Dòng xem trước = tin cuối. Tin cuối do MÌNH gửi thì kèm tích — nếp WhatsApp. */
  const preview = useCallback((c: Conversation): { text: string; mine: boolean } => {
    const list = MOCK ? MOCK_MESSAGES[c.id] : undefined;
    const last = list?.[list.length - 1];
    if (!last)
      return {
        text: `${PLATFORM_LABEL[c.platform || "web"] ?? c.platform} · ${c.message_count ?? 0} tin`,
        mine: false,
      };
    return { text: last.content, mine: last.role !== "user" };
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      {MOCK && (
        <div className="shrink-0 bg-amber-100 px-4 py-1 text-center text-[11px] font-medium tracking-wide text-amber-900">
          DỮ LIỆU GIẢ — chế độ mock, không phải hội thoại thật
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ══ Rail ══ */}
        <Rail
          tab={tab}
          onPick={(t) => {
            setTab(t);
            setActiveId(null);
          }}
          badges={{ chat: convs?.reduce((n, c) => n + (c.unread ?? 0), 0) ?? 0 }}
        />

        {/* ══ Sidebar: chỉ ở tab Chat. Task và Test tự chiếm cả khung phải ══ */}
        <aside
          className={`${tab !== "chat" ? "hidden" : activeId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r bg-[var(--wa-panel)] md:w-[380px] lg:w-[420px]`}
          style={{ borderColor: "var(--wa-border-strong)" }}
        >
          <header className="flex h-[64px] shrink-0 items-center justify-between px-4 pt-2">
            <h1 className="truncate text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
              {BRAND.name}
            </h1>
            <div className="flex items-center">
              <IconBtn label="Soạn tin mới">
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </IconBtn>
              <IconBtn label="Menu">
                <DotsIcon />
              </IconBtn>
            </div>
          </header>

          <div className="shrink-0 px-3 pb-1 pt-1">
            <div
              className="flex items-center gap-3 rounded-full px-3 py-[7px]"
              style={{ background: "var(--wa-panel-head)" }}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden>
                <path
                  d="M10 3a7 7 0 105.2 11.7l4 4 1.4-1.4-4-4A7 7 0 0010 3zm0 2a5 5 0 110 10 5 5 0 010-10z"
                  fill="var(--wa-text-soft)"
                />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm hoặc bắt đầu đoạn chat mới"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--wa-text-soft)]"
              />
            </div>
          </div>

          {/* Dải filter — đặc trưng bản redesign */}
          <div className="flex shrink-0 gap-2 px-3 pb-2 pt-1.5">
            {(
              [
                ["all", "Tất cả"],
                ["unread", "Chưa đọc"],
              ] as [Filter, string][]
            ).map(([key, label]) => {
              const on = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="rounded-full px-3 py-[5px] text-[13px] transition"
                  style={
                    on
                      ? { background: "#e7fce3", color: "var(--wa-teal)", fontWeight: 500 }
                      : { background: "var(--wa-panel-head)", color: "var(--wa-text-soft)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {error && (
              <div className="m-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}{" "}
                <button onClick={() => void loadConvs()} className="underline">
                  Thử lại
                </button>
              </div>
            )}
            {shown === null && !error && (
              <p className="p-4 text-sm" style={{ color: "var(--wa-text-soft)" }}>
                Đang tải…
              </p>
            )}
            {shown?.length === 0 && (
              <p className="p-4 text-sm" style={{ color: "var(--wa-text-soft)" }}>
                Không có hội thoại nào.
              </p>
            )}
            {shown?.map((c) => {
              const name = c.title || "Khách chưa có tên";
              const on = c.id === activeId;
              const unread = c.unread ?? 0;
              const pv = preview(c);
              return (
                <button
                  key={c.id}
                  onClick={() => void openConv(c.id)}
                  className="flex w-full items-center gap-3 px-3 py-[9px] text-left transition"
                  style={{ background: on ? "var(--wa-panel-active)" : undefined }}
                  onMouseEnter={(e) => {
                    if (!on) e.currentTarget.style.background = "var(--wa-panel-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!on) e.currentTarget.style.background = "";
                  }}
                >
                  <Avatar size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
                        {name}
                      </span>
                      <span
                        className="shrink-0 text-[12px]"
                        style={{
                          color: unread > 0 ? "var(--wa-unread)" : "var(--wa-text-soft)",
                          fontWeight: unread > 0 ? 500 : 400,
                        }}
                      >
                        {now ? listStamp(c.updated_at, now) : ""}
                      </span>
                    </span>
                    <span className="mt-[2px] flex items-center gap-1">
                      {pv.mine && <Ticks read />}
                      <span
                        className="truncate text-[14px]"
                        style={{
                          color: unread > 0 ? "var(--wa-text)" : "var(--wa-text-soft)",
                          fontWeight: unread > 0 ? 500 : 400,
                        }}
                      >
                        {pv.text}
                      </span>
                      {c.reply_mode_override === "off" && (
                        <span className="ml-auto shrink-0 text-[11px]" title="Đã tắt trợ lý">
                          🔕
                        </span>
                      )}
                      {unread > 0 && (
                        <span
                          className="ml-auto flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                          style={{ background: "var(--wa-unread)" }}
                        >
                          {unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ══ Khung phải: Công việc hoặc Hội thoại ══ */}
        <section className={`${tab !== "chat" || activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {tab === "task" ? (
            <TicketsPanel
              onOpenConversation={(id) => {
                setTab("chat");
                void openConv(id);
              }}
            />
          ) : tab === "quality" ? (
            <QualityPanel
              onOpenConversation={(id) => {
                setTab("chat");
                void openConv(id);
              }}
            />
          ) : tab === "settings" ? (
            <SettingsPanel />
          ) : tab === "test" ? (
            <TestPanel />
          ) : !active ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 border-b-4 px-6 text-center"
              style={{ background: "var(--wa-chrome)", borderColor: "var(--wa-green)" }}
            >
              <svg viewBox="0 0 96 96" className="h-24 w-24 opacity-30" aria-hidden>
                <rect x="10" y="20" width="76" height="52" rx="8" fill="none" stroke="var(--wa-text-soft)" strokeWidth="3" />
                <path d="M22 38h40M22 50h28" stroke="var(--wa-text-soft)" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="text-[15px]" style={{ color: "var(--wa-text-soft)" }}>
                Chọn một hội thoại để xem nội dung
              </p>
            </div>
          ) : (
            <>
              <header
                className="flex h-[60px] shrink-0 items-center gap-3 px-4"
                style={{ background: "var(--wa-chrome)" }}
              >
                <button
                  onClick={() => setActiveId(null)}
                  className="-ml-1 rounded p-1 md:hidden"
                  style={{ color: "#54656f" }}
                  aria-label="Quay lại"
                >
                  ←
                </button>
                <Avatar size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
                    {active.title || "Khách chưa có tên"}
                  </span>
                  <span className="block text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
                    {PLATFORM_LABEL[active.platform || "web"] ?? active.platform}
                  </span>
                </span>
                <ReplyModeChip
                  value={active.reply_mode_override ?? null}
                  onClick={() => setSheetOpen(true)}
                />
                <IconBtn label="Chế độ trả lời" onClick={() => setSheetOpen(true)}>
                  <DotsIcon />
                </IconBtn>
              </header>

              <div className="wa-doodle min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-[6%]">
                {messages === null && (
                  <p className="text-center text-sm" style={{ color: "var(--wa-text-soft)" }}>
                    Đang tải…
                  </p>
                )}
                {messages?.map((m, i) => {
                  const mine = m.role !== "user";
                  const prev = messages[i - 1];
                  const newDay =
                    now && (!prev || dayLabel(prev.created_at, now) !== dayLabel(m.created_at, now));
                  // Đuôi chỉ ở tin ĐẦU của một cụm cùng phía — WhatsApp thật
                  // không gắn đuôi mọi bong bóng.
                  const firstOfGroup = newDay || !prev || (prev.role !== "user") !== mine;
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <div className="my-3 flex justify-center">
                          <span
                            className="rounded-[7px] px-3 py-[5px] text-[12px] shadow-sm"
                            style={{ background: "#ffffff", color: "var(--wa-text-soft)" }}
                          >
                            {dayLabel(m.created_at, now!)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${mine ? "justify-end" : "justify-start"} ${firstOfGroup ? "mt-2" : "mt-[2px]"}`}
                      >
                        <div
                          className="relative max-w-[85%] rounded-lg px-[9px] py-[6px] shadow-sm md:max-w-[65%]"
                          style={{ background: mine ? "var(--wa-out)" : "var(--wa-panel)" }}
                        >
                          {/* Phân biệt bot với người thật: cùng phía nhưng khác
                              nhãn, không thì người trực không biết câu nào bot
                              đã tự gửi. */}
                          {m.role === "human_agent" && (
                            <p className="text-[12.5px] font-medium" style={{ color: "var(--wa-teal)" }}>
                              Nhân viên
                            </p>
                          )}
                          <p
                            className="whitespace-pre-wrap text-[14.2px] leading-[19px]"
                            style={{ color: "var(--wa-text)" }}
                          >
                            {m.content}
                          </p>
                          <span
                            className="float-right ml-2 mt-[3px] flex items-center text-[11px] leading-none"
                            style={{ color: "var(--wa-text-soft)" }}
                          >
                            {timeOnly(m.created_at)}
                            {mine && <Ticks read />}
                          </span>
                          <span className="clear-both block" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Nháp trợ lý chờ duyệt — thẻ đứt nét để KHÔNG nhầm với tin đã gửi */}
                {drafts.map((d) => (
                  <div key={d.id} className="mt-3 flex justify-end">
                    <div
                      className="max-w-[85%] rounded-lg border-2 border-dashed p-2.5 md:max-w-[65%]"
                      style={{ borderColor: "#f0c14b", background: "#fffbea" }}
                    >
                      <p className="mb-1 text-[12px] font-medium" style={{ color: "#8a6100" }}>
                        Trợ lý soạn — chưa gửi
                      </p>
                      <p className="whitespace-pre-wrap text-[14.2px] leading-[19px]" style={{ color: "var(--wa-text)" }}>
                        {d.content}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => void approveDraft(d)}
                          className="rounded-full px-3 py-[5px] text-[13px] font-medium text-white"
                          style={{ background: "var(--wa-teal)" }}
                        >
                          {composer.trim() ? "Sửa rồi gửi" : "Duyệt & gửi"}
                        </button>
                        <button
                          onClick={() => void dismissDraft(d)}
                          className="rounded-full px-3 py-[5px] text-[13px]"
                          style={{ background: "var(--wa-panel-head)", color: "var(--wa-text)" }}
                        >
                          Bỏ nháp
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <Composer
                value={composer}
                onChange={setComposer}
                onSend={() => void sendReply()}
                placeholder={drafts.length ? "Sửa nháp rồi bấm Sửa rồi gửi…" : "Nhập tin nhắn"}
                disabled={sending}
              />
            </>
          )}
        </section>
      </div>

      {sheetOpen && active && (
        <ReplyModeSheet
          value={active.reply_mode_override ?? null}
          onPick={(m) => void setReplyMode(m)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
