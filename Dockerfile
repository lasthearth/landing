# Сайт — один контейнер: Node-сервер SSR на порту 8080 отдаёт и статику,
# и страницы (предрендер, серверный рендер вики, новостей, поселений, игроков,
# модов и 404). Так же, как раньше один nginx на 8080: Dokploy (приложение
# из Dockerfile) и compose.yaml собирают образ без дополнительных настроек.
#
# Стадия `web` (nginx перед Node) оставлена для схемы из двух контейнеров,
# но по умолчанию не собирается: ей нужен второй контейнер `app`, а без него
# nginx не стартует — так сайт упал после первой выкладки SSR.

# --- Сборка -----------------------------------------------------------------
FROM node:22.21.1-alpine3.23 AS build
WORKDIR /app

# npm ci ставит ровно версии из package-lock.json (в том числе devDependencies:
# без них не работает @angular/cli).
COPY package.json package-lock.json ./
# Кэш BuildKit переживает пересборку слоя: при смене lockfile пакеты
# не скачиваются заново. На хосте Dokploy кэш хранится между деплоями.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

# dist/last-hearth-landing/browser — статика и предрендер,
# dist/last-hearth-landing/server — Node-сервер.
# .angular/cache лежит в кэше BuildKit, а не в слое: повторный деплой после
# правки исходников пересобирает только изменившееся, а не весь проект.
RUN --mount=type=cache,target=/app/.angular/cache npm run build

# Сжатые копии текстовой статики и предрендера (*.gz, *.br): сервер отдаёт
# их сам, без nginx и без сжатия на каждый запрос.
RUN node scripts/precompress.mjs dist/last-hearth-landing/browser

# --- nginx перед Node (не по умолчанию) ---------------------------------------
FROM nginx:alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 AS web

COPY nginx.conf /etc/nginx/nginx.conf
RUN mkdir -p /var/cache/nginx/html && chown -R nginx:nginx /var/cache/nginx
COPY --from=build /app/dist/last-hearth-landing/browser /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

# --- Node: сайт целиком (стадия по умолчанию — последняя) ---------------------
FROM node:22-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Серверный бандл самодостаточен: express и прочие зависимости собраны внутрь
# server.mjs, поэтому node_modules в образ не копируются.
COPY --from=build /app/dist/last-hearth-landing ./dist/last-hearth-landing

EXPOSE 8080
USER node

CMD ["node", "dist/last-hearth-landing/server/server.mjs"]
