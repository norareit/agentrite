#!/usr/bin/env bash
#
# Thin wrapper around `docker compose run`. It exists only because Compose cannot
# take an ad-hoc mount per invocation: it translates the working directory and any
# --mount flags into `docker compose run --volume` options, adds the developer's
# Claude Code status line when the host has one, and passes the rest
# through. It sets nothing that confines the container; every such setting is in
# container/compose.yml and the project's agent/compose.project.yml, and the
# firewall is in container/entrypoint.sh.
#
# It also decides which versions of Claude Code and OpenCode the image holds. Each is
# the first of: the version the project's compose file gives, and the version the host's
# own command reports. When the image was built with another version than that, it
# builds the image again before it runs, and says why. The kit names no version of its
# own: a harness with neither keeps the version the image holds, and gets the latest
# published one, which the wrapper asks npm for and names, whenever the image is built.
#
# It layers the project's compose file over the kit's base, with
# --project-directory set to the project root so that every relative path in
# either file resolves from there.
#
# Usage:
#   agent.sh PROJECT_ROOT [--rebuild] [--workdir DIR] [--mount HOST[:ro]]... [COMMAND...]
#
#   PROJECT_ROOT     the project's root, which the project's agent.sh shim passes
#   --rebuild        build the image before running, even if it already exists and
#                    holds the wanted harness versions
#   --workdir DIR    mount DIR at /work instead of the project root
#   --mount HOST     also mount HOST at /mnt/<basename>, read-write
#   --mount HOST:ro  the same, read-only
#   COMMAND...       run this instead of an interactive shell
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The caller names the project root. The kit is an installed package, and how deep it
# sits under node_modules depends on the scope, on hoisting and on the package manager,
# so counting directories up from here would be a guess.
if [ $# -lt 1 ] || [ ! -d "$1" ]; then
  echo "agent.sh: the first argument must be the project root." >&2
  echo "A project's own agent.sh shim passes it; run that rather than this file." >&2
  exit 2
fi
root="$(cd "$1" && pwd)"
shift
project_compose="$root/agent/compose.project.yml"

if [ ! -f "$project_compose" ]; then
  echo "agent.sh: $project_compose not found." >&2
  echo "Each project supplies its own compose file at that path, holding the Compose" >&2
  echo "project name, the image name, the egress allowlist, the resource limits and" >&2
  echo "the Playwright version, if it has one. See the kit's README.md." >&2
  exit 2
fi

# The image is built from the project root, so the build can reach the kit's files only
# when the kit is installed inside that root. Compose and the Dockerfile take its path
# from here rather than naming it.
case "$here" in
  "$root"/*) ;;
  *)
    echo "agent.sh: the kit at $here is not inside the project root $root," >&2
    echo "so the image build cannot reach it. Install it as the project's dependency." >&2
    exit 2
    ;;
esac
export AGENTRITE_CONTAINER="${here#"$root"/}"

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

# The developer's own Claude Code status line, read-only: the script from the host, and
# the kit's managed settings file, whose one setting runs it. Both or neither, and only
# after looking, because Compose cannot make a mount conditional. Docker creates a
# root-owned directory at a source that is not there, which here would be inside the
# developer's ~/.claude, and a managed statusLine with no script to run would blank a
# status line set inside the sandbox.
statusline="${HOME:-}/.claude/statusline-command.sh"
if [ -f "$statusline" ]; then
  mounts+=(
    --volume "$statusline:/etc/claude-code/statusline-command.sh:ro"
    --volume "$here/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro"
  )
fi

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

# Whether a word has the shape of a version: three numbers separated by dots, optionally
# followed by a hyphen and a pre-release part, which is accepted because OpenCode
# publishes such versions. A version becomes part of an `npm install` that runs as root
# in the build, so nothing of another shape is passed on.
is_version() {
  local shape='^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'
  # The ranges of the shape are those of ASCII only in this locale.
  local LC_ALL=C
  [[ "$1" =~ $shape ]]
}

# The first word of the first line of what a command printed, when that is a version.
# Fails when it is not.
version_printed() {
  local word
  # read takes the first line only.
  read -r word _ <<< "$1"
  is_version "$word" || return 1
  echo "$word"
}

# What the host's command reports as its version, when the command exits 0. Prints
# nothing for a command that is not on the PATH, and fails for one that is there and
# gave no version.
host_version() {
  local harness_command="$1" output
  type -P "$harness_command" >/dev/null || return 0
  output="$("$harness_command" --version </dev/null 2>/dev/null)" || return 1
  version_printed "$output"
}

# Prints the host's version of a harness, or nothing when the host does not have it. A
# command that is there and gives no version counts as not installed, and is named: the
# sandbox would otherwise be unaccountably not on the host's version.
installed_version() {
  local harness_command="$1" harness="$2" version
  if ! version="$(host_version "$harness_command")"; then
    echo "agent.sh: '$harness_command --version' printed no version," \
      "so $harness counts as not installed on the host." >&2
    return 0
  fi
  echo "$version"
}

# Prints the latest published version of a harness's package, as npm on the host gives
# it. Without retries, which a registry that refuses the connection would otherwise take
# over a minute of. Fails, saying how to get past it, when there is none to be had: no
# npm on the PATH, a command that fails, or output that is not a version.
latest_published() {
  local harness="$1" package="$2" argument="$3" output version
  output="$(npm view "$package" version --fetch-retries=0 </dev/null 2>/dev/null)" || output=""
  if ! version="$(version_printed "$output")"; then
    echo "agent.sh: could not find the latest published version of $harness:" \
      "'npm view $package version' gave none." >&2
    echo "Give a version in agent/compose.project.yml, under services.agent.build.args as $argument," \
      "or install $harness on the host." >&2
    return 1
  fi
  echo "$version"
}

# Says, for one harness, that the image is built again and why, when the version the
# image holds is not the wanted one. Fails when it is.
differs_from_image() {
  local harness="$1" held="$2" wanted="$3" origin="$4"
  [ "$held" != "$wanted" ] || return 1
  if [ -n "$held" ]; then
    echo "agent.sh: the image holds $harness $held and $wanted is wanted, from $origin. Rebuilding." >&2
  else
    echo "agent.sh: the image records no $harness version and $wanted is wanted, from $origin. Rebuilding." >&2
  fi
}

# Whether one harness makes a build due. With a version from the project or the host,
# when the image holds another. With neither, which an empty origin says, only when the
# image records no version of it: the sandbox otherwise keeps the one it has.
needs_build() {
  local harness="$1" held="$2" wanted="$3" origin="$4"
  if [ -z "$origin" ]; then
    ! is_version "$held"
    return
  fi
  differs_from_image "$harness" "$held" "$wanted" "$origin"
}

claude_code_host="$(installed_version claude "Claude Code")"
opencode_host="$(installed_version opencode "OpenCode")"

# The image name is in the configuration Compose merges from both files, and so is a
# version the project's file gives, which stands above the host's. For this one
# question Compose is handed a marker in place of the two versions: a marker that comes
# back says the project gives none, and anything else is the project's own value, also
# when it equals the host's. Captured first, so that a configuration Compose refuses
# stops here with Compose's own error. node reads the result; the host has node for npm
# already.
unheld="agent.sh/no-version-from-the-project"
config="$(AGENT_CLAUDE_CODE_VERSION="$unheld" AGENT_OPENCODE_VERSION="$unheld" \
  "${compose[@]}" config --format json)"
merged="$(node -e '
  let json = "";
  process.stdin.on("data", (chunk) => (json += chunk));
  process.stdin.on("end", () => {
    const agent = JSON.parse(json).services.agent;
    const args = agent.build?.args ?? {};
    console.log([agent.image, args.CLAUDE_CODE_VERSION ?? "", args.OPENCODE_VERSION ?? ""].join("\n"));
  });
' <<< "$config")"
{
  read -r image
  read -r claude_code_wanted
  read -r opencode_wanted
} <<< "$merged"

# The wanted version of each harness and where it comes from. An origin left empty says
# that neither the project nor the host gives one.
claude_code_origin="the project's compose file"
if [ "$claude_code_wanted" = "$unheld" ]; then
  claude_code_wanted="$claude_code_host"
  claude_code_origin="${claude_code_host:+the host}"
fi
opencode_origin="the project's compose file"
if [ "$opencode_wanted" = "$unheld" ]; then
  opencode_wanted="$opencode_host"
  opencode_origin="${opencode_host:+the host}"
fi

# Build on --rebuild, when there is no image, and when a harness needs it, which the
# image's two labels say. A build that fails ends the wrapper: the image that exists
# holds versions nobody asked for.
build="$rebuild"
claude_code_held=""
opencode_held=""
if [ "$build" -eq 0 ]; then
  labels='{{ index .Config.Labels "com.ritenoar.agentrite.claude-code-version" }}'
  labels="$labels|"'{{ index .Config.Labels "com.ritenoar.agentrite.opencode-version" }}'
  if held="$(docker image inspect --format "$labels" "$image" 2>/dev/null)"; then
    claude_code_held="${held%%|*}"
    opencode_held="${held#*|}"
    if needs_build "Claude Code" "$claude_code_held" "$claude_code_wanted" "$claude_code_origin"; then
      build=1
    fi
    if needs_build "OpenCode" "$opencode_held" "$opencode_wanted" "$opencode_origin"; then
      build=1
    fi
  else
    build=1
  fi
fi

# A harness with a version from neither the project nor the host keeps the one the image
# holds, and gets the latest published one when a build is due. The registry is asked
# only then: a start that builds nothing needs no network. When the latest cannot be
# found the wrapper stops, rather than run the image that exists, which would be a build
# that silently did not happen. Both are asked before either is named, so that no line
# says what an image is built with that is then not built.
claude_code_latest=""
opencode_latest=""
if [ -z "$claude_code_origin" ]; then
  claude_code_wanted="$claude_code_held"
  if [ "$build" -eq 1 ]; then
    claude_code_latest="$(latest_published "Claude Code" @anthropic-ai/claude-code CLAUDE_CODE_VERSION)" || exit 2
    claude_code_wanted="$claude_code_latest"
  fi
fi
if [ -z "$opencode_origin" ]; then
  opencode_wanted="$opencode_held"
  if [ "$build" -eq 1 ]; then
    opencode_latest="$(latest_published "OpenCode" opencode-ai OPENCODE_VERSION)" || exit 2
    opencode_wanted="$opencode_latest"
  fi
fi
if [ -n "$claude_code_latest" ]; then
  echo "agent.sh: neither the project nor the host gives a version of Claude Code," \
    "so the image is built with the latest published, $claude_code_latest." >&2
fi
if [ -n "$opencode_latest" ]; then
  echo "agent.sh: neither the project nor the host gives a version of OpenCode," \
    "so the image is built with the latest published, $opencode_latest." >&2
fi

# The versions the image is built with, for the base compose file's two build arguments.
# Assigned whatever the caller's environment holds, so that nothing there is a source.
# The names are the wrapper's own: Claude Code exports variables named CLAUDE_CODE_...
# into the shells it starts, and agents run the wrapper from those. Where the project's
# file gives the argument, Compose uses that and not the variable.
export AGENT_CLAUDE_CODE_VERSION AGENT_OPENCODE_VERSION
AGENT_CLAUDE_CODE_VERSION="$claude_code_wanted"
AGENT_OPENCODE_VERSION="$opencode_wanted"

if [ "$build" -eq 1 ]; then
  "${compose[@]}" build
fi

exec "${compose[@]}" run --rm \
  --volume "$workdir:/work" \
  ${mounts[@]+"${mounts[@]}"} \
  agent "$@"
