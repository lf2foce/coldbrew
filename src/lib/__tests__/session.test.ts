/**
 * Hàng rào cho phiên đăng nhập. Chạy: `pnpm test`
 *
 * Ca quan trọng nhất là "đổi mật khẩu giết phiên cũ": ở mô hình mật khẩu dùng
 * chung, đổi mật khẩu LÀ cách duy nhất thu hồi quyền. Thu hồi mà cookie cũ vẫn
 * sống 12 tiếng thì coi như không thu hồi.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SESSION_SECRET = "day-la-secret-du-32-ky-tu-cho-hmac-sha256";
process.env.APP_PASSWORD = "mat-khau-mot";

const { createSession, cungNguonGoc, verifySession } = await import("../session.ts");

test("cookie do mình phát thì hợp lệ", async () => {
  const { value } = await createSession();
  assert.ok(await verifySession(value));
});

test("chữ ký bịa hoặc sửa một ký tự đều hỏng", async () => {
  const { value } = await createSession();
  assert.equal(await verifySession(value.slice(0, -1) + "X"), false);
  assert.equal(await verifySession("9999999999999.abcdef123456.chu-ky-bia"), false);
  assert.equal(await verifySession("1"), false);
  assert.equal(await verifySession(undefined), false);
});

test("ĐỔI MẬT KHẨU thì mọi phiên cũ chết ngay", async () => {
  const { value } = await createSession();
  assert.ok(await verifySession(value), "cookie phải hợp lệ trước khi đổi");
  process.env.APP_PASSWORD = "mat-khau-hai";
  assert.equal(await verifySession(value), false, "cookie cũ vẫn sống sau khi đổi mật khẩu");
  process.env.APP_PASSWORD = "mat-khau-mot";
  assert.ok(await verifySession(value), "đổi lại mật khẩu cũ thì cookie hợp lệ trở lại");
});

test("hạn nằm trong phần được ký nên client không tự nới", async () => {
  const { value } = await createSession();
  const [, vanTay, chuKy] = value.split(".");
  const nguyBien = `${Date.now() + 10 ** 12}.${vanTay}.${chuKy}`;
  assert.equal(await verifySession(nguyBien), false);
});

function req(headers: Record<string, string>): Request {
  return new Request("https://khach.vn/api/py/v1/conversations", { headers });
}

test("cùng nguồn gốc thì cho qua", () => {
  assert.ok(cungNguonGoc(req({ host: "khach.vn", origin: "https://khach.vn" })));
});

test("subdomain khác BỊ CHẶN — sameSite=lax không lo được ca này", () => {
  // blog.khach.vn là SAME-site với khach.vn nên cookie vẫn được gửi kèm.
  assert.equal(cungNguonGoc(req({ host: "khach.vn", origin: "https://blog.khach.vn" })), false);
});

test("thiếu Origin lẫn Referer thì từ chối", () => {
  assert.equal(cungNguonGoc(req({ host: "khach.vn" })), false);
});
