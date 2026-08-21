/**
 * Hàng rào cho BFF proxy. Chạy: `pnpm test`
 *
 * Ba ca đầu là thứ giữ cho lần sửa sau không âm thầm mở toang cửa: allowlist chặn
 * mặc định, không khớp tiền tố, và không nuốt path traversal.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { ALLOWLIST, ALLOWLIST_LEN, khop } from "../allowlist.ts";

test("đường trong danh sách thì mở", () => {
  assert.ok(khop("GET", "/v1/conversations"));
  assert.ok(khop("GET", "/v1/conversations/facets"));
  assert.ok(khop("GET", "/v1/conversations/abc-123/messages"));
  assert.ok(khop("POST", "/v1/conversations/abc/drafts/d1/edit-and-send"));
  assert.ok(khop("PATCH", "/v1/agents/xyz/tickets/t1"));
  assert.ok(khop("PUT", "/v1/agents/xyz"));
  assert.ok(khop("GET", "/v1/agents/xyz/channels"));
  assert.ok(khop("POST", "/v1/agents/xyz/channels/i1/auto-reply"));
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

test("mọi đường mở đều có trong bảng README", () => {
  // Bản trước ghim con số 21 và bảo "khớp con số ghi trong README" — nhưng README
  // KHÔNG có con số nào để khớp, nên nó chỉ bắt người ta sửa 21 thành 22 rồi thôi.
  // Bảng đã âm thầm lệch mất 7 đường. Giờ đối chiếu THẲNG với bảng: mở thêm cửa mà
  // không ghi vào tài liệu là đỏ.
  const md = readFileSync(new URL("../../../README.md", import.meta.url), "utf8");
  const trongDoc = new Set<string>();
  for (const dong of md.split("\n")) {
    const m = dong.match(/^\| `(GET|POST|PUT|PATCH|DELETE) ([^`?]+)/);
    if (!m) continue;
    // Bảng markdown escape dấu ống thành `\|`; không gỡ thì tách nhánh ra chuỗi
    // còn dính dấu chéo ở đuôi và không khớp được với allowlist.
    const [, method, duongThô] = [m[0], m[1], m[2].replace(/\\\|/g, "|")];
    // `{a|b|c}` = một dòng gộp nhiều đường; tách ra cho khớp allowlist.
    const nhanh = duongThô.match(/\{([^}]*\|[^}]*)\}/);
    const banSao = nhanh ? nhanh[1].split("|").map((x) => duongThô.replace(nhanh[0], x)) : [duongThô];
    for (const d of banSao) trongDoc.add(`${method} ${d.trim().replace(/\{[^}]*\}/g, "*")}`);
  }
  const thieu = ALLOWLIST.map(([m, p]) => `${m} ${p.replace(/:[^/]+/g, "*")}`).filter(
    (k) => !trongDoc.has(k),
  );
  assert.deepEqual(thieu, [], "đường mở trong proxy nhưng chưa ghi vào bảng README");
  assert.equal(ALLOWLIST.length, ALLOWLIST_LEN);
});
