/**
 * Ngưỡng nhận biết bàn phím ảo.
 *
 * Đặt sai ngưỡng thì thanh điều hướng CHỚP TẮT khi cuộn trang — lỗi khó chịu mà chỉ
 * hiện trên máy thật, nên phải chốt bằng test ở đây.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { banPhimDangMo } from "../ban-phim.ts";

test("bàn phím iPhone (~44% màn) → nhận là đang mở", () => {
  assert.equal(banPhimDangMo(844, 470), true);
});

test("bàn phím Android thấp (~35%) → vẫn nhận ra", () => {
  assert.equal(banPhimDangMo(800, 520), true);
});

test("thanh địa chỉ co giãn khi cuộn (~10%) → KHÔNG nhận nhầm", () => {
  // Đây là ca làm thanh điều hướng chớp tắt nếu ngưỡng đặt thấp quá.
  assert.equal(banPhimDangMo(844, 760), false);
});

test("không có gì che → đóng", () => {
  assert.equal(banPhimDangMo(844, 844), false);
});

test("ngay tại ngưỡng 25% → chưa tính là mở", () => {
  assert.equal(banPhimDangMo(800, 600), false);
  assert.equal(banPhimDangMo(800, 599), true);
});
