"use client";

/** Mảnh giao diện dùng lại giữa hộp thư và Công việc. Gom vào một chỗ để hai
 *  màn không trôi khỏi nhau về hình thức. */

export function Avatar({ size = 48 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: "#dfe5e7" }}
      aria-hidden
    >
      <svg viewBox="0 0 212 212" style={{ width: size, height: size }}>
        <path
          fill="#ffffff"
          d="M106 112c22 0 39-18 39-41s-17-41-39-41-39 18-39 41 17 41 39 41zm0 18c-33 0-72 17-72 50v10c0 6 5 11 11 11h122c6 0 11-5 11-11v-10c0-33-39-50-72-50z"
        />
      </svg>
    </span>
  );
}

export function Ticks({ read }: { read: boolean }) {
  return (
    <svg viewBox="0 0 16 11" className="ml-1 inline-block h-[11px] w-4 shrink-0" aria-hidden>
      <path
        d="M1 5.5l3 3 5.5-6M6.5 8.5l3 3 5.5-6"
        fill="none"
        stroke={read ? "var(--wa-tick)" : "var(--wa-text-soft)"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5"
      style={{ color: active ? "var(--wa-teal)" : "#54656f" }}
    >
      {children}
    </button>
  );
}

export function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="currentColor">
      <circle cx="12" cy="5" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="12" cy="19" r="1.9" />
    </svg>
  );
}
