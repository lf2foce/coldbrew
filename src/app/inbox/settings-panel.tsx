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

import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";
import { MOCK } from "@/lib/mock";
import {
  HOTFIX_MAX_CHARS,
  type AgentDetail,
  type Kenh,
  type PromptHotfix,
} from "@/lib/types";
import { makeApi } from "@/lib/api";

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  zalo: "Zalo OA",
  lark: "Lark",
  telegram: "Telegram",
  web: "Nội bộ",
  web_public: "Web public",
};


/** true / vắng mặt = trợ lý tự trả lời (mặc định của backend). */


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
  const api = useMemo(() => makeApi(), []);


  const [hotfix, setHotfix] = useState("");
  const [savedHotfix, setSavedHotfix] = useState("");
  const [hotfixMeta, setHotfixMeta] = useState<PromptHotfix | null>(null);
  const [savingHotfix, setSavingHotfix] = useState(false);
  const [hotfixMsg, setHotfixMsg] = useState<string | null>(null);

  const [kenh, setKenh] = useState<Kenh[] | null>(null);
  const [kenhLoi, setKenhLoi] = useState<string | null>(null);
  const [dangLuuKenh, setDangLuuKenh] = useState<string | null>(null);
  const [dangChonKenh, setDangChonKenh] = useState<Kenh | null>(null);

  const loadKenh = useCallback(async () => {
    if (MOCK || !AGENT_ID) return;
    setKenhLoi(null);
    try {
      setKenh(await api<Kenh[]>(`/agents/${AGENT_ID}/channels`));
    } catch (e) {
      setKenhLoi(e instanceof Error ? e.message : String(e));
    }
  }, [api]);

  useEffect(() => {
    void loadKenh();
  }, [loadKenh]);

  const doiAutoReply = useCallback(
    async (k: Kenh, bat: boolean) => {
      setDangLuuKenh(k.id);
      // Đổi ngay trên màn hình rồi mới gọi API: công tắc phải nhúc nhích tức thì,
      // không thì người ta bấm lại lần nữa vì tưởng hụt.
      setKenh((p) => p?.map((x) => (x.id === k.id ? { ...x, auto_reply_enabled: bat } : x)) ?? p);
      try {
        await api(`/agents/${AGENT_ID}/channels/${k.id}/auto-reply`, {
          method: "POST",
          body: JSON.stringify({ enabled: bat }),
        });
      } catch (e) {
        // Hỏng thì đọc lại trạng thái THẬT, đừng đoán: người trực cần biết chính
        // xác trợ lý đang bật hay tắt, sai một nấc là khách nhận tin tự động
        // trong lúc tưởng đã tắt.
        await loadKenh();
        setKenhLoi(e instanceof Error ? e.message : String(e));
      } finally {
        setDangLuuKenh(null);
      }
    },
    [api, loadKenh],
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
        // PUT chứ không PATCH: backend chỉ có @router.put cho /agents/{id}. Bản
        // trước gọi PATCH nên mọi lần bấm Lưu đều 405 — luật vá chưa từng lưu được.
        method: "PUT",
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
      <header className="flex h-[60px] shrink-0 items-center px-4">
        <h2 className="text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
          Cài đặt
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {/* ── Mặc định theo kênh ──
            Đi qua /agents/{id}/channels chứ KHÔNG phải /integrations/*: đường cũ
            thao tác theo tenant nên app khách sẽ thấy và chỉnh được kênh của agent
            khác trong cùng workspace. Chi tiết: runbook 36. */}
        {/* Điều kiện hiện mục: có kênh HOẶC có lỗi. Bản trước chỉ xét `kenh.length > 0`,
            nên khi key thiếu scope (403) thì kenh rỗng → cả thông báo lỗi lẫn nút "Thử
            lại" biến mất theo, người dùng chỉ thấy mục cài đặt tự dưng không còn. Lỗi
            im lặng kiểu đó tốn hàng giờ mới lần ra. */}
        {((kenh?.length ?? 0) > 0 || kenhLoi) && (
          <section className="mb-6">
            <h3 className="mb-1 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
              Trợ lý làm gì khi có khách mới nhắn
            </h3>

            {kenhLoi && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {kenhLoi}{" "}
                <button onClick={() => void loadKenh()} className="underline">
                  Thử lại
                </button>
                {kenhLoi.includes("403") && (
                  <p className="mt-1 text-[12.5px]">
                    Khoá API thiếu quyền kênh — tạo lại khoá ở dashboard với nhóm quyền
                    &quot;App hộp thư&quot;.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {kenh?.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium" style={{ color: "var(--wa-text)" }}>
                      {k.label}
                    </p>
                    <p className="text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
                      {PLATFORM_LABEL[k.platform] ?? k.platform}
                      {k.editable ? "" : " · chỉ xem, không đổi được từ đây"}
                    </p>
                  </div>
                  {k.editable && (
                    <button
                      onClick={() => setDangChonKenh(k)}
                      disabled={dangLuuKenh === k.id}
                      className="shrink-0 rounded-full px-3 py-[6px] text-[13px] font-medium transition disabled:opacity-50"
                      style={
                        k.auto_reply_enabled
                          ? { background: "var(--wa-teal)", color: "#fff" }
                          : { background: "var(--wa-panel-head)", color: "var(--wa-text)" }
                      }
                    >
                      {/* KHÔNG dùng chữ "Tắt": ở mức kênh, tắt tự-trả-lời nghĩa là trợ
                          lý chuyển sang soạn nháp chờ duyệt, chứ không im lặng. Gọi là
                          "tắt" thì người trực tưởng khách không được phản hồi gì. */}
                      {k.auto_reply_enabled ? "Tự động trả lời" : "Soạn nháp chờ duyệt"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-2 text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
              Bấm vào chế độ bên phải để đổi cho cả kênh.
            </p>
          </section>
        )}

        {/* ── Luật vá ── */}
        <section className="mb-6">
          <h3 className="mb-1 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Luật bổ sung cho trợ lý
          </h3>
          <textarea
            value={hotfix}
            onChange={(e) => setHotfix(e.target.value.slice(0, HOTFIX_MAX_CHARS))}
            rows={5}
            placeholder="Ví dụ: Từ 20/8, giá khám dịch vụ là 150.000đ/lượt. Khoa Nhi không khám chiều thứ Bảy."
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

        {/* ── Tài khoản ── */}
        <section className="mb-6">
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Tài khoản
          </h3>
          <div
            className="flex items-center justify-end gap-3 rounded-xl border p-3"
            style={{ borderColor: "var(--wa-border)" }}
          >
            <button
              onClick={() => {
                void fetch("/api/logout", { method: "POST" }).then(() => {
                  window.location.href = "/sign-in";
                });
              }}
              className="shrink-0 rounded-full border px-3.5 py-[6px] text-[13.5px] font-medium transition hover:bg-black/[0.03]"
              style={{ borderColor: "var(--wa-border-strong)", color: "#a33a33" }}
            >
              Đăng xuất
            </button>
          </div>
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

      {dangChonKenh && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-black/30" onClick={() => setDangChonKenh(null)} aria-label="Đóng" />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-2 shadow-xl sm:rounded-2xl">
            <p className="px-4 pb-1 pt-3 text-[15px] font-medium" style={{ color: "var(--wa-text)" }}>
              Mặc định cho {dangChonKenh.label}
            </p>
            <p className="px-4 pb-2 text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
              Áp cho mọi khách nhắn vào kênh này.
            </p>
            {([
              [true, "Tự động trả lời", "Trợ lý trả lời khách ngay, không cần duyệt"],
              [false, "Soạn nháp chờ duyệt", "Trợ lý soạn sẵn, nhân viên bấm gửi"],
            ] as [boolean, string, string][]).map(([bat, nhan, mota]) => {
              const on = dangChonKenh.auto_reply_enabled === bat;
              return (
                <button
                  key={String(bat)}
                  onClick={() => {
                    const k = dangChonKenh;
                    setDangChonKenh(null);
                    if (k.auto_reply_enabled !== bat) void doiAutoReply(k, bat);
                  }}
                  className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-black/[0.03]"
                >
                  <span
                    className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: on ? "var(--wa-teal)" : "var(--wa-border-strong)" }}
                  >
                    {on && <span className="h-[9px] w-[9px] rounded-full" style={{ background: "var(--wa-teal)" }} />}
                  </span>
                  <span>
                    <span className="block text-[14.5px]" style={{ color: "var(--wa-text)" }}>{nhan}</span>
                    <span className="block text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>{mota}</span>
                  </span>
                </button>
              );
            })}
            {/* Mức kênh CHỈ có hai nấc: backend lưu `runtime.auto_reply_enabled` là
                boolean. Nấc thứ ba — trợ lý im hẳn — chỉ tồn tại ở mức hội thoại
                (`reply_mode_override: auto_send | advisor | off`). Nói thẳng ra đây,
                không thì người trực đi tìm mãi một lựa chọn không có. */}
            <p className="px-4 pb-3 pt-1 text-[12.5px]" style={{ color: "var(--wa-text-soft)" }}>
              Muốn trợ lý <strong>im hẳn</strong> thì đặt riêng cho từng hội thoại ở tab Hộp thư —
              mức kênh không có lựa chọn đó.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
