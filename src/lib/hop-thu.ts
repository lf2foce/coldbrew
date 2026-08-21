/** Hai quyết định của hộp thư, tách khỏi component để test được.
 *
 * Cả hai đều là luật do người dùng đặt ra, không suy được từ dữ liệu — nên phải chốt
 * bằng test, không thì lần refactor sau ai đó sắp lại "cho gọn" là mất.
 */

// Đuôi `.ts` tường minh: bộ chạy test của Node phân giải import THẬT lúc chạy, không
// như `import type` bị xoá khi strip-types. Thiếu đuôi là test không nạp được module.
// tsconfig bật `allowImportingTsExtensions` nên bundler vẫn hiểu.
import { laNoiBo, nhanNguon } from "./types.ts";

/** Nguồn thuộc hộp thư KHÁCH HÀNG và hộp thư NỘI BỘ.
 *
 *  Liệt kê tường minh chứ không viết "mọi nguồn trừ nội bộ": backend lọc bằng danh
 *  sách nguồn muốn LẤY, không có dạng loại-trừ. Thêm kênh mới vào hệ thống thì phải
 *  thêm vào đây, không thì nó vô hình ở "Tất cả".
 *
 *  `fb` là biến thể cũ của `facebook`, có thật trong dữ liệu nên phải hỏi cả hai. */
export const KHACH_HANG = [
  "facebook", "fb", "instagram", "zalo", "lark", "telegram", "web_public", "external_api",
];
export const NOI_BO = ["web", "phechat"];

export type CheDo = "khach" | "noibo";
export type Facet = { platform: string; count: number };

/** Nguồn cần hỏi backend cho một bộ lọc.
 *
 * "Tất cả"/"Chưa đọc" cũng phải bó theo chế độ — không bó thì "Tất cả" ở hộp thư khách
 * kéo cả chat thử về, đúng cái làm người trực rối. */
export function nguonCanHoi(filter: string, cheDo: CheDo): string[] {
  if (filter.startsWith("kenh:")) {
    const k = filter.slice(5);
    return k === "facebook" ? ["facebook", "fb"] : [k];
  }
  return cheDo === "noibo" ? NOI_BO : KHACH_HANG;
}

/** Dãy chip. Thứ tự CÓ CHỦ Ý, không phải theo số lượng:
 *
 *     kênh khách thật (Facebook trước) → Chưa đọc → Tất cả → API ngoài
 *
 * Việc thường ngày nằm bên trái, trong tầm ngón cái. "API ngoài" đẩy xuống cuối vì đó
 * là luồng hệ thống khác đổ vào, không phải kênh người trực chăm hằng ngày — xếp theo
 * số lượng thì nó nhảy lên đầu chỉ vì đông. */
export function dungChip(facets: Facet[], cheDo: CheDo): [string, string][] {
  const laApi = (p: string) => p === "external_api";
  const co = facets.filter(({ platform }) =>
    cheDo === "noibo" ? laNoiBo(platform) : !laNoiBo(platform),
  );
  const chip = (x: Facet): [string, string] => [`kenh:${x.platform}`, `${nhanNguon(x.platform)} ${x.count}`];
  if (cheDo === "noibo") return [["all", "Tất cả"], ...co.map(chip)];

  const uuTien = (p: string) => (p === "facebook" ? 0 : 1);
  const thuong = co
    .filter((x) => !laApi(x.platform))
    .sort((a, b) => uuTien(a.platform) - uuTien(b.platform) || b.count - a.count);
  return [
    ...thuong.map(chip),
    ["unread", "Chưa đọc"],
    ["all", "Tất cả"],
    ...co.filter((x) => laApi(x.platform)).map(chip),
  ];
}

/** Chip mặc định khi mở app / đổi chế độ.
 *
 * Facebook là nơi khách thật nhắn vào nhiều nhất — mở máy ra thấy ngay việc phải làm.
 * Nhưng tenant KHÔNG có Facebook mà vẫn giữ mặc định đó thì màn hình trắng trơn, không
 * lời giải thích, và người dùng kết luận "app hỏng". */
export function chipMacDinh(facets: Facet[], cheDo: CheDo): string {
  if (cheDo === "noibo") return "all";
  if (!facets.length || facets.some((x) => x.platform === "facebook")) return "kenh:facebook";
  // Lùi về kênh khách ĐÔNG NHẤT, không phải phần tử đầu mảng — thứ tự facets là do
  // backend trả, lấy bừa thì có thể rơi vào một kênh 12 hội thoại trong khi kênh chính
  // có 900, và người dùng vẫn thấy màn gần như trống.
  const dau = facets
    .filter((x) => !laNoiBo(x.platform) && x.platform !== "external_api")
    .sort((a, b) => b.count - a.count)[0];
  return dau ? `kenh:${dau.platform}` : "all";
}
