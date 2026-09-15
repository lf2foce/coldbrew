/**
 * Proxy SSE cho chat — KHÔNG dùng rewrite của next.config.
 *
 * Vì sao phải có route riêng: rewrite đi qua `fetch()` của Node, mà `fetch()`
 * ĐỆM phản hồi — backend bắn từng mảnh `delta` ngay từ giây đầu nhưng trình
 * duyệt chỉ nhận được khi stream đóng, nên chữ hiện một cục sau 5–10 giây dù
 * phía client đã đọc bằng `getReader()`.
 *
 * Dùng `node:http` để đẩy từng chunk sang thẳng client. Đây đúng cách dashboard
 * chính làm (`frontend/src/app/api/chat/[agentId]/route.ts`) — comment ở đó ghi
 * rõ "avoid the buffering that Node.js fetch() does".
 *
 * `X-Accel-Buffering: no` để proxy phía trước (Vercel/nginx) cũng không đệm lại.
 */

import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";
import {
  cookieOptions,
  hasUsableSession,
  isBrokerSession,
  SESSION_COOKIE,
  SESSION_STATE_HEADER,
  cungNguonGoc,
} from "@/lib/session";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  // Cổng phiên: route này KHÔNG đi qua BFF proxy nên phải tự kiểm, nếu không nó
  // thành cửa sau bỏ qua đăng nhập.
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await hasUsableSession(rawSession))) {
    return new NextResponse("Chưa đăng nhập", { status: 401, headers: { [SESSION_STATE_HEADER]: "expired" } });
  }
  if (!cungNguonGoc(request)) {
    return new NextResponse("Nguồn gốc không hợp lệ", { status: 403 });
  }
  const brokerSession = isBrokerSession(rawSession);
  const credential = brokerSession ? rawSession : process.env.PHENAU_API_KEY || "";
  if (!credential) {
    return new NextResponse("Chưa cấu hình PHENAU_API_KEY", { status: 500 });
  }
  const body = Buffer.from(await request.arrayBuffer());
  const url = new URL(`/api/v1/agents/${agentId}/chat`, backendUrl());

  return await new Promise<NextResponse>((resolve) => {
    const transport = url.protocol === "https:" ? https : http;
    const proxyReq = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("Content-Type") || "application/json",
          "Content-Length": String(body.byteLength),
          Accept: "text/event-stream",
          Authorization: `Bearer ${credential}`,
          ...(brokerSession ? { "X-Coldbrew-Host": request.nextUrl.hostname } : {}),
        },
      },
      (proxyRes) => {
        const status = proxyRes.statusCode ?? 500;

        // Lỗi thì gom trọn thân rồi trả — client cần đọc được thông điệp, và
        // stream lỗi chẳng có gì để chảy.
        if (status !== 200) {
          let errorBody = "";
          proxyRes.setEncoding("utf8");
          proxyRes.on("data", (c) => (errorBody += c));
          proxyRes.on("end", () => {
            const res = new NextResponse(errorBody || `Backend ${status}`, {
              status,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
            if (brokerSession && status === 401) {
              res.headers.set(SESSION_STATE_HEADER, "expired");
              res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
            }
            resolve(res);
          });
          return;
        }

        const stream = new ReadableStream({
          start(controller) {
            proxyRes.on("data", (chunk: Buffer) => controller.enqueue(chunk));
            proxyRes.on("end", () => controller.close());
            proxyRes.on("error", (err) => controller.error(err));
            proxyReq.on("error", (err) => controller.error(err));
          },
          // Client đóng tab giữa chừng → cắt luôn kết nối tới backend, đừng để
          // nó chạy tiếp và tốn lượt LLM cho câu không ai đọc.
          cancel() {
            proxyReq.destroy();
          },
        });

        resolve(
          new NextResponse(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "private, no-store, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          }),
        );
      },
    );

    proxyReq.on("error", (err) => {
      // Chuỗi lỗi thô chứa URL backend nội bộ: ghi log server, không trả về trình duyệt.
      console.error("[coldbrew] chat proxy failed", err);
      resolve(
        new NextResponse("Proxy request failed", {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
      );
    });

    proxyReq.write(body);
    proxyReq.end();
  });
}
