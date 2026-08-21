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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_ID } from "@/lib/brand";
import { MOCK, MOCK_QUALITY } from "@/lib/mock";
import { FAILED_KIND, nhanNguon, type AgentQuality, type Kenh } from "@/lib/types";
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

/** `null` = mọi nguồn. `web` là chat thử của nhân viên — trộn nó vào số liệu khách
 *  thật thì một buổi ngồi thử bot đủ kéo lệch cả tháng. */
type Nguon = string | null;

export function QualityPanel({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const api = useMemo(() => makeApi(), []);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AgentQuality | null>(MOCK ? MOCK_QUALITY : null);
  const [error, setError] = useState<string | null>(null);

  // Danh sách nguồn dựng từ KÊNH THẬT của agent, không phải danh sách cứng: bày
  // "Zalo OA" cho khách chưa nối Zalo thì họ bấm vào chỉ thấy rỗng rồi tưởng hỏng.
  const [nguonCo, setNguonCo] = useState<string[] | null>(null);
  const [nguon, setNguon] = useState<Nguon>(null);
  // Ref chứ không state: cờ này được ĐỌC trong một callback bất đồng bộ chạy sau.
  // Để là state thì callback giữ giá trị cũ trong closure — người dùng chọn "Tất cả
  // nguồn" trong lúc request đang bay, request về sau vẫn thấy `false` rồi ép ngược
  // bộ lọc về Facebook. Người ta bấm, thấy nó tự nhảy lại, tưởng nút hỏng.
  //
  // Ref cũng giữ effect KHÔNG phụ thuộc cờ này, nên danh sách kênh chỉ tải một lần
  // thay vì tải lại mỗi lần đổi nguồn.
  const daChonNguon = useRef(false);

  useEffect(() => {
    if (MOCK || !AGENT_ID) {
      setNguonCo([]);
      return;
    }
    let con = true; // unmount giữa chừng thì đừng setState nữa
    void (async () => {
      try {
        const ks = await api<Kenh[]>(`/agents/${AGENT_ID}/channels`);
        if (!con) return;
        const pf = [...new Set(ks.map((k) => k.platform))];
        setNguonCo(pf);
        // Mặc định Facebook vì đó là nơi khách thật nhắn vào. Nhưng chỉ khi kênh đó
        // CÓ — không thì mặc định thành bộ lọc rỗng, màn hình trắng trơn ngay lần
        // mở đầu và người ta kết luận "tính năng hỏng".
        if (!daChonNguon.current && pf.includes("facebook")) setNguon("facebook");
      } catch {
        // Không lấy được danh sách kênh thì vẫn xem được số liệu — chỉ mất bộ lọc.
        // Chặn cả màn vì một lời gọi phụ hỏng là đánh đổi tồi.
        if (con) setNguonCo([]);
      }
    })();
    return () => {
      con = false;
    };
  }, [api]);

  const load = useCallback(async () => {
    if (MOCK || !AGENT_ID) return;
    // Chưa biết agent có những kênh nào thì CHƯA chốt được bộ lọc mặc định. Gọi sớm
    // là gọi hai lần: lần đầu "tất cả nguồn", lần sau "facebook" — và giữa hai lần
    // đó màn hình kịp hiện con số của tất cả nguồn rồi mới nhảy sang con số khác.
    if (nguonCo === null) return;
    setError(null);
    setData(null);
    try {
      const qs = new URLSearchParams({ days: String(days) });
      // Lặp khoá `platforms` cho từng giá trị — FastAPI đọc list[str] theo dạng này.
      if (nguon) qs.append("platforms", nguon);
      setData(await api<AgentQuality>(`/business/agents/${AGENT_ID}/quality?${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, days, nguon, nguonCo]);

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

        {/* Lọc nguồn nằm CÙNG HÀNG với khoảng thời gian: hai thứ này cùng quy định
            "con số đang nói về cái gì". Tách ra chỗ khác thì người ta đọc số mà
            không thấy bộ lọc đang bật. */}
        {(nguonCo?.length ?? 0) > 0 && (
          <select
            value={nguon ?? ""}
            onChange={(e) => {
              daChonNguon.current = true;
              setNguon(e.target.value || null);
            }}
            className="ml-auto rounded-full px-3 py-[5px] text-[13px] outline-none"
            style={{ background: "var(--wa-panel-head)", color: "var(--wa-text)" }}
            aria-label="Lọc theo nguồn"
          >
            <option value="">Tất cả nguồn</option>
            {nguonCo?.map((pf) => (
              <option key={pf} value={pf}>
                {nhanNguon(pf)}
              </option>
            ))}
            {/* "web" là chat thử — không phải một kênh đã nối nên không có trong danh
                sách kênh, nhưng nó CÓ sinh ra số liệu. Thiếu mục này thì không ai
                tách nổi lượt thử của nhân viên ra khỏi lượt của khách thật.
                Chèn có điều kiện: backend hôm nay lọc `web` ra khỏi danh sách kênh,
                nhưng dựa vào điều đó thì ngày nào họ thêm vào là có hai mục trùng. */}
            {!nguonCo?.includes("web") && <option value="web">{nhanNguon("web")}</option>}
          </select>
        )}
      </div>

      {/* Lọc nguồn thì sự kiện KHÔNG gắn hội thoại nào sẽ rơi ra ngoài (backend suy
          nguồn qua hội thoại). Nói ra để người đọc không hoang mang khi tổng của các
          nguồn nhỏ hơn "Tất cả nguồn". */}
      {nguon && (
        <p className="shrink-0 px-4 pb-2 text-[12px]" style={{ color: "var(--wa-text-soft)" }}>
          Chỉ tính lượt đến từ {nhanNguon(nguon)}.
        </p>
      )}

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
              {/* null = CHƯA ĐO ĐƯỢC, khác hẳn 0%. Backend chỉ tính tỉ lệ từ lúc bắt
                  đầu đếm được mẫu số (số lượt thực sự truy vấn tri thức); trước mốc đó
                  không có gì để chia. Hiện "—" chứ đừng để `null * 100` thành 0% —
                  người đọc sẽ tưởng trợ lý đang hoàn hảo. */}
              <Stat
                value={data.fallback_rate === null || data.fallback_rate === undefined
                  ? "—"
                  : `${Math.round(data.fallback_rate * 100)}%`}
                label={
                  data.fallback_rate === null || data.fallback_rate === undefined
                    ? "Tỉ lệ không đáp được · đang gom số liệu"
                    : `Tỉ lệ không đáp được · ${data.kb_query_count ?? 0} lượt tra cứu`
                }
                tone={(data.fallback_rate ?? 0) > 0.1 ? "#a33a33" : undefined}
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
