# صورة الـ API — multi-stage عشان الصورة النهائية تبقى صغيرة
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# 1) تثبيت كل الـ dependencies + توليد Prisma Client
FROM base AS deps
COPY package.json ./
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma generate

# 2) بناء TypeScript → JavaScript
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 3) صورة التشغيل النهائية
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 4000
CMD ["node", "dist/server.js"]
