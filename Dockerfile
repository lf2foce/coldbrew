# Ảnh production cho coldbrew — chạy trên VPS Dokploy, không còn Vercel.
#
# ⚠ ĐIỀU QUAN TRỌNG NHẤT: `NEXT_PUBLIC_*` được NHÚNG VÀO BUNDLE LÚC `next build`
# (self-hosting.md dòng 39), KHÔNG đọc lúc chạy. Đặt chúng làm env runtime trong
# Dokploy là build ra bundle rỗng: app vẫn chạy, vẫn đăng nhập được, chỉ là mất tên
# thương hiệu và mã trợ lý — tiêu đề tab tụt về "Hộp thư" và Chat thử báo chưa cấu
# hình. Hỏng kiểu đó không có log nào báo, nên phải khai làm ARG ở đây.
#
# Trong Dokploy: điền những biến này vào phần **Build-time variables / Build Args**,
# còn nhóm runtime (APP_*, SESSION_SECRET, PHENAU_API_KEY) vào Environment thường.

# ─────────────────────────── 1. thư viện ───────────────────────────
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Bản pnpm ghim theo lockfileVersion 9.0. Để corepack tự chọn thì một hôm pnpm ra bản
# mới là lockfile bị viết lại giữa hai lần build giống nhau.
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate \
 && pnpm install --frozen-lockfile

# ─────────────────────────── 2. build ───────────────────────────
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_AGENT_ID
ARG NEXT_PUBLIC_BRAND_NAME
ARG NEXT_PUBLIC_BRAND_ACCENT
ARG NEXT_PUBLIC_MOCK=0
ARG NEXT_PUBLIC_PHIN_SDK_URL
ARG NEXT_PUBLIC_ENABLE_CITATIONS
ARG NEXT_PUBLIC_ENABLE_DEAL_REVENUE
ARG NEXT_PUBLIC_ENABLE_INSIGHT_REPORT

# CỬA CHẶN. Thiếu mã trợ lý thì app dựng được nhưng vô dụng với khách, mà không
# báo lỗi ở đâu — đúng loại hỏng chỉ người dùng cuối phát hiện. Chặn ở đây để
# một lần build sai là biết ngay, không phải đợi khách phản ánh.
RUN test -n "$NEXT_PUBLIC_AGENT_ID" || { \
      echo "LỖI: thiếu build arg NEXT_PUBLIC_AGENT_ID."; \
      echo "     Nó được nhúng lúc build, đặt ở Environment runtime KHÔNG có tác dụng."; \
      echo "     Dokploy → app → Build-time variables."; exit 1; }
RUN test -n "$NEXT_PUBLIC_BRAND_NAME" || { \
      echo "LỖI: thiếu build arg NEXT_PUBLIC_BRAND_NAME (tên khách hiện trên tab + màn đăng nhập)."; \
      exit 1; }

ENV NEXT_PUBLIC_AGENT_ID=$NEXT_PUBLIC_AGENT_ID \
    NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME \
    NEXT_PUBLIC_BRAND_ACCENT=$NEXT_PUBLIC_BRAND_ACCENT \
    NEXT_PUBLIC_MOCK=$NEXT_PUBLIC_MOCK \
    NEXT_PUBLIC_PHIN_SDK_URL=$NEXT_PUBLIC_PHIN_SDK_URL \
    NEXT_PUBLIC_ENABLE_CITATIONS=$NEXT_PUBLIC_ENABLE_CITATIONS \
    NEXT_PUBLIC_ENABLE_DEAL_REVENUE=$NEXT_PUBLIC_ENABLE_DEAL_REVENUE \
    NEXT_PUBLIC_ENABLE_INSIGHT_REPORT=$NEXT_PUBLIC_ENABLE_INSIGHT_REPORT \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# VPS chạy production của khách khác trên cùng máy (phenau-backend, sister3r, radar…).
# Trần heap để một lần build phình RAM không kéo theo cả máy.
ENV NODE_OPTIONS=--max-old-space-size=2048

# Chạy test + typecheck TRƯỚC khi build: ảnh không dựng được từ cây code đang đỏ.
RUN pnpm test && pnpm typecheck && pnpm build

# ─────────────────────────── 3. chạy ───────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: "standalone"` gom sẵn node_modules cần thiết, nhưng KHÔNG gom `public/`
# và `.next/static` — hai thứ đó phải chép tay, thiếu là trang mất CSS/ảnh.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Trang /sign-in là trang công khai duy nhất chắc chắn trả 200 khi app khoẻ.
# Đừng dò "/" — nó chuyển hướng về /sign-in, healthcheck đọc 307 là coi như chết.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/sign-in').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
