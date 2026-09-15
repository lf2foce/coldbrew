/** `state` chặn login CSRF: mã đăng nhập của người khác không đổi được trong trình duyệt này. */
import assert from "node:assert/strict";
import { test } from "node:test";

const { callbackReturnUrl, newState, stateMatches } = await import("../oauth-state.ts");

test("state ngẫu nhiên, đủ dài, an toàn cho URL", () => {
  const a = newState();
  const b = newState();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
});

test("return_url dựng lại ở callback phải trùng NGUYÊN VĂN chuỗi gửi đi", () => {
  // Backend so khớp return_url đã lưu cùng mã; lệch một ký tự là exchange 401.
  const state = newState();
  const sent = callbackReturnUrl("https://chat.khach.vn", state);
  assert.equal(sent, `https://chat.khach.vn/auth/callback?state=${state}`);
  assert.equal(callbackReturnUrl("https://chat.khach.vn", state), sent);
  assert.equal(callbackReturnUrl("http://localhost:3005", "s"), "http://localhost:3005/auth/callback?state=s");
});

test("state lệch, thiếu cookie hoặc thiếu query đều bị từ chối", () => {
  const state = newState();
  assert.ok(stateMatches(state, state));
  assert.equal(stateMatches(state, newState()), false);
  assert.equal(stateMatches(state, undefined), false, "link callback gửi cho người chưa bấm Đăng nhập");
  assert.equal(stateMatches(null, state), false);
  assert.equal(stateMatches("", ""), false);
});
