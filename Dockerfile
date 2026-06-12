# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS prod-deps

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

COPY .npmrc package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

COPY .npmrc package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV UPTIME_KUMA_DB_TYPE=sqlite
ENV UPTIME_KUMA_IS_CONTAINER=1
ENV UPTIME_KUMA_PORT=3001
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        chromium \
        curl \
        dumb-init \
        fonts-indic \
        fonts-noto \
        fonts-noto-cjk \
        iputils-ping \
        nscd \
        sqlite3 \
        sudo \
        util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get --yes autoremove

COPY docker/etc/nscd.conf /etc/nscd.conf
COPY docker/etc/sudoers /etc/sudoers

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json .npmrc ./
COPY db ./db
COPY docker/entrypoint.sh ./docker/entrypoint.sh
COPY extra ./extra
COPY server ./server
COPY src ./src

RUN mkdir -p /data \
    && chmod +x ./docker/entrypoint.sh \
    && chown -R node:node /app /data

VOLUME ["/data"]

EXPOSE 3001

HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=5 CMD node extra/healthcheck.js

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/docker/entrypoint.sh"]
CMD ["node", "server/server.js"]
