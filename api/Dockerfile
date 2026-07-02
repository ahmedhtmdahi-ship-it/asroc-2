# صورة الـ API — تُبنى من جذر المشروع (workspace) عشان يتحل @asroc/shared.
# بناء:  docker build -f api/Dockerfile .   (السياق = جذر المشروع)
FROM node:22-alpine
WORKDIR /app
RUN corepack enable

# 1) manifests الأول (طبقة install مخبّأة)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json ./api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# 2) الكود
COPY packages/shared ./packages/shared
COPY api ./api

# 3) توليد Prisma Client (محتاج شبكة لتنزيل المحرّك أول مرة)
WORKDIR /app/api
RUN pnpm exec prisma generate

ENV NODE_ENV=production
EXPOSE 4000

# migrate deploy + seed + تشغيل السيرفر (عبر tsx — مفيش خطوة compile فبنتجنّب مشاكل .ts وقت التشغيل)
ENTRYPOINT ["/bin/sh", "/app/api/docker-entrypoint.sh"]
