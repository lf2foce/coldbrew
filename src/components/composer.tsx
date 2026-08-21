"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { EMOJI } from "@/lib/emoji";

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

/** Đọc chính tả bằng Web Speech API.
 *
 * Không gửi tiếng nói đi đâu của mình cả — trình duyệt tự lo (Chrome đẩy lên máy chủ
 * Google, Safari xử lý trên máy). Nói rõ vì đây là hội thoại khách hàng.
 *
 * Trình duyệt nào không có thì trả `hoTro=false` để nút tự ẩn, thay vì bày một nút
 * bấm vào không có gì xảy ra.
 */
type BoDoc = { start: () => void; stop: () => void; abort: () => void } & Record<string, unknown>;

function dungDocChinhTa(onChu: (chu: string) => void) {
  const [dangNghe, setDangNghe] = useState(false);
  const [hoTro, setHoTro] = useState(false);
  const boRef = useRef<BoDoc | null>(null);
  const onChuRef = useRef(onChu);
  onChuRef.current = onChu;

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const Bo = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => BoDoc)
      | undefined;
    if (!Bo) return;
    setHoTro(true);
    const bo = new Bo();
    bo.lang = "vi-VN";
    // `continuous` để nói được nhiều câu; `interim` để chữ hiện dần thay vì đợi im
    // hẳn mới đổ ra một cục — người nói cần thấy máy đang nghe đúng hay sai.
    bo.continuous = true;
    bo.interimResults = false;
    bo.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => {
      let chu = "";
      for (let i = e.resultIndex; i < e.results.length; i++) chu += e.results[i][0].transcript;
      if (chu.trim()) onChuRef.current(chu.trim());
    };
    bo.onend = () => setDangNghe(false);
    bo.onerror = () => setDangNghe(false);
    boRef.current = bo;
    return () => {
      // Dừng hẳn khi rời màn: để chạy tiếp là micro vẫn sáng đèn sau khi đóng tab.
      try {
        bo.abort();
      } catch {
        /* trình duyệt đã dọn rồi thì thôi */
      }
    };
  }, []);

  const bat = useCallback(() => {
    const bo = boRef.current;
    if (!bo) return;
    if (dangNghe) {
      bo.stop();
      setDangNghe(false);
      return;
    }
    try {
      bo.start();
      setDangNghe(true);
    } catch {
      /* gọi start() hai lần liên tiếp thì trình duyệt ném — bỏ qua */
    }
  }, [dangNghe]);

  return { dangNghe, hoTro, bat };
}

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
  const [moEmoji, setMoEmoji] = useState(false);

  /** Chèn vào ĐÚNG vị trí con trỏ, không nối vào đuôi: người ta hay chèn icon giữa
   *  câu. Chèn xong đặt lại con trỏ ngay sau icon để gõ tiếp được luôn. */
  const chen = useCallback(
    (ky: string) => {
      const o = oTrong.current;
      if (!o) {
        onChange(value + ky);
        return;
      }
      const d = o.selectionStart ?? value.length;
      const c = o.selectionEnd ?? d;
      onChange(value.slice(0, d) + ky + value.slice(c));
      requestAnimationFrame(() => {
        o.focus();
        o.setSelectionRange(d + ky.length, d + ky.length);
      });
    },
    [value, onChange],
  );

  const doc = dungDocChinhTa(
    useCallback(
      (chu: string) => {
        // Nối vào cuối, tự thêm dấu cách nếu đang có chữ.
        onChange(value ? `${value.replace(/\s+$/, "")} ${chu}` : chu);
      },
      [value, onChange],
    ),
  );

  // Đo lại chiều cao mỗi lần nội dung đổi. `useLayoutEffect` chứ không `useEffect`:
  // đo sau khi vẽ thì người dùng thấy ô giật một nhịp mỗi lần gõ xuống dòng.
  useEffect(() => {
    if (!moEmoji) return;
    const bam = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.("[data-emoji]")) setMoEmoji(false);
    };
    const phim = (e: KeyboardEvent) => e.key === "Escape" && setMoEmoji(false);
    document.addEventListener("mousedown", bam);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", bam);
      document.removeEventListener("keydown", phim);
    };
  }, [moEmoji]);

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
      className="relative flex shrink-0 items-end gap-2 px-4 py-3"
      style={{ background: "var(--wa-chrome)" }}
    >
      {/* Nút "+" (đính kèm) và nút nhãn dán tạm ẩn: chưa nối gì cả. Nút bấm không
          làm gì tệ hơn không có nút — người trực bấm, không thấy phản ứng, rồi tưởng
          app lỗi. Bỏ khỏi DOM luôn chứ không chỉ ẩn bằng CSS. */}
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
          // 16px trên màn hẹp: iOS TỰ PHÓNG TO cả trang khi chạm vào ô nhập có cỡ chữ dưới
          // 16px, và phóng xong thì không tự thu lại — bố cục vỡ, phải chụm tay kéo về.
          // Sửa bằng cỡ chữ chứ KHÔNG bằng `maximum-scale=1` ở viewport: khoá phóng to
          // là chặn luôn người mắt kém phóng chữ lên đọc.
          className="min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-[20px] outline-none placeholder:text-[var(--wa-text-soft)] md:text-[15px]"
          style={{ color: "var(--wa-text)" }}
        />
        <button
          type="button"
          data-emoji
          onClick={() => setMoEmoji((v) => !v)}
          title="Biểu tượng cảm xúc"
          aria-label="Biểu tượng cảm xúc"
          aria-expanded={moEmoji}
          className="shrink-0 transition hover:opacity-70"
          style={{ color: moEmoji ? "var(--wa-teal)" : "#54656f" }}
        >
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />
            <path d="M8.2 14.3c1 1.3 2.3 2 3.8 2s2.8-.7 3.8-2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {hasText ? (
        <button
          type="submit"
          disabled={disabled}
          title="Gửi"
          aria-label="Gửi"
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-50"
          style={{ background: "var(--wa-green)" }}
        >
          <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden>
            <path d="M2 21l21-9L2 3v7l14 2-14 2v7z" fill="currentColor" />
          </svg>
        </button>
      ) : (
        // Trình duyệt không có Web Speech API thì KHÔNG bày nút: mic bấm vào không
        // nghe được còn tệ hơn không có mic.
        doc.hoTro && (
          <button
            type="button"
            onClick={doc.bat}
            title={doc.dangNghe ? "Đang nghe — bấm để dừng" : "Đọc thành chữ"}
            aria-label={doc.dangNghe ? "Đang nghe — bấm để dừng" : "Đọc thành chữ"}
            aria-pressed={doc.dangNghe}
            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-white transition"
            style={{ background: doc.dangNghe ? "#a33a33" : "var(--wa-green)" }}
          >
            {/* Đang nghe thì đổi thành ô vuông "dừng" và nhấp nháy — nút mic đứng yên
                không cho biết máy có đang thu hay không, mà micro bật lén là chuyện lớn. */}
            {doc.dangNghe ? (
              <span className="wa-dot h-[13px] w-[13px] rounded-[3px] bg-white" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0014 0M12 18v3" />
              </svg>
            )}
          </button>
        )
      )}

      {moEmoji && (
        <div
          data-emoji
          className="absolute bottom-[68px] right-3 z-40 max-h-[280px] w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-2xl border bg-white p-3 shadow-2xl"
          style={{ borderColor: "var(--wa-border-strong)" }}
        >
          {EMOJI.map((nhom) => (
            <div key={nhom.ten} className="mb-2 last:mb-0">
              <p className="mb-1 text-[11px] font-medium" style={{ color: "var(--wa-text-soft)" }}>
                {nhom.ten}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {nhom.ky.map((k) => (
                  <button
                    key={k}
                    type="button"
                    data-emoji
                    onClick={() => chen(k)}
                    className="flex h-[34px] items-center justify-center rounded-lg text-[20px] transition hover:bg-black/5"
                    aria-label={k}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </form>
  );
}
