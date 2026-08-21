/**
 * Chiều cao ô soạn.
 *
 * Có test riêng vì đã hỏng một lần theo kiểu KHÔNG ai ngờ: ô nằm trong khung đang
 * `display:none` thì `scrollHeight` đo ra 0, height bị đặt 0px, rồi khung hiện ra
 * nhưng effect không chạy lại vì nội dung không đổi — ô kẹt 0px, chạm vào không được.
 * Người dùng chỉ thấy "tab Chat thử không gõ được", không có lỗi nào trên console.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { caoOSoan } from "../o-soan.ts";

test("đo lúc đang ẩn (scrollHeight = 0) vẫn cao ít nhất một dòng", () => {
  assert.equal(caoOSoan(0, 20, 4), 20);
});

test("một dòng thì đúng một dòng", () => {
  assert.equal(caoOSoan(20, 20, 4), 20);
});

test("ba dòng thì giãn theo nội dung", () => {
  assert.equal(caoOSoan(60, 20, 4), 60);
});

test("quá số dòng tối đa thì chặn lại để cuộn", () => {
  assert.equal(caoOSoan(200, 20, 4), 80);
  assert.equal(caoOSoan(81, 20, 4), 80);
});

test("chiều cao dòng lẻ vẫn kẹp đúng", () => {
  assert.equal(caoOSoan(0, 22.5, 4), 22.5);
  assert.equal(caoOSoan(1000, 22.5, 4), 90);
});
