"use client";

import { useState } from "react";

import { TheNguon } from "./the-nguon";

import {
  catLatTrichDan,
  gomNguonTheoTep,
  moTaNguon,
  nguonHienThi,
} from "@/lib/trich-dan";
import type { Citation } from "@/lib/types";

/**
 * Nội dung một tin nhắn: tách ảnh markdown ra khỏi chữ.
 *
 * Backend nhét ảnh vào `content` dưới dạng markdown, kèm hai dòng đánh dấu:
 *
 *     [Image]
 *     ![](https://img.thietkeai.com/ephemeral-chat/…/1787222399886-0.jpg)
 *
 *     [Attached files: [image]]
 *
 * Bản trước in nguyên khối đó ra màn hình, nên người trực thấy một đoạn URL dài
 * thay vì thấy cái ảnh khách gửi — mà ảnh thường CHÍNH LÀ nội dung (đơn thuốc,
 * kết quả xét nghiệm, ảnh chụp giấy tờ).
 *
 * KHÔNG kéo react-markdown về chỉ để làm việc này: app cố ý mỏng, và ta chỉ cần
 * đúng một cú pháp. Regex ở đây hẹp — `![alt](url)` — không cố hiểu markdown khác.
 *
 * Cùng chỗ này lo luôn dấu trích dẫn `[1][2]` → chip tròn. Đặt chung một component
 * vì cả hai đều là "dịch nội dung thô của backend sang thứ người đọc được"; tách ra
 * hai bản render thì sớm muộn một bản có ảnh mà không có chip, hoặc ngược lại.
 */

const ANH = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
// Hai dòng đánh dấu của backend: có ích cho log, vô nghĩa với người đang trực.
const NHIEU = /^\s*(\[Image\]|\[Attached files:[^\]]*\]?\]?)\s*$/gim;

function AnhTin({ src, alt }: { src: string; alt: string }) {
  const [hong, setHong] = useState(false);
  // Ảnh hội thoại nằm dưới prefix ephemeral-chat/ và bị R2 xoá sau N ngày, nhưng
  // URL thì nằm vĩnh viễn trong nội dung tin → về sau chắc chắn 404. Hiện nhãn
  // thay vì để một ô ảnh vỡ (doc 75).
  if (hong) {
    return (
      <span
        className="my-1 inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-[12px]"
        style={{ borderColor: "var(--wa-border-strong)", color: "var(--wa-text-soft)" }}
      >
        Ảnh đã hết hạn
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "Ảnh khách gửi"}
      onError={() => setHong(true)}
      loading="lazy"
      className="my-1 max-h-[320px] w-auto max-w-full rounded-lg"
    />
  );
}

/** Chèn chip cho `[n]` trong MỘT đoạn chữ.
 *
 * Số KHÔNG khớp nguồn nào thì giữ nguyên dạng chữ, không đeo chip: `[12]` trong câu
 * thường là mã lô, mục lục, hoặc khách gõ tay. Giữ nguyên nên chưa bao giờ mất chữ —
 * kể cả lúc nguồn chưa về (nó tới sau qua SSE `citations_updated`), người đọc vẫn
 * thấy đúng những gì trợ lý viết. */
function chenChip(
  chu: string,
  citations: Citation[] | null | undefined,
  khoa: string,
  moThe: (nguon: Citation, soHien: number, e: React.MouseEvent) => void,
): React.ReactNode[] {
  return catLatTrichDan(chu, citations).map((lat, k) => {
    if ("chu" in lat) return lat.chu;
    return (
      <span key={`${khoa}-c${k}`} className="mx-[1px] inline-flex items-center gap-[2px] align-[1px]">
        {lat.nhom.map(({ so, soHien, nguon }) => (
          <button
            key={so}
            type="button"
            // Nút chứ không phải link: bấm để ĐỌC trích đoạn ngay tại chỗ. Link mở
            // thẳng Drive thì người trực phải rời màn hình mới kiểm được một câu.
            // Link vẫn còn, nằm trong thẻ.
            onClick={(e) => moThe(nguon, soHien, e)}
            title={moTaNguon(nguon, so)}
            className="inline-flex h-[16px] min-w-[16px] cursor-pointer items-center justify-center rounded-full px-[4px] text-[10.5px] font-semibold transition hover:brightness-110"
            style={{ background: "var(--wa-teal)", color: "#fff" }}
          >
            {soHien}
          </button>
        ))}
      </span>
    );
  });
}

export function MessageContent({
  content,
  citations,
}: {
  content: string;
  citations?: Citation[] | null;
}) {
  const [dangXem, setDangXem] = useState<{ nguon: Citation; soHien: number; x: number; y: number } | null>(null);
  const moThe = (nguon: Citation, soHien: number, e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDangXem({ nguon, soHien, x: r.left + r.width / 2, y: r.top - 8 });
  };

  const phan: React.ReactNode[] = [];
  let cuoi = 0;
  let m: RegExpExecArray | null;
  ANH.lastIndex = 0;

  const day = (raw: string, key: string) => {
    const chu = raw.replace(NHIEU, "").trim();
    if (chu) {
      phan.push(
        <span key={key} className="whitespace-pre-wrap">
          {chenChip(chu, citations, key, moThe)}
        </span>,
      );
    }
  };

  while ((m = ANH.exec(content)) !== null) {
    day(content.slice(cuoi, m.index), `t${m.index}`);
    phan.push(<AnhTin key={`i${m.index}`} src={m[2]} alt={m[1]} />);
    cuoi = m.index + m[0].length;
  }
  day(content.slice(cuoi), "t-cuoi");

  // Danh sách nguồn: `nguonHienThi` lo phần chọn — có marker thì chỉ nguồn được nhắc
  // (đúng luật dashboard), không marker nào thì đưa hết (Facebook/Zalo đã bị backend
  // xoá marker, đó là đường duy nhất để người trực biết trợ lý dựa vào đâu).
  const tep = gomNguonTheoTep(nguonHienThi(content, citations));
  if (tep.length) {
    phan.push(
      <span key="nguon" className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="text-[11.5px]" style={{ color: "var(--wa-text-soft)" }}>
          Nguồn:
        </span>
        {tep.map(({ khoa, nhan, nguon }, thu) => {
          const the = (
            <span
              className="inline-block max-w-[190px] truncate rounded-full px-2 py-[2px] text-[11.5px]"
              style={{ background: "var(--wa-panel-head)", color: "var(--wa-text-soft)" }}
            >
              {nhan}
              {nguon.length > 1 ? ` · ${nguon.length} đoạn` : ""}
            </span>
          );
          return (
            <button
              key={khoa}
              type="button"
              // Số trên thẻ = thứ tự trong CHÍNH hàng này. Ghi cứng 1 thì tệp nào
              // bấm vào cũng ra "Nguồn 1", người đọc tưởng bấm nhầm.
              onClick={(e) => moThe(nguon[0], thu + 1, e)}
              title={moTaNguon(nguon[0], nguon[0].source_id)}
              className="cursor-pointer transition hover:brightness-95"
            >
              {the}
            </button>
          );
        })}
      </span>,
    );
  }

  return (
    <>
      {phan}
      {dangXem && (
        <TheNguon
          nguon={dangXem.nguon}
          soHien={dangXem.soHien}
          viTri={{ x: dangXem.x, y: dangXem.y }}
          onDong={() => setDangXem(null)}
        />
      )}
    </>
  );
}
