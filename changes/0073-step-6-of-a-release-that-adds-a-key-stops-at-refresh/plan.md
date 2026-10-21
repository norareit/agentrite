# 0073 Step 6 of a release that adds a key stops at refresh

## Approach

The fix is in the text of step 6 of `RELEASING.md` and nowhere else. It has no test of its own, so the regression
check is a dry run of the step in a clone of this repository at the tag `v8.0.0`, once in today's order to see it
stop at `refresh`, and once in the new order to see it move the clone to 8.0.0.

Step 6 today gives the five commands as one block, then settles the instructions of "Worth knowing when you update".
It becomes, in this order:

1. The sentence that introduces the five, saying that the release's own instructions are settled right after the
   install and are the only other thing that changes a file
2. A block with the install alone, followed by its two bullets as they stand: the one on what `npm install` fetches
   and the one on the registry catching up
3. The paragraph that opens "Then read "Worth knowing when you update"", the four cases, and the paragraph that
   opens "Keep, for the commit", as they stand, but for the wording in case 1 that places the five commands
4. A block with the other four, `refresh`, `npm test`, `npm run check-changes` and the start of the sandbox, followed
   by their three bullets as they stand
5. Everything from the paragraph that opens "Then read `git status --short`" to the end of the step, as it stands

The step keeps calling them "the five" and "the five commands", so the refusal "One of the five fails", case 1 and
what is put back read as today (R3). Nothing outside step 6 changes (R4).

## Files

- `RELEASING.md`: step 6, under `## 6. The kit's own dependency`
- `changes/0073-step-6-of-a-release-that-adds-a-key-stops-at-refresh/record.md`: log entries
- A clone of this repository outside it, in the implementer's scratchpad or temporary directory, removed at the end

## Tasks

The failure, before the fix:

- [x] Clone this repository into a directory outside it, and in the clone run `git switch -C master v8.0.0` and
  `npm ci`, which installs 7.3.0 as `package-lock.json` at the tag names. Check that the devDependency `agentrite` in
  the clone's `package.json` is `7.3.0` and that its `agentrite.json` has no `orchestrator` (R5)
- [x] In the clone, follow today's step 6 for 8.0.0 up to its second command: `npm install --save-dev --save-exact
  agentrite@8.0.0`, then `npm run kit -- refresh`. See `refresh` print `agentrite: agentrite.json: orchestrator is
  missing` and exit 1. Put the clone back as the step says: `git restore .`, remove any file `refresh` printed as
  written, and `npm ci`. Check that `git status --short` in the clone is empty (R5)

The fix:

- [x] In step 6 of `RELEASING.md`, replace the sentence "Run these five, in this order, and nothing else that changes
  a file, but for the release's own instructions that come after them:" with one that says to run the five commands
  below, in the order given, with the release's own instructions settled right after the install, and nothing else
  that changes a file (R1)
- [x] Split the command block in two. The first holds `npm install --save-dev --save-exact agentrite@<version>` alone,
  and is followed by the bullets that open "`npm install` fetches" and "Right after `npm publish`". Then come, moved
  up unchanged but for the next task, the paragraph that opens "Then read "Worth knowing when you update"", the four
  cases, and the paragraph that opens "Keep, for the commit". Then a sentence that introduces the other four, to run
  in this order, and the second block with `npm run kit -- refresh`, `npm test`, `npm run check-changes` and
  `./sandbox.sh --in-place --rebuild true`, followed by the bullets that open "`npm run kit -- refresh`", "`npm run
  check-changes`" and "`./sandbox.sh --in-place --rebuild true`". The paragraph that opens "Then read `git status
  --short`" follows the second group of bullets, as it follows the bullets today (R1, R3)
- [x] In case 1, "The five commands and the commit below do that" reads as if all five came after the case. Change it
  to say that the five commands of this step and its commit do that, each at its place, and leave the rest of the
  case as it is (R2)
- [x] Read step 6 through against the spec: the stop conditions, the reading of the tree, putting the repository
  back, the commit and the list of its body are word for word as before; nothing in steps 1 to 5 or 7, or above the
  heading of step 6, changed (`git diff master -- RELEASING.md` shows only step 6); every line is at most 120
  characters; and no em dash was added (R3, R4)
- [x] Run `npm test` in this repository and see it pass. If a test fails, run it alone and then the whole suite once
  more, and log both results, as task 0072 did for `tests/sandbox-variant.test.mjs`
- [x] Commit `RELEASING.md` alone as `bugfix-0073 Settle the release's instructions before refresh in step 6`

The dry run, after the fix:

- [x] In the clone, still on `master` at `v8.0.0` with 7.3.0 installed, follow step 6 as now written in this
  repository's `RELEASING.md` for `<version>` 8.0.0, reading "Worth knowing when you update" of 8.0.0 in the
  clone's `CHANGELOG.md`. Run the two checks the step opens with, and the install. Settle each instruction by the
  four cases: the line `"orchestrator": "node_modules/agentrite/orchestrator.json",` is added after `standards` in
  `agentrite.json` by case 3, and checked by reading the file; `npx agentrite refresh` is taken as done by case 1;
  settle each other bullet that asks a project to do something by its case, and note those that ask nothing. Then
  run `npm run kit -- refresh`, `npm test` and `npm run check-changes`, and see each exit 0. Leave out the start of
  the sandbox, which requirement 5 permits (R5)
- [x] In the clone, read `git status --short` and `git diff package.json` as the step says, and check that the tree
  holds nothing but `package.json` with the one version, `package-lock.json`, `agentrite.json`, and the files
  `refresh` printed as refreshed or written. Commit them in the clone as `Depend on AgentRite 8.0.0`, with the body
  the step asks for but for the line on the sandbox, and push nothing (R3, R5)
- [x] Log in `record.md` one entry for the failure before the fix and one for the dry run after it: the commit of
  `v8.0.0` the clone was at, what each command printed and its exit status, how many tests passed, what `refresh`
  reported, how each instruction of 8.0.0 was settled, and that the start of the sandbox was left out of the dry
  run (R5)
- [x] Remove the clone
- [x] Check `record.md` for the line limit, then commit it alone as `bugfix-0073 Record the dry run of step 6`

## Verification

- [x] `npm test` passes in this repository after the commit of `RELEASING.md`
- [x] `npm run check-changes` exits 0 on the unit's branch, after the last commit
- [x] In the dry run, `refresh`, `npm test` and `npm run check-changes` exit 0, and `agentrite.json` holds the line
  of `orchestrator` after `standards`
- [x] `git diff master -- RELEASING.md` changes nothing outside step 6

## Commit Points

- [x] `bugfix-0073 Settle the release's instructions before refresh in step 6`: `RELEASING.md`
- [x] `bugfix-0073 Record the dry run of step 6`: `record.md` and the ticks of `plan.md`
- [x] `bugfix-0073 Record the final checks`: `record.md` and `plan.md`
