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
import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";
import { MOCK } from "@/lib/mock";
import { HOTFIX_MAX_CHARS, REPLY_MODES, type AgentDetail, type Conversation, type PromptHotfix, type ReplyMode } from "@/lib/types";
import { makeApi } from "@/lib/api";

export function SettingsPanel() {
  const { getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);
  const [busy, setBusy] = useState<ReplyMode | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Luật vá ──
  const [hotfix, setHotfix] = useState("");
  const [savedHotfix, setSavedHotfix] = useState("");
  const [hotfixMeta, setHotfixMeta] = useState<PromptHotfix | null>(null);
  const [savingHotfix, setSavingHotfix] = useState(false);
  const [hotfixMsg, setHotfixMsg] = useState<string | null>(null);

  useEffect(() => {
    if (MOCK || !AGENT_ID) return;
    void (async () => {
      try {
        const a = await api<AgentDetail>(`/agents/${AGENT_ID}`);
        const raw = (a.agent_config_json ?? {})["prompt_hotfix"];
        const h: PromptHotfix | null =
          typeof raw === "string" ? { text: raw } : (raw as PromptHotfix | undefined) ?? null;
        setHotfix(h?.text ?? "");
        setSavedHotfix(h?.text ?? "");
        setHotfixMeta(h);
      } catch {
        /* đọc hỏng thì để trống, không chặn cả màn Cài đặt */
      }
    })();
  }, [api]);

  const saveHotfix = useCallback(async () => {
    setSavingHotfix(true);
    setHotfixMsg(null);
    const text = hotfix.trim();
    if (MOCK) {
      setTimeout(() => {
        setSavedHotfix(text);
        setHotfixMsg("(chế độ mock) Chưa gọi backend.");
        setSavingHotfix(false);
      }, 300);
      return;
    }
    try {
      // Đọc lại config rồi ghi ĐÈ NGUYÊN CẢ object: PATCH thay cả
      // `agent_config_json`, gửi thiếu khoá là xoá mất cấu hình khác.
      const a = await api<AgentDetail>(`/agents/${AGENT_ID}`);
      const cfg = { ...(a.agent_config_json ?? {}) };
      if (text) {
        cfg["prompt_hotfix"] = {
          text,
          updated_at: new Date().toISOString(),
        } satisfies PromptHotfix;
      } else {
        delete cfg["prompt_hotfix"];
      }
      await api(`/agents/${AGENT_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ agent_config_json: cfg }),
      });
      setSavedHotfix(text);
      setHotfixMeta(text ? { text, updated_at: new Date().toISOString() } : null);
      setHotfixMsg(text ? "Đã lưu. Trợ lý áp luật này từ lượt chat kế tiếp." : "Đã gỡ luật vá.");
    } catch (e) {
      setHotfixMsg(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingHotfix(false);
    }
  }, [api, hotfix]);

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

        <section className="mb-6">
          <h3 className="mb-1 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Luật bổ sung cho trợ lý
          </h3>
          <p className="mb-2 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
            Viết vài dòng để sửa nhanh khi trợ lý nói sai — ví dụ đổi giá, đổi lịch, thêm quy
            định mới. Luật này <strong>đè lên</strong> hướng dẫn gốc và áp cho mọi kênh.
          </p>

          <textarea
            value={hotfix}
            onChange={(e) => setHotfix(e.target.value.slice(0, HOTFIX_MAX_CHARS))}
            rows={5}
            placeholder="Ví dụ: Từ 20/8, học phí lớp trực tuyến là 1.800.000đ/tháng. Không nhận bé dưới 3 tuổi."
            className="w-full resize-y rounded-xl border p-3 text-[14px] outline-none"
            style={{ borderColor: "var(--wa-border-strong)", color: "var(--wa-text)" }}
          />

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-[12px]" style={{ color: hotfix.length > HOTFIX_MAX_CHARS * 0.9 ? "#a33a33" : "var(--wa-text-soft)" }}>
              {hotfix.length}/{HOTFIX_MAX_CHARS} ký tự
            </span>
            <button
              onClick={() => void saveHotfix()}
              disabled={savingHotfix || hotfix.trim() === savedHotfix.trim()}
              className="rounded-full px-4 py-[6px] text-[13.5px] font-medium text-white transition disabled:opacity-40"
              style={{ background: "var(--wa-teal)" }}
            >
              {savingHotfix ? "Đang lưu…" : "Lưu luật"}
            </button>
          </div>

          {hotfixMeta?.updated_at && (
            <p className="mt-1.5 text-[12px]" style={{ color: "var(--wa-text-soft)" }}>
              Sửa lần cuối {new Date(hotfixMeta.updated_at).toLocaleString("vi-VN")}
              {hotfixMeta.updated_by ? ` · ${hotfixMeta.updated_by}` : ""}
            </p>
          )}
          {hotfixMsg && (
            <p className="mt-2 rounded-lg bg-[#e7fce3] px-3 py-2 text-[13px]" style={{ color: "#0a7a52" }}>
              {hotfixMsg}
            </p>
          )}

          <p
            className="mt-2 rounded-lg border px-3 py-2 text-[12.5px]"
            style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel-head)", color: "var(--wa-text-soft)" }}
          >
            Dùng cho việc vá gấp vài dòng. Nội dung dài hoặc lâu dài nên đưa vào tài liệu để
            trợ lý tra cứu, thay vì nhét hết vào đây.
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
