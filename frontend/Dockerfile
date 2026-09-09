FROM node:24-alpine AS build
ARG APP_NAME
ARG VITE_API_BASE_URL=""
ARG VITE_PUBLIC_WEB_URL="http://localhost:5173"
ARG VITE_ADMIN_WEB_URL="http://localhost:5174"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_WEB_URL=$VITE_PUBLIC_WEB_URL
ENV VITE_ADMIN_WEB_URL=$VITE_ADMIN_WEB_URL
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@gigabyte-cashback/${APP_NAME}" build

FROM nginx:1.29-alpine
ARG APP_NAME
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/${APP_NAME}/dist /usr/share/nginx/html
EXPOSE 8080
