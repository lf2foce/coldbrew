/**
 * Nhấp nháy tiêu đề phải theo DÒNG SỰ KIỆN `visibilitychange`, không theo một lần đọc
 * `document.hidden`. Hai ca dưới đây từng hỏng thật:
 *
 *  · rời tab khi ĐANG có tin chưa đọc  → phải bắt đầu nhấp nháy (ca CHÍNH, từng câm)
 *  · quay lại tab khi vẫn còn chưa đọc → phải dừng hẳn (từng nháy trước mắt người dùng)
 */
import assert from "node:assert/strict";
import test from "node:test";

import { batNhapNhay, type BoDem, type TaiLieu } from "../nhap-nhay-tieu-de.ts";

function dungMoiTruong(hidden = false) {
  const nghe = new Set<() => void>();
  let nhip: (() => void) | null = null;
  const doc: TaiLieu = {
    title: "Coldbrew",
    hidden,
    addEventListener: (_l, f) => void nghe.add(f),
    removeEventListener: (_l, f) => void nghe.delete(f),
  };
  const boDem: BoDem = {
    setInterval: (f) => {
      nhip = f;
      return 1;
    },
    clearInterval: () => {
      nhip = null;
    },
  };
  return {
    doc,
    boDem,
    /** Giả lập trình duyệt đổi trạng thái tab rồi bắn sự kiện. */
    doiTab(an: boolean) {
      doc.hidden = an;
      for (const f of nghe) f();
    },
    /** Giả lập một nhịp interval trôi qua. */
    tich() {
      nhip?.();
    },
    dangChay: () => nhip !== null,
  };
}

test("RỜI tab khi đang có tin chưa đọc thì bắt đầu nhấp nháy", () => {
  const mt = dungMoiTruong(false); // tab đang mở
  batNhapNhay(mt.doc, "Coldbrew", 3, mt.boDem);
  assert.equal(mt.doc.title, "Coldbrew", "đang nhìn tab thì đừng nháy");

  mt.doiTab(true); // người trực chuyển sang tab khác
  assert.equal(
    mt.doc.title,
    "(3) Coldbrew",
    "ca CHÍNH: rời máy khi còn tin chưa đọc mà tiêu đề im là hỏng",
  );
});

test("QUAY LẠI tab thì dừng hẳn, không nháy tiếp sau 1 nhịp", () => {
  const mt = dungMoiTruong(true); // tab đã ẩn sẵn
  batNhapNhay(mt.doc, "Coldbrew", 3, mt.boDem);
  assert.equal(mt.doc.title, "(3) Coldbrew");

  mt.doiTab(false); // quay lại, CHƯA mở hội thoại nên số chưa đọc vẫn 3
  assert.equal(mt.doc.title, "Coldbrew");
  assert.equal(mt.dangChay(), false, "interval phải bị huỷ, không chỉ đặt lại tiêu đề");

  mt.tich(); // nếu interval còn sống, đây là lúc nó ghi đè
  assert.equal(mt.doc.title, "Coldbrew", "nháy trước mắt người đang nhìn");
});

test("ẩn sẵn từ đầu vẫn nháy (không phải chỉ khi có sự kiện)", () => {
  const mt = dungMoiTruong(true);
  batNhapNhay(mt.doc, "Coldbrew", 2, mt.boDem);
  assert.equal(mt.doc.title, "(2) Coldbrew");
});

test("hai pha luân phiên, pha nào cũng mang số", () => {
  const mt = dungMoiTruong(true);
  batNhapNhay(mt.doc, "Coldbrew", 3, mt.boDem);
  assert.equal(mt.doc.title, "(3) Coldbrew");
  mt.tich();
  assert.equal(mt.doc.title, "Coldbrew · 3 chưa đọc");
  mt.tich();
  assert.equal(mt.doc.title, "(3) Coldbrew");
});

test("không còn tin chưa đọc thì trả tiêu đề gốc, không gắn gì", () => {
  const mt = dungMoiTruong(true);
  batNhapNhay(mt.doc, "Coldbrew", 0, mt.boDem);
  assert.equal(mt.doc.title, "Coldbrew");
  assert.equal(mt.dangChay(), false);
});

test("dọn xong phải trả tiêu đề gốc và huỷ interval", () => {
  const mt = dungMoiTruong(true);
  const don = batNhapNhay(mt.doc, "Coldbrew", 5, mt.boDem);
  assert.equal(mt.doc.title, "(5) Coldbrew");
  don();
  assert.equal(mt.doc.title, "Coldbrew");
  assert.equal(mt.dangChay(), false);
  mt.doiTab(true); // đã gỡ listener — đổi tab không được đánh thức lại
  assert.equal(mt.doc.title, "Coldbrew");
});

test("đổi tab qua lại nhiều lần không chồng interval", () => {
  const mt = dungMoiTruong(true);
  batNhapNhay(mt.doc, "Coldbrew", 1, mt.boDem);
  mt.doiTab(true);
  mt.doiTab(true); // sự kiện lặp (trình duyệt vẫn bắn) — không được tạo interval thứ hai
  mt.doiTab(false);
  assert.equal(mt.dangChay(), false, "còn interval mồ côi là tiêu đề bị hai bên giành");
});
