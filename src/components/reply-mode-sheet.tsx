"use client";

/**
 * Chọn CHẾ ĐỘ TRẢ LỜI cho MỘT hội thoại — ghi đè mặc định của kênh.
 *
 * Vì sao là thao tác của từng hội thoại chứ không phải công tắc toàn cục: khi
 * một khách đang căng thì nhân viên cần trợ lý im ngay ở đúng hội thoại đó, mà
 * không làm ngưng trợ lý với mọi khách khác.
 *
 * "Theo mặc định của kênh" = gửi `null` → backend suy lại từ cấu hình kênh. Đây
 * là trạng thái khác hẳn "tắt": tắt là chặn hẳn, mặc định là thả theo kênh.
 */

import { REPLY_MODES, type ReplyMode } from "@/lib/types";

export function ReplyModeSheet({
  value,
  onPick,
  onClose,
}: {
  value: ReplyMode;
  onPick: (mode: ReplyMode) => void;
  onClose: () => void;
}) {
  const rows: { value: ReplyMode; label: string; hint: string }[] = [
    ...REPLY_MODES,
    { value: null, label: "Theo mặc định của kênh", hint: "Dùng cài đặt chung, không ghi đè riêng" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-2 shadow-xl sm:rounded-2xl">
        <p className="px-4 pb-2 pt-3 text-[15px] font-medium" style={{ color: "var(--wa-text)" }}>
          Chế độ trả lời
        </p>
        {rows.map((r) => {
          const on = r.value === value;
          return (
            <button
              key={String(r.value)}
              onClick={() => {
                onPick(r.value);
                onClose();
              }}
              className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-black/5"
            >
              <span
                className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: on ? "var(--wa-teal)" : "#c4cdd2" }}
              >
                {on && (
                  <span
                    className="h-[9px] w-[9px] rounded-full"
                    style={{ background: "var(--wa-teal)" }}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px]" style={{ color: "var(--wa-text)" }}>
                  {r.label}
                </span>
                <span className="block text-[13px]" style={{ color: "var(--wa-text-soft)" }}>
                  {r.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Nhãn nhỏ hiện ở header hội thoại — nhân viên phải thấy NGAY trợ lý đang ở
 *  chế độ nào trước khi gõ, không phải mở menu ra mới biết. */
export function ReplyModeChip({ value, onClick }: { value: ReplyMode; onClick: () => void }) {
  const map: Record<string, { text: string; bg: string; fg: string }> = {
    auto_send: { text: "Trợ lý tự trả lời", bg: "#e7fce3", fg: "#0a7a52" },
    advisor: { text: "Chờ duyệt nháp", bg: "#fff4d6", fg: "#8a6100" },
    off: { text: "Đã tắt trợ lý", bg: "#ffe6e4", fg: "#a33a33" },
  };
  const s = value ? map[value] : { text: "Theo kênh", bg: "var(--wa-panel)", fg: "var(--wa-text-soft)" };
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition hover:opacity-80"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.text}
    </button>
  );
}
