/** Chiều cao ô soạn, tách khỏi component để test được.
 *
 * @param caoNoiDung `scrollHeight` — 0 khi phần tử đang nằm trong khung `display:none`
 * @param caoDong    chiều cao một dòng
 * @param soDongToiDa quá số dòng này thì cuộn trong ô
 */
export function caoOSoan(caoNoiDung: number, caoDong: number, soDongToiDa: number): number {
  // Sàn một dòng là chốt chính. Thiếu nó thì ô đo lúc đang ẩn (scrollHeight = 0) bị
  // đặt height 0px, và vì nội dung không đổi nên không ai đo lại — ô kẹt 0px, chạm
  // vào không được. Đó là lỗi "Chat thử không gõ được" trên điện thoại.
  return Math.max(caoDong, Math.min(caoNoiDung, caoDong * soDongToiDa));
}
