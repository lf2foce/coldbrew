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

const { createSession, cungNguonGoc, hasUsableSession, isBrokerSession, verifySession } = await import("../session.ts");

test("opaque session từ identity bridge được nhận dạng nhưng token bịa ngắn bị chặn", async () => {
  const token = `cb_live_${"A".repeat(64)}`;
  assert.ok(isBrokerSession(token));
  assert.ok(await hasUsableSession(token));
  assert.equal(isBrokerSession("cb_live_ngan"), false);
});

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

test("xoá SESSION_SECRET (runbook 41 bước 6) thì cookie cũ chỉ vô hiệu, KHÔNG ném lỗi", async () => {
  const { value } = await createSession();
  const secret = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {
    // Bản đầu ném "SESSION_SECRET phải có ít nhất 32 ký tự" ⇒ proxy.ts trả 500 mọi trang.
    assert.equal(await verifySession(value), false);
    assert.equal(await hasUsableSession(value), false);
  } finally {
    process.env.SESSION_SECRET = secret;
  }
});

test("đã chuyển sang identity bridge và tắt legacy thì cookie mật khẩu cũ hết tác dụng ngay", async () => {
  const { value } = await createSession();
  assert.ok(await hasUsableSession(value));
  process.env.COLDBREW_AUTH_URL = "https://phenau.com";
  try {
    process.env.ALLOW_LEGACY_PASSWORD_LOGIN = "0";
    assert.equal(await hasUsableSession(value), false, "cookie legacy vẫn dùng PHENAU_API_KEY sau khi tắt");
    process.env.ALLOW_LEGACY_PASSWORD_LOGIN = "1";
    assert.ok(await hasUsableSession(value), "canary bật lại legacy thì cookie hợp lệ");
  } finally {
    delete process.env.COLDBREW_AUTH_URL;
    delete process.env.ALLOW_LEGACY_PASSWORD_LOGIN;
  }
});
