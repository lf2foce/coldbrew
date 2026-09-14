/**
 * Tiêu đề tab trình duyệt khi có tin chưa đọc — tách khỏi hook để test không cần DOM.
 *
 * Hai pha nhấp nháy đều vẫn mang số đếm: pha "(3) Coldbrew" đánh vào TẦM NHÌN góc tab,
 * pha "Coldbrew · 3 chưa đọc" giữ thông tin khi tab bị thu hẹp còn đúng chữ thương hiệu.
 */

export const NHAC_TAN_SU_MS = 1100;

export function tieuDeNhac(coSo: string, so: number, sang: boolean): string {
  const ten = coSo.trim() || "Hộp thư";
  if (so <= 0) return ten;
  return sang ? `(${so}) ${ten}` : `${ten} · ${so} chưa đọc`;
}
