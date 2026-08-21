"use client";

import { useState } from "react";

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

export function MessageContent({ content }: { content: string }) {
  const phan: React.ReactNode[] = [];
  let cuoi = 0;
  let m: RegExpExecArray | null;
  ANH.lastIndex = 0;

  const day = (raw: string, key: string) => {
    const chu = raw.replace(NHIEU, "").trim();
    if (chu) {
      phan.push(
        <span key={key} className="whitespace-pre-wrap">
          {chu}
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

  // Tin chỉ có mỗi ảnh thì `phan` chỉ chứa ảnh — đúng, không cần chữ đệm.
  return <>{phan}</>;
}
