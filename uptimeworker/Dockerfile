# syntax=docker/dockerfile:1.7

ARG UPTIMEWORKER_REPOSITORY=https://github.com/esaueng/uptimeworker-ha.git
ARG UPTIMEWORKER_REF=main

FROM node:22-bookworm-slim AS source

ARG UPTIMEWORKER_REPOSITORY
ARG UPTIMEWORKER_REF

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch "${UPTIMEWORKER_REF}" "${UPTIMEWORKER_REPOSITORY}" /source

FROM node:22-bookworm-slim AS prod-deps

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=source /source/.npmrc /source/package.json /source/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=source /source/.npmrc /source/package.json /source/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY --from=source /source ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ARG BUILD_VERSION
ARG BUILD_ARCH

LABEL \
    io.hass.version="${BUILD_VERSION}" \
    io.hass.type="app" \
    io.hass.arch="${BUILD_ARCH}"

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

COPY --from=source /source/docker/etc/nscd.conf /etc/nscd.conf
COPY --from=source /source/docker/etc/sudoers /etc/sudoers

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=source /source/package.json /source/package-lock.json /source/.npmrc ./
COPY --from=source /source/db ./db
COPY --from=source /source/docker/entrypoint.sh ./docker/entrypoint.sh
COPY --from=source /source/extra ./extra
COPY --from=source /source/server ./server
COPY --from=source /source/src ./src
COPY run.sh /run.sh

RUN mkdir -p /data \
    && chmod +x /run.sh ./docker/entrypoint.sh \
    && chown -R node:node /app /data

VOLUME ["/data"]

EXPOSE 3001

HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=5 CMD node extra/healthcheck.js

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/run.sh"]
