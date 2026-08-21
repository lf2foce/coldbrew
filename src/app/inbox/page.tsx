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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";
import { MOCK, MOCK_CONVERSATIONS, MOCK_DRAFTS, MOCK_MESSAGES } from "@/lib/mock";
import type { Conversation, Draft, Message, ReplyMode, SearchHit } from "@/lib/types";
import { Highlight } from "@/components/highlight";
import { MessageContent } from "@/components/message-content";
import { Avatar, DotsIcon, IconBtn, Ticks } from "@/components/ui";
import { ReplyModeChip, ReplyModeSheet } from "@/components/reply-mode-sheet";
import { Rail, type RailTab } from "@/components/rail";
import { Composer } from "@/components/composer";
import { TicketsPanel } from "./tickets-panel";
import { TestPanel } from "./test-panel";
import { QualityPanel } from "./quality-panel";
import { SettingsPanel } from "./settings-panel";
import { makeApi } from "@/lib/api";
import { useConversationStream } from "@/lib/use-conversation-stream";

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

/** Tên hiện lên cho một hội thoại. Ưu tiên `display_title` (tên khách đã phân giải)
 *  rồi mới tới `title` (tên thô nền tảng đặt, thường là "New conversation" và không
 *  bao giờ đổi). Cùng thứ tự với dashboard chính, để hai màn hình không gọi khác tên
 *  cùng một người. */
function tenHoiThoai(c: { display_title?: string | null; title?: string | null }): string {
  return c.display_title?.trim() || c.title?.trim() || "Khách chưa có tên";
}

type Filter = "all" | "unread" | `kenh:${string}`;

/** Nhãn tiếng Việt cho kênh. Kênh lạ thì hiện nguyên tên thô — thà thấy
 *  "external_api" còn hơn gộp hết vào "Khác" rồi không biết đang lọc cái gì. */
const NHAN_KENH: Record<string, string> = {
  facebook: "Facebook",
  fb: "Facebook",
  instagram: "Instagram",
  zalo: "Zalo",
  lark: "Lark",
  web: "Website",
  web_public: "Web công khai",
  external_api: "API ngoài",
};

function nhanKenh(platform: string): string {
  return NHAN_KENH[platform.trim().toLowerCase()] ?? platform;
}

/** facebook và fb là cùng một kênh — gộp để không ra hai chip trùng nhau.
 *  Dashboard chính cũng gộp đúng cặp này (getConversationFilterKey). */
function goKenh(platform: string): string {
  const p = platform.trim().toLowerCase();
  return p === "fb" ? "facebook" : p;
}

export default function InboxPage() {
  const api = useMemo(() => makeApi(), []);
  const [convs, setConvs] = useState<Conversation[] | null>(MOCK ? MOCK_CONVERSATIONS : null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [composer, setComposer] = useState("");
  const [query, setQuery] = useState("");
  // Số đếm theo kênh, lấy từ /conversations/facets — đếm trên TOÀN BỘ hội thoại
  // chứ không phải trang đang tải, nên chip không nói dối khi khách có nhiều tin.
  const [kenhFacets, setKenhFacets] = useState<{ platform: string; count: number }[]>([]);
  // Khớp theo NỘI DUNG tin (backend trgm) — tách khỏi lọc theo tên ở client.
  const [hits, setHits] = useState<Map<string, { snippet: string; messageId: string }>>(new Map());
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<RailTab>("chat");
  const [sending, setSending] = useState(false);
  // Mốc thời gian chốt SAU khi mount: dùng ngay lúc render đầu thì server và
  // client ra hai kết quả khác nhau → hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);
  // Giữ danh sách trong ref: hiệu ứng tìm kiếm vừa ĐỌC vừa GHI `convs`, đưa nó
  // vào deps là vòng lặp vô tận (set → effect chạy lại → set…).
  // Tin cần cuộn tới + tô sau khi mở hội thoại từ kết quả tìm kiếm.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const pendingTargetRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convsRef = useRef<Conversation[] | null>(convs);
  useEffect(() => {
    convsRef.current = convs;
  }, [convs]);

  useEffect(() => setNow(new Date()), []);

  const loadConvs = useCallback(async () => {
    if (MOCK) return;
    setError(null);
    try {
      const qs = new URLSearchParams({ scope: "all", limit: "50" });
      if (AGENT_ID) qs.set("agent_id", AGENT_ID);
      // Lọc kênh ở SERVER, không lọc trên mảng đã tải: chỉ tải 50 hội thoại mới
      // nhất, nên lọc ở client sẽ ra "kênh này không có gì" trong khi thực tế có
      // — chỉ là nằm ngoài 50 cái đó.
      if (filter.startsWith("kenh:")) {
        const kenh = filter.slice(5);
        // facebook lưu cả "facebook" lẫn "fb" tuỳ nguồn ghi — hỏi cả hai.
        for (const p of kenh === "facebook" ? ["facebook", "fb"] : [kenh]) qs.append("platforms", p);
      }
      setConvs(await api<Conversation[]>(`/conversations?${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, filter]);

  // Số đếm theo kênh: nạp riêng, không đi kèm mỗi lần đổi chip — số này không đổi
  // theo chip đang chọn.
  const loadFacets = useCallback(async () => {
    if (MOCK) return;
    try {
      const qs = new URLSearchParams({ scope: "all" });
      if (AGENT_ID) qs.set("agent_id", AGENT_ID);
      const f = await api<{ platforms?: { platform: string; count: number }[] }>(
        `/conversations/facets?${qs}`,
      );
      // Gộp facebook + fb thành một dòng rồi mới xếp theo số lượng.
      const gop = new Map<string, number>();
      for (const { platform, count } of f.platforms ?? []) {
        const k = goKenh(platform);
        gop.set(k, (gop.get(k) ?? 0) + count);
      }
      setKenhFacets([...gop].map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count));
    } catch {
      // Không có số đếm thì thôi, đừng làm hỏng cả hộp thư vì một dải chip.
      setKenhFacets([]);
    }
  }, [api]);

  useEffect(() => {
    void loadFacets();
  }, [loadFacets]);

  const openConv = useCallback(async (id: string, targetMessageId?: string) => {
    pendingTargetRef.current = targetMessageId ?? null;
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
      // ĐÁNH DẤU ĐÃ ĐỌC ngay khi mở. Trước đây chỉ gọi mark-read lúc có tin mới về
      // qua SSE, nên hội thoại người trực vừa đọc xong vẫn nằm nguyên trong "Chưa
      // đọc" — bộ lọc chỉ ra một danh sách không bao giờ vơi, tức là vô dụng.
      void api(`/conversations/${id}/mark-read`, { method: "POST" }).catch(() => undefined);
      // Gạt cờ ngay trên màn hình, khỏi chờ tải lại danh sách.
      setConvs((p) => p?.map((c) => (c.id === id ? { ...c, has_unread: false } : c)) ?? p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages([]);
    }
  }, [api]);

  useEffect(() => {
    void loadConvs();
  }, [loadConvs]);

  // Chỉ còn lo MỘT việc: nhảy tới tin cụ thể khi bấm từ kết quả tìm kiếm. Việc
  // "về đáy" đã do `flex-col-reverse` lo, không cần code.
  useEffect(() => {
    const target = pendingTargetRef.current;
    if (target) {
      // Chờ DOM dựng xong rồi mới tìm phần tử. Tin cũ hơn cửa sổ đã tải thì
      // không có trong DOM → nhả về đáy thay vì kẹt im.
      setHighlightId(target);
      const t1 = window.setTimeout(() => {
        const el = document.getElementById(`msg-${target}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Tin cũ hơn cửa sổ đã tải thì không có trong DOM. Trong container đảo
        // chiều, ĐÁY là scrollTop = 0 — không phải scrollHeight.
        else scrollRef.current?.scrollTo({ top: 0 });
        pendingTargetRef.current = null;
      }, 200);
      const t2 = window.setTimeout(() => setHighlightId(null), 2800);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    // KHÔNG có nhánh "bám đáy" nào ở đây nữa: container dùng `flex-col-reverse`,
    // nên đáy CHÍNH LÀ vị trí mặc định — mở hội thoại đã ở đáy, tin mới về cũng nằm
    // sẵn ở đáy. Và khi người trực đang cuộn lên đọc tin cũ, tin mới tới không giật
    // màn hình về dưới, vì nó chèn vào đầu DOM chứ không đổi vị trí đang xem.
  }, [messages, drafts, activeId]);

  // Tìm theo NỘI DUNG tin: debounce 300ms rồi hỏi backend. Dưới 2 ký tự thì bỏ
  // qua — gõ một chữ là quét cả kho, tốn mà chẳng lọc được gì.
  useEffect(() => {
    const q = query.trim();
    // `agent_id` là tham số BẮT BUỘC của endpoint search — thiếu là 422, nên
    // không có nó thì đừng gọi. Ô tìm kiếm vẫn lọc theo tên ở client.
    if (MOCK || !AGENT_ID || q.length < 2) {
      setHits(new Map());
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ q, agent_id: AGENT_ID });
        const found = await api<SearchHit[]>(`/conversations/search?${qs}`);
        if (cancelled) return;
        setHits(new Map(found.map((h) => [h.conversation_id, { snippet: h.snippet, messageId: h.message_id }])));

        // Backend quét TOÀN hộp thư, nhưng danh sách bên trái chỉ có phần đã
        // tải → hit ở hội thoại chưa nạp sẽ không thành dòng nào. Nạp bù (tối
        // đa 20) rồi ghép vào, khử trùng theo id.
        const loaded = new Set((convsRef.current ?? []).map((c) => c.id));
        const missing = [...new Set(found.map((h) => h.conversation_id))]
          .filter((id) => !loaded.has(id))
          .slice(0, 20);
        if (missing.length) {
          const got = (
            await Promise.all(
              missing.map((id) => api<Conversation>(`/conversations/${id}`).catch(() => null)),
            )
          ).filter((c): c is Conversation => c != null);
          if (!cancelled && got.length) {
            setConvs((prev) => {
              const seen = new Set((prev ?? []).map((c) => c.id));
              return [...(prev ?? []), ...got.filter((c) => !seen.has(c.id))];
            });
          }
        }
      } catch {
        if (!cancelled) setHits(new Map());
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, api]);

  const active = convs?.find((c) => c.id === activeId) ?? null;

  // Nghe tin mới của hội thoại đang mở. Dedupe theo id vì tin mình vừa gửi đã
  // nằm sẵn trong danh sách (cập nhật lạc quan) và sẽ quay về qua SSE.
  useConversationStream({
    conversationId: activeId,
    enabled: !MOCK && tab === "chat",
    api,
    onMessage: (m) => {
      setMessages((prev) => {
        if (!prev) return [m];
        if (prev.some((x) => x.id === m.id)) return prev;
        // Bỏ bản lạc quan cùng nội dung: nó có id tạm `tmp-…`, không trùng id
        // thật nên dedupe theo id không bắt được.
        const cleaned = prev.filter(
          (x) => !(x.id.startsWith("tmp-") && x.content === m.content),
        );
        return [...cleaned, m];
      });
      // Danh sách bên trái phải nhảy lên đầu, nếu không nhân viên không biết
      // cuộc nào vừa có tin.
      setConvs((prev) =>
        prev?.map((c) =>
          c.id === activeId
            ? { ...c, updated_at: m.created_at, message_count: (c.message_count ?? 0) + 1 }
            : c,
        ) ?? prev,
      );
    },
    // Khách vừa nhắn → trợ lý có thể vừa soạn nháp mới.
    onUserMessage: () => {
      if (activeId) void api<Draft[]>(`/conversations/${activeId}/drafts`).then(setDrafts).catch(() => undefined);
    },
  });

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
            content: edited || d.edited_content?.trim() || d.draft_content,
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
    if (filter === "unread") list = list.filter((c) => c.has_unread || c.status === "pending");
    // Khớp TÊN (client) hoặc khớp NỘI DUNG (backend) — thiếu vế thứ hai thì gõ
    // "sổ hồng" ra rỗng dù có hội thoại nhắc tới.
    if (q) list = list.filter((c) => tenHoiThoai(c).toLowerCase().includes(q) || hits.has(c.id));
    return list;
  }, [convs, query, filter, hits]);

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
          badges={{ chat: convs?.filter((c) => c.has_unread).length ?? 0 }}
        />

        {/* ══ Sidebar: chỉ ở tab Chat. Task và Test tự chiếm cả khung phải ══ */}
        <aside
          className={`${tab !== "chat" ? "hidden" : activeId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r bg-[var(--wa-panel)] md:w-[380px] lg:w-[420px]`}
          style={{ borderColor: "var(--wa-border)" }}
        >
          <header className="flex h-[60px] shrink-0 items-center justify-between px-4">
            <h1 className="truncate text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
              {BRAND.name}
            </h1>
            <div className="flex items-center gap-1">
              <IconBtn label="Menu">
                <DotsIcon />
              </IconBtn>
              <IconBtn label="Soạn tin mới">
                <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
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
                placeholder="Tìm tên khách hoặc nội dung tin nhắn"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--wa-text-soft)]"
              />
              {searching && (
                <span className="shrink-0 text-[11px]" style={{ color: "var(--wa-text-soft)" }}>
                  đang tìm…
                </span>
              )}
            </div>
          </div>

          {/* Dải filter — đặc trưng bản redesign */}
          <div className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-2 pt-1.5">
            {(
              [
                ["all", "Tất cả"],
                ["unread", "Chưa đọc"],
                // Chip kênh dựng từ facets, nên khách chỉ thấy kênh mình THẬT SỰ có
                // — không phải một danh sách cứng đầy kênh chưa bao giờ dùng.
                ...kenhFacets.map(
                  ({ platform, count }) =>
                    [`kenh:${platform}` as Filter, `${nhanKenh(platform)} ${count}`] as [Filter, string],
                ),
              ] as [Filter, string][]
            ).map(([key, label]) => {
              const on = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="shrink-0 whitespace-nowrap rounded-full px-3 py-[5px] text-[13px] transition"
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
              const name = tenHoiThoai(c);
              const on = c.id === activeId;
              const unread = c.has_unread ? 1 : 0;
              const pv = preview(c);
              return (
                <button
                  key={c.id}
                  onClick={() => void openConv(c.id, hits.get(c.id)?.messageId)}
                  className="flex w-full items-center gap-3 px-3 py-[9px] text-left transition"
                  style={{ background: on ? "var(--wa-panel-active)" : undefined }}
                  onMouseEnter={(e) => {
                    if (!on) e.currentTarget.style.background = "var(--wa-panel-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!on) e.currentTarget.style.background = "";
                  }}
                >
                  <Avatar size={48} name={name} id={c.id} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
                        <Highlight text={name} term={query} />
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
                        {/* Đang tìm và cuộc này khớp NỘI DUNG → hiện đoạn trích
                            thay vì tin cuối: người tìm cần thấy chỗ khớp, không
                            phải câu mới nhất. */}
                        {hits.has(c.id) ? (
                          <Highlight text={hits.get(c.id)!.snippet} term={query} />
                        ) : (
                          pv.text
                        )}
                      </span>
                      {c.reply_mode_override === "off" && (
                        <span className="ml-auto shrink-0 text-[11px]" title="Đã tắt trợ lý">
                          🔕
                        </span>
                      )}
                      {unread > 0 && (
                        <span
                          // CHẤM chứ không phải SỐ: backend trả `has_unread` là cờ
                          // đúng/sai, không có số tin chưa đọc. In số "1" cho mọi hội
                          // thoại là bịa ra một con số mà dữ liệu không hề nói.
                          className="ml-auto h-[10px] w-[10px] shrink-0 rounded-full"
                          style={{ background: "var(--wa-unread)" }}
                          title="Có tin chưa đọc"
                        />
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
                <Avatar size={40} name={tenHoiThoai(active)} id={active.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
                    {tenHoiThoai(active)}
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

              {/* `flex-col-reverse` = `inverted` của FlatList bên mobile: trình duyệt neo
                  sẵn ở ĐÁY ngay từ khung hình đầu, nên mở hội thoại là đã thấy tin mới
                  nhất — không cuộn, không nháy, không phụ thuộc hội thoại dài bao nhiêu.
                  Gán scrollTop như bản trước vẫn là CUỘN, chỉ là cuộn nhanh: hội thoại
                  500 tin thì trình duyệt vẫn dựng cả danh sách rồi mới nhảy xuống.
                  Đổi lại thứ tự trong DOM phải ĐẢO: nháp đứng trước, tin mới trước tin cũ.

                  Khe ĐÁY (pb-8) rộng hơn khe đỉnh (pt-2) hẳn một bậc: bong bóng cuối
                  dính sát thanh soạn thì đọc rất tức mắt, nhất là bong bóng dài. Mobile
                  để paddingTop 72 / paddingBottom 10 trong FlatList inverted, cùng ý đó
                  (ở inverted thì paddingTop chính là khe đáy).

                  Hội thoại ÍT TIN thì dồn xuống đáy, chừa trống phía trên — đúng chuẩn
                  chat và giống hệt mobile ("inverted tự canh đáy cho list ngắn"). Mắt và
                  ô nhập đều ở đáy, nên tin phải ở gần đó; kéo lên đỉnh thì tin mới rơi
                  vào giữa màn hình, xa chỗ đang gõ. */}
              <div
                ref={scrollRef}
                className="wa-doodle flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-4 pb-8 pt-2 md:px-[6%]"
              >
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
                      <div className="text-[14.2px] leading-[19px]" style={{ color: "var(--wa-text)" }}>
                        <MessageContent content={d.edited_content?.trim() || d.draft_content} />
                      </div>
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

                {messages === null && (
                  <p className="text-center text-sm" style={{ color: "var(--wa-text-soft)" }}>
                    Đang tải…
                  </p>
                )}
                {[...(messages ?? [])].reverse().map((m, i, rev) => {
                  const mine = m.role !== "user";
                  // DOM đảo → tin CŨ hơn nằm ở i + 1, và hiển thị phía TRÊN tin này.
                  const prev = rev[i + 1];
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
                          id={`msg-${m.id}`}
                          className={`relative max-w-[85%] rounded-lg px-[9px] py-[6px] shadow-sm transition-shadow md:max-w-[65%] ${
                            highlightId === m.id ? "ring-2" : ""
                          }`}
                          style={{
                            background: mine ? "var(--wa-out)" : "var(--wa-panel)",
                            // Vòng vàng cùng tông với chỗ tô trong danh sách, để
                            // mắt nối được "dòng vừa bấm" với "tin vừa nhảy tới".
                            ...(highlightId === m.id
                              ? { "--tw-ring-color": "#f0c14b" } as React.CSSProperties
                              : {}),
                          }}
                        >
                          {/* Phân biệt bot với người thật: cùng phía nhưng khác
                              nhãn, không thì người trực không biết câu nào bot
                              đã tự gửi. */}
                          {m.role === "human_agent" && (
                            <p className="text-[12.5px] font-medium" style={{ color: "var(--wa-teal)" }}>
                              Nhân viên
                            </p>
                          )}
                          <div
                            className="text-[14.2px] leading-[19px]"
                            style={{ color: "var(--wa-text)" }}
                          >
                            <MessageContent content={m.content} />
                          </div>
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
