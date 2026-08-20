/**
 * Hàng rào cho BFF proxy. Chạy: `pnpm test`
 *
 * Ba ca đầu là thứ giữ cho lần sửa sau không âm thầm mở toang cửa: allowlist chặn
 * mặc định, không khớp tiền tố, và không nuốt path traversal.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ALLOWLIST, ALLOWLIST_LEN, khop } from "../allowlist.ts";

test("đường trong danh sách thì mở", () => {
  assert.ok(khop("GET", "/v1/conversations"));
  assert.ok(khop("GET", "/v1/conversations/facets"));
  assert.ok(khop("GET", "/v1/conversations/abc-123/messages"));
  assert.ok(khop("POST", "/v1/conversations/abc/drafts/d1/edit-and-send"));
  assert.ok(khop("PATCH", "/v1/agents/xyz/tickets/t1"));
  assert.ok(khop("PUT", "/v1/agents/xyz"));
});

test("đường ngoài danh sách thì chặn — mặc định là ĐÓNG", () => {
  for (const [m, p] of [
    ["GET", "/v1/tenants/me/members"],
    ["POST", "/v1/tenants/me/members"],
    ["GET", "/v1/platform/users"],
    ["GET", "/v1/integrations"],
    ["POST", "/v1/integrations/meta/set-auto-reply"],
    ["POST", "/v1/agents/xyz/outbound/campaign"],
    ["DELETE", "/v1/agents/xyz"],
    ["GET", "/v1/knowledge-bases"],
  ] as [string, string][]) {
    assert.equal(khop(m, p), false, `${m} ${p} lọt qua allowlist`);
  }
});

test("KHÔNG khớp theo tiền tố", () => {
  // `startsWith("/v1/conversations")` sẽ cho cả hai cái dưới đây lọt.
  assert.equal(khop("GET", "/v1/conversations/abc/messages/m1/extra"), false);
  assert.equal(khop("GET", "/v1/conversationsX"), false);
});

test("đúng method mới mở — cùng đường khác method thì chặn", () => {
  assert.ok(khop("GET", "/v1/agents/xyz"));
  assert.equal(khop("POST", "/v1/agents/xyz"), false);
  assert.equal(khop("DELETE", "/v1/agents/xyz"), false);
});

test("đoạn rỗng không được coi là tham số hợp lệ", () => {
  assert.equal(khop("GET", "/v1/conversations//messages"), false);
});

test("số đường mở khớp con số ghi trong README", () => {
  assert.equal(ALLOWLIST_LEN, 19, "đổi allowlist thì phải sửa cả bảng trong README");
  assert.equal(ALLOWLIST.length, ALLOWLIST_LEN);
});
