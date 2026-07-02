# صورة الواجهة (React/Vite) — بناء ثم تقديم عبر nginx.
# بناء:  docker build -f Dockerfile .   (السياق = جذر المشروع)
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json ./api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .

# العنوان اللي الواجهة هتكلّم عليه الـ API — افتراضيًا same-origin عبر بروكسي nginx على /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
