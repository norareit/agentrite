---
kind: feature
status: implemented
timestamp: 2026-10-22T22:02:19Z
---

# 0078 Commits with forbidden trailers are refused

## Log

- 2026-10-22T22:02:19Z [Claude Code, anthropic/claude-sonnet-5-5] as the specifier, in a session on the Linux host, on
  `master` at `52667e7`, on the human's request to specify a `commit-msg` hook that refuses the trailers the standards
  forbid, after an agent added `Co-Authored-By` to commits against the standards. The human chose to cover the host and
  the sandbox both, and a fixed pair of trailers, `Co-Authored-By` and `Claude-Session`, over a list in
  `agentrite.json`. Made the unit as a feature. Numbered 0078: the highest number in `changes/` is 0077. Read
  "agentrite init", "agentrite refresh" and "Installing it into a project" of `README.md`, `container/compose.yml` for
  how the sandbox sets git's configuration, `container/unit-clone.sh` and "What the sandbox defends against" of
  `SANDBOX.md` for why the clone's own hooks are not trusted, and the Dockerfile for what the image build copies.
  Wrote `spec.md`. The attribution setting of the harness, a check of the branch's commits and the pull request
  description are beyond the request. The status is `draft`
- 2026-10-22T22:18:10Z [Claude Code, anthropic/claude-opus-5-5] as the spec-reviewer, in a session on the Linux host,
  reviewed `spec.md` and `record.md` fully, at `a9920c2`. Findings F1 to F6, saved in
  `.reviews/0078-commits-with-forbidden-trailers-are-refused/spec-review-2026-10-22T221810Z.md`. Not checked: that
  Claude Code injects `Claude-Session` as a trailer, and the name of its attribution setting
- 2026-10-22T22:21:41Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `d0afd83`, on the human's request to apply every finding of the review of the spec. F1: the wrapper builds
  the image again when it records another version of the kit or none (requirements 16 and 24). F2: in the sandbox only
  the image's hooks run, recorded as a decision, in `SANDBOX.md` by requirement 18 and in the non-goal on chaining. That
  finding offered no recommended option, and this is the one that keeps the non-goal on chaining. F3: a hook that cannot
  run the checker refuses the commit, saying why (requirements 8 and 22). F4: the container test is required
  (requirement 23). F5: the context and the decision on a file already there now say what `git clone` and `refresh` do.
  F6: the reason of requirement 3 is narrowed. The host's requirements from 8 on are renumbered, and every reference to
  them with them. The status is `draft`
- 2026-10-23T11:17:45Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `48d8fd3`, on the human's request to record in "Beyond the request" what Codex does about attribution, as
  a harness the kit may support later and not today. Read the source of `openai/codex`, `codex-rs/ext/git-attribution`,
  and the binary of OpenCode 1.19.3. Codex instructs `Co-authored-by: Codex <noreply@openai.com>` and a line in a pull
  request body when the account's setting on OpenAI's servers enables it, and OpenCode instructs no trailer. Added both
  to items 1 and 3. The trailer of Codex is caught by requirement 2, which reads the name whatever its case, so no
  requirement changed. The status is `draft`
- 2026-10-23T11:20:19Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `c6a7c7e`, on the human's decision that `README.md` describes the hook in a section `## Git hooks` of its
  own, with the checker as an entry under `## Commands` and a linking line in the entries of `init` and `refresh`.
  Rewrote requirement 17 and added the decision. The status is `draft`
- 2026-10-23T11:23:18Z [human] approved the spec. The status is `approved`
- 2026-10-23T11:31:13Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `feature-0078-commits-with-forbidden-trailers-are-refused` from `master` at `6138747` and wrote `plan.md`. The
  checker is in `container/` because the `.dockerignore` that `init` writes admits only the kit's `container/` to the
  image build, and `refresh` never writes it. A fresh clone gets the hook from `refresh`, which `README.md` says in
  "On a fresh clone", as the only reading under which requirement 17 describes what a clone needs. The human decided
  that the paragraph of "Updating a project to a newer kit" in `README.md` about the group `tty` is replaced by the line
  requirement 17 asks for, and that the entry "Claude Code in the sandbox does not ring the bell, while OpenCode does"
  of "When something goes wrong" in `SANDBOX.md` is removed, since requirement 16 makes both false and the entry's case
  can no longer arise. The status is `approved`
- 2026-10-23T11:34:42Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  began the work on `feature-0078-commits-with-forbidden-trailers-are-refused` at `543a76b`. The status is
  `in-progress`
- 2026-10-23T11:44:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added
  `tests/package-documents.test.mjs` to the plan's files: it compares `files` of `package.json` in full, so
  `scripts/agentrite-hook.mjs` is added there too. In `tests/settings-update.test.mjs` the project is a git repository,
  so `refresh` writes the hook rather than printing the notice of requirement 11: the test expects the line `wrote
  .git/hooks/commit-msg`, and its installed kit gets `container/check-commit-message.mjs`, without which the hook
  refuses the test's next commit. `tests/sandbox-update.test.mjs` compares no output in full that the hook changes, and
  is unchanged
- 2026-10-23T11:48:53Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave the fake hosts of
  `tests/wrapper-fixture.mjs` an answer to `image inspect` of the labels its format names, all three when it names the
  kit's version and the two of the harnesses otherwise, rather than `<claude>|<opencode>|<kit>` to every format as the
  plan's task says. The wrapper reads the OpenCode label as all that follows the first `|`, so a third field in every
  answer would have changed what the wrapper reads before it reads the kit's label, and the commit would not have been
  one of no behavior. The real `docker` answers only what its format asks, so the fake is the closer for it. The suite
  passes on the fixture commit, 1087 tests and none skipped
- 2026-10-23T11:55:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the checker's closing text one
  sentence, as requirement 5 asks: it had been two, and at 134 characters it broke the line limit in the code block of
  `README.md` that shows it. The sentence now reads that the standards forbid the two trailers, so the lines are to be
  removed and the commit made again, and it fits in 117 characters. `SANDBOX.md` shows the refusal in "Commit messages"
  although its message names both why and what to do, since requirement 18 asks for what a reader sees when the hook
  refuses a commit in the container. `CONTRIBUTING.md` needs no change: the unit adds nothing at the root of the
  repository, and "The kit's own tests" already says that a host without Docker skips the tests that need it, which the
  new container test does
- 2026-10-23T12:11:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, found by hand that a start of the
  sandbox failed with Compose's `required variable SANDBOX_AGENTRITE_VERSION is missing a value`: the wrapper asks
  Compose for the merged configuration before it reads the kit's version, and hands that question a marker only for the
  two harness versions. The fake hosts answer `config --format json` without reading the base Compose file, so the suite
  had not seen it. Made the fake refuse, as Compose does, when a variable that `container/compose.yml` requires with
  `:?` has no value, which failed 204 tests, then handed the question the marker for the kit's version too, after which
  none failed. This is in `tests/wrapper-fixture.mjs` and `container/sandbox.sh`, beyond the plan's tasks, which named
  the export of the variable and not this question
- 2026-10-23T12:11:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on `275e0a6`, the
  last commit of code. `npm test` on the Linux host, with Docker: 1097 tests, 1097 pass, none fail and none skipped, so
  the container test of the hook and the wrapper's tests with real Docker ran. `./sandbox.sh --in-place npm test`: 1097
  tests, 1067 pass, none fail, and 30 skipped, those that need Docker. By hand, in a scratch git repository with the
  working tree's kit copied under `node_modules/agentrite`: `init claude` wrote an executable `.git/hooks/commit-msg`,
  `git commit` with a `Co-Authored-By` trailer was refused with the checker's lines and made no commit, and the same
  commit without it was made. In the sandbox started with `./sandbox-dev.sh --in-place`, git reported `core.hooksPath`
  as `/usr/local/lib/agentrite/hooks`, the same pair of commits was refused and then made, and the image built records
  `com.ritenoar.agentrite.kit-version` as `8.0.0`. Not checked: a host other than Linux, a git client started without
  `node` on its `PATH` other than the one the end-to-end test makes, and a start of the installed release's sandbox
  after an update, which needs a release of the kit. Every task of `plan.md` is ticked. The status stays `in-progress`,
  for the review by another model in another harness
- 2026-10-23T12:27:12Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, fully reviewed unit 0078 at `35280f5`, against
  merge base `6138747` with `master`. Findings C1 and P1, saved in
  `.reviews/0078-commits-with-forbidden-trailers-are-refused/review-2026-10-23T122545Z.md`. Ran `npm test`:
  1097 passed, none failed or skipped; `./sandbox.sh --in-place npm test`: 1067 passed, none failed, 30 skipped for
  Docker; and the diff check, which passed. Not independently verified: a non-Linux host, a graphical git client's
  PATH, historical test-first runs, the manual scratch-project and sandbox-dev session, or a published-release update
- 2026-10-23T12:31:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied C1 of the review of
  `35280f5`: the test context the unit's own tests name `t` is now `testContext`, in all of
  `tests/commit-msg-hook.test.mjs` and in the tests of the hook that the unit added at the end of
  `tests/agentrite-init.test.mjs` and `tests/agentrite-refresh.test.mjs`, and three of their titles are shortened to
  keep the lines within 120 characters, in `a3d34f5`. The tests those two files held before the unit still name it `t`,
  which they are left with, since the unit changes no code it did not add. The two files therefore hold both names
- 2026-10-23T12:31:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied P1 of the review of
  `35280f5`: `plan.md` has a ticked task, after commit point 4, for the fake hosts' refusal of a configuration without a
  required variable and for the marker of the kit's version in the question for the merged configuration, traced to R16
  and R24, and a commit point for `275e0a6`. The reason is in the entry of 2026-10-23T12:11:23Z
- 2026-10-23T12:31:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on `a3d34f5`. `npm
  test` on the Linux host, with Docker: 1097 tests, 1097 pass, none fail and none skipped. `./sandbox.sh --in-place npm
  test`: 1097 tests, 1067 pass, none fail, and 30 skipped, those that need Docker. The status stays `in-progress`, until
  the human decides C1, the review's blocking finding
- 2026-10-23T12:33:26Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's decision that C1 of
  the review of `35280f5`, the one blocking finding, is resolved by the rename in `a3d34f5`. P1 does not block and is
  applied. Every task of `plan.md` is ticked. The human decided too that the tests of `tests/agentrite-init.test.mjs`
  and `tests/agentrite-refresh.test.mjs` that name their test context `t` are renamed, in a task of their own. The
  status is `implemented`

## Amendments

- 2026-10-23T12:41:45Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, renamed every one-character variable
  of the repository, in `ce15b35`, on the human's decision, which replaces the task of its own that the last entry of
  the log names: the work is done on this unit's branch with no unit of its own, and covers every file that breaks the
  rule, not only the two files of that entry. The test context `t` is `testContext` in the 23 files of `tests/` that
  named it so, 920 uses. `P` of `tests/agentrite-run.test.mjs` is `PROMPT`. The unused parameters `_` of
  `scripts/agentrite.mjs` and `scripts/agentrite-orchestrate.mjs` are `_placeholder` and `_cell`, and the fields `_`
  that `read` discards in `container/entrypoint.sh` and `container/sandbox.sh` are `keyword` and `rest`, and the loop's
  `_` there is `attempt`. A `test(` call that the longer name took over 120 characters is written with its title and its
  callback on lines of their own, as the suite already writes a long one, 128 of them, and 13 other lines are broken
  where they ran over. Nothing a test checks changed. `npm test` on the Linux host, with Docker: 1097 tests, 1097 pass,
  none fail and none skipped. `./sandbox.sh --in-place npm test`: 1097 tests, 1067 pass, none fail, and 30 skipped,
  those that need Docker. A search of the tracked code, outside `node_modules` and `changes/`, for a declaration, a
  parameter, a `for` or a `read` of one character finds none
