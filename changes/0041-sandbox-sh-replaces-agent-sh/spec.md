# 0041 `sandbox.sh` replaces `agent.sh`

## Context

What starts the sandbox is called `agent.sh`, and the name says something else than what the script does. It starts a
container and runs a command in it. The command may be a harness, and it may as well be `npm test` or the shell, so
`./agent.sh --in-place npm test` starts no agent. Everything else that names the thing already calls it the sandbox:
`SANDBOX.md`, the section "The sandbox" of `README.md`, `init --no-sandbox`, and the description of `agent.sh` itself
as "the shim that runs the kit's sandbox".

The name did not stay in the script. The project's half of the configuration is in `agent/`, the Compose service is
`agent`, the Compose project and the image are `<name>-agent`, the limits are read from `AGENT_MEM_LIMIT` and
`AGENT_CPUS`, and this repository's own second script is `agent-dev.sh`. Each of these names the sandbox.

`agent` is also the name of something that is the agent: the account inside the container that the command runs as,
and its home. Those are named rightly.

Everything that names the sandbox `agent` is renamed to `sandbox`, in one step, and what names the agent stays.

## Requirements

1. The names are these, and the old ones name nothing any more:

   | What                                            | Was                         | Is                            |
   |-------------------------------------------------|-----------------------------|-------------------------------|
   | The shim at a project's root                    | `agent.sh`                  | `sandbox.sh`                  |
   | The kit's script that the shim runs             | `container/agent.sh`        | `container/sandbox.sh`        |
   | The project's half of the configuration         | `agent/compose.project.yml` | `sandbox/compose.project.yml` |
   | The Compose service, in both compose files      | `agent`                     | `sandbox`                     |
   | The Compose project and image names of `init`   | `<name>-agent`              | `<name>-sandbox`              |
   | The memory limit in the file `init` writes      | `AGENT_MEM_LIMIT`           | `SANDBOX_MEM_LIMIT`           |
   | The CPU limit in the file `init` writes         | `AGENT_CPUS`                | `SANDBOX_CPUS`                |
   | The harness versions handed to Compose          | `AGENT_CLAUDE_CODE_VERSION` | `SANDBOX_CLAUDE_CODE_VERSION` |
   |                                                 | `AGENT_OPENCODE_VERSION`    | `SANDBOX_OPENCODE_VERSION`    |
   | This repository's script for the working copy   | `agent-dev.sh`              | `sandbox-dev.sh`              |
   | The variable that script names its project with | `AGENT_PROJECT_NAME`        | `SANDBOX_PROJECT_NAME`        |

2. `sandbox.sh` takes every form, option, argument and environment variable that `agent.sh` takes, does with each
   what `agent.sh` does, and exits with the same status. What it prints is what `agent.sh` prints with the names of
   requirement 1 in place of the old ones, and the lines it opens with its own name open with `sandbox.sh:`. The same
   holds for `sandbox-dev.sh` and `agent-dev.sh`
3. What names the agent is unchanged: the account `agent` in the container and its group, its home `/home/agent`, the
   home volume `<project>_agent-home`, and the build arguments `AGENT_UID` and `AGENT_GID`. Unchanged too are the
   form of a unit run's container name, the two directories of the host the sandbox keeps things in, and the remote
   `sandbox` a unit run fetches from
4. `init` writes `sandbox.sh` and `sandbox/compose.project.yml`, and prints its lines for them by those paths. The
   compose file it writes configures the service `sandbox`, names the Compose project and the image
   `<name>-sandbox`, and takes the limits from `SANDBOX_MEM_LIMIT` and `SANDBOX_CPUS`. `init --no-sandbox` leaves
   those two files out as it left out the two before them. Everything else `init` does is unchanged. It does not
   read, write or change an `agent.sh` or an `agent/` that the project holds, and prints nothing for either
5. `refresh` writes a `sandbox.sh` that is missing and refreshes one that differs, and prints its line for it by that
   path. `refresh --no-sandbox` leaves it out. `refresh` does not read, change or remove an `agent.sh`, and prints
   nothing for it
6. `sandbox.sh` refuses a project whose compose file still configures a service named `agent`. It refuses before
   anything is built or started, exits with a status other than 0, and its message says both why and what to do:
   that the service is named `sandbox`, and that `agent:` under `services:` of `sandbox/compose.project.yml` is to
   be renamed
7. A project that the release before this unit set up, with `agent.sh` and `agent/compose.project.yml` as `init` of
   that release wrote them, has a sandbox that starts after these steps and no others:
    1. install the release that holds this unit, and run `npx agentrite refresh` with the project's harnesses
    2. remove `agent.sh`
    3. rename the directory `agent` to `sandbox`
    4. in `sandbox/compose.project.yml`, rename `agent:` under `services:` to `sandbox:`

   After them the project's Compose project name and image name are what its file gave before, so its home volume,
   its image and the clones of its unit runs are the ones it had. The limits are still read from the variables its
   file names
8. This repository, as a project that uses the kit, holds what `init` of this unit writes: `sandbox.sh` at its root,
   byte for byte the shim, and `sandbox/compose.project.yml` with the service `sandbox`. It holds no `agent.sh` and
   no `agent/`. Its Compose project and image are named `ritenoar-agentrite-sandbox`, and those of `sandbox-dev.sh`
   `ritenoar-agentrite-sandbox-dev`
9. No tracked file holds one of the old names of requirement 1, as a path, as a word in a comment, in what a command
   prints or in an identifier of the code, and no tracked file or directory is named after one. That covers the
   names the code derived from them, such as the function and the template placeholder that hold `<name>-agent`,
   and the test files named after `agent.sh` and `agent-dev.sh`. Excepted are:
    * the documents of the units in `changes/` other than this one
    * the sections of earlier releases in `CHANGELOG.md`
    * what implements and tests requirements 4 to 7, where an old name is what is looked for
10. `README.md`, `SANDBOX.md`, `CONTRIBUTING.md` and `RELEASING.md` describe the commands, the files, the variables
    and the names by requirement 1, with every form, option and variable they described before. The table "What is
    here" of `README.md` and the table "What the repository holds besides the package" of `CONTRIBUTING.md` hold the
    new names. None of the four says what a name was before, or how a project moves from one to the other
11. The suites pass. `init` and `refresh` are tested end to end for requirements 4 and 5, in a project that holds
    `agent.sh` and `agent/` and in one that does not. The refusal of requirement 6 and the steps of requirement 7
    are tested as far as the suites test the script without Docker

## Decisions

* **`sandbox`, not `container`.** The human named both. `sandbox` is what the documents, the option `--no-sandbox`
  and the README's own description of the file already call it. `container` is how the sandbox is made, which a
  reader need not know to use it, and it is the name of the kit's directory that holds the sandbox's files, so a
  `container.sh` at a project's root would read as one of those
* **Everything at once, on the human's word.** The specifier proposed to rename the scripts and keep `agent/`, the
  service and the variables, so that a project had only to run `refresh`. The human refused: "I want this to be a
  clean sweep. There's only a handful of projects already using the kit." A sandbox that is `sandbox.sh` outside and
  `agent` in its configuration would keep the confusion this unit is for, one level down
* **No old name keeps working.** No `agent.sh` that forwards, and no reading of `agent/compose.project.yml` when
  `sandbox/` is missing. Either would stay in the kit for good to serve a handful of projects for one update. It is
  a breaking change, so the release that carries this unit is a major one
* **The account, its home and the home volume keep `agent`.** The command in the container runs as the agent, in the
  agent's home, and `AGENT_UID` and `AGENT_GID` are that account's ids. A sweep that renamed them would be a sweep
  of the word and not of the mistake. Renaming the volume would also discard the login in it, in every project, for
  a name nobody types
* **The service is renamed, which costs each project one line.** The service is the container, so it is the
  sandbox. The kit's file and the project's must give it one name, and the kit never writes the project's file, so
  the line is the project's to change
* **A project's Compose project and image names stay what its file says.** They are in the project's own file, which
  `init` wrote once and nothing rewrites. `init` writes `<name>-sandbox` for a new project. A project that has
  `<name>-agent` may keep it: the name is seen in `docker` listings and nowhere else. Changing it starts a new home
  volume, so the login in the old one is gone, and leaves the old volume, image and network to be removed by hand
* **This repository changes its own names, and pays that.** Requirement 8 moves it to `ritenoar-agentrite-sandbox`.
  On each host that ran its sandbox, Claude Code is logged in once more, and the old volume, image and network are
  removed by hand. OpenCode's login is in the log directory and stays. A clone that a unit run left under the old
  name is not found by a run under the new one, so runs that are under way are finished first
* **The limits' names are the project's.** The kit reads neither variable. The project's file names them, so a file
  that says `AGENT_MEM_LIMIT` goes on reading that, and requirement 7 asks for no edit. The documents describe what
  `init` writes now
* **One refusal, for the service, although the human asked for release notes and no more.** The specifier tried it:
  given the kit's file with the service `sandbox` and a project's file with the service `agent`, `docker compose
  config` reports no error and returns two services. `sandbox` then has no image name, no memory or CPU limit, no
  `ALLOWLIST` of the project and none of its held harness versions. The sandbox would start without what the project
  configured and say nothing. That is not a failure someone sees, so it is refused. It is the one such check: a
  missing `sandbox/compose.project.yml` is refused already, and an `agent.sh` that was left fails by itself, since
  the script it runs is gone
* **`refresh` leaves an `agent.sh` where it is.** The kit has never removed a file from a project, and what is at
  that path after this release is no file of the kit's. The release notes say to remove it
* **This repository's own files move in this unit, and its released sandbox does not start until the release.**
  `sandbox.sh` here runs the script of the installed release, which until the release is made holds
  `container/agent.sh` and reads `agent/`. So from the commit that renames the shim until the step of the release
  that moves the dependency, `./sandbox.sh` fails here. `./sandbox-dev.sh` runs the working copy's sandbox all that
  time, and a checkout that is still at `master` from before the unit has `./agent.sh`. The alternative was to keep
  `agent.sh` and `agent/` here until the release, beside a second compose file for `sandbox-dev.sh`: two files with
  one content, and a release whose step for the kit's own dependency stops, because removing them is more than its
  five commands, and hands the removal to a unit of its own. The human makes the release right after this unit
* **The steps of requirement 7 are what the release notes give.** The human asked for clear instructions there. The
  notes are written when the release is made, for all of its units, and not by this unit. They say besides what
  requirement 7 does not ask for: that whatever of the project's own names `./agent.sh` is changed, that the limits'
  variables may be renamed in the project's file, and what changing the Compose project name costs
* **The earlier units and release notes keep the old names.** The documents of an implemented unit are frozen, and
  the notes of a release say what that release held

## Non-goals

* A change to what the sandbox does, confines, mounts, builds or prints, beyond the names
* Renaming the account `agent`, its home or the home volume
* Rewording text in which "agent" means the agent, such as "Two agents on one unit" and "the agent sandbox"
* A section in `CHANGELOG.md`. It is written when the release is made
* Changing the other projects that use the kit
* Carrying the login of a home volume over to a volume under a new Compose project name
* A way to start the sandbox through `npx agentrite`

## Beyond the request

* `refresh` that removes an `agent.sh` it recognises as the old shim, or prints a line that it is left over. It
  would cost a rule for what counts as the old shim, and the first case of the kit deleting a project's file.
  Without it the file stays until it is removed by hand, and running it prints the shell's own "No such file or
  directory" for `container/agent.sh`
* A line in the refusal for a missing `sandbox/compose.project.yml` that says to rename `agent/`, when the project
  holds `agent/compose.project.yml`. It would cost a branch and a test that serve one update. Without it the
  refusal names the path that is missing and what the file holds, as it does now, and the release notes say the rest
