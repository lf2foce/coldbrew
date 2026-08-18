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
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const TENANT_HEADER = "X-Phenau-Tenant-Id";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const body = Buffer.from(await request.arrayBuffer());
  const authorization = request.headers.get("Authorization") || "";
  const tenantId = request.headers.get(TENANT_HEADER) || "";
  const url = new URL(`/api/v1/agents/${agentId}/chat`, BACKEND_URL);

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
          Authorization: authorization,
          ...(tenantId ? { [TENANT_HEADER]: tenantId } : {}),
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
          proxyRes.on("end", () =>
            resolve(
              new NextResponse(errorBody || `Backend ${status}`, {
                status,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
            ),
          );
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
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          }),
        );
      },
    );

    proxyReq.on("error", (err) =>
      resolve(
        new NextResponse(`Proxy request failed: ${String(err)}`, {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
      ),
    );

    proxyReq.write(body);
    proxyReq.end();
  });
}
