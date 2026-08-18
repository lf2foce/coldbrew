/**
 * Chuỗi tiếng Việt cho Clerk, ĐÃ BÓC tên Clerk-app ra.
 *
 * Vì sao cần: instance Clerk dùng chung với dashboard chính nên `applicationName`
 * là "Phe Nau" và KHÔNG đổi được ở Clerk Dashboard (đổi thì dashboard chính đổi
 * theo). Clerk chèn tên đó vào chuỗi qua token `{{applicationName}}`.
 *
 * Vì sao quét cả bộ thay vì đè từng khoá: có 13 chuỗi mang token này. Đè tay
 * `signIn.start.title` xong thì tên vẫn hiện ở bước nhập mã email ("để tiếp tục
 * đến Phe Nau"), ở màn chọn workspace… — mỗi bản Clerk lại thêm khoá mới. Thay
 * token ở MỘT chỗ thì bản sau có thêm chuỗi cũng tự sạch.
 */
import { viVN } from "@clerk/localizations";
import { BRAND } from "./brand";

/** Thay `{{applicationName}}` bằng tên khách, giữ nguyên mọi token khác
 *  (`{{provider}}`, `{{identifier}}`… vẫn phải để Clerk tự điền). */
function rebrand<T>(node: T): T {
  if (typeof node === "string") {
    return node.replaceAll("{{applicationName}}", BRAND.name) as T;
  }
  if (Array.isArray(node)) return node.map(rebrand) as T;
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, rebrand(v)]),
    ) as T;
  }
  return node;
}

const vi = rebrand(viVN);

export const localization = {
  ...vi,
  signIn: {
    ...vi.signIn,
    start: {
      ...vi.signIn?.start,
      // Màn đăng nhập đã có <h1> tên khách ngay phía trên thẻ, nên ở đây dùng
      // chữ trung tính cho khỏi lặp tên hai lần. `titleCombined` mới là khoá
      // Clerk thực sự render ở luồng gộp (email + mật khẩu một màn) — `title`
      // chỉ dùng cho luồng cũ, giữ cả hai để không phụ thuộc bản Clerk.
      title: "Đăng nhập",
      titleCombined: "Đăng nhập",
      subtitle: "Đăng nhập để xem hộp thư của bạn",
    },
  },
};
