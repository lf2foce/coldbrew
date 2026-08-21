"use client";

/**
 * Thanh điều hướng chính. ĐỔI CHỖ theo bề ngang màn hình:
 *
 *  - Từ `md` trở lên: cột dọc bên trái 58px, đúng WhatsApp macOS Desktop.
 *  - Dưới `md`: hàng ngang dưới đáy, như mọi app điện thoại.
 *
 * Vì sao phải đổi chứ không co lại: trên điện thoại, cột dọc bên trái ăn mất 58px
 * của chiều NGANG — thứ đang thiếu nhất — trong khi ngón cái lại không với tới nổi
 * góc trên. Đáy màn hình vừa rẻ về không gian vừa đúng tầm tay.
 *
 * Ở chế độ dọc thì icon đứng một mình, hiểu được nhờ tooltip khi rê chuột. Điện thoại
 * KHÔNG có rê chuột, nên chế độ ngang phải kèm chữ.
 *
 * Là flex sibling chứ KHÔNG `position: fixed`: thanh cố định sẽ đè lên ô soạn tin ở
 * đáy, và trên iOS còn chồng vào vạch home.
 */

export type RailTab = "chat" | "task" | "quality" | "test" | "settings";

type Muc = { key: RailTab; label: string; nhan: string; icon: React.ReactNode };

const TOP_ITEMS: Muc[] = [
  {
    key: "chat",
    label: "Hộp thư",
    nhan: "Hộp thư",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5z" />
        <path d="M18 9h2a2 2 0 0 1 2 2v8l-3-3h-5a2 2 0 0 1-2-2v-1" />
      </svg>
    ),
  },
  {
    key: "task",
    label: "Yêu cầu khách",
    nhan: "Yêu cầu",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    ),
  },
  {
    key: "quality",
    label: "Quản lý thông tin",
    nhan: "Thông tin",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 22a10 10 0 0 1-10-10" />
      </svg>
    ),
  },
];

const BOTTOM_ITEMS: Muc[] = [
  {
    key: "test",
    label: "Chat thử với trợ lý",
    nhan: "Chat thử",
    // Ngôi sao nói "yêu thích / đã ghim", không nói "chỗ thử nghiệm" — sai nghĩa hẳn.
    // Bình thí nghiệm thì ai nhìn cũng hiểu là chỗ làm thử, không đụng khách thật.
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6" />
        <path d="M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3" />
        <path d="M7.2 14h9.6" />
      </svg>
    ),
  },
];

const SETTINGS: Muc = {
  key: "settings",
  label: "Cài đặt",
    nhan: "Cài đặt",
  icon: (
    <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export function Rail({
  tab,
  onPick,
  badges,
  anTrenMobile,
}: {
  tab: RailTab;
  onPick: (t: RailTab) => void;
  badges?: Partial<Record<RailTab, number>>;
  /** Ẩn thanh ở màn hẹp (vẫn giữ cột dọc từ md). Dùng khi đang mở một hội thoại:
   *  bàn phím đã ăn nửa màn hình, thêm ô soạn nữa thì thanh điều hướng chiếm nốt chỗ
   *  đọc tin. WhatsApp/Zalo cũng ẩn — và đã có mũi tên quay lại ở đầu hội thoại. */
  anTrenMobile?: boolean;
}) {
  const nut = (it: Muc, n = 0) => {
    const on = tab === it.key;
    return (
      <button
        key={it.key}
        onClick={() => onPick(it.key)}
        title={it.label}
        aria-label={it.label}
        aria-current={on ? "page" : undefined}
        className={
          // Ngang: mỗi nút chia đều bề rộng, icon trên chữ dưới, vùng chạm cao 52px
          // (dưới ~44px là ngón tay bấm trượt sang nút bên cạnh).
          "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[2px] rounded-[10px] transition hover:bg-[var(--wa-rail-hover)] " +
          // Dọc: về đúng ô vuông 40px của bản desktop.
          "md:h-[40px] md:min-h-0 md:w-[40px] md:flex-none md:gap-0"
        }
        style={{
          background: on ? "var(--wa-rail-active)" : "transparent",
          color: on ? "var(--wa-text)" : "#54656f",
        }}
      >
        <span className="relative flex items-center justify-center">
          {it.icon}
          {n > 0 && (
            <span
              className="absolute -right-2 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs"
              style={{ background: "var(--wa-unread)" }}
            >
              {n}
            </span>
          )}
        </span>
        {/* Chữ chỉ ở chế độ ngang: điện thoại không rê chuột được nên không có tooltip. */}
        <span className="text-[10.5px] leading-none md:hidden">{it.nhan}</span>
      </button>
    );
  };

  return (
    <nav
      className={
        "wa-rail flex select-none " +
        (anTrenMobile ? "max-md:hidden " : "") +
        // Ngang (mặc định = mobile-first): full bề ngang, nằm đáy, viền TRÊN.
        "w-full shrink-0 flex-row items-stretch gap-1 border-t px-1 pt-1 " +
        // Chừa vạch home của iPhone. Máy không có thì env() = 0.
        "pb-[max(4px,env(safe-area-inset-bottom))] " +
        // Dọc từ md: cột 58px bên trái, viền PHẢI.
        "md:w-[58px] md:flex-col md:items-center md:border-r md:border-t-0 md:px-0 md:py-3 md:pb-3"
      }
      style={{ background: "var(--wa-rail)", borderColor: "var(--wa-border)" }}
    >
      {TOP_ITEMS.map((it) => nut(it, badges?.[it.key] ?? 0))}

      {/* Vạch ngăn hai cụm: nằm ngang thì thành vạch ĐỨNG. */}
      <div className="my-1 w-[1px] self-stretch bg-[#dedede] md:my-1.5 md:h-[1px] md:w-7 md:self-auto" />

      {BOTTOM_ITEMS.map((it) => nut(it))}

      {/* Cài đặt tách xuống đáy — chỉ ở chế độ dọc. Nằm ngang mà đẩy nó ra xa thì
          khoảng trống giữa các nút không đều, trông như thiếu mất một mục. */}
      <div className="contents md:mt-auto md:block">{nut(SETTINGS)}</div>
    </nav>
  );
}
