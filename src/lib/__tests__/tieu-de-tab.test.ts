/**
 * Tiêu đề tab nhấp nháy: cả hai pha phải vẫn mang số đếm, hết chưa đọc thì trả đúng
 * tiêu đề gốc — để lại "(3)" sau khi đã đọc xong là nói dối người dùng.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { tieuDeNhac } from "../tieu-de-tab.ts";

test("pha sáng: (số) đứng trước tên", () => {
  assert.equal(tieuDeNhac("Coldbrew", 3, true), "(3) Coldbrew");
});

test("pha tối: số đếm vẫn hiện, đuôi sau tên", () => {
  assert.equal(tieuDeNhac("Coldbrew", 3, false), "Coldbrew · 3 chưa đọc");
});

test("hết chưa đọc thì về nguyên tiêu đề, không sót dấu ngoặc", () => {
  assert.equal(tieuDeNhac("Coldbrew", 0, true), "Coldbrew");
  assert.equal(tieuDeNhac("Coldbrew", 0, false), "Coldbrew");
});

test("tiêu đề trống thì đừng hiện chuỗi rỗng", () => {
  assert.equal(tieuDeNhac("", 2, true), "(2) Hộp thư");
});
