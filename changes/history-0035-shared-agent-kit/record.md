---
kind: feature
status: implemented
timestamp: 2026-09-21T00:25:22Z
---

# 0035 Shared agent kit

## Log

- 2026-09-21T00:25:22Z [human] reported that unit 0033 would not converge: the reviewer kept returning new findings
  round after round, and asked whether the roles were underspecified, whether the spec and plan were too vague, or
  whether the implementation was simply bad
- 2026-09-21T00:25:22Z [Claude Code, anthropic/claude-opus-5] read the four reviews in
  `.reviews/0033-agent-sandbox-container/`, the unit's documents and its record, and reported that the cause is the
  instructions rather than the code: two reviews of the same commit `243c5ce` returned different finding sets, the
  missing shell-script coverage was reported as blocking in all four rounds including after it became a recorded
  spec decision, nearly every finding was marked blocking with nothing defining the word, and the findings drifted
  toward hostile inputs that no threat model had ruled in or out
- 2026-09-21T00:25:22Z [human] asked how `ideas/roles-tuning-loop.md` fits, in particular whether reviewers
  re-raising decided concessions calls for a list of accepted concessions in the unit folder
- 2026-09-21T00:25:22Z [Claude Code, anthropic/claude-opus-5] answered that the 0033 history already tested that
  idea: the concession was recorded first in `record.md` and then as a spec decision, and was re-raised as blocking
  both times, so the fix is authority in the reviewer's instructions rather than another file to keep in step. Also
  noted that the note's git rules, no history rewriting and no pushes to `master`, are not what 0033 delivers and
  belong to the later unattended-loop unit
- 2026-09-21T00:25:22Z [human] said the roles and container are wanted in other projects, that `~/projects/finrite`
  already holds a trimmed copy of the roles, and asked how to keep the shared files movable when ten projects might
  carry them
- 2026-09-21T00:25:22Z [Claude Code, anthropic/claude-opus-5] compared the two copies and found drift in both
  directions: finrite carries requirement tracing the norareit copy lacks, and the norareit copy carries project
  anecdotes finrite had already generalized. Proposed one kit repository vendored with `git subtree`, having ruled
  out a submodule, an npm package, a Claude Code plugin and a symlink for reasons now recorded in `spec.md`
- 2026-09-21T00:25:22Z [human] chose Bitbucket in the `ritenoar` workspace over GitHub, `master` as the default
  branch everywhere, and created the private `agent-kit` repository with no README and no `.gitignore`
- 2026-09-21T00:25:22Z [Claude Code, anthropic/claude-opus-5] noted the consequences of Bitbucket for the sandbox:
  `bitbucket.org` is not on the allowlist and no git credential reaches the container, so kit updates are a host
  task, and there is no `gh` equivalent for opening a pull request from inside a session
- 2026-09-21T00:25:22Z [human] decided that the container moves into the kit as part of this unit rather than a
  follow-up, and confirmed that 0033 is closed and on `master`
- 2026-09-21T00:25:22Z [Claude Code, anthropic/claude-opus-5] confirmed from the tree that 0033 is `implemented` and
  fast-forwarded onto `master` at `52538ff`, with its fourth-round findings dispositioned, and that unit 0034 is
  committed on its own branch
- 2026-09-21T00:25:22Z [Claude Code, anthropic/claude-opus-5] took the planner role. `spec.md` and `plan.md`
  written, status `draft`, awaiting approval. Eighteen requirements, eleven decisions and seven non-goals; the
  tasks are split between the kit repository and this one, with sixteen kit tasks, eight here, twelve verification
  items and six commit points. The unit is recorded here rather than in the kit because the changes process and its
  check live here
- 2026-09-22T18:47:21Z [human] asked for the unit to be implemented, which is the approval the status was waiting
  for. The status moved from `draft` straight to `in-progress` without a separate `approved` entry
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] took the implementer role. Confirmed the starting
  state: `~/projects/agent-kit` is initialized on `master` with the Bitbucket remote and no commits, and
  `git ls-remote` returns nothing, so the remote is empty as the plan's first task requires. Diffed the two role
  copies: `implementer.md` is identical, and finrite is strictly ahead on `planner.md` and `reviewer.md`, so the
  kit takes finrite's wording wherever they differ
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] extended the Compose split beyond what `plan.md`
  listed, and amended the plan's file list and its two container tasks to match. The plan gave the project file the
  allowlist, the resource limits and the Playwright version; the Compose project name and the image name are
  `norareit-agent` and are equally project-specific, so requirement 2 puts them in the project's file too. The
  wrapper now asks Compose for the image name with `config --images` rather than hard-coding one
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] answered the plan's open question about the build
  context: it must stay the project root. The Dockerfile copies the project's `package.json` and `package-lock.json`
  in order to install Playwright's system libraries at the version the project resolved, and neither file exists in
  the kit. `container/agent.sh` therefore passes `--project-directory <project root>` so that both compose files
  resolve their relative paths from there, and the Dockerfile's own path is written as
  `agent-kit/container/Dockerfile`, which the spec's fixed vendoring prefix makes stable
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] the kit's ported `check-changes` suite passed before
  anything else touched the script: 16 tests, 16 passing, on `~/projects/agent-kit` with `npm test`. The port is
  dependency-free ESM and the tests are unchanged apart from the import path and dropping the `ts-node` invocation

- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] the kit is on Bitbucket at
  `git@bitbucket.org:ritenoar/agent-kit.git`, one commit, "Add the shared agent kit". Vendored here with
  `git subtree add --prefix agent-kit agent-kit master --squash`, whose merge commit was amended to carry the
  `feature-0035` prefix the commit conventions ask for
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] reordered the plan's commit points and merged its last
  two, recording the reason in `plan.md`. The stale-reference test that requirement 16 asks for reads `AGENTS.md`,
  `README.md` and `agent/compose.project.yml` together, so the documentation commit cannot stand apart from the one
  that moves the roles, and both have to follow the sandbox split for each commit to leave a tree whose own suite
  passes
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] added a commit the plan did not list,
  "feature-0035 Point the Docker build context notes at the kit". `.dockerignore` named `agent/Dockerfile` in its
  opening comment, which the plan expected to be unchanged. The file's contents were indeed still correct; only the
  comment was stale. `.dockerignore` is now in the roles test's list of instruction files, so the next path that
  moves is caught there
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] ran the suites on the committed tree at `1681439`:
  `npm run test:unit` 48 tests, 48 passing; `PORT=3100 npm test` 86 end-to-end tests, 86 passing, with
  `npm run check:changes` running first as part of it. The kit's own `npm test` is 16 tests, 16 passing. The host
  unit count was 61 on `master`: 16 `check-changes` tests moved into the kit and the three new stale-reference tests
  requirement 16 asks for were added, which is 61 - 16 + 3 = 48
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] verified the freeze check end to end on a throwaway
  branch, one temporary commit at a time, each reset afterwards: an edited `0034` `spec.md` was rejected as
  `0034-categories-test-count-coupling: spec.md`, the deleted unit as `unit deleted`, and an unticked task as
  `plan.md has 1 unticked task`. `changes/0033-agent-sandbox-container/` is untouched by this branch's diff against
  `master`
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] saw `tests/unit/roles.test.ts` fail before the
  references were repointed, on both halves: the Roles section not pointing at `agent-kit/roles/planner.md`, and
  `AGENTS.md` still naming `roles/` and `changes/_templates/`. It later failed again on `README.md` naming
  `agent/Dockerfile` and `agent/compose.yml`, which is what caught the README work, and passes on the migrated tree
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] verified requirement 13 for OpenCode with
  `opencode debug agent <role>`: all three resolve, each `mode` is `subagent`, and each prompt is the kit role file
  inlined in full, 5078, 4435 and 8829 characters. For Claude Code, the three stubs' frontmatter is unchanged by
  this unit, so what the harness dispatches on did not move; the stub bodies now name the kit paths and the roles
  test proves those files exist. This session lists all three subagents
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] verified the subtree round trip in two halves rather
  than the single flow the plan describes, to keep a probe commit out of the kit's shared history.
  `git subtree push --prefix agent-kit agent-kit master` against Bitbucket split 315 commits and reported
  "Everything up-to-date", and `git subtree pull ... --squash` reported "Subtree is already at commit 03112fb", so
  both directions work against the real remote. The content half went through a scratch bare repository: a reworded
  line in `agent-kit/roles/planner.md` was committed here, pushed with `git subtree push`, and read back from a
  fresh clone, where it had arrived at `roles/planner.md`. The probe commit was then reset and the scratch remote
  removed
- 2026-09-22T18:47:21Z [Claude Code, anthropic/claude-opus-5] **blocked on the sandbox verification.** Docker is
  not reachable from this session's shell: `/var/run/docker.sock` is `root:docker` and this user is not in the
  `docker` group, and `agent.sh` refuses `sudo` by design. The two remaining verification items, that `./agent.sh`
  builds and starts with the firewall self-check passing and the agent landing unprivileged, and that the suites
  pass inside the sandbox on the migrated tree, need the developer to run them. Nothing about the container's
  behavior was changed by this unit, only where its files live, but that is a claim about the move and not a
  measurement of the container. `docker compose --project-directory . -f agent-kit/container/compose.yml -f
  agent/compose.project.yml config --images` does resolve to `norareit-agent`, which is client-side only and proves
  the two files merge, not that the image builds

- 2026-09-22T19:44:00Z [human] ran `sudo usermod -aG docker stef`, which unblocked the sandbox verification
- 2026-09-22T19:44:00Z [Claude Code, anthropic/claude-opus-5] verified the sandbox on the migrated tree at
  `d8c9121`. `./agent.sh --rebuild` built the image from `agent-kit/container/Dockerfile` with the project root as
  the build context and started the container: the entrypoint installed the firewall, denied IPv6, allowlisted every
  host and range from `agent/compose.project.yml`, confirmed the `example.com` canary blocked and the
  `api.anthropic.com` probe reachable, and dropped to `uid=1000(agent) gid=1000(agent)`. `/proc/self/status` inside
  reports `CapPrm`, `CapEff`, `CapInh` and `CapAmb` all zero, and `/etc` is read-only. Then, inside the sandbox:
  `npm ci`, `npm run build`, `npm run test:unit` 48 tests 48 passing, and `PORT=3100 npm test` 86 end-to-end tests
  86 passing
- 2026-09-22T19:44:00Z [Claude Code, anthropic/claude-opus-5] two notes on how that run was obtained, because
  neither is the developer's own invocation exactly. This session's process predates the `usermod`, so its
  credentials carry no `docker` group; only the `docker` calls were routed through `sg docker`, by a shim on `PATH`
  in the scratch directory, leaving `agent.sh` to read the real `1000:1000` from the outer shell. Nothing in the
  repository was changed for it and the shim is not committed. Separately, one start aborted with
  `FATAL: allowlisted host api.github.com is not reachable`, because GitHub's edge answered with a different address
  than the one resolved moments earlier at start-up. That is the address-boundary behavior unit 0033 documents, not
  a regression from this unit, and the next start succeeded
- 2026-09-22T19:44:00Z [Claude Code, anthropic/claude-opus-5] every task and every verification item in `plan.md`
  is ticked. The unit stays `in-progress`: the gate this unit itself writes into `process.md` is the human having
  decided every blocking finding a review returned, and no review has run yet
- 2026-09-22T22:27:56Z [OpenCode, openai/gpt-5.6-sol] performed the first, full review of unit
  `0035-shared-agent-kit` at commit `141e69e`. Returned findings S1, S2, P1, P2 and C1 in
  `.reviews/0035-shared-agent-kit/full-review-141e69e-gpt-5.6-sol.md`. Could not independently verify the historical
  empty Bitbucket remote, the Bitbucket visibility flag, the prior subtree push/pull and scratch round trip,
  test-first timing and deliberate failing probes, Claude Code's displayed subagent list, or the sandbox `npm ci`;
  the exact unwrapped `./agent.sh --rebuild` invocation was also unavailable to this shell's stale group credentials

- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] the reason the `.gitignore` task was added to
  `plan.md`, which finding P2 correctly reports was never logged at the time. The kit repository was created with no
  `.gitignore`, and `~/projects/agent-kit` already held an untracked `.idea/` directory. Without one, the editor
  directory would have been committed into the kit and then vendored into every project that pulls it. The file was
  added and the plan extended before the kit's first commit, but the reason went unrecorded
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] first review received, by OpenCode with
  openai/gpt-5.6-sol, on commit `141e69e`, saved at
  `.reviews/0035-shared-agent-kit/full-review-141e69e-gpt-5.6-sol.md`. Five findings, S1 and S2 blocking, P1, P2 and
  C1 not. All five verified against the tree and all five accepted; none declined. Outcomes below. The review also
  reported the absent automated coverage for `agent.sh` and `entrypoint.sh` as settled residual risk against the
  non-goal at `spec.md:136-138`, without blocking, which is the behavior requirement 5 asks for
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] **S1 accepted and fixed.**
  `agent-kit/container/Dockerfile` said "Requirement 1 needs an actual non-root user", inherited from unit 0033's
  first requirement and meaningless inside the kit. Reworded to "The sandbox needs an account that is actually
  unprivileged, not one merely named `agent`". Swept the rest of the kit for the same class of dangling reference,
  matching on requirement numbers, unit numbers and named spec sections, and the Dockerfile line was the only hit
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] **S2 accepted and fixed.** `AGENTS.md` restated the
  kit's end-to-end testing rule as "New features that can be tested end to end get Playwright coverage", which is
  the same condition and obligation as the bullet in `process.md`. It now names the suites without restating the
  rule: "Playwright is this project's end-to-end suite, and `node --test` its unit one"
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] **P1 accepted and fixed.** `plan.md` still described
  `.dockerignore` as unchanged and its commit-point list stopped at `871cb90`. The file entry now says its rules
  were confirmed and its opening comment repointed, and the list carries the four commits made after `871cb90`,
  including this one
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] **P2 accepted and fixed** by the new log entry above,
  appended rather than written into the original entries
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] **C1 accepted and fixed.** `README.md` told the reader
  to update shared agent instructions in `AGENTS.md`, and `CLAUDE.md` said all instructions are maintained in
  AGENTS files, both of which contradict the split this unit makes. Both now describe the two homes, `process.md`
  for what is the same everywhere and `AGENTS.md` for what is specific here, and say how a rule reaches the kit.
  `CLAUDE.md` and `README.md` are already in the roles test's instruction-file list, so a path in either going stale
  fails a test

- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] the S1 fix touches a vendored kit file, so it was sent
  back with `git subtree push --prefix agent-kit agent-kit master`, which pushed `03112fb..651ecf8` to Bitbucket.
  `~/projects/agent-kit` was then pulled and `diff -r` reports the kit clone and the vendored copy identical. That
  is also the round trip the plan asked for, carrying a real correction rather than the scratch probe used earlier
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] suites run on the final tree at `eed0f8b`, after the
  review fixes: `npm run test:unit` 48 tests 48 passing, `PORT=3100 npm test` 86 end-to-end tests 86 passing with
  the change check first, and the kit's own `npm test` 16 tests 16 passing. `git status` afterwards shows only the
  pre-existing untracked `ideas/roles-tuning-loop.md`. The sandbox was not rebuilt for this round: the fixes touch
  a comment in the Dockerfile and four Markdown files, none of which changes what the image or the firewall does,
  so the sandbox results stand from `d8c9121` and were not re-measured
- 2026-09-22T22:44:05Z [Claude Code, anthropic/claude-opus-5] every finding from the first review is applied and
  every task and verification item in `plan.md` is ticked. The unit waits on the human: `process.md` gates
  `implemented` on their having decided every blocking finding, and S1 and S2 were blocking

- 2026-09-22T22:57:44Z [OpenCode, openai/gpt-5.6-sol] performed a delta review of unit
  `0035-shared-agent-kit` at commit `438026f`, from the prior reviewed commit `141e69e`. Returned finding P3 in
  `.reviews/0035-shared-agent-kit/delta-review-438026f-from-141e69e-gpt-5.6-sol.md`. Could not independently verify
  the historical untracked `.idea/` directory, the precise uncommitted ordering of the `.gitignore` plan extension,
  or the exact subtree command used to produce the verified remote state; did not rebuild the sandbox because the
  delta changes no runtime sandbox behavior

- 2026-09-22T23:10:00Z [Claude Code, anthropic/claude-opus-5] **P3 accepted and fixed.** The delta review is correct
  that `plan.md`'s file map never listed `CLAUDE.md`, although C1 edited it and the review-response commit point
  named it. Both `README.md` and `CLAUDE.md` entries now say they also carry the maintenance guidance that C1
  corrected. This is the same class of gap as P1 and the third time the file map has lagged the work, which is worth
  noting for whoever plans the next unit: the map is easiest to keep true by updating it in the same edit as the
  file, not at the commit

- 2026-09-22T23:48:42Z [human] decided the blocking findings S1 and S2 and the non-blocking P1, P2, P3 and C1, all
  of which were accepted and applied, and marked the unit done. Status moved to `implemented`, freezing `spec.md`
  and `plan.md`. The branch is deliberately not merged to `master` yet: unit 0036 branches from it and is
  implemented first

## Amendments

- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] the vendoring mechanism this unit chose, `git
  subtree`, is replaced by unit `0036-install-the-agent-kit`. Requirement 11 and the decision "Bitbucket and
  `git subtree`, not the alternatives" are superseded in that respect, as are the parts of requirements 14 and 18
  that describe the `agent.sh` shim's path and the `git subtree pull` and `push` commands. Nothing else this unit
  delivered is affected: the kit repository, the role corrections, `process.md`, the ported check script, the
  container split and the `AGENTS.md` split all stand.

  The evidence is a failure this unit's own verification did not reach. `git subtree push` reconstructs the upstream
  repository from the consumer's copy, so a path missing from the copy is deleted upstream. Demonstrated on a pair
  of scratch repositories: a project vendored a kit holding `roles/` and `changes/`, deleted its local
  `agent-kit/changes/`, then sent a genuine improvement to `roles/planner.md` back with `git subtree push`. The push
  reported success, the improvement landed, and the kit's entire `changes/` history was gone from its `master`.
  Contributing a fix silently destroyed unrelated history in another repository.

  This unit's round-trip verification did not catch it because it only ever pushed a tree that still held
  everything. The same property is what forces the kit's own `changes/` into every consumer, where a bare unit
  reference such as "review change 0001" can resolve to the kit's unit rather than the project's. `0036` replaces
  the mechanism with a copy-in installer and does not rewrite this unit's documents, which describe what was
  actually built and verified.
