import { test } from "node:test";
import assert from "node:assert/strict";

const { publicHost, publicHostname, publicOrigin, publicUrl } = await import("../public-origin.ts");

// Đúng thứ Next standalone đưa vào route handler sau Traefik (đo 17/10/2026).
const nextUrl = new URL("https://0.0.0.0:3000/api/login/start");

function req(headers: Record<string, string>) {
  return { headers: new Headers(headers), nextUrl };
}

test("sau Traefik: lấy domain thật từ X-Forwarded-*, không phải 0.0.0.0", () => {
  const r = req({ host: "chatbot.bdsradar.com", "x-forwarded-host": "chatbot.bdsradar.com", "x-forwarded-proto": "https" });
  assert.equal(publicHostname(r), "chatbot.bdsradar.com");
  assert.equal(publicOrigin(r), "https://chatbot.bdsradar.com");
  assert.equal(publicUrl("/sign-in", r).href, "https://chatbot.bdsradar.com/sign-in");
});

test("không có X-Forwarded-Host thì dùng Host; chuỗi nhiều proxy lấy giá trị đầu", () => {
  assert.equal(publicHostname(req({ host: "chatbot.dkpt.vn" })), "chatbot.dkpt.vn");
  const r = req({ "x-forwarded-host": "chatbot.dkpt.vn, internal:3000", "x-forwarded-proto": "https, http" });
  assert.equal(publicOrigin(r), "https://chatbot.dkpt.vn");
});

test("giữ cổng trong origin nhưng bỏ cổng ở hostname (dev local)", () => {
  const r = req({ host: "localhost:3001", "x-forwarded-proto": "http" });
  assert.equal(publicHost(r), "localhost:3001");
  assert.equal(publicHostname(r), "localhost");
  assert.equal(publicOrigin(r), "http://localhost:3001");
});

test("header rác hoặc thiếu ⇒ rơi về nextUrl, không ghép chuỗi lạ vào URL", () => {
  assert.equal(publicHost(req({ host: "evil.com/path?x" })), "0.0.0.0:3000");
  assert.equal(publicOrigin(req({ "x-forwarded-proto": "javascript", host: "a.vn" })), "https://a.vn");
  assert.equal(publicHost(req({})), "0.0.0.0:3000");
});
