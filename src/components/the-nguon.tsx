"use client";

/**
 * Thẻ nguồn — bấm chip `[1]` thì bật ra, hiện ĐOẠN VĂN BẢN trợ lý đã đọc.
 *
 * Bám bản `CitationTooltip` của dashboard: số nguồn, tên tệp, trang + độ khớp,
 * đường dẫn thư mục, link mở tệp, rồi trích đoạn. Bỏ phần dashboard có mà app này
 * không cần: render markdown trong trích đoạn (app cố ý mỏng, trích đoạn là văn bản
 * thô lấy từ tài liệu nên hiếm khi có markdown thật).
 *
 * Vì sao đáng có: chip mà chỉ hiện số thì người trực biết "có nguồn" nhưng không
 * kiểm được. Đọc thẳng đoạn văn bản mới trả lời được câu hỏi thật sự cần trả lời —
 * trợ lý vừa nói có đúng theo tài liệu không.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { tenNguon } from "@/lib/trich-dan";
import type { Citation } from "@/lib/types";

function dongPhu(c: Citation): string {
  const p: string[] = [];
  if (c.page != null && c.page !== ("" as unknown)) p.push(`Trang ${c.page}`);
  if (typeof c.score === "number") p.push(`${Math.round(c.score * 100)}% khớp`);
  return p.join(" · ");
}

export function TheNguon({
  nguon,
  soHien,
  viTri,
  onDong,
}: {
  nguon: Citation;
  soHien: number;
  viTri: { x: number; y: number };
  onDong: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [cho, setCho] = useState(viTri);

  // Ghim vào trong màn hình TRƯỚC khi vẽ. Chip nằm sát mép phải là thẻ tràn ra ngoài,
  // người dùng chỉ thấy một nửa và không có cách nào kéo vào.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const le = 12;
    const r = el.getBoundingClientRect();
    const nua = r.width / 2;
    const x = Math.min(Math.max(viTri.x, le + nua), window.innerWidth - le - nua);
    const tren = viTri.y - r.height;
    const y =
      tren >= le
        ? Math.min(tren, window.innerHeight - le - r.height)
        : Math.min(viTri.y + 12, window.innerHeight - le - r.height);
    setCho({ x, y });
  }, [viTri, nguon]);

  useEffect(() => {
    const bam = (e: MouseEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      onDong();
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDong();
    };
    document.addEventListener("mousedown", bam);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", bam);
      document.removeEventListener("keydown", phim);
    };
  }, [onDong]);

  if (typeof document === "undefined") return null;

  const phu = dongPhu(nguon);
  const link = [
    { nhan: "Mở tệp", url: nguon.source_links?.file_url },
    { nhan: "Mở thư mục", url: nguon.source_links?.folder_url },
  ].filter((x): x is { nhan: string; url: string } => !!x.url);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      className="fixed z-50 w-[min(30rem,calc(100vw-24px))] rounded-2xl border bg-white p-4 text-left shadow-2xl"
      style={{
        left: cho.x,
        top: cho.y,
        transform: "translateX(-50%)",
        borderColor: "var(--wa-border-strong)",
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--wa-text-soft)" }}>
        Nguồn {soHien}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold" style={{ color: "var(--wa-text)" }}>
        {tenNguon(nguon)}
      </p>
      {phu && (
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--wa-text-soft)" }}>
          {phu}
        </p>
      )}
      {nguon.source_path && (
        <p className="mt-1.5 break-words text-[11px] leading-4" style={{ color: "var(--wa-text-soft)" }}>
          {nguon.source_path}
        </p>
      )}
      {link.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {link.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-medium underline underline-offset-4"
              style={{ color: "var(--wa-teal)" }}
            >
              {l.nhan}
            </a>
          ))}
        </div>
      )}
      {nguon.text ? (
        <p
          className="mt-3 max-h-44 overflow-y-auto whitespace-pre-wrap text-[12.5px] leading-[18px]"
          style={{ color: "var(--wa-text)" }}
        >
          {nguon.text}
        </p>
      ) : (
        // Nói ra thay vì để trống: thẻ trống trơn thì người ta tưởng bấm hụt.
        <p className="mt-3 text-[12px] italic" style={{ color: "var(--wa-text-soft)" }}>
          Tin này lưu trước khi hệ thống giữ lại trích đoạn.
        </p>
      )}
    </div>,
    document.body,
  );
}
