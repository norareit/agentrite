# 0078 Commits with forbidden trailers are refused

## Approach

One checker, `container/check-commit-message.mjs`, holds the rule. It lives in `container/` and not in `scripts/`
because the image build reads the kit from the project's build context, and the `.dockerignore` that `init` writes
admits `node_modules/agentrite/container/**` and nothing else of the kit. `refresh` never writes `.dockerignore`, so
a checker under `scripts/` would be missing from the build context of every project set up before this unit. The
checker is a pure function over the text of the message, `offendingLines`, and a thin entry point that reads the
file, prints and exits.

Two thin hooks call it:

* The host's hook is the template `templates/project/commit-msg`. It finds the top of the work tree with
  `git rev-parse --show-toplevel` and runs `node <top>/node_modules/agentrite/container/check-commit-message.mjs "$1"`.
  When the checker's file is missing, or `node` is not on the `PATH`, it says which and what to do, and exits 1. It
  holds the mark line `# agentrite: commit-msg hook`
* The sandbox's hook is `container/hooks/commit-msg`. It runs `node /usr/local/lib/agentrite/check-commit-message.mjs
  "$1"`. The Dockerfile copies the checker and the hook to `/usr/local/lib/agentrite/` and
  `/usr/local/lib/agentrite/hooks/`

On the host, `init` and `refresh` ask git where the hooks are, with
`git rev-parse --path-format=absolute --git-path hooks` run in the project root. This honors `core.hooksPath` and a
linked worktree, and it fails outside a git repository. What `init` and `refresh` decide about the hook, the mark,
and the texts of their notices are pure functions in a new module, `scripts/agentrite-hook.mjs`. The call to git and
the writing stay in `scripts/agentrite.mjs`, beside the rest of what `init` and `refresh` write. A path inside the
project root is printed relative to it, as `.git/hooks/commit-msg`, and one outside it is printed absolute.

In the sandbox, `container/compose.yml` raises `GIT_CONFIG_COUNT` to 2 and adds `core.hooksPath` as
`/usr/local/lib/agentrite/hooks`, beside `safe.directory`. Every run mode starts the one Compose service, and
`--connect` uses `docker exec`, which keeps the container's environment, so every process in the container gets it.

The image records the kit's version in the label `com.ritenoar.agentrite.kit-version`, from a build argument
`AGENTRITE_VERSION` that the base Compose file takes from `SANDBOX_AGENTRITE_VERSION`. The wrapper reads the
installed kit's version from `package.json` beside its `container/`, which is `node_modules/agentrite/package.json` in
a project and the repository's own `package.json` for `sandbox-dev.sh`. It reads the label with the two harness
labels it reads already, and builds again when the two differ or the image records none. The fake hosts of the
wrapper's tests answer `image inspect` with `<claude>|<opencode>`, so the test fixture gets the third field first, in
a commit of its own that changes no behavior.

The human decided, while this plan was written, that the passages a new kit's build makes false are replaced or
removed: the paragraph of "Updating a project to a newer kit" in `README.md` that tells a project to build again for
the group `tty` is replaced by the line requirement 17 asks for, and the entry "Claude Code in the sandbox does not
ring the bell, while OpenCode does" of "When something goes wrong" in `SANDBOX.md` is removed, since an image built
before it records no kit version and is built again at the first start.

## Files

- `container/check-commit-message.mjs`: new. The checker: `offendingLines`, the refusal's text, and the entry point
- `container/hooks/commit-msg`: new. The sandbox's hook, executable
- `container/Dockerfile`: copies the checker and the hook, and records the kit's version as a label
- `container/compose.yml`: `core.hooksPath` through git's environment configuration, and the build argument
  `AGENTRITE_VERSION`
- `container/sandbox.sh`: reads the installed kit's version, compares it with the image's label, builds again and
  says why, and exports `SANDBOX_AGENTRITE_VERSION`
- `templates/project/commit-msg`: new. The host's hook, with the mark
- `scripts/agentrite-hook.mjs`: new. The mark, whether a text is the kit's hook, the path as printed, and the
  notices of requirements 10 and 11
- `scripts/agentrite.mjs`: `init` and `refresh` write the hook, and `readTemplates` reads its template
- `package.json`: `scripts/agentrite-hook.mjs` in `files`
- `tests/check-commit-message.test.mjs`: new. The checker's unit tests
- `tests/agentrite-hook.test.mjs`: new. The unit tests of `scripts/agentrite-hook.mjs`
- `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`: the hook in `init` and `refresh`, and the
  notice of requirement 11 added to the output that existing tests compare in full, since their projects are not git
  repositories
- `tests/settings-update.test.mjs`, `tests/sandbox-update.test.mjs`: the same notice where they compare the output of
  `init` or `refresh` in full
- `tests/commit-msg-hook.test.mjs`: new. End to end on the host
- `tests/sandbox-commit-msg.test.mjs`: new. The sandbox's configuration, the image's files, and the container run
- `tests/compose-entries.mjs`: a reader of one entry of the service's `environment:` mapping
- `tests/wrapper-fixture.mjs`: the kit's `package.json` beside an installed `container/`, the third label in the fake
  hosts' answers, and the kit version in the stand-in image
- `tests/sandbox-wrapper.test.mjs`, `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`,
  `tests/sandbox-dev.test.mjs`, `tests/sandbox-update.test.mjs`, `tests/settings-update.test.mjs`: their set-ups
  install the kit's `package.json`, and the labels they write carry the kit's version
- `tests/harness-versions.test.mjs`: the kit's label and build argument, beside the harnesses'
- `README.md`: `## Git hooks`, `### check-commit-message`, the lines in `init` and `refresh`, the table of contents,
  "What is here", "On a fresh clone", and "Updating a project to a newer kit"
- `SANDBOX.md`: `## Commit messages`, "What the sandbox defends against", and the removal of the bell's entry

## Tasks

### The checker

- [ ] Write `tests/check-commit-message.test.mjs` first, against `offendingLines` and against the script run with
  `node`: each of `Co-Authored-By` and `Claude-Session` refused as written, in lower case and in upper case; a
  trailer at the start of a later line, with its line number; a line that starts with `#` holding either name, not
  refused; a name inside a sentence, as `Do not add Co-Authored-By: lines`, not refused; a name with a space before
  the colon or a space before the name, not refused; a message of CRLF lines, refused with the line as written but
  for its line break; several offending lines named together in one run with exit 1 and the closing sentence once;
  an empty message, exit 0 and nothing printed; a clean message, exit 0 and nothing printed on either stream; a file
  that does not exist, exit 1 with its path named; no path and two paths, each exit 2 with what is wrong and the
  usage, and nothing read (R2, R3, R4, R5, R6, R20)
- [ ] Write `container/check-commit-message.mjs`: `offendingLines(text)` returns `{ number, line }` for each line that
  matches `/^(co-authored-by|claude-session):/i`, numbered from 1, a line that starts with `#` never matching. The
  entry point prints on standard error `line <number>: <line>` for each, then the one sentence that the standards
  forbid the trailers `Co-Authored-By` and `Claude-Session` in a commit message and that the lines are to be removed
  before the commit is made again, and exits 1. A clean message prints nothing and exits 0. A file that cannot be read
  prints `check-commit-message: cannot read <path>: <reason>` and exits 1. Wrong arguments print what is wrong and
  `usage: node node_modules/agentrite/container/check-commit-message.mjs <commit message file>`, and exit 2. The two
  names are written here and nowhere else in the code (R1, R2, R3, R4, R5, R6)

### The hook on the host

- [ ] Write `tests/agentrite-hook.test.mjs` first: `isKitHook` is true for a text that holds the mark as a line of its
  own and false for one that holds it inside another line or not at all; the template `templates/project/commit-msg`
  holds the mark; the printed path is relative for a path under the root and absolute for one outside it; the notice
  of a hook that is the project's own names the path, says that commit messages are then not checked for the
  trailers, and names "Git hooks" in the kit's `README.md`; the notice outside a git repository says that no hook was
  written and why (R7, R10, R11)
- [ ] Write `templates/project/commit-msg`: `#!/bin/sh`, the mark line `# agentrite: commit-msg hook`, a comment that
  points to "Git hooks" in the kit's `README.md`, the top of the work tree from `git rev-parse --show-toplevel`, and
  the checker's path under it, every path quoted since a project's path may hold a space. When the checker's file is
  not there, it prints on standard error that the checker is not at that path and to install the project's
  dependencies in that work tree, as with `npm ci`, and exits 1. When `command -v node` finds no `node`, it prints that
  `node` is not on the `PATH` git gives the hook and to make `node` reachable from git, and exits 1. Otherwise it runs
  `exec node "<checker>" "$1"` (R7, R8, R15)
- [ ] Write `scripts/agentrite-hook.mjs`: `HOOK_MARK`, `isKitHook(text)`, `printedHookPath(root, path)`,
  `foreignHookNotice(printedPath)` and `noRepositoryNotice(reason)`, where the reason is either that the project root
  is not inside a git repository or that git could not be run, with the error it gave. Add the file to `files` in
  `package.json` (R7, R10, R11)
- [ ] Add to `tests/agentrite-init.test.mjs`, before the code: in a project that is a git repository, `init` writes
  `.git/hooks/commit-msg` with the template's content, executable by the owner, and prints `wrote
  .git/hooks/commit-msg`; with `core.hooksPath` set to a relative directory that does not exist yet, it writes the
  hook there, making the directory; with `core.hooksPath` outside the project, it prints the absolute path; a file
  already at the path is left byte for byte and printed as `skipped <path>, which exists`; in a directory that is
  not inside a git repository, no hook is written, the notice is printed after the other notices, every other file is
  written as before and the status is 0; with `--no-sandbox` the hook is written too. Add the notice of requirement 11
  to every existing test that compares the output of `init` in full (R7, R9, R11, R21)
- [ ] In `scripts/agentrite.mjs`, add `hookPath(root)`, which runs `git rev-parse --path-format=absolute --git-path
  hooks` in `root` and gives the path of `commit-msg` in that directory, or the reason there is none. `init` plans it
  before it writes anything, writes the hook with the flag `wx` and mode `0o755` after `.dockerignore`, prints `wrote`
  or `skipped` with the printed path, and puts the notice of requirement 11 last among its notices (R7, R9, R11)
- [ ] Add to `tests/agentrite-refresh.test.mjs`, before the code: `refresh` writes the hook where there is none and
  prints `wrote`; rewrites a hook that carries the mark and differs from the template, as one an older kit wrote, and
  prints `refreshed`; makes a marked hook with the template's content but without the owner's execute bit executable;
  prints `up to date` for one that is the template and executable; leaves a file without the mark byte for byte,
  prints no line of files for it, and prints the notice of requirement 10 after the other notices; treats a symbolic
  link at the path as the project's own, with the same notice and status 0; with `core.hooksPath` writes the hook
  there; outside a git repository writes no hook and prints the notice of requirement 11; and the status is that of
  the other files in every case. Add the notice of requirement 11 to every existing test that compares the output of
  `refresh` in full (R10, R11, R21)
- [ ] In `scripts/agentrite.mjs`, `refresh` takes the hook after the kit's own files and before it removes stale
  wrappers: missing, it writes it; a regular file that `isKitHook` accepts, it rewrites as the other kit files are
  rewritten, `refreshed` or `up to date`, with the execute bit; anything else is the project's own, left as it is,
  with the notice of requirement 10. The notices of requirements 10 and 11 come last among its notices. Neither
  changes the status (R10, R11)
- [ ] Add the notice of requirement 11 to the outputs that `tests/settings-update.test.mjs` and
  `tests/sandbox-update.test.mjs` compare in full, and run the whole suite (R11)
- [ ] Write `tests/commit-msg-hook.test.mjs`: make a git repository in a temporary directory with a `package.json`,
  install the kit as `installKit` does and copy `container/check-commit-message.mjs` under its
  `node_modules/agentrite/container/`, run `init` with the working tree's `scripts/agentrite.mjs`, and show that
  `git commit -m` is refused for a message with `Co-Authored-By` and for one with `Claude-Session`, with the checker's
  message on standard error and `HEAD` unchanged, and made for the same message without the trailer; that a message
  written by an editor, given as `GIT_EDITOR` a script that writes the message file, is refused and then made; that
  `git commit --amend` adding a trailer is refused and leaves the commit as it was. Then remove the checker's file
  and show a commit refused with the hook's message about the checker, and with the file back, run `git commit` with
  a `PATH` that holds `git` and no `node` and show it refused with the hook's message about `node` (R8, R12, R22)
- [ ] Commit point 1, below

### The hook in the sandbox

- [ ] Add to `tests/compose-entries.mjs` `environmentEntry(key)`, which reads the value of `      <key>: <value>` in
  the service's `environment:` mapping, with its quotes removed
- [ ] Write `tests/sandbox-commit-msg.test.mjs` first: the compose file gives `GIT_CONFIG_COUNT` as `2`, keeps
  `safe.directory` as entry 0, and gives entry 1 as `core.hooksPath` with the directory to which the Dockerfile copies
  the hook; `container/sandbox.sh` sets no `GIT_CONFIG_` variable and passes no `--env` of one, so that no run mode
  and not `--connect` replaces it; the Dockerfile's last stage copies `check-commit-message.mjs` and `hooks/commit-msg`
  from `${KIT_CONTAINER}` and makes the hook executable; the path that `container/hooks/commit-msg` runs is the path
  to which the Dockerfile copies the checker, so that the image's hook runs the file the host's hook runs; and, with
  the skip of the suite's other tests of the sandbox on a host without Docker, a container of the Dockerfile's base
  image, as the agent's uid, with the compose file's `GIT_CONFIG_*` entries as its environment and the hook and the
  checker mounted read-only at the paths the Dockerfile copies them to, refuses `git commit -m` with a trailer in a
  new repository, leaving no commit, and makes the same commit without it. The paths are read from the Dockerfile and
  the compose file, not written again in the test (R13, R14, R15, R23)
- [ ] Write `container/hooks/commit-msg`, executable: `#!/bin/sh` and `exec node
  /usr/local/lib/agentrite/check-commit-message.mjs "$1"`, with a comment that it is the image's hook and why
  (R13, R15)
- [ ] In `container/Dockerfile`, beside the other `COPY ${KIT_CONTAINER}` lines, copy `check-commit-message.mjs` to
  `/usr/local/lib/agentrite/` and `hooks/commit-msg` to `/usr/local/lib/agentrite/hooks/`, and make the hook
  executable in the `RUN chmod` that follows. Nothing of the clone or of the build context's project files is read for
  it, so a unit run's clone needs no `npm ci` for the check (R13, R14, R15)
- [ ] In `container/compose.yml`, set `GIT_CONFIG_COUNT` to `"2"` and add `GIT_CONFIG_KEY_1: core.hooksPath` and
  `GIT_CONFIG_VALUE_1: /usr/local/lib/agentrite/hooks`, with a comment that says why the hook comes from the image and
  through the environment, and that it replaces the hooks of a mounted repository and of a hooks directory its
  configuration names. Update the comment above `GIT_CONFIG_COUNT`, which speaks of one entry (R13)
- [ ] Commit point 2, below

### The image built again for a new kit

- [ ] In `tests/wrapper-fixture.mjs`, with no change of behavior: export `kitVersion`, a version no release has, and
  `installKitPackage(installed)`, which writes `package.json` with `name` `agentrite` and that version into a directory
  that stands for an installed kit; let the fake hosts' default answer to `image inspect` be
  `<claude>|<opencode>|<kit>`, and export `imageLabelsText({ claude, opencode, kit })` that gives that answer. Call
  `installKitPackage` in every set-up that installs `container/sandbox.sh`, and write every label the tests write with
  `imageLabelsText`. The wrapper does not read the third field yet, so the suite passes unchanged. Commit point 3,
  below
- [ ] Add to `tests/sandbox-wrapper.test.mjs`, before the code: an image that records another kit version is built
  again, with the line `sandbox.sh: the image was built from the kit <held> and <installed> is installed. Rebuilding.`
  on standard error before the build; an image that records none is built again with
  `sandbox.sh: the image records no kit version and <installed> is installed. Rebuilding.`; an image with the same
  version is not built and no such line is printed; the build gets `SANDBOX_AGENTRITE_VERSION` as the installed
  version; `--rebuild` builds without the line; and a kit whose `package.json` is missing or holds no version is
  refused before anything is built, with exit 1 and a message that names the file and says to install the project's
  dependencies again. Add to `tests/harness-versions.test.mjs` that the last stage declares `ARG AGENTRITE_VERSION`
  with no default and sets `com.ritenoar.agentrite.kit-version` from it, and that the base Compose file gives
  `AGENTRITE_VERSION` from `${SANDBOX_AGENTRITE_VERSION:?` (R16, R24)
- [ ] In `container/Dockerfile`, at the end of the last stage, after the `COPY` lines, declare `ARG
  AGENTRITE_VERSION` and `LABEL com.ritenoar.agentrite.kit-version="${AGENTRITE_VERSION}"`, with a comment that the
  wrapper reads it, placed last so that a new version changes no layer before it. In `container/compose.yml`, add
  `AGENTRITE_VERSION: ${SANDBOX_AGENTRITE_VERSION:?run the sandbox through the project's sandbox.sh}` to the build
  arguments, with a comment (R16)
- [ ] In `container/sandbox.sh`, after `--connect` has ended and before the build is decided, read the installed
  kit's version from `$here/../package.json` with `node`, as the wrapper computes the Dockerfile's digest, and refuse
  as the test says when it is not a version by `is_version`. Read `com.ritenoar.agentrite.kit-version` in the same
  `docker image inspect` as the harness labels, and when it differs from the installed version print the line of
  the test and build. Export `SANDBOX_AGENTRITE_VERSION` beside the two harness variables. Update the comments at the
  head of the file and above the build decision, which name what makes a build (R16)
- [ ] In `tests/wrapper-fixture.mjs`, give the stand-in image of `dockerHost` the build argument and the label of the
  kit's version, so that the tests with real Docker see what the kit's image records. Run the whole suite (R16, R24)
- [ ] Commit point 4, below

### The documents

- [ ] `README.md`: add `## Git hooks` after "Installing it into a project" and its subsections, before "The project's
  settings", and add it to the table of contents. It says where `init` and `refresh` write the hook, the hooks
  directory git uses, `core.hooksPath` among it; its mark line; what it refuses, linking to the checker's entry rather
  than describing it again; what `init` does with a file already there and outside a git repository; what `refresh`
  does with a marked hook, a missing one, one without the mark, and outside a git repository, with the two notices;
  what the hook prints when the checker's file is missing or `node` is not on the `PATH`, and what to do; that each
  worktree needs its own dependencies installed; that a fresh clone has no hook until `npx agentrite refresh` writes
  it; how a project with a hook of its own calls the checker from it, as `node
  node_modules/agentrite/container/check-commit-message.mjs "$1"` from the top of the work tree; and that the hook in
  the sandbox is in `SANDBOX.md` (R17)
- [ ] `README.md`: add `### check-commit-message` after `### check-changes`, with its form, its one argument, the lines
  it prints for a refused message and its closing sentence, what it prints for a file it cannot read and for wrong
  arguments, and its statuses 0, 1 and 2 by "Exit statuses" (R17)
- [ ] `README.md`: add a line to `### agentrite init` and one to `### agentrite refresh` that each writes the hook,
  linking to "Git hooks", and add the two notices to the order of notices each section gives. Add to "On a fresh
  clone" one sentence that `npx agentrite refresh` writes the hook, which a clone does not copy, linking to "Git
  hooks" (R17)
- [ ] `README.md`: in "Updating a project to a newer kit", replace the paragraph about the group `tty` and its command
  with one that says the first start of the sandbox after the update builds the image again, since the image records
  the release of the kit it was built from, and that the wrapper says so before it builds. In the list of what
  `refresh` writes there, add the hook (R16, R17)
- [ ] `README.md`: in "What is here", let the row of `container/` name the commit-msg hook of the image and the checker
  of commit messages, and let the row of `templates/project/` stay true with the hook among the files `init` writes
  (R19)
- [ ] `SANDBOX.md`: add `## Commit messages` after "Running on the tree as it is". It says what a reader sees when a
  commit is refused in the container, the checker's lines and sentence; that it is the rule of the host's hook, run
  by the same checker; that git in the container runs the image's hooks only, so that the hooks of a repository
  mounted with `--in-place` or `--workdir` and of a hooks directory that its configuration names, as `npm ci` may set
  in a clone, are not run there, and that a project runs its own checks as commands; and that the image is built again
  at the first start after an update of the kit, saying so (R18)
- [ ] `SANDBOX.md`: in "What the sandbox defends against", add that git in the container runs the image's hook, which
  the agent cannot write, and not the clone's, and add to what it does not defend against `--no-verify` and a command
  that sets `core.hooksPath` itself. Remove the entry "Claude Code in the sandbox does not ring the bell, while
  OpenCode does" from "When something goes wrong", by the human's decision recorded in `record.md`. Check that no
  link to the removed entry is left, and that the README paragraph that linked to it is the one replaced above (R18)
- [ ] `CONTRIBUTING.md`: check that "What the repository holds besides the package" needs no row, since the unit adds
  nothing at the root of the repository, and that "The kit's own tests" stays true with the new container test
  skipped on a host without Docker (R19)
- [ ] Check every line the unit changed is within 120 characters and that `SANDBOX.md` holds no HTML
- [ ] Commit point 5, below

## Verification

- [ ] `npm test` passes, with the container test of the hook and the wrapper's tests with real Docker run on a host
  that has Docker
- [ ] `./sandbox.sh --in-place npm test` passes, for the tests a host other than Linux skips
- [ ] By hand, in a scratch project with the working tree's kit installed: `git commit` with a `Co-Authored-By`
  trailer is refused on the host after `init`, and in the sandbox started with `sandbox-dev.sh`
- [ ] `npm run check-changes` passes once everything is committed
- [ ] Every requirement from 1 to 24 has a task above, and every task names the requirements it delivers

## Commit Points

- [ ] `feature-0078 Refuse commit messages with forbidden trailers on the host`: the checker, the host's hook, `init`
  and `refresh`, and their tests
- [ ] `feature-0078 Run the commit-msg hook in the sandbox`: the image's hook, the Dockerfile's copies, the compose
  file's `core.hooksPath`, and their tests
- [ ] `feature-0078 Give the wrapper's fake hosts the kit's version label`: the fixture alone, behavior unchanged
- [ ] `feature-0078 Build the image again for a new kit`: the label, the build argument, the wrapper, and their tests
- [ ] `feature-0078 Describe the commit-msg hook`: `README.md` and `SANDBOX.md`
