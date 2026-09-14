"use client";

/**
 * Nhắc người trực trên TAB TRÌNH DUYỆT khi có tin chưa đọc:
 *  · tiêu đề nhấp nháy đếm số — "(3) Coldbrew" ↔ "Coldbrew · 3 chưa đọc";
 *  · một tiếng "kêu" ngắn khi ĐÚNG LÚC tab đang ẨN mà số chưa đọc TĂNG.
 *
 * Âm thanh chỉ chạy khi tab ẩn: đang nhìn thẳng màn hình mà vẫn kêu là phiền. Không
 * dùng Notification API: xin quyền giữa giờ làm việc một lần bị từ chối là mất hẳn
 * kênh báo, còn tiêu đề + âm thì không cần xin phép ai.
 */

import { useEffect, useRef } from "react";
import { batNhapNhay } from "./nhap-nhay-tieu-de";

function tiengKeu(): void {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.45);
    window.setTimeout(() => void ctx.close().catch(() => undefined), 700);
  } catch {
    /* trình duyệt chặn âm thì thôi — tiêu đề vẫn nhấp nháy */
  }
}

export function useTabAlert(soChuaDoc: number, bat = true): void {
  // Số lần trước để biết khi nào là TĂNG (tin mới), không phải merely khác.
  const truocRef = useRef<number | null>(null);
  // Tiêu đề gốc do metadata đặt — đọc MỘT lần trong effect (SSR không có document).
  const coSoRef = useRef("");

  // Nhấp nháy do `batNhapNhay` lo — nó nghe `visibilitychange` nên rời/quay lại tab
  // ăn ngay, không phải chờ `soChuaDoc` đổi mới chạy lại effect (đó là lỗi bản đầu:
  // rời máy khi còn tin chưa đọc thì tiêu đề IM, vì hidden đổi mà deps thì không).
  useEffect(() => {
    if (!bat) return;
    if (!coSoRef.current) coSoRef.current = document.title;
    return batNhapNhay(document, coSoRef.current, soChuaDoc, window);
  }, [bat, soChuaDoc]);

  // Tiếng kêu: chỉ khi tab ẨN và số chưa đọc TĂNG (bỏ qua lần đầu mount).
  useEffect(() => {
    if (!bat) return;
    const truoc = truocRef.current;
    truocRef.current = soChuaDoc;
    if (truoc !== null && soChuaDoc > truoc && document.hidden) tiengKeu();
  }, [bat, soChuaDoc]);
}
