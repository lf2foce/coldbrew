"use client";

/** Mảnh giao diện dùng lại giữa hộp thư và Công việc. Gom vào một chỗ để hai
 *  màn không trôi khỏi nhau về hình thức. */

const AVATAR_PALETTES = [
  { bg: "#ede7ff", fg: "#673ab7" }, // Purple / Lavender (như clc Huy trong WhatsApp)
  { bg: "#ffe7ee", fg: "#d63384" }, // Pink / Rose (như Adam eva trong WhatsApp)
  { bg: "#e0f7fa", fg: "#00838f" }, // Cyan / Teal (như GoDaddy trong WhatsApp)
  { bg: "#dcf8c6", fg: "#075e54" }, // WhatsApp green
  { bg: "#fff3e0", fg: "#e65100" }, // Amber / Warm Orange
  { bg: "#e3f2fd", fg: "#1976d2" }, // Sky Blue
  { bg: "#d1fae5", fg: "#059669" }, // Mint Green
  { bg: "#eedfd4", fg: "#8d5b36" }, // Tan / Brown (như danh bạ SĐT)
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function Avatar({
  size = 48,
  name,
  id,
  variant,
}: {
  size?: number;
  name?: string;
  id?: string;
  variant?: "user" | "bot" | "test" | "group";
}) {
  const seed = (id || name || "coldbrew") + (variant || "");
  const palette = AVATAR_PALETTES[hashString(seed) % AVATAR_PALETTES.length];

  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: palette.bg,
        color: palette.fg,
      }}
      aria-hidden
    >
      {variant === "test" || variant === "bot" ? (
        <svg
          viewBox="0 0 24 24"
          style={{ width: size * 0.52, height: size * 0.52 }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.9 4.3 4.6.5-3.4 3.1.9 4.6L12 13.3 8 15.5l.9-4.6L5.5 7.8l4.6-.5L12 3z" />
        </svg>
      ) : variant === "group" ? (
        <svg
          viewBox="0 0 24 24"
          style={{ width: size * 0.55, height: size * 0.55 }}
          fill="currentColor"
        >
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 3s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          style={{ width: size * 0.58, height: size * 0.58 }}
          fill="currentColor"
        >
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      )}
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
