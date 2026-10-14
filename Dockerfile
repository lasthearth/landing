# Один файл — два целевых состояния (собираются из общей стадии сборки):
#   --target app — Node-сервер SSR: рендерит статьи вики, новости, поселения,
#                  игроков и 404 по запросу;
#   --target web — nginx: отдаёт статику сборки сам и проксирует HTML на app.
# compose.yaml собирает оба; стадия `build` у них общая, поэтому BuildKit
# выполняет её один раз и второй раз берёт из кэша.

# --- Сборка -----------------------------------------------------------------
FROM node:22.21.1-alpine3.23 AS build
WORKDIR /app

# npm ci ставит ровно версии из package-lock.json (в том числе devDependencies:
# без них не работает @angular/cli). Глобальный @angular/cli не нужен —
# вызывается локальный CLI через npm-скрипт.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ng build в конфигурации production (она по умолчанию) кладёт
# dist/last-hearth-landing/browser — статику и предрендер,
# dist/last-hearth-landing/server — Node-сервер.
RUN npm run build

# --- Node: серверный рендер -------------------------------------------------
FROM node:22-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Серверный бандл самодостаточен: express и прочие зависимости собраны внутрь
# server.mjs, внешних import из node_modules в нём нет. Поэтому node_modules
# в рантайм не копируются (образ легче и деплой быстрее).
# browser/ обязателен: из него сервер берёт index.csr.html и предрендер.
COPY --from=build /app/dist/last-hearth-landing ./dist/last-hearth-landing

EXPOSE 4000
USER node

CMD ["node", "dist/last-hearth-landing/server/server.mjs"]

# --- nginx: статика и прокси на node ----------------------------------------
FROM nginx:alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 AS web

COPY nginx.conf /etc/nginx/nginx.conf

# Каталог кэша HTML создаём заранее и отдаём пользователю nginx: рабочие
# процессы пишут в него сами (мастер при старте создал бы его от root).
RUN mkdir -p /var/cache/nginx/html && chown -R nginx:nginx /var/cache/nginx

# Статику nginx отдаёт со своей файловой системы, минуя node.
COPY --from=build /app/dist/last-hearth-landing/browser /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
