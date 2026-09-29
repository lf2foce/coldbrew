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

const { createSession, cungNguonGoc, hasUsableSession, isBrokerSession, legacyLoginEnabled, requiresUsername, thongTinDangNhapDung, verifySession } = await import("../session.ts");

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

test("ĐỔI TÊN ĐĂNG NHẬP cũng giết phiên cũ, y như đổi mật khẩu", async () => {
  process.env.APP_USERNAME = "dkpt";
  const { value } = await createSession();
  assert.ok(await verifySession(value), "cookie phải hợp lệ trước khi đổi");

  process.env.APP_USERNAME = "dkpt-cu";
  assert.equal(
    await verifySession(value),
    false,
    "username không nằm trong vân tay ⇒ đổi tên mà phiên cũ vẫn sống 12 tiếng",
  );

  process.env.APP_USERNAME = "dkpt";
  assert.ok(await verifySession(value), "đặt lại tên cũ thì cookie hợp lệ trở lại");
  delete process.env.APP_USERNAME;
});

test("THÊM username vào deployment đang chạy cũng đuổi phiên cũ ra", async () => {
  delete process.env.APP_USERNAME;
  const { value } = await createSession(); // phiên phát khi chưa có username
  assert.ok(await verifySession(value));

  process.env.APP_USERNAME = "dkpt"; // siết bảo mật giữa chừng
  assert.equal(
    await verifySession(value),
    false,
    "siết bảo mật mà người đang đăng nhập không phải gõ lại thì chưa siết được gì",
  );
  delete process.env.APP_USERNAME;
});

test("ranh giới user/mật khẩu không nhập nhèm được", async () => {
  // Nối thẳng hai chuỗi thì ("ab","c") và ("a","bc") ra cùng một đầu vào ⇒ cùng vân tay
  // ⇒ đổi thông tin đăng nhập mà phiên cũ không chết. Phải có dấu ngăn.
  process.env.APP_USERNAME = "ab";
  process.env.APP_PASSWORD = "c";
  const { value } = await createSession();

  process.env.APP_USERNAME = "a";
  process.env.APP_PASSWORD = "bc";
  assert.equal(await verifySession(value), false, "hai cặp khác nhau lại ra cùng vân tay");

  process.env.APP_USERNAME = undefined as unknown as string;
  delete process.env.APP_USERNAME;
  process.env.APP_PASSWORD = "mat-khau-mot";
});

test("APP_USERNAME chỉ bật lớp phụ, KHÔNG bật/tắt đăng nhập mật khẩu", () => {
  delete process.env.APP_USERNAME;
  assert.ok(legacyLoginEnabled(), "deployment cũ chỉ có APP_PASSWORD vẫn phải đăng nhập được");
  assert.equal(requiresUsername(), false);

  process.env.APP_USERNAME = "dkpt";
  assert.ok(legacyLoginEnabled());
  assert.ok(requiresUsername());
  delete process.env.APP_USERNAME;
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

test("xoá APP_PASSWORD (tắt đăng nhập mật khẩu) thì cookie mật khẩu cũ hết tác dụng ngay", async () => {
  const { value } = await createSession();
  assert.ok(await hasUsableSession(value));
  const pw = process.env.APP_PASSWORD;
  delete process.env.APP_PASSWORD;
  try {
    assert.equal(await hasUsableSession(value), false, "cookie legacy vẫn dùng PHENAU_API_KEY sau khi tắt");
    assert.equal(legacyLoginEnabled(), false);
  } finally {
    process.env.APP_PASSWORD = pw;
  }
  assert.ok(legacyLoginEnabled());
});

/* ── Cổng kiểm thông tin đăng nhập ──────────────────────────────────────────────
   Trước đây nằm trong `/api/login/route.ts` cùng rate-limit, kiểm nguồn gốc và
   `next/server` — không test nào chạy tới được. Nay tách ra nên canh được. */

test("KHÔNG đặt APP_USERNAME: deployment cũ vẫn vào bằng mỗi mật khẩu", () => {
  delete process.env.APP_USERNAME;
  process.env.APP_PASSWORD = "dkpt2026";
  assert.ok(thongTinDangNhapDung("", "dkpt2026"), "thêm username không được làm hỏng bản cũ");
  assert.ok(thongTinDangNhapDung("gõ-bừa", "dkpt2026"), "chưa bật thì tên gõ gì cũng kệ");
  assert.equal(thongTinDangNhapDung("", "sai"), false);
});

test("CÓ APP_USERNAME: phải ĐÚNG CẢ HAI mới vào", () => {
  process.env.APP_USERNAME = "dkpt";
  process.env.APP_PASSWORD = "dkpt2026";
  assert.ok(thongTinDangNhapDung("dkpt", "dkpt2026"));

  assert.equal(
    thongTinDangNhapDung("", "dkpt2026"),
    false,
    "mật khẩu đúng mà bỏ trống tên vẫn vào = thêm ô cho vui, không thêm lớp nào",
  );
  assert.equal(thongTinDangNhapDung("sai", "dkpt2026"), false, "client cũ gửi thiếu username thì phải BỊ CHẶN");
  assert.equal(thongTinDangNhapDung("dkpt", "sai"), false);
  assert.equal(thongTinDangNhapDung("dkpt2026", "dkpt"), false, "đảo hai ô cho nhau không được vào");
});

test("tên đăng nhập dính dấu cách vẫn vào, mật khẩu thì không tự cắt", () => {
  process.env.APP_USERNAME = "dkpt";
  process.env.APP_PASSWORD = "dkpt2026";
  assert.ok(thongTinDangNhapDung("  dkpt ", "dkpt2026"), "dán tên kèm dấu cách là chuyện thường");
  assert.equal(
    thongTinDangNhapDung("dkpt", " dkpt2026 "),
    false,
    "cắt hộ mật khẩu là tự ý sửa bí mật của người ta",
  );
  delete process.env.APP_USERNAME;
  process.env.APP_PASSWORD = "mat-khau-mot";
});

test("route KHÔNG được giữ bản sao phép so sánh", async () => {
  // Bản gốc có `bangNhau` riêng trong route. Còn để đó là còn đường quay lại: sửa luật ở
  // lib mà route vẫn xài bản cũ thì hai nơi nói hai kiểu, và bản trong route không ai test.
  const { readFile } = await import("node:fs/promises");
  const route = await readFile(new URL("../../app/api/login/route.ts", import.meta.url), "utf8");
  assert.equal(/function bangNhau/.test(route), false, "route đẻ lại bản sao bangNhau");
  assert.equal(
    /process\.env\.APP_(PASSWORD|USERNAME)/.test(route),
    false,
    "route đọc thẳng APP_* = có nơi thứ hai quyết định thông tin đăng nhập",
  );
});
