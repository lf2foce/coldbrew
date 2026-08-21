/**
 * Trích dẫn nguồn — kiểm phần LOGIC (component không có bộ test ở repo này).
 *
 * Bám theo bản đã có ở dashboard `message-bubble.tsx`: cùng regex nhóm, cùng cách xử
 * marker không khớp, cùng việc gom nguồn theo tệp. Lệch nhau thì nhân viên xem một
 * câu trả lời ở hai nơi lại thấy hai kiểu.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  catLatTrichDan,
  gomNguonTheoTep,
  khoaTepNguon,
  nguonHienThi,
  RE_TRICH_DAN,
  thuTuThamChieu,
} from "../trich-dan.ts";
import type { Citation } from "../types.ts";

const NGUON: Citation[] = [
  { source_id: 1, filename: "bang-gia-2026.pdf" },
  { source_id: 2, filename: "noi-quy.docx" },
];

/** Rút chuỗi hiển thị ra để so — chip thành `<n>`. */
function ve(content: string, cs?: Citation[] | null): string {
  return catLatTrichDan(content, cs)
    .map((l) => ("chu" in l ? l.chu : l.nhom.map((x) => `<${x.soHien}>`).join("")))
    .join("");
}

test("marker đơn khớp nguồn → thành chip", () => {
  assert.equal(ve("Giá [1] ạ", NGUON), "Giá <1> ạ");
});

test("marker NHÓM [1, 2] → cụm chip, đúng dạng dashboard dùng", () => {
  assert.equal(ve("Chi tiết [1, 2] ạ", NGUON), "Chi tiết <1><2> ạ");
  // Cụm phải khớp TOÀN BỘ: một nửa khớp thì giữ nguyên chữ, không đeo chip cho nửa
  // này rồi bỏ rơi nửa kia.
  assert.equal(ve("Chi tiết [1, 9] ạ", NGUON), "Chi tiết [1, 9] ạ");
});

test("tin của khách có [12] KHÔNG thành chip", () => {
  // Không có citations ⇒ không gì để khớp. Đây là lý do không cần truyền vai của tin
  // vào component: điều kiện khớp nguồn đã tự chặn.
  assert.equal(ve("Cho tôi xem mục [12]", undefined), "Cho tôi xem mục [12]");
});

test("số không khớp nguồn nào thì để nguyên trong chữ", () => {
  assert.equal(ve("Mã lô [12] ạ", NGUON), "Mã lô [12] ạ");
});

test("KHÔNG in lặp đoạn chữ khi bỏ qua marker không khớp", () => {
  // Bẫy: bỏ qua marker mà quên dời con trỏ ⇒ đoạn trước nó bị đẩy ra lần nữa. Lỗi này
  // hiện ra thành câu lặp giữa tin nhắn, không ai đoán là do cắt chuỗi.
  assert.equal(ve("Xem mục [12] và giá [1] nhé", NGUON), "Xem mục [12] và giá <1> nhé");
});

test("chip mang đúng nguồn tương ứng", () => {
  const lat = catLatTrichDan("Giá [2] ạ", NGUON);
  const cum = lat.find((l) => "nhom" in l);
  assert.ok(cum && "nhom" in cum);
  assert.equal(cum.nhom[0].nguon.filename, "noi-quy.docx");
});

test("nguồn thứ 100 trở đi vẫn có chip", () => {
  // Bản trước giới hạn 1–2 chữ số. Kho tài liệu lớn là mất chip mà không ai hiểu vì sao.
  const c: Citation[] = [{ source_id: 137, filename: "phu-luc.pdf" }];
  // Ra CHIP (không phải chữ "[137]") là điều cần canh. Số hiện lên là 1 vì đã đánh
  // lại theo thứ tự nhắc tới — `source_id` thô chỉ dùng để tra nguồn.
  assert.equal(ve("Xem [137]", c), "Xem <1>");
});

test("gom nguồn theo tệp — nhiều đoạn cùng tài liệu chỉ hiện một dòng", () => {
  const nhieu: Citation[] = [
    { source_id: 1, filename: "bang-gia.pdf", page: 2, metadata: { file_id: "F1" } },
    { source_id: 2, filename: "bang-gia.pdf", page: 7, metadata: { file_id: "F1" } },
    { source_id: 3, filename: "noi-quy.docx", metadata: { file_id: "F2" } },
  ];
  const g = gomNguonTheoTep(nhieu);
  assert.deepEqual(g.map((x) => x.nhan), ["bang-gia", "noi-quy"]);
  assert.equal(g[0].nguon.length, 2, "hai đoạn cùng tệp phải gom làm một");
});

// ── Gom theo DANH TÍNH tệp, không theo tên ──────────────────────────────────
// Tên không phải danh tính: hai tài liệu khác nhau trùng tên, hoặc cùng tên khác đuôi.
// Gom nhầm thì hàng nguồn chỉ hiện một dòng, lấy link của tệp đầu, tệp kia biến mất.

test("cùng tên khác đuôi là HAI tệp, không được gộp", () => {
  const hai: Citation[] = [
    { source_id: 1, filename: "bang-gia.pdf", metadata: { file_id: "F1" } },
    { source_id: 2, filename: "bang-gia.docx", metadata: { file_id: "F2" } },
  ];
  const g = gomNguonTheoTep(hai);
  assert.equal(g.length, 2, "bỏ đuôi rồi gom là gộp mất một tệp");
  // Nhãn trùng nhau sau khi bỏ đuôi ⇒ giữ tên đầy đủ để phân biệt được.
  assert.deepEqual(g.map((x) => x.nhan).sort(), ["bang-gia.docx", "bang-gia.pdf"]);
});

test("trùng tên ở hai thư mục cũng là HAI tệp", () => {
  const hai: Citation[] = [
    { source_id: 1, filename: "bao-gia.pdf", source_path: "/2025" },
    { source_id: 2, filename: "bao-gia.pdf", source_path: "/2026" },
  ];
  assert.equal(gomNguonTheoTep(hai).length, 2);
});

test("khoá tệp theo đúng thứ tự ưu tiên của dashboard", () => {
  // file_id > drive_file_id > source_file_id > source_path > file_url > filename
  assert.equal(
    khoaTepNguon({ source_id: 1, filename: "a.pdf", source_path: "/x", metadata: { file_id: "F", drive_file_id: "D" } }),
    "F",
  );
  assert.equal(khoaTepNguon({ source_id: 1, filename: "a.pdf", metadata: { drive_file_id: "D" } }), "D");
  assert.equal(khoaTepNguon({ source_id: 1, filename: "a.pdf", source_path: "/x" }), "/x");
  assert.equal(khoaTepNguon({ source_id: 1, filename: "a.pdf" }), "a.pdf");
  assert.equal(khoaTepNguon({ source_id: 1 }), "khong-ro-tep", "không có gì để nhận dạng vẫn phải gom được");
});

test("không có nguồn thì không có dòng nào", () => {
  assert.deepEqual(gomNguonTheoTep([]), []);
  assert.deepEqual(gomNguonTheoTep(undefined), []);
});

test("regex khớp bản dashboard: nhận nhóm, không nhận chữ", () => {
  const so = (s: string) => [...s.matchAll(new RegExp(RE_TRICH_DAN.source, "g"))].map((m) => m[1]);
  assert.deepEqual(so("[1] [2, 3] [10,11]"), ["1", "2, 3", "10,11"]);
  assert.deepEqual(so("[ABC] [12a] []"), []);
});


// ── Đánh số lại 1..N theo thứ tự nhắc tới ───────────────────────────────────
// Giống dashboard (`displayCitationIds`). Kho trả về 8 đoạn mà câu chỉ trích đoạn 3
// và 7 thì chip phải đọc là 1 2 — hiện 3 7 là người đọc đi tìm 1 2 không có.

const TAM: Citation[] = [
  { source_id: 3, filename: "a.pdf", metadata: { file_id: "A" } },
  { source_id: 7, filename: "b.pdf", metadata: { file_id: "B" } },
  { source_id: 5, filename: "c.pdf", metadata: { file_id: "C" } },
];

test("chip đánh số lại theo thứ tự xuất hiện, không dùng source_id thô", () => {
  assert.equal(ve("Xem [7] rồi [3] ạ", TAM), "Xem <1> rồi <2> ạ");
});

test("cùng một nguồn nhắc hai lần giữ nguyên số", () => {
  assert.equal(ve("[3] và [7] rồi [3]", TAM), "<1> và <2> rồi <1>");
});

test("thuTuThamChieu bỏ qua cụm không khớp hết", () => {
  assert.deepEqual(thuTuThamChieu("[3] [7, 99] [5]", TAM), [3, 5]);
});

// ── Danh sách nguồn: theo dashboard khi CÓ marker ──────────────────────────

test("có marker → chỉ hiện nguồn được nhắc, đúng thứ tự", () => {
  const ra = nguonHienThi("Chỉ [7] thôi", TAM);
  assert.deepEqual(ra.map((c) => c.source_id), [7], "hiện cả nguồn không được nhắc là sai luật dashboard");
});

test("KHÔNG marker nào (Facebook đã bị xoá) → hiện HẾT nguồn", () => {
  // Cố ý khác dashboard: bên đó không hiện gì, nhưng bên đó không có ca này. Ở app
  // này áp nguyên luật kia là mọi tin Facebook đều mất nguồn.
  const ra = nguonHienThi("Dạ giá khám là 150.000đ ạ.", TAM);
  assert.equal(ra.length, 3);
});

test("không có citations thì danh sách rỗng", () => {
  assert.deepEqual(nguonHienThi("Dạ vâng ạ", []), []);
  assert.deepEqual(nguonHienThi("Dạ vâng ạ", undefined), []);
});
