"use client";

/**
 * Cài đặt — chỗ khách bật/tắt trợ lý.
 *
 * ⚠ GIỚI HẠN THẬT, PHẢI NÓI RA: backend hiện KHÔNG có "chế độ mặc định" ở mức
 * agent. `resolve_effective_reply_mode` chỉ đọc hai thứ — ghi đè của TỪNG hội
 * thoại, và cờ `auto_reply_enabled` của TỪNG kênh (chỉ Meta có endpoint đổi).
 * Không có đường nào tắt trợ lý cho hội thoại SẼ đến trong tương lai.
 *
 * Nên nút ở đây áp chế độ cho MỌI hội thoại ĐANG CÓ — có tác dụng ngay và thật.
 * Hội thoại mới sau đó vẫn theo mặc định của kênh. Màn hình nói thẳng điều đó
 * thay vì bày một công tắc trông như tắt toàn cục rồi khách tưởng đã tắt.
 *
 * Muốn tắt thật cho cả tương lai thì phải sửa backend — xem ghi chú cuối file.
 */

import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";
import { MOCK } from "@/lib/mock";
import { REPLY_MODES, type Conversation, type ReplyMode } from "@/lib/types";
import { makeApi } from "@/lib/api";

export function SettingsPanel() {
  const { getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);
  const [busy, setBusy] = useState<ReplyMode | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyToAll = useCallback(
    async (mode: ReplyMode) => {
      setBusy(mode);
      setResult(null);
      setError(null);
      if (MOCK) {
        setTimeout(() => {
          setResult("(chế độ mock) Chưa gọi backend.");
          setBusy(null);
        }, 400);
        return;
      }
      try {
        const qs = new URLSearchParams({ scope: "all", limit: "500" });
        if (AGENT_ID) qs.set("agent_id", AGENT_ID);
        const convs = await api<Conversation[]>(`/conversations?${qs}`);
        // Tuần tự chứ không bắn song song: backend có van tải lượt LLM, và một
        // cú bấm không đáng làm nghẽn hàng đợi của khách đang chat thật.
        let ok = 0;
        for (const c of convs) {
          try {
            await api(`/conversations/${c.id}/reply-mode`, {
              method: "POST",
              body: JSON.stringify({ reply_mode_override: mode }),
            });
            ok += 1;
          } catch {
            /* bỏ qua từng cái hỏng, báo tổng ở cuối */
          }
        }
        setResult(`Đã áp cho ${ok}/${convs.length} hội thoại đang có.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [api],
  );

  return (
    <div className="flex h-full flex-col bg-[var(--wa-panel)]">
      <header className="flex h-[64px] shrink-0 items-center px-4 pt-2">
        <h2 className="text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
          Cài đặt
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <section className="mb-6">
          <h3 className="mb-1 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Chế độ trả lời của trợ lý
          </h3>
          <p className="mb-3 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
            Áp cho tất cả hội thoại đang có. Từng hội thoại vẫn đổi riêng được ở tab Hộp thư.
          </p>

          <div className="space-y-2">
            {REPLY_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => void applyToAll(m.value)}
                disabled={busy !== null}
                className="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-black/[0.02] disabled:opacity-50"
                style={{ borderColor: "var(--wa-border)" }}
              >
                <span
                  className="mt-[3px] h-3 w-3 shrink-0 rounded-full"
                  style={{
                    background:
                      m.value === "auto_send"
                        ? "#25d366"
                        : m.value === "advisor"
                          ? "#f0c14b"
                          : "#e06b62",
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-[15px]" style={{ color: "var(--wa-text)" }}>
                    {m.label}
                    {busy === m.value && " — đang áp…"}
                  </span>
                  <span className="block text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
                    {m.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {result && (
            <p className="mt-3 rounded-lg bg-[#e7fce3] px-3 py-2 text-[13px]" style={{ color: "#0a7a52" }}>
              {result}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {error}
            </p>
          )}

          {/* Nói thẳng giới hạn. Che đi thì khách bấm "Tắt trợ lý" rồi tưởng đã
              tắt hẳn, tới lúc khách mới nhắn mà bot vẫn trả lời là mất tin. */}
          <p
            className="mt-3 rounded-lg border px-3 py-2 text-[12.5px]"
            style={{ borderColor: "#f0c14b", background: "#fffbea", color: "#8a6100" }}
          >
            Chỉ áp cho hội thoại <strong>đang có</strong>. Khách mới nhắn sau đó vẫn theo mặc
            định của kênh — muốn tắt hẳn cho cả về sau, liên hệ bên vận hành.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Thông tin
          </h3>
          <dl className="rounded-xl border" style={{ borderColor: "var(--wa-border)" }}>
            {[
              ["Tên hiển thị", BRAND.name],
              ["Mã trợ lý", AGENT_ID ? `${AGENT_ID.slice(0, 8)}…` : "chưa cấu hình"],
              ["Nguồn dữ liệu", MOCK ? "Dữ liệu giả (mock)" : "Dữ liệu thật"],
            ].map(([k, v], i) => (
              <div
                key={k}
                className="flex items-center justify-between px-3 py-2.5"
                style={{ borderTop: i ? "1px solid var(--wa-border)" : undefined }}
              >
                <dt className="text-[14px]" style={{ color: "var(--wa-text-soft)" }}>
                  {k}
                </dt>
                <dd className="text-[14px]" style={{ color: "var(--wa-text)" }}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
