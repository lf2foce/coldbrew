"use client";

/**
 * Thanh rail dọc bên trái — WhatsApp bản mới dùng nó thay cho tab dưới đáy.
 *
 * Ba mục cho app này:
 *   Chat  — hộp thư khách
 *   Task  — yêu cầu chăm sóc khách (ticket), giống màn "Công việc" của mobile
 *   Test  — chat thử với trợ lý, không đụng khách thật
 *
 * Mục đang mở có nền bo tròn, đúng cách WhatsApp đánh dấu (không phải gạch chân
 * hay đổi màu icon).
 */

export type RailTab = "chat" | "task" | "quality" | "test" | "settings";

const ITEMS: { key: RailTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "chat",
    label: "Hộp thư",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.9-.9L3 20.5l1.6-4.7A8.4 8.4 0 013 11.5a8.4 8.4 0 019-8.4 8.4 8.4 0 019 8.4z" />
      </svg>
    ),
  },
  {
    key: "task",
    label: "Yêu cầu khách",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" />
        <rect x="4" y="6" width="16" height="15" rx="2" />
        <path d="M8.5 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "quality",
    label: "Trợ lý còn yếu ở đâu",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    key: "test",
    label: "Chat thử với trợ lý",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.3 4.6.5-3.4 3.1.9 4.6L12 13.3 8 15.5l.9-4.6L5.5 7.8l4.6-.5L12 3z" />
      </svg>
    ),
  },
];

const SETTINGS: { key: RailTab; label: string; icon: React.ReactNode } = {
  key: "settings",
  label: "Cài đặt",
  icon: (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
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
      className="wa-rail flex w-[68px] shrink-0 flex-col items-center gap-1 border-r py-3"
      style={{ borderColor: "var(--wa-border)" }}
    >
      {ITEMS.map((it) => {
        const on = tab === it.key;
        const n = badges?.[it.key] ?? 0;
        return (
          <button
            key={it.key}
            onClick={() => onPick(it.key)}
            title={it.label}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className="relative flex h-[46px] w-[46px] items-center justify-center rounded-xl transition"
            style={{
              background: on ? "var(--wa-rail-active)" : "transparent",
              color: on ? "var(--wa-text)" : "#54656f",
            }}
          >
            {it.icon}
            {n > 0 && (
              <span
                className="absolute right-[6px] top-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold text-white"
                style={{ background: "var(--wa-unread)" }}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}

      {/* Cài đặt tách xuống đáy — đúng nếp WhatsApp, và nó là mục ÍT bấm nhất
          nên không nên chiếm chỗ trong luồng làm việc hằng ngày. */}
      <div className="mt-auto">
        <button
          onClick={() => onPick(SETTINGS.key)}
          title={SETTINGS.label}
          aria-label={SETTINGS.label}
          aria-current={tab === SETTINGS.key ? "page" : undefined}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-xl transition"
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
