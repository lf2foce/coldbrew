/**
 * Trích dẫn nguồn — phần LOGIC, tách khỏi component để test được.
 *
 * BÁM THEO bản đã có ở dashboard (`frontend/src/components/chat/message-bubble.tsx`).
 * Cùng một trợ lý, cùng một câu trả lời: nhân viên xem ở app này mà thấy khác ở
 * dashboard thì họ mất tin vào cả hai. Ba điều lấy nguyên từ bên đó:
 *
 *   1. Marker nhận dạng cả nhóm — `[1]` lẫn `[1, 2]`.
 *   2. Marker không khớp nguồn nào thì GIỮ NGUYÊN dạng chữ (mã đơn, mục lục, khách
 *      gõ tay), không đeo chip.
 *   3. Danh sách nguồn hiện bất cứ khi nào có citations, gom theo TỆP — không phụ
 *      thuộc câu trả lời có marker hay không.
 *
 * Điều 3 quan trọng nhất với app này: kênh Facebook/Zalo mặc định tắt inline
 * citation, backend `strip_inline_citation_markers` xoá hết `[n]` khỏi nội dung
 * trước khi lưu, nhưng `filter_citations_used_in_response` không thấy marker nên
 * trả lại TOÀN BỘ nguồn vào `metadata.citations`. Khách nhận câu trả lời sạch, còn
 * người trực vẫn phải kiểm được trợ lý dựa vào tài liệu nào.
 */

import type { Citation } from "./types";

/** `[1]` hoặc `[1, 2]`. Giống hệt `CITATION_GROUP_RE` của dashboard.
 *
 * Không giới hạn số chữ số: cái chặn "[12] là mã lô, không phải nguồn" là điều kiện
 * KHỚP `source_id` bên dưới, không phải độ dài. Chặn bằng độ dài thì kho tài liệu
 * lớn có nguồn thứ 100 trở đi là mất chip. */
export const RE_TRICH_DAN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

function tachSo(nhom: string): number[] {
  return nhom
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n));
}

/** Thứ tự nguồn được NHẮC TỚI trong câu, theo lần xuất hiện đầu tiên.
 *
 * Dùng để đánh số lại 1..N khi hiển thị — giống dashboard. Kho tri thức trả về 8 đoạn
 * nhưng câu trả lời chỉ trích đoạn 3 và 7 thì chip phải đọc là ① ②, không phải ③ ⑦:
 * người đọc thấy "③" liền hỏi ① ② đâu, mà không có ① ② nào cả. */
export function thuTuThamChieu(content: string, citations?: Citation[] | null): number[] {
  const co = new Map((citations ?? []).map((c) => [Number(c.source_id), c]));
  const ra: number[] = [];
  if (!co.size) return ra;
  for (const m of content.matchAll(new RegExp(RE_TRICH_DAN.source, "g"))) {
    const so = tachSo(m[1]);
    if (!so.length || so.some((n) => !co.has(n))) continue;
    for (const n of so) if (!ra.includes(n)) ra.push(n);
  }
  return ra;
}

/** Một lát của câu trả lời: chữ thường, hoặc một CỤM chip đã khớp nguồn. */
export type LatTrichDan =
  | { chu: string }
  | { nhom: { so: number; soHien: number; nguon: Citation }[] };

/** Cắt chuỗi thành các lát để render.
 *
 * Ở đây chứ không trong component vì đây là chỗ dễ sai nhất mà sai lại KHÔNG lộ ra
 * như lỗi kỹ thuật: bỏ qua một marker mà quên dời con trỏ thì đoạn chữ đứng trước nó
 * bị đẩy ra lần nữa ở lát sau — người đọc thấy tin nhắn lặp chữ, không ai nghĩ tới
 * chuyện cắt chuỗi.
 *
 * Cả cụm phải khớp thì mới thành chip: `[1,9]` mà chỉ có nguồn 1 thì giữ nguyên chữ,
 * không đeo chip cho nửa cụm rồi bỏ rơi nửa kia. */
export function catLatTrichDan(content: string, citations?: Citation[] | null): LatTrichDan[] {
  const co = new Map((citations ?? []).map((c) => [Number(c.source_id), c]));
  const danhLai = new Map(thuTuThamChieu(content, citations).map((n, i) => [n, i + 1]));
  const ra: LatTrichDan[] = [];
  let cuoi = 0;
  if (co.size) {
    for (const m of content.matchAll(new RegExp(RE_TRICH_DAN.source, "g"))) {
      const so = tachSo(m[1]);
      const nguon = so.map((n) => co.get(n));
      // Kiểm TRƯỚC khi đẩy đoạn chữ đứng trước: đẩy trước rồi mới bỏ qua thì `cuoi`
      // đứng yên và đoạn vừa đẩy sẽ được đẩy lại ở vòng sau.
      if (!so.length || nguon.some((c) => !c)) continue;
      const i = m.index ?? 0;
      if (i > cuoi) ra.push({ chu: content.slice(cuoi, i) });
      ra.push({
        nhom: so.map((n, k) => ({ so: n, soHien: danhLai.get(n) ?? n, nguon: nguon[k] as Citation })),
      });
      cuoi = i + m[0].length;
    }
  }
  if (cuoi < content.length) ra.push({ chu: content.slice(cuoi) });
  return ra;
}

/** Nguồn đưa xuống danh sách dưới bong bóng.
 *
 * KHÁC dashboard một cách CỐ Ý, và đây là lý do:
 *
 * Dashboard chỉ hiện nguồn được marker nhắc tới (`visibleSourceCitations`), nên khi
 * câu không còn marker nào thì nó không hiện gì. Ở dashboard điều đó không sao — chat
 * ở đó chạy nền tảng `web`, luôn có marker.
 *
 * App này thì ngược lại: hộp thư toàn Facebook/Zalo, mà hai kênh đó backend XOÁ sạch
 * marker trước khi lưu (`strip_inline_citation_markers`) rồi vẫn giữ nguyên citations
 * trong metadata. Áp nguyên luật dashboard vào đây là mọi tin của trợ lý đều không
 * hiện nguồn — đúng cái tab mà người trực cần kiểm bot nhất.
 *
 * Nên: có marker thì theo dashboard (chỉ nguồn được nhắc, đúng thứ tự); không marker
 * nào thì đưa hết ra, vì lúc đó không còn thông tin nào để chọn lọc. */
export function nguonHienThi(content: string, citations?: Citation[] | null): Citation[] {
  const cs = citations ?? [];
  if (!cs.length) return [];
  const thuTu = thuTuThamChieu(content, cs);
  if (!thuTu.length) return cs;
  const co = new Map(cs.map((c) => [Number(c.source_id), c]));
  return thuTu.map((n) => co.get(n)).filter((c): c is Citation => !!c);
}

function chuoiDauTienCoNoiDung(...xs: unknown[]): string {
  for (const x of xs) {
    const v = typeof x === "string" ? x.trim() : "";
    if (v) return v;
  }
  return "";
}

/** DANH TÍNH của tệp mà một đoạn trích thuộc về — bám đúng `getStoredCitationFileKey`
 *  của dashboard, kể cả thứ tự ưu tiên.
 *
 *  Vì sao không dùng tên tệp: tên KHÔNG phải danh tính. Hai tài liệu khác nhau có thể
 *  trùng tên ("bang-gia.pdf" ở hai thư mục), và tên bỏ đuôi còn gộp cả .pdf lẫn .docx
 *  làm một — gộp nhầm thì hàng nguồn chỉ hiện một dòng, lấy link của tệp đầu, và tệp
 *  kia biến mất khỏi màn hình mà không ai biết. Tên chỉ dùng để HIỂN THỊ. */
export function khoaTepNguon(c: Citation): string {
  const meta = (c.metadata ?? {}) as Record<string, unknown>;
  return (
    chuoiDauTienCoNoiDung(
      meta.file_id,
      meta.drive_file_id,
      meta.source_file_id,
      c.source_path,
      c.source_links?.file_url,
      c.filename,
    ) || "khong-ro-tep"
  );
}

/** Gom nguồn theo TỆP cho danh sách dưới bong bóng.
 *
 * Một câu trả lời thường trích 3–4 đoạn của cùng một tài liệu. Không gom thì hàng
 * nguồn hiện "bang-gia, bang-gia, bang-gia" — trông như lỗi. */
export function gomNguonTheoTep(citations?: Citation[] | null): { khoa: string; nhan: string; nguon: Citation[] }[] {
  const nhom = new Map<string, { khoa: string; nhan: string; nguon: Citation[] }>();
  for (const c of citations ?? []) {
    const khoa = khoaTepNguon(c);
    const co = nhom.get(khoa);
    if (co) co.nguon.push(c);
    else nhom.set(khoa, { khoa, nhan: tenNguon(c).replace(/\.[^.]+$/, "") || tenNguon(c), nguon: [c] });
  }
  const ra = [...nhom.values()];
  // Hai TỆP KHÁC NHAU mà bỏ đuôi xong trùng nhãn (bang-gia.pdf và bang-gia.docx) thì
  // giữ nguyên tên đầy đủ cho cả hai — nếu không, màn hình hiện hai dòng y hệt và
  // người đọc không biết dòng nào là dòng nào. Dashboard chưa xử ca này.
  const dem = new Map<string, number>();
  for (const x of ra) dem.set(x.nhan, (dem.get(x.nhan) ?? 0) + 1);
  for (const x of ra) if ((dem.get(x.nhan) ?? 0) > 1) x.nhan = tenNguon(x.nguon[0]);
  return ra;
}

/** Tên hiển thị của một nguồn. Không có tên tệp thì lùi về số thứ tự — thà "Nguồn 2"
 *  còn hơn một chip trống không nói lên gì. */
export function tenNguon(c: Citation): string {
  return c.filename?.trim() || `Nguồn ${c.source_id}`;
}

export function moTaNguon(c: Citation | undefined, so: number): string {
  if (!c) return `Nguồn ${so} — chưa có thông tin tài liệu`;
  const p = [tenNguon(c)];
  if (c.page != null) p.push(`trang ${c.page}`);
  if (c.source_path) p.push(c.source_path);
  return p.join(" · ");
}

export function lienKetNguon(c: Citation | undefined): string | null {
  return c?.source_links?.file_url || c?.source_links?.folder_url || null;
}
