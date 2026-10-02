---
kind: feature
status: in-progress
timestamp: 2026-10-02T14:01:59Z
---

# 0013 A command that brings the kit's own files in a project up to date

## Log

- 2026-10-02T14:01:59Z [human] asked, while preparing Norareit's move to AgentRite 2.0.0, whether the kit should
  have a way to clean out the generated files that are meant to be replaced, or an "install" and a "clean
  install", and then asked for a unit for a refresh command
- 2026-10-02T14:01:59Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: it narrows a decision of 0010 and needs decisions on which files are the kit's, what of a
  project's edits survives, and what happens at a path that is not a regular file. Read `scripts/agentrite.mjs`,
  `scripts/agentrite-roles.mjs` and the `init` tests before planning, so the plan names the functions it reuses.
  Written on a branch from `master` at 5f0705d, which does not yet hold 0012; the plan says to start once it does.
  Not decided by the human yet, and theirs to change on approval: that `CLAUDE.md` is not refreshed, that additions
  to a wrapper's body are replaced, and that `package.json` and `.dockerignore` are left alone
- 2026-10-02T15:46:08Z [human] asked for the unit to be implemented, which approves it as written, with the three
  decisions the planner had left to the human: `CLAUDE.md` is not refreshed, additions to a wrapper's body are
  replaced, and `package.json` and `.dockerignore` are left alone
- 2026-10-02T15:46:08Z [Claude Code, anthropic/claude-opus-5-5] rebased the branch onto `master` at ecccb16, which
  holds 0012 and 0014, took the implementer role and moved the status to `in-progress`. Since 0014 the wrappers hold a
  folded description, whose indented lines `refreshedWrapper` has to treat as part of the key, as the plan of 0014
  notes
- 2026-10-02T15:47:32Z [Claude Code, anthropic/claude-opus-5-5] rewrote the parsing tests for `parseArgs` and saw the
  file fail on the missing export. Replaced `parseInitArgs` with `parseArgs`, which returns the command and the
  harnesses, and dispatched on the command through a registry, `COMMANDS`, with `refresh` a stub that throws. One of
  the new tests then failed for a reason of its own: it matched a pattern against the error where `assert.throws`
  matches against the error with its `Error: ` prefix, and was corrected to compare the message. `npm test` passed,
  151 of 151
- 2026-10-02T15:48:06Z [Claude Code, anthropic/claude-opus-5-5] changed the plan before the refactoring, for a reason
  found in the code. The plan had `projectFiles` built from `kitOwnedFiles`. But `init` writes `AGENTS.md` and
  `CLAUDE.md` between the wrappers and the shim, and an existing test requires the wrappers `init` plans to equal
  those of `agentrite-roles` exactly, which a list that marks them for `refresh` would not. So the refactoring cuts
  out only `shimFile`, what `agent.sh` is, and `kitOwnedFiles` is written with `refresh`, its one caller. The
  requirements are untouched
- 2026-10-02T15:49:47Z [Claude Code, anthropic/claude-opus-5-5] wrote `tests/agentrite-refresh.test.mjs`, with the
  unit tests of `refreshedWrapper` and the end-to-end tests of the command in one go, where the plan has them as two
  steps, and saw the file fail on the missing export. Wrote `refreshedWrapper`, `kitOwnedFiles` and `refresh`. One
  unit test then failed because of its own input: it pinned a model on the line straight after `description: >-`,
  inside the folded text, which no YAML file holds; it now pins it ahead of the description. `npm test` passed, 170 of
  170. The two commit points for the function and for the command are one commit, since the tests of both are in one
  file. Beyond the plan's list, the tests also cover a folded description of other text being replaced whole, a second
  refresh of a refreshed wrapper changing nothing, a shim with the right content that is not executable, a dangling
  symbolic link, and the command run through a `node_modules/.bin` link
- 2026-10-02T15:49:47Z [Claude Code, anthropic/claude-opus-5-5] two things the tests pin down that the spec leaves to
  the implementation. A line in the frontmatter that is not a key line belongs to the key above it, which is a little
  wider than the plan's wording of indented lines, list items and blank lines: it also keeps a comment with the key it
  follows. And a shim whose content is right but which is not executable is reported as refreshed, not as up to date,
  since requirement 6 has the command make it executable
- 2026-10-02T15:50:32Z [Claude Code, anthropic/claude-opus-5-5] updated the README: the command under "Updating a
  project to a newer kit", and under "Installing it into a project" the wrappers and `agent.sh` as the exception to a
  generated file being the project's own. The one existing line that changed is "`CLAUDE.md` and `agent.sh` are best
  left as written", which now names `CLAUDE.md` alone; nothing else was removed
- 2026-10-02T15:50:32Z [Claude Code, anthropic/claude-opus-5-5] verified on 6ea8885: `npm test` passed, 170 of 170;
  `npx tsc -p infra` exited 0; `npm run check-changes` exited 0; `npm pack --dry-run` lists the same 22 files,
  `scripts/agentrite.mjs` among them. In a scratch project set up by `init` from the packed working copy, with a model
  pinned in `.opencode/agents/reviewer.md` and a line appended to `agent.sh`, `npx agentrite refresh claude opencode`
  exited 0, reported `agent.sh` as refreshed and the six wrappers as up to date, kept the pin, removed the appended
  line, and left `AGENTS.md`, `CLAUDE.md`, `agent/compose.project.yml`, `package.json` and `.dockerignore` byte for
  byte as they were; a second run reported all seven as up to date. The plan had expected the pinned wrapper to be
  reported as refreshed, which was wrong: a wrapper that differs only by a key added after the kit's own is already
  what a refresh writes. The verification line was corrected to say so. Not checked: either harness reading a wrapper
  after a refresh, which 0014 checked for the same generated content, and the command on macOS
- 2026-10-02T15:50:32Z [Claude Code, anthropic/claude-opus-5-5] every box in `plan.md` is ticked. The status stays
  `in-progress` until the unit is reviewed and the human has decided what the review returns
- 2026-10-02T16:05:02Z [OpenCode, openai/gpt-6.1-sol] completed a full first review of `0013-refresh-command` at
  commit `0111a17b383a30179ffb45585c852c06269e5e5b`, against the `master` merge-base
  `ecccb16f8681b1860cf42823853944cf97d49b0d`. Returned S1, S2 and C1; complete findings are saved in
  `.reviews/0013-refresh-command/20261002T160215Z-opencode-full.md`. Not verified: macOS execution, either harness
  consuming refreshed wrappers (including the recorded 0014 harness-consumption claim), and the original
  within-session test-first chronology. The packed CLI smoke used an extracted tarball, a local bin symlink and
  a synthetic lockfile, not a fresh npm dependency or Playwright installation
- 2026-10-02T16:08:37Z [human] asked the implementer to read the review and to make the changes it calls for where
  they are needed
- 2026-10-02T16:08:37Z [Claude Code, anthropic/claude-opus-5-5] the review returned three blocking findings, S1, S2
  and C1, and reproduced each. All three are accepted, the human having left that to the implementer, and each is a
  requirement that is false for an input a project may plainly have: S1, a wrapper with CRLF line endings loses its
  added keys, against requirement 4; S2, a key written in quotes or with space before its colon is not seen as a key,
  so an added one is dropped and a kit one is kept beside the release's, against requirements 4 and 5; C1, a shim
  whose only execute bit is not its owner's is taken as executable, against requirement 6. Added a task for each to
  `plan.md`, regression first
- 2026-10-02T16:09:38Z [Claude Code, anthropic/claude-opus-5-5] applied S1, S2 and C1. Wrote the regressions first,
  five of which failed: a CRLF wrapper losing its keys, in the function and through the command; an added key in
  double quotes, in single quotes and with space or a tab before its colon; a kit key in those spellings kept beside
  the release's; and a shim of mode 0645 taken as executable. A sixth, that a value holding a colon and the items of a
  list are not taken for keys, passed before the change and guards it. Then: the frontmatter is found on lines split
  at CRLF or LF, and the result is written with LF; a key is recognized in quotes or plain, with space before its
  colon, and compared by its name; the shim counts as executable only by its owner's bit. `npm test` passed, 176 of
  176, and `npx tsc -p infra` exited 0
- 2026-10-02T16:09:38Z [Claude Code, anthropic/claude-opus-5-5] a limit that the fix of S2 does not remove, and a
  proposed decision for the human, not taken here. The frontmatter is read line by line, without a YAML parser, the
  kit having no dependencies. Probed after the fix: a key in quotes with an escape in its name, such as `"mo\x64e"`,
  is taken as a different key from `mode` and kept beside the release's; a complex key, written with `?`, is not seen
  as a key and is dropped with the kit key above it; a comment line above an added key is dropped when the key above
  it is the kit's, while the key itself is kept; a flow mapping on one line is kept as written. The spec promises that
  every key the release does not write is kept, and names no boundary. Proposed: record as a decision that `refresh`
  reads frontmatter written as a block mapping, one key to a line at the left margin, plain or in quotes without
  escapes, and that complex keys, escaped names and comments between keys are outside what it supports. Without that
  boundary a later review can keep finding spellings of YAML that the line reading does not cover
- 2026-10-02T16:20:41Z [OpenCode, openai/gpt-6.1-sol] completed a delta review of `0013-refresh-command` from the
  previous reviewed commit `0111a17b383a30179ffb45585c852c06269e5e5b` to HEAD
  `6c816a288f0b3ac556b101374452856f108e777c`, with `master` merge-base
  `ecccb16f8681b1860cf42823853944cf97d49b0d`. Returned S2 and C2; complete findings are saved in
  `.reviews/0013-refresh-command/20261002T161716Z-opencode-delta.md`. Not verified: macOS execution, either harness
  consuming refreshed wrappers (including the recorded 0014 harness-consumption claim), and the original
  in-session regression-first chronology. The prior packed smoke and broad init comparisons were not rerun
- 2026-10-02T16:37:04Z [Claude Code, anthropic/claude-opus-5-5] read the delta review. It confirms S1 and C1 as
  corrected and returns two blocking findings. S2 again, as incompletely corrected: the two forms logged above as
  outside the line reading, a quoted key with an escape in its name and a key written with `?`, each make requirement
  4 or 5 false, and the boundary proposed for them is not a decision until the human makes it. C2, a regression the
  fix of S2 introduced: a line inside a quoted value that runs over several lines, when it looks like a quoted key, is
  now taken for a key, which cuts the value and leaves frontmatter that is not valid YAML, where the code before the
  fix kept it whole. The review also found that the guard test added with the fix uses a value that is not valid YAML.
  Both findings come from the same cause, reading YAML line by line and guessing, and a third patch of the pattern
  would invite a fourth finding. Not patched: what `refresh` does with frontmatter it cannot read safely is a question
  for the spec, so it goes back to the human
- 2026-10-02T17:25:19Z [human] had the two findings and their cause explained, and decided how the command deals with
  frontmatter: it reads a small, exact form and refuses anything else, leaving that wrapper untouched and saying so.
  Asked for a fix that ends the going round in circles
- 2026-10-02T17:25:19Z [Claude Code, anthropic/claude-opus-5-5] took the planner role for the amendment the human
  approved, and changed `spec.md`, which is not frozen. Requirements 4 and 5 now hold for a wrapper whose frontmatter
  the command reads; requirement 13 states that form and requirement 14 the refusal; requirement 11 has the README
  describe both. Two decisions were added: the exact form and the refusal, with the two reviews that led to it, what
  it defends and what it does not promise; and a comment belonging to the key below it. This replaces the boundary
  proposed in the entry on the limit of the S2 fix, and takes back part of that fix: a key in quotes or with space
  before its colon is refused, not recognized. Checked with PyYAML 6.0.1 before writing the form that a quoted text
  and a bracketed list can be opened on an indented line and continued at the left margin, which is why the form
  constrains values on indented lines too, and that a plain text cannot continue at the margin. Added four tasks to
  `plan.md`
- 2026-10-02T17:25:19Z [Claude Code, anthropic/claude-opus-5-5] S2 and C2 of the delta review: accepted, the human
  having decided the way. Took the implementer role again
- 2026-10-02T17:32:26Z [Claude Code, anthropic/claude-opus-5-5] reworked the reading of frontmatter into a module of
  its own, `scripts/wrapper-frontmatter.mjs`, which checks every line against the form of requirement 13 and returns a
  problem with its line number for anything else; `refresh` leaves such a wrapper as it is, names it on standard error
  and exits 1. The recognition of quoted and spaced keys added for S2 is gone: those are refused. Out of order with
  the plan, the module was drafted before the tests, so the new unit tests passed when first run; replayed against the
  implementation before the rework, 41 of the 53 tests in the file failed. The end-to-end test of the refusal failed
  until the command used the module. Added the module to `files` in `package.json`, so the pack holds 23 files, one
  more than before, and corrected the verification line that said nothing new
- 2026-10-02T17:32:26Z [Claude Code, anthropic/claude-opus-5-5] checked the frontmatter the tests use with PyYAML
  6.0.1, outside the suite. Three of the nine the tests called readable were not valid YAML and were replaced: a list
  item after keys at one depth, a plain text continued with a colon in it, and an alias to an anchor that did not
  exist. All nine now parse, and after a refresh every added key has the value it had and every kit key the release's.
  Of the nineteen the tests call unreadable, sixteen are valid YAML that the command refuses by design, and three are
  not valid YAML
- 2026-10-02T17:32:26Z [Claude Code, anthropic/claude-opus-5-5] added a task and did it: a comparison with PyYAML on
  random frontmatter, built from readable, unreadable and misleading pieces, in two runs, one of 40,000 cases mixing
  all pieces and one of 30,000 from pieces the command reads, for both harnesses. It found two faults before either
  was reviewed, both now tests in the suite. A comment or blank line carried along with a kept key could land straight
  after the folded description of the Claude wrapper, which took an indented comment into its text and a blank line as
  its own, so that a second refresh changed the file. Now an indented comment stays in the value above it, or is
  refused when no key is above it, and blank lines between keys are not carried along. And comments after the last key
  were dropped on the second refresh; they are now kept as lines of their own. After the fixes: no case where the
  command read the frontmatter and the result did not parse, changed the value of an added key, kept a kit key beside
  the release's, or changed on a second refresh. The scripts for both checks are not in the repository
- 2026-10-02T17:32:26Z [Claude Code, anthropic/claude-opus-5-5] updated the README with the form `refresh` reads and
  what it does with a wrapper written otherwise
- 2026-10-02T17:32:27Z [Claude Code, anthropic/claude-opus-5-5] verified on 38a8f4d: `npm test` passed, 206 of 206;
  `npx tsc -p infra` exited 0; `npm run check-changes` exited 0. In a scratch project set up by `init` from the packed
  working copy, with a comment and a pinned model added to one wrapper and the delta review's case C2 written into
  another, `npx agentrite refresh claude opencode` exited 1, named the second wrapper with line 6 and left it byte for
  byte as it was, and reported the first, with its comment and pin, and the other five files as up to date. Every box
  in `plan.md` is ticked. The status stays `in-progress` for the delta review of the rework, from 6c816a2, the commit
  the last review named
- 2026-10-02T17:59:44Z [OpenCode, openai/gpt-6.1-sol] completed a delta review of `0013-refresh-command` from
  previous reviewed commit `6c816a288f0b3ac556b101374452856f108e777c` to HEAD
  `26c8b8b821247315ca6cf69949456184f3b8bf49`, with `master` merge-base
  `ecccb16f8681b1860cf42823853944cf97d49b0d`. Returned S3, P1 and C3; complete findings are saved in
  `.reviews/0013-refresh-command/20261002T175527Z-opencode-delta.md`. Not verified: macOS, actual harness consumption
  including the earlier 0014 claim, the original 40,000/30,000 random runs, and the original 41/53 replay stage or
  detailed in-session test chronology. The packed CLI smoke used extraction, local bin wiring and a synthetic
  lockfile, not a fresh npm or Playwright installation
- 2026-10-02T18:10:06Z [human] asked the implementer to assess the new findings and to fix what needs fixing
- 2026-10-02T18:10:06Z [Claude Code, anthropic/claude-opus-5-5] the delta review confirms S2 and C2 as corrected under
  the amended spec, and returns S3 and C3, which block, and P1, which does not. All three are accepted. S3: the reader
  asks a key's name to open with a letter or `_`, where requirement 13 allows any run of letters, digits, `_` and `-`,
  so `2fa: true` is refused although it is in the form. C3: the check that a bracketed list closes on its line counts
  a bracket inside a comment, so `tools: [read, # ]` passes as closed while the list runs on, the lines inside it are
  read as keys, and the wrapper is rewritten broken, against requirements 13 and 14. P1: the task that says tests
  first was ticked although the module was written before its unit tests, as the record already admitted; the task now
  says so itself. The review also notes that the random comparison cannot be repeated, its scripts not being in the
  repository, and C3 shows what it missed: none of its pieces put a comment inside brackets. Added three tasks to
  `plan.md`, the third to keep that comparison in the repository and widen it
- 2026-10-02T18:13:57Z [Claude Code, anthropic/claude-opus-5-5] applied S3 and C3, each regression first. Five tests
  failed before the change: names opening with a digit or a dash being refused; the review's list closed only in a
  comment, in the function and through the command; the same in a nested map; and a `#` inside a word in brackets
  being read. Then: a key's name is any run of letters, digits, `_` and `-`; a bracketed list or map that holds a `#`
  is refused. A sixth test, written before its change and seen failing, allows a comment after a bracketed value that
  has closed, which the reader had refused although requirement 13 has such a value in the form; a comment after a
  plain text may now hold a quote, for the same reason
- 2026-10-02T18:13:57Z [Claude Code, anthropic/claude-opus-5-5] took the planner role for a small amendment to
  requirement 13, which follows from C3 and which the human has not yet confirmed: a bracketed list or map holds no
  `#`, and a comment may follow a value that ends on its line. The reason is recorded as a decision in `spec.md`.
  Without it the reader, refusing every `#` in brackets, would again be narrower than the form the spec states, which
  is what S3 was
- 2026-10-02T18:13:57Z [Claude Code, anthropic/claude-opus-5-5] put the comparison with a YAML parser in the
  repository, as `tests/manual/frontmatter-vs-yaml.py` with its node half, and described it in the README. It now also
  builds frontmatter from single tokens, and from pieces with a comment inside and after brackets. With the fix of C3
  taken out, a run of 80,000 refreshes reports 810 failures, the first of them the kind C3 is. With it in: three runs
  of 200,000 refreshes each, seeds 1, 2 and 3, about 31,000 read in each and about 24,000 of those valid YAML to
  compare, 0 failures. PyYAML 6.0.1, Node 24.14.1
- 2026-10-02T18:14:11Z [Claude Code, anthropic/claude-opus-5-5] verified on 0d03cdf: `npm test` passed, 213 of 213;
  `npx tsc -p infra` exited 0; `npm run check-changes` exited 0; `npm pack` holds 23 files and nothing of
  `tests/manual/`. The frontmatter the tests use was checked with PyYAML again: the eleven called readable parse and
  keep their meaning through a refresh, and of the twenty-three called unreadable twenty are valid YAML. From the
  packed working copy in a scratch project, `npx agentrite refresh opencode` exited 1, named the wrapper holding the
  case of C3 at line 4 and left it byte for byte as it was, and refreshed a wrapper holding `2fa: true` and `tools:
  [read] # all`, keeping both lines. Every box in `plan.md` is ticked. The status stays `in-progress`: the amendment
  to requirement 13 awaits the human, and the rework since 26c8b8b awaits a delta review
- 2026-10-02T18:16:33Z [human] confirmed the amendment to requirement 13: a bracketed list or map holds no `#`, and a
  comment may follow a value that ends on its line. Added that the reading of frontmatter as a whole feels flaky
- 2026-10-02T18:24:58Z [human] asked which file all this is about and what a project adds to it, and on hearing that
  the README names one thing, a pinned model, on one line, decided that this is all `refresh` keeps. The wrappers are
  tracked, so whatever was in one is in the git history; the worst case is that a refresh overwrites a value, which
  the project sees in git and reports, and that is fixed then. No form of frontmatter, no refusal
- 2026-10-02T18:24:58Z [Claude Code, anthropic/claude-opus-5-5] took the planner role for the amendment. Requirement 4
  now keeps a line that opens with `model:`, as written; requirement 5 replaces everything else; requirements 13 and
  14 are withdrawn, their numbers kept so that the reviews that cite them still point somewhere; requirement 11
  follows. The decisions on the exact form, on comments and on `#` in brackets are replaced by one that records the
  three reviews, the human's reasoning and the alternatives. Keeping every added key was the planner's own widening of
  what the README invites, and it is what the reviews kept finding faults in. Added three tasks to `plan.md`, rewrote
  its account of the one pure function, and opened the verification line on the pack again, which is back to 22 files.
  Took the implementer role again
- 2026-10-02T18:26:15Z [Claude Code, anthropic/claude-opus-5-5] replaced the tests of the reader with ten for the
  pinned model, and took out the two end-to-end tests of the refusal; the file failed as a whole on the export that
  did not exist yet. Then wrote `refreshedWrapper` in `scripts/agentrite.mjs`, eleven lines that find the lines
  opening with `model:` in the existing frontmatter and put them into the rendered wrapper, and removed
  `scripts/wrapper-frontmatter.mjs`, its entry in `package.json`, the refusal in `refresh`, and `tests/manual/`. `npm
  test` passed, 173 of 173. Rewrote the README's account of `refresh` to match and took out the check run by hand. The
  findings S2, C2, S3 and C3 of the three reviews were all about the reading of frontmatter, which is gone; S1, on
  CRLF, and C1, on the owner's execute bit, still hold and keep their tests
- 2026-10-02T18:26:16Z [Claude Code, anthropic/claude-opus-5-5] verified on 74163ae: `npm test` passed, 173 of 173;
  `npx tsc -p infra` exited 0; `npm run check-changes` exited 0; `npm pack --dry-run` lists 22 files and
  `package.json` is as on `master`. In a scratch project set up by `init` from the packed working copy, with `model`
  and `temperature` added to one wrapper and a line appended to `agent.sh`, `npx agentrite refresh claude opencode`
  exited 0, reported that wrapper and `agent.sh` as refreshed and the other five as up to date, kept the model line,
  dropped `temperature` and the appended line, and left the five files that are the project's byte for byte as they
  were; a second run reported all seven as up to date. Every box in `plan.md` is ticked. The status stays
  `in-progress` for a delta review from 26c8b8b, the commit the last review named
- 2026-10-02T18:44:05Z [OpenCode, openai/gpt-6.1-sol] completed a delta review of `0013-refresh-command` from
  previous reviewed commit `26c8b8b821247315ca6cf69949456184f3b8bf49` to HEAD
  `5c56afdb768e2fb0e2aef0bed3c6f2fe0182016e`, with `master` merge-base
  `ecccb16f8681b1860cf42823853944cf97d49b0d`. Returned S4; complete findings are saved in
  `.reviews/0013-refresh-command/20261002T184041Z-opencode-delta.md`. Not verified: macOS, actual harness consumption
  including the earlier 0014 claim, and detailed original in-session test-authoring chronology. The packed CLI
  smoke used extraction, local bin wiring and a synthetic lockfile, not a fresh dependency installation or deployment
- 2026-10-02T19:02:41Z [human] asked the implementer to check the latest review
- 2026-10-02T19:02:41Z [Claude Code, anthropic/claude-opus-5-5] the delta review confirms the simplification, treats
  S3 and C3 as superseded with the code they were about, and P1 as corrected, and returns one blocking finding, S4,
  accepted. Requirement 4 keeps a line that opens with `model:`; the code also asked for a space or the end of the
  line after the colon, so a model set off by a tab was dropped, and a test listed `model:a/b` as not a pin. Wrote the
  regressions first and saw two tests fail: the tab and the no-space forms in the function, and the tab form through
  the command, with LF and CRLF. The check is now the literal prefix, `line.startsWith('model:')`, and the lookalike
  test holds only lines that do not open with it. `npm test` passed, 174 of 174, and `npx tsc -p infra` exited 0

## Amendments
