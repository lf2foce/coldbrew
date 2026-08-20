"use client";

/**
 * Thanh rail dọc bên trái — WhatsApp macOS Desktop chuẩn.
 */

export type RailTab = "chat" | "task" | "quality" | "test" | "settings";

const TOP_ITEMS: { key: RailTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "chat",
    label: "Hộp thư",
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
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    ),
  },
  {
    key: "quality",
    label: "Trợ lý còn yếu ở đâu",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 22a10 10 0 0 1-10-10" />
      </svg>
    ),
  },
];

const BOTTOM_ITEMS: { key: RailTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "test",
    label: "Chat thử với trợ lý",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

const SETTINGS: { key: RailTab; label: string; icon: React.ReactNode } = {
  key: "settings",
  label: "Cài đặt",
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
}: {
  tab: RailTab;
  onPick: (t: RailTab) => void;
  badges?: Partial<Record<RailTab, number>>;
}) {
  return (
    <nav
      className="wa-rail flex w-[58px] shrink-0 flex-col items-center gap-1 border-r py-3 select-none"
      style={{
        background: "var(--wa-rail)",
        borderColor: "var(--wa-border)",
      }}
    >
      {TOP_ITEMS.map((it) => {
        const on = tab === it.key;
        const n = badges?.[it.key] ?? 0;
        return (
          <button
            key={it.key}
            onClick={() => onPick(it.key)}
            title={it.label}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className="relative flex h-[40px] w-[40px] items-center justify-center rounded-[10px] transition hover:bg-[var(--wa-rail-hover)]"
            style={{
              background: on ? "var(--wa-rail-active)" : "transparent",
              color: on ? "var(--wa-text)" : "#54656f",
            }}
          >
            {it.icon}
            {n > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs"
                style={{ background: "var(--wa-unread)" }}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}

      {/* Đường phân cách mảnh giữa hai cụm icon chuẩn WhatsApp */}
      <div className="my-1.5 h-[1px] w-7 bg-[#dedede]" />

      {BOTTOM_ITEMS.map((it) => {
        const on = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onPick(it.key)}
            title={it.label}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className="relative flex h-[40px] w-[40px] items-center justify-center rounded-[10px] transition hover:bg-[var(--wa-rail-hover)]"
            style={{
              background: on ? "var(--wa-rail-active)" : "transparent",
              color: on ? "var(--wa-text)" : "#54656f",
            }}
          >
            {it.icon}
          </button>
        );
      })}

      {/* Cài đặt tách xuống đáy */}
      <div className="mt-auto">
        <button
          onClick={() => onPick(SETTINGS.key)}
          title={SETTINGS.label}
          aria-label={SETTINGS.label}
          aria-current={tab === SETTINGS.key ? "page" : undefined}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] transition hover:bg-[var(--wa-rail-hover)]"
          style={{
            background: tab === SETTINGS.key ? "var(--wa-rail-active)" : "transparent",
            color: tab === SETTINGS.key ? "var(--wa-text)" : "#54656f",
          }}
        >
          {SETTINGS.icon}
        </button>
      </div>
    </nav>
  );
}
