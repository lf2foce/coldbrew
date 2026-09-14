/**
 * Bộ điều khiển nhấp nháy tiêu đề tab — tách khỏi hook để test được KHÔNG cần DOM.
 *
 * Vì sao tách: hai lỗi dưới đây đều nằm ở phần ĐIỀU KHIỂN (bật/tắt theo trạng thái
 * tab), không nằm ở phần sinh chuỗi. `tieuDeNhac` đã tách sẵn và có test, nên lỗi
 * lọt qua vẫn đủ chỗ trốn: phần chưa tách thì chưa ai canh.
 *
 * LỖI 1 — không nhấp nháy ở đúng ca chính. Bản đầu để logic trong `useEffect` với
 * deps `[bat, soChuaDoc]` và early-return khi `!document.hidden`. Người trực đang mở
 * tab, có 3 tin chưa đọc, rồi chuyển sang tab khác: `document.hidden` đổi nhưng
 * `soChuaDoc` KHÔNG đổi ⇒ React không chạy lại effect ⇒ không có gì nhấp nháy. Mà
 * đó CHÍNH LÀ ca cần báo — rời máy mà vẫn còn tin chưa đọc. Ca duy nhất chạy đúng là
 * tin mới tới trong lúc tab đã ẩn sẵn.
 *
 * LỖI 2 — nhấp nháy ngay trước mắt người đang nhìn. Bản đầu chỉ đặt lại tiêu đề MỘT
 * lần khi quay lại tab, không dừng `setInterval`; 1,1 giây sau interval lại ghi đè.
 * Quay lại tab mà chưa mở hội thoại (số chưa đọc chưa đổi) thì tiêu đề cứ nháy mãi.
 *
 * Cả hai đều do coi `document.hidden` như giá trị ĐỌC MỘT LẦN, trong khi nó là một
 * dòng sự kiện. Nay chỉ có `visibilitychange` quyết định chạy/dừng.
 */

import { NHAC_TAN_SU_MS, tieuDeNhac } from "./tieu-de-tab.ts";

/** Chỉ những gì bộ điều khiển cần — để test truyền vào bản giả. */
export type TaiLieu = {
  title: string;
  hidden: boolean;
  addEventListener(loai: string, f: () => void): void;
  removeEventListener(loai: string, f: () => void): void;
};

export type BoDem = {
  setInterval(f: () => void, ms: number): number;
  clearInterval(id: number): void;
};

/**
 * Bật nhấp nháy khi tab ẩn, dừng ngay khi tab hiện. Trả hàm dọn.
 *
 * `coSo` truyền vào (không tự đọc `doc.title`) vì lúc gọi lại, tiêu đề hiện tại có
 * thể ĐANG là chuỗi nhấp nháy — đọc lúc đó là chốt nhầm "(3) Coldbrew" làm gốc.
 */
export function batNhapNhay(
  doc: TaiLieu,
  coSo: string,
  soChuaDoc: number,
  boDem: BoDem,
): () => void {
  if (soChuaDoc <= 0) {
    doc.title = coSo;
    return () => undefined;
  }

  let id: number | null = null;
  let sang = true;

  const dung = () => {
    if (id !== null) {
      boDem.clearInterval(id);
      id = null;
    }
    doc.title = coSo;
  };

  const chay = () => {
    if (id !== null) return; // đang chạy rồi — đừng chồng interval
    sang = true;
    doc.title = tieuDeNhac(coSo, soChuaDoc, sang);
    id = boDem.setInterval(() => {
      sang = !sang;
      doc.title = tieuDeNhac(coSo, soChuaDoc, sang);
    }, NHAC_TAN_SU_MS);
  };

  const theoDoi = () => {
    if (doc.hidden) chay();
    else dung();
  };

  theoDoi(); // trạng thái LÚC gắn — tab có thể đã ẩn sẵn
  doc.addEventListener("visibilitychange", theoDoi);

  return () => {
    doc.removeEventListener("visibilitychange", theoDoi);
    dung();
  };
}
