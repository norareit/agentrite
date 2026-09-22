#!/usr/bin/env bash
#
# Thin wrapper around `docker compose run`. It exists only because Compose cannot
# take an ad-hoc mount per invocation: it translates the working directory and any
# --mount flags into `docker compose run --volume` options and passes the rest
# through. It sets nothing that confines the container; every such setting is in
# container/compose.yml and the project's agent/compose.project.yml, and the
# firewall is in container/entrypoint.sh.
#
# It layers the project's compose file over the kit's base, with
# --project-directory set to the project root so that every relative path in
# either file resolves from there.
#
# Usage:
#   ./agent.sh [--rebuild] [--workdir DIR] [--mount HOST[:ro]]... [COMMAND...]
#
#   --rebuild        build the image before running, even if it already exists
#   --workdir DIR    mount DIR at /work instead of the project root
#   --mount HOST     also mount HOST at /mnt/<basename>, read-write
#   --mount HOST:ro  the same, read-only
#   COMMAND...       run this instead of an interactive shell
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The kit is vendored at <project>/agent-kit, so the project root is two levels up.
root="$(cd "$here/../.." && pwd)"
project_compose="$root/agent/compose.project.yml"

if [ ! -f "$project_compose" ]; then
  echo "agent.sh: $project_compose not found." >&2
  echo "Each project supplies its own compose file at that path, holding the Compose" >&2
  echo "project name, the image name, the egress allowlist, the resource limits and" >&2
  echo "the Playwright version. See the kit's README.md." >&2
  exit 2
fi

compose=(docker compose --project-directory "$root" -f "$here/compose.yml" -f "$project_compose")

workdir="$root"
rebuild=0
mounts=()

while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild)
      rebuild=1
      shift
      ;;
    --workdir)
      [ $# -ge 2 ] || { echo "agent.sh: --workdir needs a directory" >&2; exit 2; }
      workdir="$(cd "$2" && pwd)"
      shift 2
      ;;
    --mount)
      [ $# -ge 2 ] || { echo "agent.sh: --mount needs a path" >&2; exit 2; }
      spec="$2"
      opts=""
      case "$spec" in
        *:ro) opts=":ro"; spec="${spec%:ro}" ;;
      esac
      host="$(cd "$spec" && pwd)"
      mounts+=(--volume "$host:/mnt/$(basename "$host")$opts")
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

export AGENT_UID AGENT_GID
AGENT_UID="$(id -u)"
AGENT_GID="$(id -g)"

# Building as root would make the "agent" account inside the container root too, which
# defeats the sandbox. sudo is a foreseeable reach when Docker is not in the caller's
# group; the real fix is group membership, not privilege. container/Dockerfile refuses
# this too, so a direct `docker compose build` bypassing this wrapper is still caught.
if [ "$AGENT_UID" -eq 0 ] || [ "$AGENT_GID" -eq 0 ]; then
  echo "agent.sh: refusing to run as root (uid/gid 0)." >&2
  echo "The sandbox's 'agent' user would then be root, defeating the sandbox." >&2
  echo "If Docker needs elevated permissions, add your user to the docker group" >&2
  echo "instead of running this with sudo." >&2
  exit 2
fi

# The image name is the project's to choose, so ask Compose for it rather than
# hard-coding one here.
image="$("${compose[@]}" config --images | head -1)"

if [ "$rebuild" -eq 1 ] || ! docker image inspect "$image" >/dev/null 2>&1; then
  "${compose[@]}" build
fi

exec "${compose[@]}" run --rm \
  --volume "$workdir:/work" \
  ${mounts[@]+"${mounts[@]}"} \
  agent "$@"
