# 0078 Commits with forbidden trailers are refused

## Context

The standards forbid two trailers in a commit message: `Co-Authored-By`, and `Claude-Session` together with any other
trailer a harness injects. The rule is in the standards that every role reads, and it is still broken. A harness adds
its own instruction to put a trailer on every commit, the agent follows that instruction instead of the standards, and
the commit has to be rewritten once the human sees it. A rule that is only read is not kept reliably, so the kit
should refuse the commit itself.

Git offers one place for that: the `commit-msg` hook, a script that git runs with the path of the message file after
the message is written and before the commit is made. A hook that exits with a non-zero status stops the commit and
shows what it printed, so an agent learns of the mistake in the same step it makes it and can commit again.

A hook has to be in force where agents commit, and there are two such places. A project's own repository is one, with
the sessions of an agent on the host. The other is the sandbox, where a unit run mounts a clone at `/work`. A hook
installed in the project's repository never reaches that clone: `git clone` copies neither the hooks nor
`.git/config`, and the sandbox runs no git in the clone on the host, since the clone is the agent's to write.

The sandbox sets git's configuration for every process in its container through the environment, which
`container/compose.yml` already does for `safe.directory`. Compose reads that file from the installed kit at every
start, while what the image holds stays as it was built. The wrapper builds the image again when a harness version
changes, and not for a new kit.

## Requirements

The checker:

1. The kit ships one checker that takes the path of a commit message file and decides whether the message may be used.
   The hook of the project and the hook of the sandbox both call it, and the rule that names the forbidden trailers is
   written in it and nowhere else
2. A message is refused when one of its lines starts with `Co-Authored-By` or with `Claude-Session`, with nothing
   before the name and a colon right after it. The name is read whatever its case, as git reads trailer names
3. A line that starts with `#` is not read: it is not a trailer, and git removes it from a message that is edited. A
   line that holds a forbidden name
   anywhere but at its start, as in `Do not add Co-Authored-By: lines`, does not refuse the message
4. For a message that is not refused, the checker prints nothing and exits 0
5. For a refused message, the checker prints on standard error, for each offending line, its number in the file and the
   line as written, then one sentence that says the standards forbid these trailers and that the lines are to be
   removed before the commit is made again. It names every offending line in one run, and exits 1
6. A file that cannot be read is refused with a message that names the file, and the checker exits 1. No path, or more
   than one, is wrong arguments: it says what is wrong, prints its usage and exits 2

On the host:

7. `agentrite init` writes the `commit-msg` hook into the hooks directory that git uses for the project, so that
   `core.hooksPath` is honored where the project sets it. The hook is a file the owner can execute, and it calls the
   checker of the installed kit, under `node_modules` at the top of the work tree git runs it in, with the path git
   gives it. It marks itself as the kit's with a line that `refresh` recognizes
8. When the hook cannot run the checker, because the checker's file is not under `node_modules` of the work tree or
   `node` is not on the `PATH` git gives it, the hook refuses the commit. It prints on standard error which of the two
   it is and what to do, to install the project's dependencies in that work tree or to make `node` reachable from
   git, and exits 1. Git then makes no commit and shows that message
9. A file already at the hook's path is left as it is by `init` and reported as skipped, as `init` treats any file that
   exists
10. `agentrite refresh` rewrites a hook at that path that carries the kit's mark, so that a hook written by an older
    kit is brought up to date, and writes the hook where there is none. A file there that does not carry the mark is
    the project's own: `refresh` leaves it as it is and prints a notice that says the commit messages are then not
    checked for the trailers, and where the README says how to call the checker from its own hook
11. In a directory that is not inside a git repository, `init` and `refresh` write no hook and print a notice that
    says why. The notice changes neither what else they write nor their exit status
12. In a project set up by `init`, `git commit` with a message that holds a forbidden trailer fails, makes no commit,
    and shows the checker's message. The same commit with the trailer removed is made. This holds for `-m`, for a
    message from an editor and for `--amend`

In the sandbox:

13. Every process in the sandbox's container runs git with the hooks directory of the kit's hook, whichever way the
    container is started: a unit run, `--in-place`, `--workdir` and `--mount` included. The hook is taken from the
    image, and not from the clone or from a mount, which the agent can write
14. In the container, `git commit` with a forbidden trailer fails and makes no commit, and the same commit without it
    is made. This holds in a unit run's clone before `npm ci`, as the image does not depend on the repository's files
    for the check
15. The hook of the sandbox calls the same checker as the hook of the project, so that a change of the rule changes
    both with no second edit
16. The wrapper builds the kit's image again when the image records a version of the kit other than the installed
    kit's, or records none, and says so on standard error before it builds, as it does for a harness version. The
    image records the version of the kit it was built from, as it records the harness versions. So the first start
    after an update builds the image, and the hook and the checker in the container are those of the installed kit

The documents:

17. `README.md` has a section `## Git hooks`, after "Installing it into a project", which describes the hook: where
    it is written, its mark, what it refuses, what `init` and `refresh` each do with it, the notices of requirements
    10 and 11, what the hook prints when it cannot run the checker (requirement 8), and how a project that has a hook
    of its own calls the checker from that hook. It points to `SANDBOX.md` for the hook in the sandbox. The checker
    has an entry of its own under `## Commands`, beside `check-changes`, with its form, its arguments, the messages it
    prints and its exit statuses by "Exit statuses", and the section links to it rather than describing it again.
    The entries of `init` and `refresh` each say in a line that they write the hook, and link to the section. It
    says that the wrapper builds the image again for a new kit, where it describes updating a project
18. `SANDBOX.md` says what a reader sees when the hook refuses a commit in the container, that it is the same rule as
    on the host, and that it is the image's hook and not the clone's. It says that git in the container runs the
    image's hooks only, so that the hooks of the mounted repository and of a hooks directory its configuration names
    are not run there, and that the image is built again for a new kit. "What the sandbox defends against" is kept
    true
19. The table "What is here" in `README.md` is kept true for any file the unit adds to the package, and so is "What the
    repository holds besides the package" in `CONTRIBUTING.md`

Tests:

20. Unit tests of the checker cover each of requirements 2 to 6: each forbidden name in several cases, a trailer at the
    start of a later line, a line that starts with `#`, a name inside a sentence, several offending lines in one
    message, an empty message, a file that does not exist, and no path and two paths
21. Tests of `init` and `refresh` cover requirements 7 and 9 to 11: the hook written and executable, a project with
    `core.hooksPath`, a file already there, a hook with the mark rewritten, a file without it left as it is with the
    notice, no hook written outside a git repository with the notice, and that the exit statuses are as before
22. An end-to-end test makes a git repository, sets it up with `init`, and shows that `git commit` is refused for a
    message with each trailer and made for one without, with `--amend` among the commits (requirement 12). It shows
    too that a commit is refused with the hook's message when the checker is not under `node_modules`, and when
    `node` is not on the `PATH` (requirement 8)
23. Tests show that the sandbox's configuration gives git the hooks directory in every run mode and that the image
    holds the hook and the checker it calls. A test runs the container, as the suite's tests of the sandbox do and
    with their skip on a host without Docker, and shows a commit refused and a commit made in it (requirements 13 to
    15)
24. Tests of the wrapper show that it builds the image when the image records another version of the kit or none,
    with the line it prints, and does not build it for that reason when the versions are the same (requirement 16)

## Decisions

* **The `commit-msg` hook, and not a check afterwards.** The hook stops the commit as it is made, so the agent that
  made the mistake corrects it in the next command. The change check could also look at the commits of a branch, but it
  runs late, often by someone else, and would leave the history to be rewritten. That is left as a beyond-the-request
  item
* **One checker, called by two hooks.** The rule is a decision, and a decision written twice drifts. The checker holds
  the names of the trailers, and the hook of a project and the hook of the sandbox are thin files that call it, so that
  `refresh` can bring a project's hook up to date without the rule being in it
* **The two names are fixed by the kit.** The human chose this over a list in `agentrite.json`. They are the two the
  standards name. Standards the project replaces are not read by the checker, so a project whose standards differ
  edits its hook or does not use the kit's. The list in `agentrite.json` has one use today, and would need its own
  setting, documentation and tests
* **The hook goes where the project's git looks for it.** A project that sets `core.hooksPath`, as projects that use a
  hook manager do, would never run a hook written to `.git/hooks`, which would look installed and do nothing. Writing
  where git looks avoids that. A committed hooks directory with `core.hooksPath` pointing to it was considered and
  dropped: the setting is per clone, so it needs a step on every clone, and it replaces the project's other hooks
* **A file already there is the project's.** `init` never changes a file that exists. `refresh` rewrites the hook only
  when it carries the kit's mark, which is new to `refresh`: the wrappers, the list and `sandbox.sh` it rewrites
  whatever is in them, and it reads a wrapper's body only to decide whether to remove one. A hook is not a file the kit
  owns by its path, since a project may already have its own there. A project that has a hook of its own keeps it,
  with a notice that tells it how to call the checker. Chaining several hooks is left out: git has no mechanism for
  it, and each project already has its own way
* **The sandbox gets the hook from the image, through git's environment configuration.** The clone is the agent's to
  write, with its `.git` included, so a hook there can be removed, and the sandbox is built never to run what the clone
  holds. The developer's `/etc/gitconfig` is mounted as the developer wrote it, and the agent's `~/.gitconfig` lives in
  the home volume. The environment of the container, which the sandbox already uses for `safe.directory`, outranks
  both and belongs to the kit. The human chose to cover the host and the sandbox both, since agents commit in both
* **The hook has a section of its own in `README.md`.** It is a new kind of thing the kit puts in a project, one
  that both `init` and `refresh` act on, and part of what a reader needs of it, such as its mark, a worktree, and
  calling the checker from a hook of the project's own, belongs to neither command. Describing it in the entries of
  both commands was rejected, since it would be written twice or split between them. The checker is under
  `## Commands`, since a project runs it, as `check-changes` is
* **A hook that cannot run the checker refuses the commit.** A worktree without its own `node_modules`, a removed
  `node_modules` and a git client whose `PATH` has no `node` all run the hook without a checker. Letting the commit
  through there, with a notice, was rejected: it checks nothing in exactly the case the hook is for, and an agent
  does not stop for a notice of a command that succeeded. A refusal is seen at once and recovered from cheaply, by an
  install or a `PATH`, and the hook's own message says which. The checker is looked for under the top of the work tree
  git runs the hook in, so each worktree needs its dependencies installed, as the project's other commands already do
* **The image is built again for a new kit.** The hooks directory reaches git through `container/compose.yml`, which
  is read from the installed kit at every start, and the hook is in the image, which is not. Without a build, the
  first start after an update would point git at a directory the old image does not hold, and git runs no hook it
  cannot find, so the check would be off with nothing said. A line in the update instructions was rejected: it rests
  on a developer reading it, and missing it fails silently. The image records the kit's version as it records the
  harness versions, and is built again when they differ, which costs one build per update of the kit
* **In the sandbox, the image's hooks are the only ones.** `core.hooksPath` replaces the hooks directory, so with
  `--in-place` and `--workdir` the mounted repository's own hooks stop running in the container, and in a unit run's
  clone so does a hooks directory that `npm ci` configures. Running them as well as the kit's hook is chaining, which
  is left out on the host for the same reason: git has no mechanism for it. A project that wants its own checks in the
  sandbox runs them as commands. `SANDBOX.md` says so, so that a developer does not find it out when a hook stops
* **A guardrail against a mistake, not a defence.** The hook is there for an agent that follows a harness instruction
  over the standards, and for a developer who forgets. It does not defend against someone who means to bypass it. That
  is the same boundary the standards keep for every rule: they are read in good faith
* **No opt-out setting.** A project that does not want the hook replaces the file with its own, which `refresh` then
  leaves as it is. A setting in `agentrite.json` would add a flag, a branch in two commands and documentation for a
  choice that a file already makes

## Supported usage and what is not defended against

The hook is built for an agent or a developer who makes commits with `git commit`, on the host in a repository that
`init` set up, or in the sandbox's container. It does not defend against:

* `git commit --no-verify`, which skips the hook, and a hook file the committer edits or deletes
* a container started with its own `GIT_CONFIG_COUNT`, which the sandbox already says overrides its git configuration
  (`container/compose.yml`), and a command that sets `core.hooksPath` itself
* a commit that git makes without running `commit-msg`, as some steps of `cherry-pick`, `revert` and `rebase` do
* a trailer other than the two, including one a harness injects that the kit does not know of
* a pull request description or any text other than the commit message

## Non-goals

* A list of forbidden trailers in `agentrite.json`, or any other setting for the hook
* Trailers other than `Co-Authored-By` and `Claude-Session`, and detecting a harness-injected trailer by its shape
* Checking the commits that already exist, and rewriting any of them
* Pull request descriptions, tag messages and any text that is not a commit message
* Chaining the kit's hook with a hook of the project's own, on the host or in the sandbox
* A hook other than `commit-msg`
* Changing `standards.md` or `process.md`
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **The attribution setting of the harness.** Claude Code has a setting in `.claude/settings.json` that removes the
   instruction to add its attribution lines to commits and pull requests. `init` would write it, or amend that file,
   for `claude`. It would stop the mistake at its source, where the hook only catches it. It costs a new file the kit
   writes and keeps true, a check of its key names against the harness, and an equivalent for each other harness.
   OpenCode needs none, since it gives no such instruction. Codex, which the kit may support later, has no setting a
   project can hold: it gives the instruction for `Co-authored-by: Codex <noreply@openai.com>` when the account's
   setting on OpenAI's servers says so, and tells the model to ignore any earlier instruction against it. Without it,
   the harness still gives the instruction, the hook refuses the commit, and the agent commits again
2. **A check of the commits of a branch.** `check-changes` would also refuse a branch whose commits hold a forbidden
   trailer, which catches a commit made with `--no-verify`, on a machine without the hook, or by a commit git makes
   without the hook. It costs a pass over the branch's commits in a check that reads documents only now, and a rule
   written in a second place unless it calls the checker. Without it, those commits are found by the human when they
   read the history, and rewritten then
3. **The pull request description.** The same instruction is given for pull request descriptions, where no hook runs.
   Codex gives one too, for a line `Generated with [Codex](https://openai.com/codex/).` in the body.
   The kit has no step at which a description is written, so there is nothing to attach a check to. Without it, the
   human removes the line when they read the description
