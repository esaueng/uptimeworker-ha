const { describe, test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");

function read(filePath) {
    return fs.readFileSync(path.join(root, filePath), "utf8");
}

describe("Home Assistant add-on repository", () => {
    test("has repository metadata at the git root", () => {
        const repository = read("repository.yaml");

        assert.match(repository, /^name: Uptime Worker HA$/m);
        assert.match(repository, /^url: https:\/\/github\.com\/esaueng\/uptimeworker-ha$/m);
        assert.match(repository, /^maintainer: Esau Engineering$/m);
    });

    test("defines an installable Uptime Worker HA add-on", () => {
        const config = read("uptimeworker/config.yaml");

        assert.match(config, /^name: Uptime Worker HA$/m);
        assert.match(config, /^version: "1\.0\.3"$/m);
        assert.match(config, /^slug: uptimeworker$/m);
        assert.match(config, /^description: Self-hosted Uptime Worker monitoring server for Home Assistant$/m);
        assert.match(config, /^url: https:\/\/github\.com\/esaueng\/uptimeworker-ha$/m);
        assert.match(config, /^  - amd64$/m);
        assert.match(config, /^  - aarch64$/m);
        assert.match(config, /^startup: application$/m);
        assert.match(config, /^boot: auto$/m);
        assert.match(config, /^timeout: 120$/m);
        assert.match(config, /^init: false$/m);
        assert.match(config, /^webui: http:\/\/\[HOST\]:\[PORT:3001\]$/m);
        assert.match(config, /^watchdog: http:\/\/\[HOST\]:\[PORT:3001\]\/api\/entry-page$/m);
        assert.match(config, /^  3001\/tcp: 3001$/m);
        assert.match(config, /^  3001\/tcp: Uptime Worker HA web interface$/m);
        assert.doesNotMatch(config, /^image:/m, "local Home Assistant builds should use this branch, not a registry image");
    });

    test("ships the add-on build files Home Assistant expects", () => {
        for (const filePath of [
            "uptimeworker/CHANGELOG.md",
            "uptimeworker/DOCS.md",
            "uptimeworker/Dockerfile",
            "uptimeworker/README.md",
            "uptimeworker/run.sh",
        ]) {
            assert.ok(fs.existsSync(path.join(root, filePath)), `${filePath} is required`);
        }

        const dockerfile = read("uptimeworker/Dockerfile");
        const runScript = read("uptimeworker/run.sh");

        assert.match(dockerfile, /^ARG BUILD_VERSION$/m);
        assert.match(dockerfile, /^ARG BUILD_ARCH$/m);
        assert.match(dockerfile, /^ARG UPTIMEWORKER_REPOSITORY=https:\/\/github\.com\/esaueng\/uptimeworker-ha\.git$/m);
        assert.match(dockerfile, /^ARG UPTIMEWORKER_REF=main$/m);
        assert.match(dockerfile, /io\.hass\.version="\$\{BUILD_VERSION\}"/);
        assert.match(dockerfile, /io\.hass\.type="app"/);
        assert.match(dockerfile, /io\.hass\.arch="\$\{BUILD_ARCH\}"/);
        assert.match(dockerfile, /git clone --depth 1 --branch "\$\{UPTIMEWORKER_REF\}"/);
        assert.match(dockerfile, /ENV DATA_DIR=\/data/);
        assert.match(dockerfile, /EXPOSE 3001/);
        assert.match(dockerfile, /CMD \["\/run\.sh"\]/);
        assert.doesNotMatch(dockerfile, /COPY \.\./, "Home Assistant builds the add-on folder as the Docker context");

        assert.match(runScript, /export DATA_DIR="\$\{DATA_DIR:-\/data\}"/);
        assert.match(runScript, /exec \/app\/docker\/entrypoint\.sh node \/app\/server\/server\.js/);
    });

    test("versions the SQLite bootstrap database used on first startup", () => {
        assert.ok(fs.existsSync(path.join(root, "db/kuma.db")), "db/kuma.db is required for first SQLite startup");

        const gitResult = spawnSync("git", ["ls-files", "--error-unmatch", "db/kuma.db"], {
            cwd: root,
            encoding: "utf8",
        });

        assert.equal(gitResult.status, 0, gitResult.stderr || "db/kuma.db must be tracked in git");
    });
});
