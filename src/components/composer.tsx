"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Ô soạn tin theo WhatsApp bản mới: nút `+` NGOÀI bên trái, ô nhập bo tròn với
 * icon emoji/sticker NẰM TRONG ô, mic ngoài bên phải. Bản trước em để emoji và
 * đính kèm thành hai nút rời bên ngoài — nhìn thô hơn hẳn.
 *
 * Nút bên phải luôn là vòng tròn xanh: mic khi ô trống, mũi tên gửi khi có chữ.
 *
 * Ô nhập là `textarea` CO GIÃN, không phải `input` một dòng: nháp trợ lý thường dài
 * cả đoạn, mà `input` chỉ cho thấy một dòng — bấm "Sửa" xong không đọc nổi mình đang
 * sửa cái gì, phải rê ngang từng chữ. Giãn tối đa 4 dòng rồi mới cuộn, để ô soạn
 * không nuốt hết chỗ đọc tin.
 *
 * Enter = gửi, Shift+Enter = xuống dòng — thói quen của mọi app chat. Textarea mặc
 * định làm ngược lại nên phải chặn tay.
 */

const SO_DONG_TOI_DA = 4;

export function Composer({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
  oRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  /** Để nơi khác đặt con trỏ vào ô soạn — ví dụ bấm "Sửa" ở nháp trợ lý. */
  oRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const hasText = value.trim().length > 0;
  const oTrong = useRef<HTMLTextAreaElement | null>(null);

  // Đo lại chiều cao mỗi lần nội dung đổi. `useLayoutEffect` chứ không `useEffect`:
  // đo sau khi vẽ thì người dùng thấy ô giật một nhịp mỗi lần gõ xuống dòng.
  useLayoutEffect(() => {
    const o = oTrong.current;
    if (!o) return;
    // Về 'auto' trước rồi mới đo: giữ nguyên chiều cao cũ thì scrollHeight không bao
    // giờ nhỏ lại, nên xoá bớt chữ mà ô vẫn cao như cũ.
    o.style.height = "auto";
    const doDong = parseFloat(getComputedStyle(o).lineHeight) || 20;
    o.style.height = `${Math.min(o.scrollHeight, doDong * SO_DONG_TOI_DA)}px`;
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="flex shrink-0 items-end gap-2 px-4 py-3"
      style={{ background: "var(--wa-chrome)" }}
    >
      <button
        type="button"
        title="Đính kèm"
        aria-label="Đính kèm"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
        style={{ color: "#54656f" }}
      >
        <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <div
        className="flex min-w-0 flex-1 items-end gap-2 rounded-[22px] px-4 py-[9px]"
        style={{ background: "var(--wa-panel)" }}
      >
        <textarea
          ref={(el) => {
            oTrong.current = el;
            if (typeof oRef === "function") oRef(el);
            else if (oRef) (oRef as React.RefObject<HTMLTextAreaElement | null>).current = el;
          }}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-[20px] outline-none placeholder:text-[var(--wa-text-soft)]"
          style={{ color: "var(--wa-text)" }}
        />
        <button type="button" title="Biểu tượng cảm xúc" aria-label="Biểu tượng cảm xúc" className="shrink-0" style={{ color: "#54656f" }}>
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />
            <path d="M8.2 14.3c1 1.3 2.3 2 3.8 2s2.8-.7 3.8-2" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" title="Nhãn dán" aria-label="Nhãn dán" className="shrink-0" style={{ color: "#54656f" }}>
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M14.5 3.5H7a3.5 3.5 0 00-3.5 3.5v10A3.5 3.5 0 007 20.5h5l8.5-8.5V7a3.5 3.5 0 00-3.5-3.5z" />
            <path d="M12 20.5V15a3 3 0 013-3h5.5" />
          </svg>
        </button>
      </div>

      <button
        type="submit"
        disabled={!hasText || disabled}
        title={hasText ? "Gửi" : "Ghi âm"}
        aria-label={hasText ? "Gửi" : "Ghi âm"}
        className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-white transition disabled:cursor-default"
        style={{ background: "var(--wa-green)" }}
      >
        {hasText ? (
          <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden>
            <path d="M2 21l21-9L2 3v7l14 2-14 2v7z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" />
          </svg>
        )}
      </button>
    </form>
  );
}
