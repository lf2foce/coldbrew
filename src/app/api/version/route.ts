/**
 * Commit đang chạy — để workflow deploy XÁC MINH bản mới đã thật sự lên.
 *
 * Vì sao cần: lần dựng đầu trên VPS (08/10/2026), Dokploy báo "done" trong khi service
 * 0/1 vì container chết lúc khởi động. Tín hiệu "deploy xong" của Dokploy chỉ nói ảnh đã
 * được kéo về, không nói app đang chạy bản đó. Workflow gọi hook rồi chờ tới khi đường này
 * trả đúng commit vừa push; không thấy thì job đỏ.
 *
 * Công khai (proxy.ts bỏ qua /api): commit của repo public không phải bí mật, và đường này
 * không đụng phiên hay backend.
 */
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ commit: process.env.GIT_SHA || "unknown" });
}
