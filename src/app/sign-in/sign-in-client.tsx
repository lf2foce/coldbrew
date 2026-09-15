"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

export function SignInClient({ authEnabled, legacyEnabled }: { authEnabled: boolean; legacyEnabled: boolean }) {
  const [password, setPassword] = useState("");
  const [loi, setLoi] = useState("");
  const [dangGui, setDangGui] = useState(false);

  async function guiDi(e: React.FormEvent) {
    e.preventDefault();
    setLoi("");
    setDangGui(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/inbox";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setLoi(data.error || "Không đăng nhập được");
    } catch {
      setLoi("Không kết nối được máy chủ");
    } finally {
      setDangGui(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-xl font-semibold" style={{ color: BRAND.accent }}>{BRAND.name}</h1>
      {authEnabled && (
        <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm" style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel)" }}>
          <a href="/api/login/start" className="block w-full rounded-lg py-2.5 text-center text-[15px] font-medium text-white" style={{ background: BRAND.accent }}>
            Đăng nhập tài khoản
          </a>
          <p className="mt-3 text-center text-[12px] text-slate-500">Mỗi nhân viên chỉ thấy đúng công ty và website được cấp quyền.</p>
        </div>
      )}
      {legacyEnabled && (
        <form onSubmit={guiDi} className="w-full max-w-sm rounded-2xl border p-6 shadow-sm" style={{ borderColor: "var(--wa-border)", background: "var(--wa-panel)" }}>
          <label className="mb-2 block text-[14px] font-medium" style={{ color: "var(--wa-text)" }}>Mật khẩu truy cập</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={!authEnabled} autoComplete="current-password" className="w-full rounded-lg border px-3 py-2 text-[15px] outline-none" style={{ borderColor: "var(--wa-border-strong)", color: "var(--wa-text)" }} />
          {loi && <p className="mt-2 text-[13px]" style={{ color: "#c0392b" }}>{loi}</p>}
          <button type="submit" disabled={dangGui || !password} className="mt-4 w-full rounded-lg py-2 text-[15px] font-medium text-white disabled:opacity-50" style={{ background: BRAND.accent }}>
            {dangGui ? "Đang vào…" : "Vào hộp thư"}
          </button>
        </form>
      )}
    </main>
  );
}
