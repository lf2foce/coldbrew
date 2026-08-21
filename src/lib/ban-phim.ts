"use client";

import { useEffect, useState } from "react";

/**
 * Bàn phím ảo có đang bật không.
 *
 * Không có sự kiện "keyboard opened" nào cả. Cách duy nhất đáng tin trên iOS lẫn
 * Android là đo `visualViewport` — vùng THẬT SỰ nhìn thấy, co lại khi bàn phím trồi
 * lên; còn `window.innerHeight` thì không đổi.
 *
 * Ngưỡng 25%: bàn phím chiếm 35–50% màn hình, trong khi thanh địa chỉ của trình duyệt
 * co giãn khi cuộn chỉ ăn ~10%. Đặt thấp quá là cuộn trang cũng bị hiểu nhầm thành mở
 * bàn phím, thanh điều hướng chớp tắt liên tục.
 *
 * Trình duyệt không có `visualViewport` (Safari rất cũ) thì luôn trả false — mất một
 * cải tiến nhỏ, không vỡ gì.
 */
/** Phần QUYẾT ĐỊNH, tách khỏi hook để test được — headless không mở nổi bàn phím thật.
 *
 * @param caoCuaSo   `window.innerHeight` — không đổi khi bàn phím trồi lên
 * @param caoNhinThay `visualViewport.height` — co lại đúng bằng chiều cao bàn phím
 */
export function banPhimDangMo(caoCuaSo: number, caoNhinThay: number): boolean {
  return caoCuaSo - caoNhinThay > caoCuaSo * 0.25;
}

export function dungBanPhimMo(): boolean {
  const [mo, setMo] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const do_ = () => setMo(banPhimDangMo(window.innerHeight, vv.height));
    do_();
    vv.addEventListener("resize", do_);
    return () => vv.removeEventListener("resize", do_);
  }, []);

  return mo;
}
