/**
 * Hai luật của hộp thư: nguồn nào được lấy, và chip xếp thế nào.
 *
 * Cả hai do người dùng đặt ra, không suy được từ dữ liệu — refactor sau ai đó sắp lại
 * "cho gọn" là mất, mà mất thì không có gì kêu lên cả: danh sách vẫn hiện, chỉ là hiện
 * sai thứ.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { chipMacDinh, dungChip, nguonCanHoi } from "../hop-thu.ts";

const FACETS = [
  { platform: "external_api", count: 3324 },
  { platform: "facebook", count: 12001 },
  { platform: "web", count: 40 },
  { platform: "web_public", count: 12 },
  { platform: "zalo", count: 900 },
];

// ── Nguồn gửi lên backend ──────────────────────────────────────────────────

test('"Tất cả" ở hộp thư khách KHÔNG kéo chat thử về', () => {
  const n = nguonCanHoi("all", "khach");
  assert.ok(!n.includes("web"), "chat thử lọt vào hộp thư khách — đúng cái gây rối");
  assert.ok(!n.includes("phechat"));
  assert.ok(n.includes("facebook") && n.includes("web_public") && n.includes("external_api"));
});

test('"Chưa đọc" cũng bó theo chế độ, không phải lọc trên mảng đã tải', () => {
  assert.deepEqual(nguonCanHoi("unread", "khach"), nguonCanHoi("all", "khach"));
  assert.deepEqual(nguonCanHoi("unread", "noibo"), ["web", "phechat"]);
});

test("chọn Facebook thì hỏi cả biến thể `fb` cũ", () => {
  assert.deepEqual(nguonCanHoi("kenh:facebook", "khach"), ["facebook", "fb"]);
});

test("hộp thư nội bộ chỉ lấy nguồn nội bộ", () => {
  assert.deepEqual(nguonCanHoi("all", "noibo"), ["web", "phechat"]);
});

// ── Thứ tự chip ───────────────────────────────────────────────────────────

test("Facebook đứng đầu, API ngoài xuống cuối", () => {
  const nhan = dungChip(FACETS, "khach").map(([, l]) => l);
  assert.deepEqual(nhan, [
    "Facebook 12001",
    "Zalo 900",
    "Web public 12",
    "Chưa đọc",
    "Tất cả",
    "API ngoài 3324",
  ]);
});

test("chat thử KHÔNG xuất hiện trong chip hộp thư khách", () => {
  const key = dungChip(FACETS, "khach").map(([k]) => k);
  assert.ok(!key.includes("kenh:web"));
});

test("chế độ nội bộ chỉ có chip nội bộ", () => {
  assert.deepEqual(dungChip(FACETS, "noibo").map(([, l]) => l), ["Tất cả", "Chat thử 40"]);
});

// ── Chip mặc định ─────────────────────────────────────────────────────────

test("mặc định là Facebook khi tenant có Facebook", () => {
  assert.equal(chipMacDinh(FACETS, "khach"), "kenh:facebook");
});

test("KHÔNG có Facebook thì lùi về kênh khách khác, không để màn trắng", () => {
  const khong = FACETS.filter((f) => f.platform !== "facebook");
  assert.equal(chipMacDinh(khong, "khach"), "kenh:zalo");
});

test("chỉ có API ngoài thì về Tất cả, không chọn API ngoài làm mặc định", () => {
  assert.equal(chipMacDinh([{ platform: "external_api", count: 5 }], "khach"), "all");
});

test("Facebook đứng đầu KỂ CẢ khi ít hội thoại hơn kênh khác", () => {
  // Ca này mới canh được luật. Trong FACETS ở trên Facebook vốn đông nhất, nên sắp
  // theo số lượng cũng ra cùng kết quả — test đó không phân biệt được hai cách làm.
  const it = [
    { platform: "zalo", count: 5000 },
    { platform: "facebook", count: 7 },
    { platform: "web_public", count: 300 },
  ];
  assert.deepEqual(dungChip(it, "khach").map(([, l]) => l), [
    "Facebook 7",
    "Zalo 5000",
    "Web public 300",
    "Chưa đọc",
    "Tất cả",
  ]);
});
