# 0092 The sandbox keeps Claude Code's sessions as long as the host

## Approach

A new reader, `scripts/agentrite-cleanup-period.mjs`, judges the host's `~/.claude/settings.json` for
`cleanupPeriodDays`, as `scripts/agentrite-settings.mjs` judges `agentrite.json` for `bell`: a pure function takes
the text and returns the number or nothing, or throws a message; a reading function adds the file; and run as a
program, which the wrapper does since a shell script cannot import, it prints the number, or nothing, or the message
on standard error with exit status 1.

`container/sandbox.sh` runs it in the block that reads `bell`, which `--connect` skips and which runs before Docker,
npm or git is asked anything, so a refused start has done nothing (R1, R4). It keeps the number until the block that
makes the project's log directory, which runs only after the image is there, so that a refused or failed start makes
no directory. There it writes the number alone as `{"cleanupPeriodDays": <n>}` to `<logs>/claude-cleanup-period.json`
and mounts that file read-only at `/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json`, ahead of the
two log mounts. With no number it removes that file if an earlier start left one, and mounts nothing (R2, R3). The
file is in the log directory because that is the directory the wrapper keeps for the project root on the host, is
removed with it, and is not mounted in the container itself: only its two subdirectories are, so the agent cannot
reach the file but through the read-only mount.

Several runs of one project root can be under way at once, and share the file. So that a later start does not change
the number of a run already under way (R2), the wrapper never writes the file in place: it writes a new file beside
it in `$logs` and renames it over the old one, and removes it with `rm -f`. A container's bind mount holds the file
it was started with, which a rename or a removal leaves unchanged, and a shell connected with `--connect` joins
that container's mounts.

The host's file is found at `$HOME/.claude/settings.json`. With `HOME` unset or empty the reader is not run and
nothing is given, as for a host without the file; the log directory block refuses such a start later, as it does
today.

After the review's S1, which the human accepted, the file is named after the number, as
`<logs>/claude-cleanup-period-<n>.json`, and is written only when it is not there, by a rename as above, and
never changed or removed. A start with no number removes nothing. A start between another start's write and its
mount can then neither change nor remove the file that start mounts, so a run under way and a run about to begin
alike keep their number, and Docker never meets a missing source, of which it would make a directory owned by root.
One file is left for each number used, and goes with the log directory.

## Files

- `scripts/agentrite-cleanup-period.mjs`: new. `parseCleanupPeriod(text, path)`, `readCleanupPeriod(home)` and the
  program entry
- `tests/agentrite-cleanup-period.test.mjs`: new. Unit tests of the two functions
- `container/sandbox.sh`: reads the number with `bell`, writes or removes `<logs>/claude-cleanup-period.json` and
  mounts it, with the header comment that lists what a start reads
- `tests/sandbox-wrapper.test.mjs`: copies the new script in `setUp`, and the tests of R2 to R7
- `tests/sandbox-unit-run.test.mjs`: the test of `--connect` reading nothing of the host's settings
- `tests/sandbox-dev.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`: copy the new script in their `setUp`,
  beside `agentrite-settings.mjs`
- `package.json`: `scripts/agentrite-cleanup-period.mjs` in `files`, after `scripts/agentrite-settings.mjs`
- `tests/package-documents.test.mjs`: the same entry in its list of `files`
- `SANDBOX.md`: the log directory section, the status line section and the bell section

## Tasks

- [x] Write `tests/agentrite-cleanup-period.test.mjs` against the functions below, before them. For
  `parseCleanupPeriod(text, path)`: `{"cleanupPeriodDays": 365}` gives `365`; `{"cleanupPeriodDays": 1}` gives `1`;
  `{}` and `{"model": "x", "env": {"TOKEN": "secret"}}` give `undefined`; and each of `0`, `1.5`, `-1`, `"365"`,
  `null`, `true`, `[]` and `{}` as the value throws a message that starts with the path, names `cleanupPeriodDays`,
  gives the value as JSON, says it must be a whole number of 1 or more, and says to correct the file or remove the
  key. Text that is not JSON, and `[]`, `"x"` and `null` as the whole text, throw a message that names the path,
  says it is not a JSON object, and says to correct the file or remove the key. For `readCleanupPeriod(home)` with
  a temporary directory as `home`: no `.claude` gives `undefined`; `.claude/settings.json` with a number gives it;
  a directory at `.claude/settings.json` throws a message that names the path and says it cannot be read (R1, R4)
- [x] Write `scripts/agentrite-cleanup-period.mjs`. `parseCleanupPeriod` parses the text, takes the key only from an
  object that is not an array, accepts `Number.isInteger(value) && value >= 1`, and returns nothing else of the
  file. `readCleanupPeriod` reads `join(home, '.claude', 'settings.json')`, returns `undefined` for `ENOENT` only,
  and throws `cannot read <path>: <reason>` for any other error. The program takes the home as its one argument,
  prints the number or an empty line, and on a thrown message prints `agentrite: <message>` to standard error and
  exits 1; with a wrong number of arguments it prints its usage and exits 2, as `agentrite-settings.mjs` does. The
  entry check is the same `isMain` as that file's. Run the new tests (R1, R4, R5)
- [x] Add `scripts/agentrite-cleanup-period.mjs` to `files` in `package.json` and to the list in
  `tests/package-documents.test.mjs`, and copy it in the `setUp` of `tests/sandbox-wrapper.test.mjs`,
  `tests/sandbox-dev.test.mjs` and `tests/sandbox-project-dockerfile.test.mjs`. `tests/sandbox-unit-run.test.mjs`
  copies the whole `scripts/` and needs no change. Run `npm test`, which passes with the wrapper unchanged
- [x] Commit: `feature-0092 Add the reader of the host's cleanupPeriodDays`
- [x] Write the wrapper's tests in `tests/sandbox-wrapper.test.mjs`, beside the status line's, failing before the
  wrapper changes. With `cleanupPeriodDays: 365` in the fake home's `.claude/settings.json`, together with
  `"env": {"TOKEN": "secret"}`: a start with `--in-place` and one with `--workdir` pass the mount
  `--volume <logs>/claude-cleanup-period.json:/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json:ro`
  after the other mounts and before the log mounts, the file holds exactly `{"cleanupPeriodDays": 365}` and a
  newline, and no docker call holds `secret`. The same with a status line script and `"bell": true`, the mount
  coming after both. A start with no `.claude/settings.json`, and one with `{"model": "x"}`, pass the arguments
  of `expectedRun` as before, also when a start with a number ran first, after which the file is gone. Each of the
  texts `not json`, `[]`, `{"cleanupPeriodDays": 0}`, `{"cleanupPeriodDays": 1.5}`, `{"cleanupPeriodDays": -1}`
  and `{"cleanupPeriodDays": "365"}` refuses the start with status 1 and the reader's message, with no docker call,
  no log directory made and no branch cut (R2, R3, R4, R5, R6, R7)
- [x] Write the test in `tests/sandbox-unit-run.test.mjs`, beside that of unit 0058's R7: `--connect` with
  `not json` in the home's `.claude/settings.json` connects with status 0, an empty standard error and the
  connect call alone (R7). Added in the implementation: an entry of the same file's runs that cut no branch, in
  which `not json` in the home's `.claude/settings.json` refuses a unit run with the reader's message and cuts no
  branch, since the wrapper's tests have no repository in which a branch could be cut (R4)
- [x] Change `container/sandbox.sh`. In the block that reads `bell`, when `connect` is 0 and `HOME` is not empty, set
  `cleanup_period` from `node "$here/../scripts/agentrite-cleanup-period.mjs" "$HOME"`, exiting 1 when it fails. In
  the block that makes the log directory, after `logs` is made absolute and before the log mounts are added, when
  `cleanup_period` is not empty, write `{"cleanupPeriodDays": <n>}` to a new file made with `mktemp` in `$logs`,
  give it mode 644 with `chmod`, since `mktemp` makes it 600 and Claude Code reads it as the agent, rename it with
  `mv -f` to `$logs/claude-cleanup-period.json`, and add its mount; when it is empty, run `rm -f` on that file.
  Before this change, add to the wrapper's tests one that a second start with another number leaves the first
  start's file, held through a hard link made after the first start, with the first number, and one that the file
  has mode 644. Say in the comments of the two blocks why the number is read
  early and written late, and that only the number crosses, and add the number to what the header comment says a
  start reads. Run the wrapper's and the unit run's tests (R1, R2, R3, R4, R5, R6)
- [x] Run `npm test`, which passes
- [x] Commit: `feature-0092 Give the sandbox the host's cleanupPeriodDays`
- [x] Rewrite in `SANDBOX.md` the paragraph of the log directory section that tells the developer to set
  `cleanupPeriodDays` in the home volume, with its JSON example and the two sentences after it, into a paragraph
  under its own bold heading "How long Claude Code's sessions are kept", in the same section, saying each item of
  R8 in turn. Add `<logs>/claude-cleanup-period.json` to the list of what the log directory holds, saying that the
  wrapper writes it at a start when the host holds a number and removes it when it holds none, that it is mounted
  read-only, and that it goes with the directory when the directory is removed (R8, R9)
- [x] In the status line section of `SANDBOX.md`, change "The credentials, the settings and the history stay on the
  host" to say that they stay there apart from the number of "How long Claude Code's sessions are kept", which the
  wrapper reads on the host. In the bell section, change "which reads none of the host's settings" in the same
  way. Search `SANDBOX.md` for every other sentence on what the sandbox reads of the host's `~/.claude`, among them
  the threat model's "none of the host's own `~/.claude`", and correct any that is no longer true (R9)
- [x] Check every changed file for the line limit of 120 characters
- [x] Commit: `feature-0092 Describe how long the sandbox keeps Claude Code's sessions`
- [x] After the review's S1: change the wrapper's tests first, so that they fail on the wrapper as it is. The file
  of a start with 365 is `<logs>/claude-cleanup-period-365.json`, holding `{"cleanupPeriodDays": 365}` and a newline
  with mode 644, and is the source of the mount. A start with no number, or with a file without the key, after a
  start with 365 passes the arguments of `expectedRun` and leaves that file as it was. In place of the test of the
  hard link: after a start with 365, a start with 90 and then a start with none leave the file of 365 with its
  inode and its content, and the start with 90 mounts `<logs>/claude-cleanup-period-90.json`. A start with 365
  when its file is there already leaves that file with its inode (S1)
- [x] Change `container/sandbox.sh`: the file of the number is `$logs/claude-cleanup-period-$cleanup_period.json`,
  made as before only when it is not there, and nothing is removed for a start with no number. Correct the
  comments. Run the wrapper's and the unit run's tests, then `npm test` (S1)
- [x] In `SANDBOX.md`, name the file of each number in the list of what the log directory holds, say that the
  wrapper writes it at a start with that number when it is not there and never changes or removes it, and that
  the files of the numbers go with the directory (S1, R9)
- [x] Check every changed file for the line limit of 120 characters
- [x] Commit: `feature-0092 Keep a file of the cleanupPeriodDays for each number`

## Verification

- [x] `npm test` passes on the host
- [x] `./sandbox.sh --in-place npm test` passes, running the tests that need Linux tools in the sandbox
- [x] `npm run check-changes` passes
- [x] On the host, with `cleanupPeriodDays` in `~/.claude/settings.json`, `./sandbox.sh --in-place cat
  /etc/claude-code/managed-settings.d/agentrite-cleanup-period.json` prints the number alone, and `/status` of
  Claude Code in the sandbox lists managed settings with drop-ins among its setting sources (R2)

## Commit Points

- [x] `feature-0092 Add the reader of the host's cleanupPeriodDays`, after the reader, its tests and the package
  entry
- [x] `feature-0092 Give the sandbox the host's cleanupPeriodDays`, after the wrapper and its tests
- [x] `feature-0092 Describe how long the sandbox keeps Claude Code's sessions`, after `SANDBOX.md`
- [x] `feature-0092 Keep a file of the cleanupPeriodDays for each number`, after the correction of S1
