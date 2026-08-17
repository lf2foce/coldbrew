"use client";

/**
 * Cài đặt — mặc định của trợ lý trên từng KÊNH, và luật vá cho prompt.
 *
 * Bản trước em làm sai: bày ba nút "áp cho tất cả hội thoại đang có". Sai vì
 * đó là một HÀNH ĐỘNG hàng loạt, không phải một CÀI ĐẶT — mở màn ra không đọc
 * được trợ lý đang ở chế độ nào, và nó cũng không đổi hành vi với khách sẽ
 * nhắn ngày mai.
 *
 * Mặc định thật nằm ở `integration.config_json.runtime.auto_reply_enabled`.
 * `resolve_effective_reply_mode` đọc theo thứ tự: ghi đè của TỪNG hội thoại →
 * nếu không có thì rơi về cờ của KÊNH. Nên màn này hiện trạng thái từng kênh
 * dưới dạng chọn một-trong-hai, đọc phát biết ngay.
 *
 * Ghi đè cho một hội thoại riêng vẫn nằm ở tab Hộp thư — hai tầng khác nhau,
 * đừng trộn.
 */

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";
import { MOCK } from "@/lib/mock";
import {
  AUTO_REPLY_EDITABLE,
  CHAT_PLATFORMS,
  HOTFIX_MAX_CHARS,
  type AgentDetail,
  type Integration,
  type PromptHotfix,
} from "@/lib/types";
import { makeApi } from "@/lib/api";

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  zalo: "Zalo OA",
  lark: "Lark",
  telegram: "Telegram",
  web: "Website",
};

const MOCK_INTEGRATIONS: Integration[] = [
  { id: "i1", agent_id: "x", platform: "facebook", external_app_id: "101618135082013", status: "active", config_json: { runtime: { auto_reply_enabled: true }, meta: { name: "BĐS Demo · Fanpage chính" } } },
  { id: "i2", agent_id: "x", platform: "facebook", external_app_id: "1064783760058317", status: "active", config_json: { runtime: { auto_reply_enabled: false }, meta: { name: "BĐS Demo · Page dự án" } } },
  { id: "i3", agent_id: "x", platform: "zalo", external_app_id: "zalo-oa-1", status: "active", config_json: { runtime: {} } },
];

/** true / vắng mặt = trợ lý tự trả lời (mặc định của backend). */
function autoReplyOn(i: Integration): boolean {
  return i.config_json?.runtime?.auto_reply_enabled !== false;
}

function channelName(i: Integration): string {
  return i.config_json?.meta?.name?.trim() || `${PLATFORM_LABEL[i.platform] ?? i.platform} · ${i.external_app_id}`;
}

function Choice({
  on,
  title,
  hint,
  color,
  disabled,
  onClick,
}: {
  on: boolean;
  title: string;
  hint: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-black/[0.03] disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span
        className="mt-[2px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-2"
        style={{ borderColor: on ? color : "#c4cdd2" }}
      >
        {on && <span className="h-[8px] w-[8px] rounded-full" style={{ background: color }} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px]" style={{ color: "var(--wa-text)" }}>
          {title}
        </span>
        <span className="block text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
          {hint}
        </span>
      </span>
    </button>
  );
}

export function SettingsPanel() {
  const { getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);

  const [channels, setChannels] = useState<Integration[] | null>(MOCK ? MOCK_INTEGRATIONS : null);
  const [chError, setChError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [hotfix, setHotfix] = useState("");
  const [savedHotfix, setSavedHotfix] = useState("");
  const [hotfixMeta, setHotfixMeta] = useState<PromptHotfix | null>(null);
  const [savingHotfix, setSavingHotfix] = useState(false);
  const [hotfixMsg, setHotfixMsg] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    if (MOCK) return;
    setChError(null);
    try {
      const all = await api<Integration[]>("/integrations");
      setChannels(
        all.filter(
          (i) =>
            CHAT_PLATFORMS.has(i.platform) &&
            i.status === "active" &&
            (!AGENT_ID || i.agent_id === AGENT_ID),
        ),
      );
    } catch (e) {
      setChError(e instanceof Error ? e.message : String(e));
      setChannels([]);
    }
  }, [api]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (MOCK || !AGENT_ID) return;
    void (async () => {
      try {
        const a = await api<AgentDetail>(`/agents/${AGENT_ID}`);
        const raw = (a.agent_config_json ?? {})["prompt_hotfix"];
        const h: PromptHotfix | null =
          typeof raw === "string" ? { text: raw } : ((raw as PromptHotfix | undefined) ?? null);
        setHotfix(h?.text ?? "");
        setSavedHotfix(h?.text ?? "");
        setHotfixMeta(h);
      } catch {
        /* đọc hỏng thì để trống, không chặn cả màn */
      }
    })();
  }, [api]);

  const setAutoReply = useCallback(
    async (ch: Integration, enabled: boolean) => {
      if (autoReplyOn(ch) === enabled) return;
      setSaving(ch.id);
      setChError(null);
      // Cập nhật lạc quan: bấm là thấy chấm nhảy sang.
      setChannels((prev) =>
        prev?.map((c) =>
          c.id === ch.id
            ? { ...c, config_json: { ...c.config_json, runtime: { ...c.config_json?.runtime, auto_reply_enabled: enabled } } }
            : c,
        ) ?? prev,
      );
      if (MOCK) {
        setSaving(null);
        return;
      }
      try {
        await api("/integrations/meta/set-auto-reply", {
          method: "POST",
          body: JSON.stringify({ integration_id: ch.id, enabled }),
        });
      } catch (e) {
        await loadChannels(); // lỗi → đọc lại trạng thái THẬT, đừng đoán
        setChError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(null);
      }
    },
    [api, loadChannels],
  );

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
      if (text) cfg["prompt_hotfix"] = { text, updated_at: new Date().toISOString() } satisfies PromptHotfix;
      else delete cfg["prompt_hotfix"];
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

  return (
    <div className="flex h-full flex-col bg-[var(--wa-panel)]">
      <header className="flex h-[64px] shrink-0 items-center px-4 pt-2">
        <h2 className="text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
          Cài đặt
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {/* ── Mặc định theo kênh ── */}
        <section className="mb-6">
          <h3 className="mb-1 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Trợ lý làm gì khi có khách mới nhắn
          </h3>
          <p className="mb-3 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
            Đặt riêng cho từng kênh. Một hội thoại cụ thể vẫn chỉnh riêng được ở tab Hộp thư và
            sẽ <strong>đè lên</strong> mặc định này.
          </p>

          {chError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {chError}{" "}
              <button onClick={() => void loadChannels()} className="underline">
                Thử lại
              </button>
            </div>
          )}
          {channels === null && !chError && (
            <p className="text-[13.5px]" style={{ color: "var(--wa-text-soft)" }}>
              Đang tải…
            </p>
          )}
          {channels?.length === 0 && (
            <p
              className="rounded-lg border px-3 py-2.5 text-[13px]"
              style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel-head)", color: "var(--wa-text-soft)" }}
            >
              Chưa có kênh trò chuyện nào được nối. Sau khi nối Fanpage hoặc Zalo OA, mặc định
              của từng kênh sẽ hiện ở đây.
            </p>
          )}

          <div className="space-y-2">
            {channels?.map((ch) => {
              const on = autoReplyOn(ch);
              const editable = AUTO_REPLY_EDITABLE.has(ch.platform);
              const busy = saving === ch.id;
              return (
                <div key={ch.id} className="rounded-xl border p-3" style={{ borderColor: "var(--wa-border)" }}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[14.5px] font-medium" style={{ color: "var(--wa-text)" }}>
                      {channelName(ch)}
                    </p>
                    <span
                      className="shrink-0 rounded-full px-2 py-[2px] text-[11.5px] font-medium"
                      style={on ? { background: "#e7fce3", color: "#0a7a52" } : { background: "#fff4d6", color: "#8a6100" }}
                    >
                      {on ? "Tự trả lời" : "Chờ duyệt"}
                    </span>
                  </div>

                  <Choice
                    on={on}
                    title="Tự động trả lời"
                    hint="Trợ lý trả lời khách ngay, không cần ai duyệt"
                    color="#25d366"
                    disabled={!editable || busy}
                    onClick={() => void setAutoReply(ch, true)}
                  />
                  <Choice
                    on={!on}
                    title="Soạn nháp chờ duyệt"
                    hint="Trợ lý soạn sẵn, nhân viên đọc rồi bấm gửi"
                    color="#f0c14b"
                    disabled={!editable || busy}
                    onClick={() => void setAutoReply(ch, false)}
                  />

                  {!editable && (
                    <p className="mt-1 px-2.5 text-[12px]" style={{ color: "var(--wa-text-soft)" }}>
                      Kênh {PLATFORM_LABEL[ch.platform] ?? ch.platform} chỉ xem được, chưa đổi
                      tại đây — liên hệ bên vận hành.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nói thẳng: không có nấc "tắt hẳn" ở tầng kênh. Bày ra rồi không chạy
              là mất tin ngay lần đầu khách thử. */}
          <p
            className="mt-2 rounded-lg border px-3 py-2 text-[12.5px]"
            style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel-head)", color: "var(--wa-text-soft)" }}
          >
            Muốn trợ lý <strong>im hẳn</strong> (không cả soạn nháp) thì đặt riêng cho từng hội
            thoại ở tab Hộp thư — mức kênh chỉ có hai nấc trên.
          </p>
        </section>

        {/* ── Luật vá ── */}
        <section className="mb-6">
          <h3 className="mb-1 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Luật bổ sung cho trợ lý
          </h3>
          <p className="mb-2 text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
            Viết vài dòng để sửa nhanh khi trợ lý nói sai — đổi giá, đổi lịch, thêm quy định
            mới. Luật này <strong>đè lên</strong> hướng dẫn gốc và áp cho mọi kênh.
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
            <span
              className="text-[12px]"
              style={{ color: hotfix.length > HOTFIX_MAX_CHARS * 0.9 ? "#a33a33" : "var(--wa-text-soft)" }}
            >
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
        </section>

        {/* ── Thông tin ── */}
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
