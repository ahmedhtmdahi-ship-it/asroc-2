# صورة الـ API — multi-stage. بنبني bundle JS مترجم (esbuild) ونشغّل السيرفر بـ
# node مباشرة — مش tsx وقت التشغيل. السيرفر (العملية الطويلة المتعرّضة للشبكة)
# بيشتغل بمستخدم non-root. البناء من جذر المشروع عشان يتحل @asroc/shared:
#   docker build -f api/Dockerfile .   (السياق = جذر المشروع)

# ───────────── build ─────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# manifests الأول (طبقة install مخبّأة)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json ./api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# الكود + توليد Prisma client + bundle السيرفر
COPY packages/shared ./packages/shared
COPY api ./api
WORKDIR /app/api
RUN pnpm exec prisma generate
RUN pnpm run build            # esbuild → dist/server.mjs

# ───────────── runtime ─────────────
FROM node:22-alpine AS runtime
# su-exec عشان الـ entrypoint يقوم root (migrate/seed + chown) ويسلّم السيرفر لـ node.
RUN apk add --no-cache su-exec
WORKDIR /app
RUN corepack enable

COPY --from=build /app /app
WORKDIR /app/api

ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["/bin/sh", "/app/api/docker-entrypoint.sh"]
