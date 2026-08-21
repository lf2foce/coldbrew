/** Bộ tách ảnh khỏi nội dung tin. Chuỗi mẫu lấy NGUYÊN VĂN từ production. */
import assert from "node:assert/strict";
import { test } from "node:test";

const ANH = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const NHIEU = /^\s*(\[Image\]|\[Attached files:[^\]]*\]?\]?)\s*$/gim;

/** Bản sao logic tách trong message-content.tsx, để test chạy không cần React. */
function tach(content: string): { chu: string[]; anh: string[] } {
  const chu: string[] = [];
  const anh: string[] = [];
  let cuoi = 0;
  let m: RegExpExecArray | null;
  ANH.lastIndex = 0;
  const day = (raw: string) => {
    const t = raw.replace(NHIEU, "").trim();
    if (t) chu.push(t);
  };
  while ((m = ANH.exec(content)) !== null) {
    day(content.slice(cuoi, m.index));
    anh.push(m[2]);
    cuoi = m.index + m[0].length;
  }
  day(content.slice(cuoi));
  return { chu, anh };
}

const THAT = `[Image]
![](https://img.thietkeai.com/ephemeral-chat/35a933b6-4020-4c51-a044-4b06346f3bf3/35a953a6-9cdb-43fb-afe0-76c053e5b739/2026-08/inbound-facebook/1787222399886-0.jpg)

[Attached files: [image]]`;

test("tin chỉ có ảnh → lấy được URL, không còn dòng đánh dấu nào", () => {
  const { chu, anh } = tach(THAT);
  assert.equal(anh.length, 1);
  assert.ok(anh[0].endsWith("1787222399886-0.jpg"));
  assert.deepEqual(chu, [], `còn sót chữ: ${JSON.stringify(chu)}`);
});

test("chữ lẫn ảnh → giữ cả hai, đúng thứ tự", () => {
  const { chu, anh } = tach(`Đây là đơn thuốc ạ\n![](https://x/a.jpg)\nBác xem giúp em`);
  assert.deepEqual(chu, ["Đây là đơn thuốc ạ", "Bác xem giúp em"]);
  assert.deepEqual(anh, ["https://x/a.jpg"]);
});

test("nhiều ảnh trong một tin", () => {
  const { anh } = tach(`![](https://x/1.jpg) ![](https://x/2.jpg)`);
  assert.deepEqual(anh, ["https://x/1.jpg", "https://x/2.jpg"]);
});

test("tin thường không có ảnh thì không đụng tới", () => {
  const goc = "Dạ bệnh viện làm việc từ 7h ạ";
  const { chu, anh } = tach(goc);
  assert.deepEqual(chu, [goc]);
  assert.deepEqual(anh, []);
});

test("KHÔNG nuốt dấu ngoặc vuông bình thường trong câu", () => {
  const goc = "Giá [tham khảo] là 500k";
  assert.deepEqual(tach(goc).chu, [goc]);
});
