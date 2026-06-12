const { describe, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");

describe("single-container Docker deployment", () => {
    const dockerfilePath = path.join(root, "Dockerfile");
    const composePath = path.join(root, "compose.yaml");
    const entrypointPath = path.join(root, "docker/entrypoint.sh");
    const docsPath = path.join(root, "docs/docker.md");

    test("builds a self-contained image from this repository", () => {
        assert.ok(fs.existsSync(dockerfilePath), "top-level Dockerfile is required");

        const dockerfile = fs.readFileSync(dockerfilePath, "utf8");

        assert.match(dockerfile, /FROM node:22-bookworm-slim AS prod-deps/);
        assert.match(dockerfile, /RUN npm ci --omit=dev/);
        assert.match(dockerfile, /FROM node:22-bookworm-slim AS build/);
        assert.match(dockerfile, /RUN npm ci/);
        assert.match(dockerfile, /RUN npm run build/);
        assert.doesNotMatch(dockerfile, /louislam\/uptime-kuma/);
        assert.doesNotMatch(dockerfile, /wrangler dev/);
    });

    test("runs the retained Node server with persistent SQLite data", () => {
        const dockerfile = fs.readFileSync(dockerfilePath, "utf8");
        const entrypoint = fs.readFileSync(entrypointPath, "utf8");

        assert.match(dockerfile, /ENV DATA_DIR=\/data/);
        assert.match(dockerfile, /ENV UPTIME_KUMA_DB_TYPE=sqlite/);
        assert.match(dockerfile, /ENV UPTIME_KUMA_IS_CONTAINER=1/);
        assert.match(dockerfile, /EXPOSE 3001/);
        assert.match(dockerfile, /HEALTHCHECK[\s\S]*node extra\/healthcheck\.js/);
        assert.match(dockerfile, /ENTRYPOINT \["\/usr\/bin\/dumb-init", "--", "\/app\/docker\/entrypoint\.sh"\]/);
        assert.match(dockerfile, /CMD \["node", "server\/server\.js"\]/);
        assert.match(entrypoint, /mkdir -p "\$\{DATA_DIR:-\/data\}"/);
        assert.match(entrypoint, /chown -R node:node "\$\{DATA_DIR:-\/data\}"/);
        assert.match(entrypoint, /exec runuser -u node -- "\$@"/);
    });

    test("ships a compose file and operator docs for Home Assistant hosts", () => {
        const compose = fs.readFileSync(composePath, "utf8");
        const docs = fs.readFileSync(docsPath, "utf8");

        assert.match(compose, /build:\s*\n\s*context: \./);
        assert.match(compose, /image: uptimeworker:local/);
        assert.match(compose, /3001:3001/);
        assert.match(compose, /\.\/data:\/data/);
        assert.match(compose, /restart: unless-stopped/);
        assert.match(docs, /Home Assistant/);
        assert.match(docs, /docker build -t uptimeworker:local \./);
        assert.match(docs, /-v .*:\/data/);
    });
});
