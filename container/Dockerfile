# syntax=docker/dockerfile:1
#
# The agent sandbox image. Builds Claude Code and OpenCode into one Debian container
# that can run the project's own suites. The kit's SANDBOX.md describes the sandbox; the
# project's README.md describes how that project runs it.

# Harness versions. The kit names none: the last stage's CLAUDE_CODE_VERSION and
# OPENCODE_VERSION have no default, and container/agent.sh hands the build both. Each is
# the version the project's compose file gives, or else the one the host has, or else
# the latest published at the time of the build, which the wrapper asks the registry for
# and hands over as an exact version.

# The browser is in the image only when the project's compose file gives this build
# argument, as the playwright version resolved in the project's package-lock.json, so the
# project's committed *-chromium-linux.png baselines still compare. It has no default:
# absent or empty, the image is built without a browser, and nothing of Playwright's is
# pulled or read.
ARG PLAYWRIGHT_VERSION

# The browser bundle source. A stage of its own so the version ARG can be interpolated
# into the image reference, which `COPY --from` cannot do on its own. Firefox and WebKit
# are dropped here: only chromium is used. Nothing is built from this stage, and its base
# image is never pulled, unless the last stage builds from base-with-browsers.
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy AS playwright
RUN rm -rf /ms-playwright/firefox-* /ms-playwright/webkit-*

# node:26 is Debian (bookworm). Alpine cannot run Playwright's glibc-linked Chromium,
# which the committed *-chromium-linux.png baselines were rendered with. Multi-arch:
# this tag has linux/amd64 and linux/arm64, so no --platform is needed on either machine.
FROM node:26-bookworm AS base

ENV DEBIAN_FRONTEND=noninteractive

# iptables and dnsutils (dig) are for entrypoint.sh (the start-up firewall); git is
# for the agent's commits; curl and jq are diagnostics the entrypoint's self-check uses.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      dnsutils \
      git \
      iproute2 \
      iptables \
      jq \
    && rm -rf /var/lib/apt/lists/*

# The same image with Playwright's browser. Built from only when PLAYWRIGHT_VERSION is
# given, which the last stage's FROM decides.
FROM base AS base-with-browsers

# Playwright's own Chromium build, baked in at a fixed path so no browser download
# happens at run time. Copied from the official Playwright image rather than downloaded
# during the build, which deadlocks under BuildKit.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
COPY --from=playwright /ms-playwright /opt/playwright

# The browsers' system libraries, resolved from the project's own dependencies, which is
# why the build context is the project root rather than this directory.
# `playwright install-deps` only runs apt, no download.
COPY package.json package-lock.json /opt/pw/
RUN cd /opt/pw \
    && npm ci --no-audit --no-fund \
    && npx playwright install-deps chromium \
    && cd / \
    && rm -rf /opt/pw /root/.npm

# The image the build produces: base, or base-with-browsers when PLAYWRIGHT_VERSION is
# given. The expansion is empty for an absent or empty argument, and BuildKit then runs
# neither the playwright stage nor base-with-browsers.
FROM base${PLAYWRIGHT_VERSION:+-with-browsers}

ARG CLAUDE_CODE_VERSION
ARG OPENCODE_VERSION

# The developer's uid and gid on the host, so a Linux bind mount of the working
# directory stays writable from inside without changing ownership on the host.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Both harness CLIs, each at exactly the version of its build argument, installed
# globally as root. Nothing self-updates, so a read-only root filesystem can protect the
# install. Auto-update is disabled explicitly rather than left to fail against the
# firewall.
RUN npm install -g --no-audit --no-fund \
      "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
      "opencode-ai@${OPENCODE_VERSION}" \
    && rm -rf /root/.npm

# The two versions this image was built with. container/agent.sh reads them at each
# start and builds again when they are not the versions it wants. After the install, so
# that they are no part of what decides whether the install runs again.
LABEL com.ritenoar.agentrite.claude-code-version="${CLAUDE_CODE_VERSION}" \
      com.ritenoar.agentrite.opencode-version="${OPENCODE_VERSION}"

# DISABLE_AUTOUPDATER stops Claude Code's background check; DISABLE_UPDATES also blocks
# `claude update`. OpenCode has no env switch, so point it at a config that sets
# autoupdate false; its project opencode.json does not override that key.
ENV DISABLE_AUTOUPDATER=1 \
    DISABLE_UPDATES=1 \
    OPENCODE_CONFIG=/etc/opencode/opencode.json
RUN mkdir -p /etc/opencode \
    && printf '{\n  "$schema": "https://opencode.ai/config.json",\n  "autoupdate": false\n}\n' \
       > /etc/opencode/opencode.json

# A non-root user owning the working directory and its own home. The node image already
# holds uid 1000 as "node"; drop it so the developer's uid is free to reuse. The uid and
# gid come from the host, and on macOS the gid is 20, which Debian already assigns to
# "dialout"; `-o` lets the agent group and user take an id that is already in use so the
# build still succeeds, while the group stays named "agent" for the privilege drop.
#
# Refuse 0: `sudo ./agent.sh` (a foreseeable fix when Docker is not in the caller's
# group) forwards uid/gid 0 into the build. Without this check the "agent" account is
# root, and the entrypoint's later drop from root to root is a no-op that leaves the
# firewall capabilities in place. The sandbox needs an account that is actually
# unprivileged, not one merely named "agent".
RUN if [ "${AGENT_UID}" = "0" ] || [ "${AGENT_GID}" = "0" ]; then \
      echo "AGENT_UID/AGENT_GID must not be 0: the agent account would be root." >&2; \
      echo "Do not run agent.sh with sudo; add your user to the docker group instead." >&2; \
      exit 1; \
    fi \
    && userdel -r node 2>/dev/null || true \
    && groupadd -o -g "${AGENT_GID}" agent \
    && useradd -o -m -u "${AGENT_UID}" -g agent -s /bin/bash agent \
    && mkdir -p /work \
    && chown "${AGENT_UID}:${AGENT_GID}" /work /home/agent

# The two directories that container/agent.sh mounts from the host for the harnesses'
# logs, and every directory above them in the home, as the agent's. Docker fills a new
# home volume from the image, ownership included, before it mounts anything inside it,
# so the mount points are found there. A mount point that a volume lacks is made by
# Docker as root, with every missing directory above it, and the agent then cannot write
# ~/.claude, where Claude Code keeps its login and its settings. The entrypoint refuses
# a volume that was made without these.
RUN mkdir -p /home/agent/.claude/projects /home/agent/.local/share/opencode \
    && chown -R "${AGENT_UID}:${AGENT_GID}" /home/agent/.claude /home/agent/.local

# The egress proxy's own account. The firewall exempts this uid from the redirect to the
# proxy and lets it alone connect out on 443, so it must be distinct from the agent.
# Created after the agent, as a system account, so that useradd picks a uid nothing else
# holds; Debian's existing "proxy" account is not used, because the agent is created
# with -o and could have taken its uid.
RUN useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin egress-proxy \
    && [ "$(id -u egress-proxy)" != "$(id -u agent)" ]

WORKDIR /work

# The container starts as root so the entrypoint can install the firewall and start the
# egress proxy; the entrypoint drops to the agent user before running the command. Every
# confinement setting other than the firewall lives in the compose files.
# KIT_CONTAINER is this directory relative to the build context, the project root. It
# depends on where the kit is installed, so container/agent.sh supplies it.
ARG KIT_CONTAINER
COPY ${KIT_CONTAINER}/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ${KIT_CONTAINER}/egress-proxy.mjs ${KIT_CONTAINER}/sni.mjs /usr/local/lib/egress-proxy/
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]
