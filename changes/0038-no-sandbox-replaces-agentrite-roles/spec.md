# 0038 `--no-sandbox` replaces `agentrite-roles`

## Context

The package has two commands whose names differ by a dash and a space, and that do unrelated things:

* `agentrite-roles claude opencode` writes the role wrappers into a project and refuses when one exists. It is the
  first command the kit had, from unit 0002, and a command of its own in the package
* `agentrite roles [--json]` lists the roles the kit has and writes nothing. It came with unit 0032

A slip between the dash and the space runs the other one. `agentrite-roles` is also nearly redundant: `init` writes
the same wrappers with everything else a project needs, and `refresh` rewrites them. What it alone still does is
write the wrappers and nothing else.

The case behind "the wrappers and nothing else" is a project that wants the process and the roles and does not want
the sandbox. Neither `init` nor `refresh` serves it today. `init` always writes `agent.sh`,
`agent/compose.project.yml` and `.dockerignore`. `refresh` writes whatever of its files is missing, so it creates an
`agent.sh` in a project that removed it on purpose.

`agentrite-roles` is removed, and `init` and `refresh` take `--no-sandbox`.

## Requirements

1. The package has one command, `agentrite`. A project that installed the kit has no `agentrite-roles` in
   `node_modules/.bin`, and no file of the package does, when run by itself, what `agentrite-roles` did
2. Nothing a command of the kit prints names `agentrite-roles`: no usage text, no error and no notice
3. The role wrappers that `init` and `refresh` write are, byte for byte, what they write before this unit
4. The package that holds the name `agentrite-roles` on the npm registry stays in this repository, with a version
   above the published 1.0.0. What it prints, and its README, say that AgentRite has no command of that name any
   more, and name `agentrite init` and `agentrite refresh` as what to run in its place, each with `--no-sandbox` for
   a project without the sandbox. It still exits 1, and still says where the kit is for someone who does not have it.
   The pointer of the name `agentrite` is unchanged
5. `init` and `refresh` each take the option `--no-sandbox`:
    * at any place among the harnesses, before, between or after them
    * given more than once, it counts as given once, as a repeated harness does
    * the usage of each command names it, as `usage: agentrite init [--no-sandbox] claude | opencode` and the same
      for `refresh`
    * `roles` and `run` do not take it, and what they print for an argument they do not take is unchanged
6. `init --no-sandbox` does for the role wrappers, `AGENTS.md`, `CLAUDE.md` and the `check-changes` script in
   `package.json` exactly what `init` does, with the same lines printed for them and the same notices. It does not
   write, change or read `agent.sh`, `agent/compose.project.yml` or `.dockerignore`, and prints no line for any of
   the three. One of them that exists is left as it is
7. `init --no-sandbox` does not refuse for what only the sandbox needs. It runs when `package.json` has no `name`,
   and it does not read `package-lock.json`. It still refuses, writing nothing, when `package.json` is missing or
   cannot be read
8. `refresh --no-sandbox` does for the role wrappers exactly what `refresh` does, a pinned model that survives
   included. It does not write, change or read `agent.sh`, and prints no line for it. What is at the path of
   `agent.sh`, a symbolic link or a directory included, changes neither what it prints nor its exit status
9. Without the option, `init` and `refresh` write, change, skip and print what they do before this unit, apart from
   the usage text of requirement 5
10. `init` without the option, run in a project that was set up with `--no-sandbox`, writes the three files of the
    sandbox and skips the rest
11. The documents that describe the commands to a project describe `--no-sandbox` under both commands: which files
    it leaves out, and that `refresh` without it writes an `agent.sh` that is missing. They name `agentrite-roles`
    nowhere. Whatever else in this repository names `agentrite-roles` as a command a project runs no longer does,
    apart from the documents of earlier units and the earlier sections of `CHANGELOG.md`
12. The suites pass. The parsing of the option is unit tested, and what each of the two commands writes and prints
    with it is tested end to end, in a project that has the sandbox's files and in one that has none

## Decisions

* **`--no-sandbox`, not `--roles-only`, on the human's word.** The human proposed `init --roles-only` and
  `refresh --roles-only`. `refresh --roles-only` would differ from `refresh` by one file, and `init --roles-only`
  would leave out `AGENTS.md`, which is what makes the kit's instructions reach an agent, so wrappers alone are of
  little use. The option names what a project does without, the sandbox, and the human took it
* **The option, and not nothing.** Removing `agentrite-roles` with no option was the alternative, for when no project
  uses the kit without the sandbox. The human chose the option
* **Nothing replaces "the wrappers alone, never overwriting".** `refresh --no-sandbox` writes the wrappers and
  nothing else, and overwrites one that exists, keeping its pinned model. `init --no-sandbox` never overwrites, and
  writes more than the wrappers. A command that does both would be `agentrite-roles` under another name
* **No release that warns first.** `agentrite-roles` goes in one step. It is a breaking change for a project that
  calls it, so the release that carries this unit is a major one, and its notes, written when it is made, say what
  to run instead. A project that runs the old name after updating reaches the pointer of requirement 4, which says
  the same
* **The registry name is kept and the pointer is reworded.** Giving the name up would let anyone publish under it,
  and whoever types `npx agentrite-roles` from habit would then run their code. Left as it is, the pointer says that
  `agentrite-roles` is a command of AgentRite that is not installed, which sends the reader to install what they
  have. Publishing the new version of the pointer to npm is the human's act, as it was in unit 0011, and the unit
  is done without it
* **What the sandbox takes with it is three files.** `agent.sh`, `agent/compose.project.yml` and `.dockerignore` are
  what `init` writes for the sandbox alone. `AGENTS.md` and `CLAUDE.md` are written as they are with the sandbox:
  the template names the sandbox once, as one of two places `npm ci` runs, which stays true of a project that has
  none
* **No line is printed for a file that is left out.** A `skipped agent.sh` line would read as the skip of a file
  that exists, which is what `skipped` means in every other line of `init`
* **The name in `package.json` is not asked for.** `init` refuses without it because the sandbox's Compose project
  and image names are derived from it, and says so. With `--no-sandbox` that reason is gone, and the refusal would
  name a sandbox the project asked not to have
* **The option is given on each run and is not remembered.** The project holds no setting that says it has no
  sandbox. `refresh` is run once per update of the kit, and forgetting the option there writes one file that is
  reported as written and is not tracked
* **The option is positional nowhere.** A harness and the option are told apart by the two dashes, so their order
  carries nothing, and a user who appends it to the command they already know is not refused
* **The order with unit 0037 is the human's.** 0037 is a draft, and its requirement 5 lists `agentrite-roles` among
  the commands the new README describes. If this unit is built first, that line leaves 0037's spec before it is
  approved, which is a change to that unit and is not made here. If 0037 is built first, requirement 11 is met in
  the three documents it leaves, by the rule it puts in this repository's `AGENTS.md`

## Non-goals

* A change to `agentrite roles` or `agentrite run`, or to what `agent.sh` does
* A change to the role wrappers, to the templates or to the role files
* Removing the sandbox's files from a project that has them. `--no-sandbox` leaves out, and deletes nothing
* A section in `CHANGELOG.md`. It is written when the release is made
* Publishing the pointer to npm, or deprecating a version of it there
* A change to unit 0037's spec

## Beyond the request

* `refresh` that sees by itself that a project has no sandbox, by the absence of `agent/compose.project.yml`, and
  then leaves `agent.sh` out without the option. It would cost a rule on what counts as having the sandbox, and a
  `refresh` that no longer repairs a project whose compose file was lost. Without it, a `refresh` run without the
  option prints `wrote agent.sh`, and the file is deleted by hand
* The remedy that `agentrite run` prints for a wrapper that is missing or out of date, `npx agentrite refresh
  <harness>`, with `--no-sandbox` added for a project that has none. It would need the detection above. Without it,
  following the remedy in such a project writes an `agent.sh`, as above
* A release in which `agentrite-roles` still runs and prints that it is going. It would cost one more release and a
  second unit to remove it. Without it, the first run of the old name after the update ends at the pointer, with
  what to run instead
