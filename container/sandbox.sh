#!/usr/bin/env bash
#
# Wrapper around `docker compose run`. Compose cannot take an ad-hoc mount per
# invocation: the wrapper translates the working directory and any --mount flags into
# `docker compose run --volume` options, adds the developer's Claude Code status line
# when the host has one, the two directories of the host that hold the harnesses' logs,
# and the harnesses' bell when the project's agentrite.json holds "bell": true, which it
# reads at each start but --connect, gives the command the host's TERM and COLORTERM,
# and passes the rest through.
# It sets nothing that confines the container; every such setting is in
# container/compose.yml and the project's sandbox/compose.project.yml, and the firewall
# is in container/entrypoint.sh.
#
# The logs are Claude Code's sessions and OpenCode's data directory. In every run they
# are in the project's log directory on the host, <data>/agentrite/<name>, where <data>
# is $XDG_DATA_HOME or ~/.local/share and <name> is the name of the project root's
# directory, and not in the home volume. The agent writes them, so they are one more
# place of the host that it writes besides /work.
#
# What is mounted at /work has no default, and there are two ways to run:
#
# * A unit run, given a unit. The wrapper makes a clone of the unit's branch in the
#   developer's state directory, mounts that at /work, the host's .reviews at
#   /work/.reviews and the host's .orchestrator at /work/.orchestrator, whatever
#   orchestrator the project's agentrite.json holds, and names the container after the
#   Compose project and the branch, so that two runs never work on one branch. When
#   the container has exited it fetches the clone's branch as sandbox/<branch>,
#   fast-forwards the host's branch when it can, and removes the clone unless it holds
#   work the host does not. A clone that is still there is resumed. A unit given by its
#   number that has no branch yet gets one first, cut from the default branch, which
#   is the one the project's agentrite.json names. The git work is in
#   container/unit-clone.sh. With --variant the run is of the unit's variant: the
#   branch is the unit's followed by two hyphens and the variant's name, so a variant
#   has the container, the clone and the bringing back of a unit run of its own, and
#   runs beside the unit's.
# * In place, with --in-place or --workdir. The directory is mounted as it is, nothing
#   is cloned, fetched or removed, and the wrapper ends in `docker compose run`.
#
# Besides the two, --connect runs a command in the container of a unit run that is
# under way, beside what runs there. It starts and mounts nothing, builds nothing and
# changes nothing on the host, and the wrapper ends in `docker exec`. The container is
# confined as the unit run started it, and the wrapper sets nothing of that. The user of
# a connected process is the wrapper's to name, though: Docker runs it as root, with the
# capabilities the container is given, unless it is told the user, so the
# wrapper names the agent, and gives the command the environment and the working
# directory that the first command has, with the TERM and COLORTERM of its own shell.
#
# It also decides which versions of Claude Code and OpenCode the image holds. Each is
# the first of: the version the project's compose file gives, and the version the host's
# own command reports. When the image was built with another version than that, it
# builds the image again before it runs, and says why. The kit names no version of its
# own: a harness with neither keeps the version the image holds, and gets the latest
# published one, which the wrapper asks npm for and names, whenever the image is built.
#
# A project may add to the image with a sandbox/Dockerfile of its own, which the wrapper
# builds on the kit's image. The image the sandbox runs keeps the name the compose files
# give it, and the kit's image is kept beside it under that name followed by -base. The
# project's file is built when the kit's image is, when there is no image, and when the
# image was built from another content of the file, which a label of the image records;
# an image built from a file that is no longer there has the kit's image built anew. The
# harness versions are read from the kit's image, and the wrapper sets the label of the
# file itself, so that no label the project's file sets decides a build. Every start with
# the file refuses an image whose entrypoint, command, user or working directory is not
# the kit's: the kit's entrypoint installs the firewall and drops to the agent.
#
# It layers the project's compose file over the kit's base, with
# --project-directory set to the project root so that every relative path in
# either file resolves from there.
#
# Usage:
#   sandbox.sh PROJECT_ROOT [--rebuild] [--mount HOST[:ro]]... UNIT [--variant NAME] [COMMAND...]
#   sandbox.sh PROJECT_ROOT [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
#   sandbox.sh PROJECT_ROOT [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
#   sandbox.sh PROJECT_ROOT --connect UNIT [--variant NAME] [COMMAND...]
#
#   PROJECT_ROOT     the project's root, which the project's sandbox.sh shim passes
#   UNIT             mount a clone of the unit's branch at /work: a local branch by its
#                    name, or by a unit's number that one branch name holds. A number
#                    that no branch holds and that is a unit of changes/ on the default
#                    branch gets its branch first, cut from the head of that branch
#   --variant NAME   run a variant of the unit: a unit run of the branch <the unit's
#                    branch>--NAME, cut from the host's branch of the unit when it does not
#                    exist, in a container and on a clone of its own. Given before the
#                    unit or right after it, optional, and not with --in-place or --workdir
#   --in-place       mount the project root at /work, as it is
#   --workdir DIR    mount DIR at /work, as it is
#   --connect UNIT   run the command in the container of the run that is under way for
#                    the unit, as the agent, and start nothing. The unit is a local
#                    branch, by its name or by a unit's number, and no branch is cut.
#                    With --variant, the run of that variant of the unit. Takes none of
#                    the options below
#   --rebuild        build the image before running, even if it already exists and
#                    holds the wanted harness versions, and the project's
#                    sandbox/Dockerfile on it when there is one
#   --mount HOST     also mount HOST at /mnt/<basename>, read-write
#   --mount HOST:ro  the same, read-only
#   COMMAND...       run this instead of an interactive shell
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The caller names the project root. The kit is an installed package, and how deep it
# sits under node_modules depends on the scope, on hoisting and on the package manager,
# so counting directories up from here would be a guess.
if [ $# -lt 1 ] || [ ! -d "$1" ]; then
  echo "sandbox.sh: the first argument must be the project root." >&2
  echo "A project's own sandbox.sh shim passes it; run that rather than this file." >&2
  exit 1
fi
root="$(cd "$1" && pwd)"
shift
project_compose="$root/sandbox/compose.project.yml"

if [ ! -f "$project_compose" ]; then
  echo "sandbox.sh: $project_compose not found." >&2
  echo "Each project supplies its own compose file at that path, holding the Compose" >&2
  echo "project name, the image name, the egress allowlist, the resource limits and" >&2
  echo "the Playwright version, if it has one." >&2
  echo "See \"Installing it into a project\" in the kit's README.md." >&2
  exit 1
fi

# The image is built from the project root, so the build can reach the kit's files only
# when the kit is installed inside that root. Compose and the Dockerfile take its path
# from here rather than naming it.
case "$here" in
  "$root"/*) ;;
  *)
    echo "sandbox.sh: the kit at $here is not inside the project root $root," >&2
    echo "so the image build cannot reach it. Install it as the project's dependency." >&2
    exit 1
    ;;
esac
export AGENTRITE_CONTAINER="${here#"$root"/}"

compose=(docker compose --project-directory "$root" -f "$here/compose.yml" -f "$project_compose")

# The forms the wrapper takes, by what each mounts at /work. They end with the one that
# mounts nothing, --connect, for whoever wanted a second shell.
list_forms() {
  echo "  sandbox.sh UNIT [--variant NAME] [COMMAND...]" >&2
  echo "                                       a clone of the unit's branch, named by its ID or its branch." >&2
  echo "                                       An ID with no branch gets one, cut from the default branch" >&2
  echo "                                       With --variant, a clone of the branch of that variant of the unit," >&2
  echo "                                       cut from the unit's branch when it does not exist" >&2
  echo "  sandbox.sh --in-place [COMMAND...]     the project root as it is" >&2
  echo "  sandbox.sh --workdir DIR [COMMAND...]  DIR as it is" >&2
  echo "Or run a command beside the one of a unit's run that is under way, which mounts nothing:" >&2
  echo "  sandbox.sh --connect UNIT [--variant NAME] [COMMAND...]" >&2
}

mount_forms() {
  echo "Say what to mount at /work, as one of:" >&2
  list_forms
}

# Refuses arguments at fault: prints each line given, then the forms, and exits 2.
refuse_arguments() {
  local line
  for line in "$@"; do
    echo "$line" >&2
  done
  echo "The forms it takes:" >&2
  list_forms
  exit 2
}

# The directories of --workdir and --mount are kept as they were given while the options
# are read, and are resolved after the loop: what refuses a combination of options
# comes first, and does not depend on a directory being there.
workdir="$root"
in_place=0
workdir_given=0
rebuild=0
connect=0
variant=""
variant_given=0
variant_twice=0
mount_specs=()
mounts=()

while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild)
      rebuild=1
      shift
      ;;
    --in-place)
      workdir="$root"
      in_place=1
      shift
      ;;
    --workdir)
      [ $# -ge 2 ] || refuse_arguments "sandbox.sh: --workdir needs a directory"
      workdir="$2"
      workdir_given=1
      shift 2
      ;;
    --connect)
      connect=1
      shift
      ;;
    --variant | --variant=*)
      if [ "$variant_given" -eq 1 ]; then variant_twice=1; fi
      variant_given=1
      if [ "$1" = --variant ]; then
        [ $# -ge 2 ] || refuse_arguments "sandbox.sh: --variant needs a name"
        variant="$2"
        shift 2
      else
        variant="${1#--variant=}"
        shift
      fi
      ;;
    --mount)
      [ $# -ge 2 ] || refuse_arguments "sandbox.sh: --mount needs a path"
      mount_specs+=("$2")
      shift 2
      ;;
    --)
      shift
      break
      ;;
    -*)
      refuse_arguments "sandbox.sh: there is no option $1." \
        "A unit or a command that opens with - goes after --."
      ;;
    *)
      break
      ;;
  esac
done

# --connect starts no run, so it takes no option of one, and it needs the unit whose run
# it connects to. Refused here, before a directory of --workdir or --mount is read.
if [ "$connect" -eq 1 ]; then
  run_options=()
  [ "$in_place" -eq 0 ] || run_options+=(--in-place)
  [ "$workdir_given" -eq 0 ] || run_options+=(--workdir)
  [ "${#mount_specs[@]}" -eq 0 ] || run_options+=(--mount)
  [ "$rebuild" -eq 0 ] || run_options+=(--rebuild)
  if [ "${#run_options[@]}" -gt 0 ]; then
    refusal=()
    for run_option in "${run_options[@]}"; do
      refusal+=("sandbox.sh: --connect cannot be given together with $run_option.")
    done
    refuse_arguments "${refusal[@]}" "That is an option of a run, and --connect starts none."
  fi
  [ $# -gt 0 ] || refuse_arguments "sandbox.sh: --connect needs a unit."
fi

# A variant is of a unit, so --variant is refused where there is no unit. It is also given
# right after the unit, as the first argument left once --in-place and --workdir are known
# to be absent. Only that argument is looked at, so that a command whose own arguments
# hold --variant is passed on as it is. Refused here, before a directory, agentrite.json,
# Docker or npm is read.
is_variant_name() {
  local shape='^[a-z0-9]+(-[a-z0-9]+)*$'
  # The ranges of the shape are those of ASCII only in this locale.
  local LC_ALL=C
  [[ "$1" =~ $shape ]]
}
if [ "$in_place" -eq 0 ] && [ "$workdir_given" -eq 0 ] && [ $# -ge 1 ]; then
  case "${2:-}" in
    --variant)
      if [ "$variant_given" -eq 1 ]; then variant_twice=1; fi
      variant_given=1
      [ $# -ge 3 ] || refuse_arguments "sandbox.sh: --variant needs a name"
      variant="$3"
      set -- "$1" "${@:4}"
      ;;
    --variant=*)
      if [ "$variant_given" -eq 1 ]; then variant_twice=1; fi
      variant_given=1
      variant="${2#--variant=}"
      set -- "$1" "${@:3}"
      ;;
  esac
  case "${2:-}" in
    --variant | --variant=*) variant_twice=1 ;;
  esac
fi
if [ "$variant_twice" -eq 1 ]; then
  refuse_arguments "sandbox.sh: --variant is given more than once." "A run is of one variant."
fi
if [ "$variant_given" -eq 1 ]; then
  for no_unit_option in --in-place --workdir; do
    if { [ "$no_unit_option" = --in-place ] && [ "$in_place" -eq 1 ]; } \
      || { [ "$no_unit_option" = --workdir ] && [ "$workdir_given" -eq 1 ]; }; then
      refuse_arguments "sandbox.sh: --variant cannot be given together with $no_unit_option." \
        "A variant is a run of a unit's branch, and $no_unit_option has no unit."
    fi
  done
  if ! is_variant_name "$variant"; then
    refuse_arguments "sandbox.sh: '$variant' is not a name a variant can have." \
      "A name is one or more words of the lowercase letters a to z and the digits 0 to 9," \
      "joined by single hyphens, as 'opus' or 'gpt-6-1'."
  fi
fi

# The directories of a run, as absolute paths. One that is not there ends the wrapper
# here, with the shell's own error.
workdir="$(cd "$workdir" && pwd)"
for spec in ${mount_specs[@]+"${mount_specs[@]}"}; do
  opts=""
  case "$spec" in
    *:ro) opts=":ro"; spec="${spec%:ro}" ;;
  esac
  host="$(cd "$spec" && pwd)"
  mounts+=(--volume "$host:/mnt/$(basename "$host")$opts")
done

# What to mount at /work has no default. Without --in-place and --workdir the first
# argument left is the unit, and with nothing left there is nothing to run on. Refused
# here, before the host's harnesses, Docker or npm are asked anything.
if [ "$in_place" -eq 0 ] && [ "$workdir_given" -eq 0 ] && [ $# -eq 0 ]; then
  echo "sandbox.sh: nothing to mount at /work was given." >&2
  mount_forms
  exit 2
fi

# Whether the harnesses ring the terminal's bell, as the project's agentrite.json says,
# read at each start by the kit's reader of that file, which judges bell alone and
# prints its own message for a file at fault. Read before the host's harnesses, Docker
# or npm are asked anything and before a branch is cut, so that a refused start has done
# nothing. --connect starts nothing and reads nothing: the command it connects has the
# bell of the run it joins, whose mounts and environment docker exec inherits.
bell=false
if [ "$connect" -eq 0 ]; then
  bell="$(node "$here/../scripts/agentrite-settings.mjs" "$root" bell)" || exit 1
fi

# The unit's branch, found with git alone, or cut from the default branch for a unit
# that has none yet, so that a unit that names none is refused as early. The default
# branch is read from the project's agentrite.json, by the kit's reader of that file,
# and only when a branch is cut: every other run judges nothing of the file but bell. An
# empty branch says that this is not a unit run. --connect finds the branch and cuts
# none: a unit with no branch has no run to connect to. The unit is kept as it was
# given, for the messages that name a command to run, followed by the variant's option when
# there is one, so that the command named is the one for the same branch. With --variant the
# branch is the variant's, cut from the unit's branch for a run and only found for --connect.
branch=""
unit=""
unit_given=""
if [ "$in_place" -eq 0 ] && [ "$workdir_given" -eq 0 ]; then
  # shellcheck source=unit-clone.sh
  . "$here/unit-clone.sh"
  unit="$1"
  resolved=0
  if [ "$connect" -eq 1 ]; then
    branch="$(find_unit_branch "$root" "$unit")" || resolved=$?
    if [ "$resolved" -eq 1 ]; then
      echo "sandbox.sh: '$unit' names no local branch, by its name or as a unit's number." >&2
      echo "So there is no run to connect to." >&2
    fi
    [ "$resolved" -eq 0 ] || exit 1
  else
    branch="$(resolve_unit_branch "$root" "$unit" "$here/../scripts/agentrite-settings.mjs")" || resolved=$?
    if [ "$resolved" -ne 0 ]; then
      # A unit that names no branch, and no unit of the default branch to cut one for,
      # may be a command given without saying what to mount.
      [ "$resolved" -ne 1 ] || mount_forms
      exit 1
    fi
  fi
  unit_given="$unit"
  if [ "$variant_given" -eq 1 ]; then
    if is_variant_branch "$branch"; then
      refuse_arguments "sandbox.sh: $branch is the branch of a variant, so --variant cannot be given with it." \
        "Run it by its name without --variant, or give the unit's branch or its number."
    fi
    unit_given="$unit --variant $variant"
    if [ "$connect" -eq 1 ]; then
      branch="$(find_variant_branch "$root" "$branch" "$variant")" || resolved=$?
      if [ "$resolved" -eq 1 ]; then
        echo "sandbox.sh: '$unit' has no variant '$variant': there is no local branch of that variant." >&2
        echo "So there is no run to connect to. Start one with 'sandbox.sh $unit_given'." >&2
      fi
    else
      branch="$(resolve_variant_branch "$root" "$branch" "$variant")" || resolved=$?
    fi
    [ "$resolved" -eq 0 ] || exit 1
  fi
  shift
fi

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

# The bell, when agentrite.json holds "bell": true: the kit's container/bell/, read-only,
# with Claude Code's hooks in the drop-in directory of its managed settings, which holds
# them beside the status line's managed-settings.json or without it, and OpenCode's
# plugin named in a configuration that OpenCode merges over the others. Both add to what
# the developer sets in the home volume, and with false nothing of them is given.
bell_environment=()
if [ "$bell" = true ]; then
  mounts+=(
    --volume "$here/bell:/etc/agentrite/bell:ro"
    --volume "$here/bell/claude-managed-settings.json:/etc/claude-code/managed-settings.d/agentrite-bell.json:ro"
  )
  bell_environment+=(
    --env 'OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]}'
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
  echo "sandbox.sh: refusing to run as root (uid/gid 0)." >&2
  echo "The sandbox's 'agent' user would then be root, defeating the sandbox." >&2
  echo "If Docker needs elevated permissions, add your user to the docker group" >&2
  echo "instead of running this with sudo." >&2
  exit 1
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
    echo "sandbox.sh: '$harness_command --version' printed no version," \
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
    echo "sandbox.sh: could not find the latest published version of $harness:" \
      "'npm view $package version' gave none." >&2
    echo "Give a version in sandbox/compose.project.yml, under services.sandbox.build.args as $argument," \
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
    echo "sandbox.sh: the image holds $harness $held and $wanted is wanted, from $origin. Rebuilding." >&2
  else
    echo "sandbox.sh: the image records no $harness version and $wanted is wanted, from $origin. Rebuilding." >&2
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

# Whether Docker has a container running under the unit run's name. Fails with 2, and
# says so, when Docker could not be asked: that says nothing of the container, which
# may be running.
unit_container_running() {
  local found
  if ! found="$(docker ps --quiet --filter "name=^/$container_name\$")"; then
    echo "sandbox.sh: could not ask Docker whether the container $container_name is running." >&2
    return 2
  fi
  [ -n "$found" ]
}

# Asks Compose for the configuration it merges from both files, and sets from it: the
# image name, the Compose project's name, and the version of each harness that the
# project's file gives, which stands above the host's. For this one question Compose is
# handed a marker in place of the two versions: a marker that comes back says the project
# gives none, and anything else is the project's own value, also when it equals the
# host's. Captured first, so that a configuration Compose refuses stops here with
# Compose's own error. node reads the result; the host has node for npm already.
#
# A service named agent is looked for first, because the kit's file configures none: the
# only one there is the project's, from before the sandbox was named. Compose merges it
# beside the kit's service sandbox without an error, and sandbox then has none of the
# image name, the limits, the allowlist and the harness versions the project gave, so the
# sandbox would start without them and say nothing.
unheld="sandbox.sh/no-version-from-the-project"
read_merged_configuration() {
  local config merged
  config="$(SANDBOX_CLAUDE_CODE_VERSION="$unheld" SANDBOX_OPENCODE_VERSION="$unheld" \
    "${compose[@]}" config --format json)"
  merged="$(node -e '
    let json = "";
    process.stdin.on("data", (chunk) => (json += chunk));
    process.stdin.on("end", () => {
      const merged = JSON.parse(json);
      if (merged.services.agent) {
        console.log("refused");
        return;
      }
      const sandbox = merged.services.sandbox;
      const args = sandbox.build?.args ?? {};
      const lines = ["merged", sandbox.image, args.CLAUDE_CODE_VERSION ?? "", args.OPENCODE_VERSION ?? "", merged.name];
      console.log(lines.join("\n"));
    });
  ' <<< "$config")"
  if [ "$merged" = "refused" ]; then
    echo "sandbox.sh: $project_compose configures a service named agent." >&2
    echo "The service is named sandbox, so rename agent: under services: to sandbox: in that file." >&2
    exit 1
  fi
  {
    read -r outcome
    read -r image
    read -r claude_code_wanted
    read -r opencode_wanted
    read -r project
  } <<< "$merged"
}

# The label that records on the image which content of the project's sandbox/Dockerfile
# it was built from: sha256: and the SHA-256 of the file's bytes, in hex.
project_dockerfile_label="com.ritenoar.agentrite.project-dockerfile"

# Prints the content of the project's file that the image records, or nothing for an
# image built from none. A value of another shape is none, which is what Docker prints for
# an image without labels. Fails when there is no image.
recorded_project_dockerfile() {
  local recorded shape='^sha256:[0-9a-f]{64}$'
  recorded="$(docker image inspect --format "{{ index .Config.Labels \"$project_dockerfile_label\" }}" \
    "$image" 2>/dev/null)" || return 1
  if [[ "$recorded" =~ $shape ]]; then
    echo "$recorded"
  fi
}

# Refuses, with 1, an image that would start otherwise than the kit's image: one whose
# entrypoint, command, user or working directory the project's file changed. Each that
# differs is named with both values, an empty one as none.
refuse_changed_start() {
  local format='{{json .Config.Entrypoint}}{{"\n"}}{{json .Config.Cmd}}{{"\n"}}'
  format="$format"'{{.Config.User}}{{"\n"}}{{.Config.WorkingDir}}'
  local whats=(entrypoint command user "working directory")
  local instructions=(ENTRYPOINT CMD USER WORKDIR)
  local settings kit_settings index value kit_value named=""
  settings="$(docker image inspect --format "$format" "$image")"
  kit_settings="$(docker image inspect --format "$format" "$kit_image")"
  # read takes one line of each at a time, an empty one included.
  for index in 0 1 2 3; do
    read -r value <&3
    read -r kit_value <&4
    [ "$value" != "$kit_value" ] || continue
    echo "sandbox.sh: the image $image has the ${whats[$index]} $(shown "$value")," \
      "and the kit's image $kit_image has $(shown "$kit_value")." >&2
    named="${named:+$named, }${instructions[$index]}"
  done 3<<< "$settings" 4<<< "$kit_settings"
  [ -n "$named" ] || return 0
  echo "The kit's entrypoint is what installs the firewall and drops to the agent, so nothing was started." >&2
  echo "Remove from sandbox/Dockerfile the instructions that set what differs: $named." \
    "Then start again, which builds the image anew." >&2
  exit 1
}

# A value of the image's configuration as the refusal writes it: none for one not set.
shown() {
  case "$1" in
    "" | null) echo none ;;
    *) echo "$1" ;;
  esac
}

# Prints the name of the container of a unit run: the Compose project's name, a dash and
# the branch, with every character a container's name cannot hold made a dash.
unit_container_name() {
  local name="$1-$2"
  echo "${name//[^A-Za-z0-9_.-]/-}"
}

# The terminal the wrapper was started from, for the command: its TERM, which names the
# terminal, and its COLORTERM, which a terminal that shows 24-bit colour may set to say
# so. Programs that draw in a terminal read the two to learn what it shows, and Docker
# gives a container with a terminal TERM=xterm and no COLORTERM, which tells OpenCode to
# send 24-bit colour to a terminal that may show only 256. A variable that is not in the
# wrapper's environment, or is empty there, is the shell's to lack, and the command is
# given none of it. Whether it is in the environment is asked of declare, and not read
# from its value: bash gives a shell started without TERM a TERM=dumb of its own, which
# it does not export and which is not the host's.
from_environment() {
  [[ "$(declare -p "$1" 2>/dev/null)" == "declare -x $1="* ]] && [ -n "${!1}" ]
}

# --connect ends here, before the host's harnesses are asked for a version, a build is
# weighed or a directory is made: it runs the command in the container of the unit's
# run, beside what runs there, and the wrapper becomes that call, so its status is the
# command's. The container's name is the one the unit run gave it, and a container that
# is not running under it says that no run is under way.
#
# What the command is given is what the first command of the container has, which this
# call holds a second time: the user is the one container/entrypoint.sh becomes, named
# with no group so that Docker takes its groups from the container's own account files,
# HOME, USER, LOGNAME and PATH are the values the entrypoint exports, /work is the
# working_dir of container/compose.yml, and bash is the CMD of container/Dockerfile. A
# test in tests/sandbox-unit-run.test.mjs reads the three files and holds this call
# against them. Without --user the command would be root, with the capabilities the
# container is given. The command runs through known-terminal.sh, as the
# entrypoint runs the first, so that a TERM the image does not describe is replaced.
# TERM and COLORTERM are not the first command's but those of this wrapper's shell,
# since --connect may be run from another terminal.
#
# Standard input is always passed on, so that a command a script runs can be given
# input. A terminal only when the wrapper has one on both its input and its output:
# Docker refuses a terminal without one on its input, and a terminal's line endings do
# not belong in a pipe.
if [ "$connect" -eq 1 ]; then
  read_merged_configuration
  container_name="$(unit_container_name "$project" "$branch")"
  running=0
  unit_container_running || running=$?
  if [ "$running" -eq 1 ]; then
    echo "sandbox.sh: no run is under way for '$unit_given': the container $container_name is not running." >&2
    echo "Start one with 'sandbox.sh $unit_given'." >&2
    exit 1
  fi
  if [ "$running" -eq 2 ]; then
    echo "Nothing was run." >&2
    exit 1
  fi
  [ $# -gt 0 ] || set -- bash
  terminal=()
  if [ -t 0 ] && [ -t 1 ]; then
    terminal=(--tty)
  fi
  # A command of docker exec inherits the TERM and COLORTERM the run's container was
  # started with, unless it is given its own, and Docker cannot remove a variable. So
  # both are given in every call: this shell's, or empty for one it lacks, which
  # known-terminal.sh removes. A TERM it lacks on a terminal is xterm, which is what
  # Docker gives a command on a terminal when nothing else gives it one.
  connected_term=""
  if from_environment TERM; then
    connected_term="$TERM"
  elif [ "${#terminal[@]}" -gt 0 ]; then
    connected_term=xterm
  fi
  connected_colorterm=""
  ! from_environment COLORTERM || connected_colorterm="$COLORTERM"
  exec docker exec --interactive ${terminal[@]+"${terminal[@]}"} --user agent --workdir /work \
    --env HOME=/home/agent --env USER=agent --env LOGNAME=agent \
    --env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    --env "TERM=$connected_term" --env "COLORTERM=$connected_colorterm" \
    "$container_name" /usr/local/bin/known-terminal.sh "$@"
fi

claude_code_host="$(installed_version claude "Claude Code")"
opencode_host="$(installed_version opencode "OpenCode")"

read_merged_configuration

# A unit run has one clone and one container for each Compose project and branch. The
# container's name is the lock: while Docker says it is running, a second run for the
# branch is refused. Both refusals come here, before a build and before the registry is
# asked, which a run that is refused has no use for.
if [ -n "$branch" ]; then
  container_name="$(unit_container_name "$project" "$branch")"
  clone="${XDG_STATE_HOME:-${HOME:?}/.local/state}/agentrite/$project/$branch"
  running=0
  unit_container_running || running=$?
  if [ "$running" -eq 0 ]; then
    echo "sandbox.sh: the container $container_name is running, so a run for $branch is under way." >&2
    echo "Two runs never work on one branch. Wait for it, or stop it with 'docker stop $container_name'." >&2
    echo "To run a command beside it: 'sandbox.sh --connect $unit_given [COMMAND...]'." >&2
    exit 1
  fi
  if [ "$running" -eq 2 ]; then
    echo "Nothing was started." >&2
    exit 1
  fi
  refuse_unlanded "$root" "$branch" "$clone" || exit 1
fi

# The project's own Dockerfile, when it has one, and the content it is built from. The
# kit's image is then kept under a name of its own, the base of the project's file, and
# the image the sandbox runs is the project's file built on it. node computes the digest;
# the host has node for npm already.
project_dockerfile="$root/sandbox/Dockerfile"
project_dockerfile_digest=""
kit_image="$image"
if [ -f "$project_dockerfile" ]; then
  project_dockerfile_digest="sha256:$(node -e '
    const { createHash } = require("crypto");
    process.stdout.write(createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"));
  ' "$project_dockerfile")"
  kit_image="$image-base"
fi

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

# Build the kit's image on --rebuild, when there is none, when a harness needs it, which
# the two labels of the kit's image say, and, without a project's file, when the image
# was built from one. A build that fails ends the wrapper: the image that exists holds
# versions nobody asked for.
build="$rebuild"
claude_code_held=""
opencode_held=""
if [ "$build" -eq 0 ]; then
  labels='{{ index .Config.Labels "com.ritenoar.agentrite.claude-code-version" }}'
  labels="$labels|"'{{ index .Config.Labels "com.ritenoar.agentrite.opencode-version" }}'
  if held="$(docker image inspect --format "$labels" "$kit_image" 2>/dev/null)"; then
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
if [ "$build" -eq 0 ] && [ -z "$project_dockerfile_digest" ] && [ -n "$(recorded_project_dockerfile)" ]; then
  echo "sandbox.sh: the image was built from a sandbox/Dockerfile that is no longer there. Rebuilding." >&2
  build=1
fi

# Build the project's file when the kit's image is built, which it is built on, when there
# is no image, and when the image was built from another content of the file, or from
# none, as when the file was added since.
project_build=0
if [ -n "$project_dockerfile_digest" ]; then
  if ! recorded="$(recorded_project_dockerfile)"; then
    project_build=1
  elif [ "$recorded" != "$project_dockerfile_digest" ]; then
    echo "sandbox.sh: sandbox/Dockerfile is not the file the image was built from. Rebuilding." >&2
    project_build=1
  fi
  [ "$build" -eq 0 ] || project_build=1
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
    claude_code_latest="$(latest_published "Claude Code" @anthropic-ai/claude-code CLAUDE_CODE_VERSION)" || exit 1
    claude_code_wanted="$claude_code_latest"
  fi
fi
if [ -z "$opencode_origin" ]; then
  opencode_wanted="$opencode_held"
  if [ "$build" -eq 1 ]; then
    opencode_latest="$(latest_published "OpenCode" opencode-ai OPENCODE_VERSION)" || exit 1
    opencode_wanted="$opencode_latest"
  fi
fi
if [ -n "$claude_code_latest" ]; then
  echo "sandbox.sh: neither the project nor the host gives a version of Claude Code," \
    "so the image is built with the latest published, $claude_code_latest." >&2
fi
if [ -n "$opencode_latest" ]; then
  echo "sandbox.sh: neither the project nor the host gives a version of OpenCode," \
    "so the image is built with the latest published, $opencode_latest." >&2
fi

# The versions the image is built with, for the base compose file's two build arguments.
# Assigned whatever the caller's environment holds, so that nothing there is a source.
# The names are the wrapper's own: Claude Code exports variables named CLAUDE_CODE_...
# into the shells it starts, and agents run the wrapper from those. Where the project's
# file gives the argument, Compose uses that and not the variable.
export SANDBOX_CLAUDE_CODE_VERSION SANDBOX_OPENCODE_VERSION
SANDBOX_CLAUDE_CODE_VERSION="$claude_code_wanted"
SANDBOX_OPENCODE_VERSION="$opencode_wanted"

# Compose tags the kit's image with the image's name, and the project's file then takes
# that name over. The label is given here rather than in the file, so that one the file
# sets does not count. BuildKit's check of a FROM whose argument has no default is
# skipped: it warns of the two lines the file opens with, whose argument the kit always
# gives. A project build that fails leaves the kit's image under the name, without the
# label, so the next start builds it again.
if [ "$build" -eq 1 ]; then
  "${compose[@]}" build
  [ -z "$project_dockerfile_digest" ] || docker tag "$image" "$kit_image"
fi
if [ "$project_build" -eq 1 ]; then
  docker build --build-arg "AGENTRITE_IMAGE=$kit_image" \
    --build-arg BUILDKIT_DOCKERFILE_CHECK=skip=InvalidDefaultArgInFrom \
    --label "$project_dockerfile_label=$project_dockerfile_digest" \
    --file "$project_dockerfile" --tag "$image" "$root"
fi

# Checked at every start with the file, and not only after a build: an image refused once
# is refused until its file is corrected, since an unchanged file builds nothing.
[ -z "$project_dockerfile_digest" ] || refuse_changed_start

# The harnesses' logs, on the host: Claude Code's sessions and OpenCode's data directory,
# from the project's log directory, which is named after the project root's directory
# and is the same whatever is mounted at /work. In it the two have the places they have
# in a home, so a tool on the host reads it as a home that holds nothing else. Made
# here, as the developer, because Docker creates a mount's missing source as root, and
# only now, so that a run that was refused or whose build failed made none. The path is
# taken through cd and pwd because Docker reads a source that is not absolute as the
# name of a volume. Nothing above the two directories is mounted. OpenCode keeps its
# login in its data directory, so that is a file of the host too.
logs="${XDG_DATA_HOME:-${HOME:?}/.local/share}/agentrite/$(basename "$root")"
mkdir -p "$logs/.claude/projects" "$logs/.local/share/opencode"
logs="$(cd "$logs" && pwd)"
mounts+=(
  --volume "$logs/.claude/projects:/home/agent/.claude/projects"
  --volume "$logs/.local/share/opencode:/home/agent/.local/share/opencode"
)

# The run's own terminal: each of the two that the wrapper's shell has, and nothing of
# one it lacks, so that the command keeps what Docker gives it.
terminal_environment=()
! from_environment TERM || terminal_environment+=(--env "TERM=$TERM")
! from_environment COLORTERM || terminal_environment+=(--env "COLORTERM=$COLORTERM")

if [ -z "$branch" ]; then
  exec "${compose[@]}" run --rm \
    ${terminal_environment[@]+"${terminal_environment[@]}"} \
    ${bell_environment[@]+"${bell_environment[@]}"} \
    --volume "$workdir:/work" \
    ${mounts[@]+"${mounts[@]}"} \
    sandbox "$@"
fi

# The clone is made only now, so that a build that failed left none behind. The
# .reviews and .orchestrator directories, of the root and of the clone, are made here
# because Docker creates a mount's missing source and its missing mount point as root.
# A stopped container that a crash left under the name is removed, and Docker refuses
# to remove one that is running.
prepare_clone "$root" "$branch" "$clone"
mkdir -p "$root/.reviews" "$clone/.reviews" "$root/.orchestrator" "$clone/.orchestrator"
docker rm "$container_name" >/dev/null 2>&1 || true

# The wrapper sees the container out. An interrupt, a terminate and a hangup reach the
# container as they did, and the wrapper waits for it and then brings the work back. A
# trap that does nothing rather than an ignored signal, which the container's own
# process would inherit.
trap : INT TERM HUP
status=0
"${compose[@]}" run --rm --name "$container_name" \
  ${terminal_environment[@]+"${terminal_environment[@]}"} \
  ${bell_environment[@]+"${bell_environment[@]}"} \
  --volume "$clone:/work" \
  --volume "$root/.reviews:/work/.reviews" \
  --volume "$root/.orchestrator:/work/.orchestrator" \
  ${mounts[@]+"${mounts[@]}"} \
  sandbox "$@" || status=$?

# A container that outlived its `run`, as one does whose terminal was closed, still
# writes the clone, so nothing is fetched or removed under it, and neither when Docker
# cannot say whether it stopped.
running=0
unit_container_running || running=$?
if [ "$running" -eq 0 ]; then
  echo "sandbox.sh: the container $container_name is still running, so nothing was fetched." >&2
  echo "Its clone is at $clone. Once it has stopped, the same command resumes the clone." >&2
  exit "$status"
fi
if [ "$running" -eq 2 ]; then
  echo "It may still be running, so nothing was fetched. Its clone is at $clone," >&2
  echo "and the same command resumes it." >&2
  [ "$status" -ne 0 ] || status=1
  exit "$status"
fi

if ! land_clone "$root" "$branch" "$clone" && [ "$status" -eq 0 ]; then
  status=1
fi
exit "$status"
