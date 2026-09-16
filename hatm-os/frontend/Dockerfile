FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:8000
ARG VITE_USE_MOCK=false
ENV VITE_API_URL=$VITE_API_URL VITE_USE_MOCK=$VITE_USE_MOCK
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
