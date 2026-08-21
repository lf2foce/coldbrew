"use client";

/**
 * Câu hỏi trợ lý còn YẾU — cùng nguồn với vùng "Căn cứ yếu" ở route analytics
 * của dashboard: `GET /business/agents/{id}/quality?days=N`.
 *
 * Vì sao đáng có riêng một tab cho khách: đây là danh sách việc phải làm để bot
 * tốt lên. Mỗi dòng là một lỗ hổng cụ thể trong kho tri thức — khách đọc rồi bổ
 * sung tài liệu, chứ không phải con số đẹp để ngắm.
 *
 * Bấm một dòng → mở thẳng hội thoại đã sinh ra nó, để xem khách hỏi trong ngữ
 * cảnh nào. Chỉ số liệu mà không có đường về hội thoại thì đọc xong vẫn không
 * biết sửa gì.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENT_ID } from "@/lib/brand";
import { MOCK, MOCK_QUALITY } from "@/lib/mock";
import { FAILED_KIND, type AgentQuality } from "@/lib/types";
import { makeApi } from "@/lib/api";

const RANGES: { days: number; label: string }[] = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
];

function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--wa-border)" }}>
      <p className="text-[22px] font-semibold leading-tight" style={{ color: tone ?? "var(--wa-text)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
        {label}
      </p>
    </div>
  );
}

export function QualityPanel({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const api = useMemo(() => makeApi(), []);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AgentQuality | null>(MOCK ? MOCK_QUALITY : null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (MOCK || !AGENT_ID) return;
    setError(null);
    setData(null);
    try {
      setData(await api<AgentQuality>(`/business/agents/${AGENT_ID}/quality?days=${days}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-full flex-col bg-[var(--wa-panel)]">
      <header className="flex h-[60px] shrink-0 items-center justify-between px-4">
        <h2 className="text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
          Trợ lý còn yếu ở đâu
        </h2>
      </header>

      <div className="flex shrink-0 gap-2 px-4 pb-3">
        {RANGES.map((r) => {
          const on = r.days === days;
          return (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className="rounded-full px-3 py-[5px] text-[13px] transition"
              style={
                on
                  ? { background: "#e7fce3", color: "var(--wa-teal)", fontWeight: 500 }
                  : { background: "var(--wa-panel-head)", color: "var(--wa-text-soft)" }
              }
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}{" "}
            <button onClick={() => void load()} className="underline">
              Thử lại
            </button>
          </div>
        )}
        {data === null && !error && (
          <p className="text-sm" style={{ color: "var(--wa-text-soft)" }}>
            Đang tải…
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat value={String(data.total_questions)} label="Câu khách hỏi" />
              <Stat
                value={`${Math.round(data.fallback_rate * 100)}%`}
                label="Tỉ lệ không đáp được"
                tone={data.fallback_rate > 0.1 ? "#a33a33" : undefined}
              />
              {/* "Số câu căn cứ yếu" chứ không phải "Thiếu trong tài liệu": con số này
                  đếm số LƯỢT TRUY VẤN mà nguồn khớp nhất có điểm dưới ngưỡng 0.72, chứ
                  không đếm tài liệu còn thiếu. Nhiều lượt trong đó vẫn trả lời đúng và
                  đủ — ngưỡng chưa từng được hiệu chỉnh bằng dữ liệu thật.
                  Card "Thiếu trong danh mục" đã bỏ: catalog_miss = 0 ở cả 7/30/90 ngày. */}
              <Stat value={String(data.kb_gap_count)} label="Số câu căn cứ yếu" tone="#8a6100" />
            </div>

            <h3 className="mb-2 mt-5 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
              Câu hỏi cần bổ sung tài liệu
            </h3>

            {data.top_failed_questions.length === 0 ? (
              <p className="text-[13.5px]" style={{ color: "var(--wa-text-soft)" }}>
                Không có câu nào trượt trong khoảng thời gian này.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.top_failed_questions.map((q, i) => {
                  const k = FAILED_KIND[q.kind];
                  const clickable = Boolean(q.conversation_id);
                  return (
                    <li
                      key={`${q.question}-${i}`}
                      onClick={clickable ? () => onOpenConversation(q.conversation_id!) : undefined}
                      className={`rounded-xl border p-3 ${clickable ? "cursor-pointer transition hover:bg-black/[0.02]" : ""}`}
                      style={{ borderColor: "var(--wa-border)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-[14.5px] font-medium" style={{ color: "var(--wa-text)" }}>
                          {q.question}
                        </p>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className="rounded-full px-2 py-[3px] text-[11.5px] font-medium"
                            style={{ background: k.bg, color: k.fg }}
                          >
                            {k.label}
                          </span>
                          <span className="text-[12px]" style={{ color: "var(--wa-text-soft)" }}>
                            ×{q.count}
                          </span>
                        </span>
                      </div>

                      {q.answer && (
                        <p className="mt-1 line-clamp-2 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
                          ↳ {q.answer}
                        </p>
                      )}
                      {clickable && (
                        <p className="mt-1.5 text-[12.5px] font-medium" style={{ color: "var(--wa-teal)" }}>
                          Mở hội thoại →
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
