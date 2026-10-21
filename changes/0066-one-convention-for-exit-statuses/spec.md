# 0066 One convention for exit statuses

## Context

Every command of the kit says in its own section of `README.md` what it exits with, and nothing says what a status
means across them. They do not agree:

| Command                        | 0       | 1                              | 2                                    |
|--------------------------------|---------|--------------------------------|--------------------------------------|
| `npx agentrite`, every command | success | it refused or failed           | wrong arguments, with its usage      |
| `check-changes`                | success | units at fault, or it failed   | not used                             |
| `./sandbox.sh`                 | success | the work was not brought back  | wrong arguments, and every refusal   |

`./sandbox.sh` refuses a project whose `agentrite.json` has a `bell` at fault with 2, where `npx agentrite` refuses
the same file with 1. Besides those, `./sandbox.sh` with a command, `--connect` and `npx agentrite run` exit with the
status of what they ran. In places the README says only "non-zero" or "a status other than 0".

Unit 0065, the orchestrator, adds a status of its own, 3, for a run that stopped for the human. Asked about it, the
human found that the statuses are defined nowhere, and decided on 2026-10-21 that the kit defines them once, in a
unit of their own, and that every tool of the kit follows that definition.

## Requirements

The definition:

1. `README.md` has a section "Exit statuses" that defines what a status of a command of the kit means:
    * `0`: the command did what it was asked
    * `1`: the command was given arguments it takes, and refused or failed. Its message says why. A check that finds
      something at fault, as the change check does, ends with 1
    * `2`: the arguments are wrong: an option the command does not take, an option without its value, a value not of
      the form the option takes, arguments that do not go together, or one that is missing. The command says what is
      wrong, prints its usage or the forms it takes, and starts nothing
    * `3` and above: a meaning of one command's own, which that command's section names. No two meanings of one
      command share a status
    * A command that runs another program and exits with that program's status passes on whatever that program
      gave, and a caller cannot tell it from the command's own
2. The section names the commands that pass a status on, and when: `npx agentrite run` once the harness started,
   `./sandbox.sh` once the command in the container started, and `./sandbox.sh --connect` once the connected command
   started. Before that point their own statuses hold
3. The section of each command in "Commands" of `README.md` says which statuses it exits with, by the meanings of
   requirement 1, names each status of its own of 3 and above, and links the section. Where `README.md` or
   `SANDBOX.md` says "non-zero", "a status other than 0" or "exits with 2" of a status the kit chooses, it names the
   status the convention gives

Bringing the tools in line:

4. `./sandbox.sh` exits 2 only when its arguments are wrong, by requirement 1. Every other refusal of it, before the
   container starts or `--connect` runs its command, exits 1. Among them: an `agentrite.json` at fault, a unit that
   names no branch, a run already under way for the branch, no run under way to connect to, a clone that is not yet
   brought back, Docker that cannot be reached, a version of a harness that cannot be looked up, a project's
   `sandbox/compose.project.yml` or `sandbox/Dockerfile` that is refused, and a first argument that is not the
   project root
5. Among those of `./sandbox.sh` that stay 2: an option it does not take, `--mount`, `--workdir` or `--variant`
   without its value, a variant's name not of the form it takes, `--variant` given twice, `--variant` with
   `--in-place` or `--workdir`, an option given with `--connect` that only a run takes, `--connect` with no unit, and
   no unit, `--in-place` or `--workdir` given
6. `./sandbox-dev.sh`, which runs the working copy's `container/sandbox.sh`, follows requirements 4 and 5 with it.
   The other commands of the kit and of this repository, but the change check, already follow requirement 1, and
   keep their statuses
7. The change check takes at most one argument, the repository root. Given more, it says that it takes one, prints
   its usage, checks nothing and exits 2. Its statuses are otherwise as today

Keeping it so:

8. This repository's `AGENTS.md` says that every command of the kit, and every command of this repository's own,
   follows "Exit statuses" of `README.md`, and that a unit that adds a command or a status of one does so by it

Tests:

9. Tests show, for `./sandbox.sh`, exit status 1 for an `agentrite.json` at fault and for a unit that names no
   branch, and 2 for an option it does not take and for `--variant` given twice. Tests that today expect 2 for a
   refusal that requirement 4 makes 1 expect 1. A test shows that the change check given two arguments exits 2 and
   checks nothing

## Decisions

* **The meanings are those that `npx agentrite` already has.** `0` for success, `1` for a refusal or a failure and
  `2` for wrong arguments is how many command-line tools use them, and every command of `npx agentrite` and the
  change check already follow it. Only `./sandbox.sh` is out of line, so it is the one that changes. Rejected:
  `./sandbox.sh`'s use of 2 for every refusal, which would change every command of `npx agentrite` instead, and gives
  a caller no way to tell a mistyped command from a refused one
* **2 is for what can be told from the arguments alone.** A unit that names no branch is a unit of the right form,
  refused for the state of the repository, as `npx agentrite run` refuses with status 1 a unit that `changes/` does
  not hold. A variant's branch given with `--variant` is told from the branch's name, which the arguments give, and
  stays 2. That draws the line the same way for every command
* **A status of 3 and above is a command's own.** The orchestrator needs one for a stop for the human, and another
  command may need one later. A meaning that two commands share would be defined here first. Rejected: reserving 3
  for the orchestrator's meaning for every command, which guesses at meanings no other command has
* **A status that is passed on stays passed on.** A caller of `npx agentrite run` or of `./sandbox.sh` with a command
  wants what the harness or the command exited with, as the orchestrator does. A wrapper may not hold a status back
  for itself, since the program it runs may exit with any status. The cost: a caller cannot tell a refusal of the
  wrapper from a failure of what it ran by the status alone, and the section says so. A `./sandbox.sh` that brings
  the work back after the command and fails at that keeps exiting 1 when the command exited 0, as today
* **The definition is in `README.md`, and the rule to follow it in `AGENTS.md`.** `README.md` is where a project
  reads what a command does. That the kit's own commands follow it is a rule for whoever works on the kit, which is
  what this repository's `AGENTS.md` holds. It is not a rule of `standards.md`, since a project's own commands are the
  project's to define
* **The change check refuses a second argument.** The human took this into the unit from "Beyond the request".
  Today it ignores every argument after the repository root, so a mistyped command runs a check the caller did not
  ask for, and the convention gives such arguments 2
* **The change of `./sandbox.sh` is a change a project's scripts may notice.** A script that tells a refusal of the
  sandbox by 2 now sees 1. Few scripts read it, and the release notes of the release that holds this unit say so

## Non-goals

* A status for a harness ended by a signal, or for one that a shell gives as 128 and the signal's number, beyond
  what the commands do today
* The statuses that a harness, Docker or a command run in the sandbox give, which the kit passes on
* The orchestrator's own statuses, which unit 0065 defines. Whichever of the two units is implemented later brings
  `agentrite orchestrate`'s section in line with the other's
* Scripts of the kit that no developer runs, such as the container's entry point and the scripts `./sandbox.sh` calls,
  beyond how `./sandbox.sh` exits when one of them fails
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

None
