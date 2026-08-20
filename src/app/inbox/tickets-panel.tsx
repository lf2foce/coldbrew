"use client";

/**
 * Yêu cầu chăm sóc khách (customer service request) — cùng nguồn với màn
 * "Công việc" của app mobile: `GET /agents/{id}/tickets`.
 *
 * Khác công việc-định-kỳ của trợ lý: cái này phát sinh TỪ KHÁCH (xin xem nhà,
 * hỏi pháp lý, cần báo lãi suất) — thứ nhân viên phải xử hằng ngày.
 *
 * HAI CÁCH XEM, tự đổi theo bề ngang màn hình:
 *   · Màn rộng (≥1100px) → KANBAN, mỗi cột một trạng thái. CSR đã có sẵn đủ
 *     status nên bày theo cột là đọc được ngay "đang tắc ở khâu nào".
 *   · Màn hẹp → danh sách dọc, vì 5 cột trên điện thoại thì cột nào cũng cụt.
 *
 * Kéo-thả CỐ Ý không làm: trên màn cảm ứng nó tranh cuộn, và một cú kéo nhầm là
 * đổi trạng thái việc của khách. Đổi trạng thái bằng nút, có xác nhận thị giác.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENT_ID } from "@/lib/brand";
import { MOCK, MOCK_TICKETS } from "@/lib/mock";
import { TICKET_STATUS_LABEL, TICKET_STATUSES, type Ticket, type TicketStatus } from "@/lib/types";
import { makeApi } from "@/lib/api";

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  open: { bg: "#e7fce3", fg: "#0a7a52", dot: "#25d366" },
  in_progress: { bg: "#e3f0ff", fg: "#1b5fa8", dot: "#4a90d9" },
  resolved: { bg: "#ede7ff", fg: "#5b3fa8", dot: "#8b6fd4" },
  closed: { bg: "#f0f2f5", fg: "#667781", dot: "#9aa5ab" },
  cancelled: { bg: "#f0f2f5", fg: "#667781", dot: "#9aa5ab" },
};

/** Cột kế tiếp trong luồng xử lý — nút "chuyển tiếp" trên mỗi thẻ. */
const NEXT_STATUS: Partial<Record<TicketStatus, TicketStatus>> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};

function TicketCard({
  t,
  onOpenConversation,
  onAdvance,
  busy,
}: {
  t: Ticket;
  onOpenConversation: (id: string) => void;
  onAdvance: (t: Ticket, to: TicketStatus) => void;
  busy: boolean;
}) {
  const next = NEXT_STATUS[t.status as TicketStatus];
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--wa-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[14.5px] font-medium" style={{ color: "var(--wa-text)" }}>
          {t.customer_name || "Khách chưa có tên"}
        </p>
        <span className="shrink-0 text-[11px]" style={{ color: "var(--wa-text-soft)" }}>
          {t.request_code}
        </span>
      </div>

      <p className="mt-1 text-[13.5px] leading-[18px]" style={{ color: "var(--wa-text)" }}>
        {t.summary}
      </p>

      <div
        className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]"
        style={{ color: "var(--wa-text-soft)" }}
      >
        <span>{t.request_type}</span>
        {t.customer_phone ? (
          <a
            href={`tel:${t.customer_phone.replace(/\s/g, "")}`}
            className="font-medium"
            style={{ color: "var(--wa-teal)" }}
          >
            {t.customer_phone}
          </a>
        ) : (
          <span>Chưa có SĐT</span>
        )}
        <span>{t.assigned_to_name ? `Giao: ${t.assigned_to_name}` : "Chưa giao"}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {t.conversation_id && (
          <button
            onClick={() => onOpenConversation(t.conversation_id!)}
            className="rounded-full px-2.5 py-[4px] text-[12.5px] font-medium"
            style={{ background: "var(--wa-panel-head)", color: "var(--wa-text)" }}
          >
            Mở hội thoại
          </button>
        )}
        {next && (
          <button
            onClick={() => onAdvance(t, next)}
            disabled={busy}
            className="rounded-full px-2.5 py-[4px] text-[12.5px] font-medium text-white disabled:opacity-50"
            style={{ background: "var(--wa-teal)" }}
          >
            → {TICKET_STATUS_LABEL[next]}
          </button>
        )}
      </div>
    </div>
  );
}

export function TicketsPanel({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const api = useMemo(() => makeApi(), []);
  const [tickets, setTickets] = useState<Ticket[] | null>(MOCK ? MOCK_TICKETS : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [wide, setWide] = useState(false);

  // Chọn kiểu xem theo bề ngang THẬT của cửa sổ, không đoán theo thiết bị.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const load = useCallback(async () => {
    if (MOCK || !AGENT_ID) return;
    setError(null);
    try {
      const data = await api<{ items?: Ticket[] } | Ticket[]>(`/agents/${AGENT_ID}/tickets?limit=200`);
      // Endpoint trả ENVELOPE {items,total,status_counts}, không phải mảng trần.
      setTickets(Array.isArray(data) ? data : (data.items ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = useCallback(async (t: Ticket, to: TicketStatus) => {
    setBusy(t.id);
    const before = t.status;
    setTickets((p) => p?.map((x) => (x.id === t.id ? { ...x, status: to } : x)) ?? p);
    if (MOCK) {
      setBusy(null);
      return;
    }
    try {
      await api(`/agents/${AGENT_ID}/tickets/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: to }),
      });
    } catch (e) {
      setTickets((p) => p?.map((x) => (x.id === t.id ? { ...x, status: before } : x)) ?? p);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [api]);

  /** Nhóm theo cột. Trạng thái lạ từ backend vẫn phải hiện ở đâu đó — dồn vào
   *  "Đã đóng" còn hơn để nó biến mất im lặng. */
  const columns = useMemo(() => {
    const by: Record<string, Ticket[]> = Object.fromEntries(TICKET_STATUSES.map((s) => [s, []]));
    for (const t of tickets ?? []) (by[t.status] ?? by.closed).push(t);
    return by;
  }, [tickets]);

  const header = (
    <header className="flex h-[60px] shrink-0 items-center justify-between px-4">
      <h2 className="text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
        Yêu cầu khách
      </h2>
      {tickets && (
        <span className="text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
          {tickets.length} yêu cầu
        </span>
      )}
    </header>
  );

  const body = (
    <>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}{" "}
          <button onClick={() => void load()} className="underline">
            Thử lại
          </button>
        </div>
      )}
      {tickets === null && !error && (
        <p className="p-2 text-sm" style={{ color: "var(--wa-text-soft)" }}>
          Đang tải…
        </p>
      )}
      {tickets?.length === 0 && (
        <p className="p-2 text-sm" style={{ color: "var(--wa-text-soft)" }}>
          Không có yêu cầu nào.
        </p>
      )}
    </>
  );

  if (wide) {
    return (
      <div className="flex h-full flex-col" style={{ background: "var(--wa-panel-head)" }}>
        {header}
        <div className="px-4">{body}</div>
        <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-4">
          <div className="flex h-full gap-3">
            {TICKET_STATUSES.map((st) => {
              const list = columns[st] ?? [];
              const s = STATUS_STYLE[st];
              return (
                <div key={st} className="flex h-full w-[300px] shrink-0 flex-col">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                    <span className="text-[13.5px] font-semibold" style={{ color: "var(--wa-text)" }}>
                      {TICKET_STATUS_LABEL[st]}
                    </span>
                    <span
                      className="rounded-full px-1.5 text-[11.5px] font-medium"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      {list.length}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {list.length === 0 && (
                      <p className="px-1 py-3 text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
                        Trống
                      </p>
                    )}
                    {list.map((t) => (
                      <TicketCard
                        key={t.id}
                        t={t}
                        onOpenConversation={onOpenConversation}
                        onAdvance={advance}
                        busy={busy === t.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Màn hẹp: danh sách dọc, gom theo trạng thái, bỏ cột rỗng.
  return (
    <div className="flex h-full flex-col bg-[var(--wa-panel)]">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {body}
        {TICKET_STATUSES.map((st) => {
          const list = columns[st] ?? [];
          if (!list.length) return null;
          const s = STATUS_STYLE[st];
          return (
            <section key={st} className="mb-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                <span className="text-[13.5px] font-semibold" style={{ color: "var(--wa-text)" }}>
                  {TICKET_STATUS_LABEL[st]}
                </span>
                <span
                  className="rounded-full px-1.5 text-[11.5px] font-medium"
                  style={{ background: s.bg, color: s.fg }}
                >
                  {list.length}
                </span>
              </div>
              <div className="space-y-2">
                {list.map((t) => (
                  <TicketCard
                    key={t.id}
                    t={t}
                    onOpenConversation={onOpenConversation}
                    onAdvance={advance}
                    busy={busy === t.id}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
