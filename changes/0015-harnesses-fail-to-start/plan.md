# 0015 Neither harness starts in a new sandbox

## Approach

The fix is two edits to `container/compose.yml`, with a regression test ahead of them and the README's host lists
after. The test reads the file as text, so it runs on the host without Docker. What only a running container can
show, requirements 1 and 4, is checked in Norareit's sandbox with the branch packed and installed there, the way
0007 was checked.

## Files

- `tests/compose-base.test.mjs`: new, the regression test
- `container/compose.yml`: `exec` on the `/tmp` tmpfs and the comment above it, and two hosts in `KIT_ALLOWLIST`
- `README.md`: the two hosts in both lists of what the kit admits itself, under "agent/compose.project.yml" in the
  list of files `init` writes and under the egress description

## Tasks

- [ ] Add `tests/compose-base.test.mjs`, reading `container/compose.yml` as text: one test that the `tmpfs` list
      holds `/tmp:exec` and still holds `/run` without options, and one that the hosts of `KIT_ALLOWLIST`, with
      comments and blank lines dropped, include `platform.claude.com` and `models.opencode.ai`, still include
      `api.anthropic.com`, `registry.npmjs.org` and `agentrite.ritenoar.com`, and do not include
      `raw.githubusercontent.com`. Run it and see both fail (R2, R3)
- [ ] In `container/compose.yml`, change the `/tmp` entry under `tmpfs` to `/tmp:exec`, and extend the comment above
      `read_only` to say that `/tmp` is executable because OpenCode loads its rendering library from there, and
      that the agent can already execute from `/work` and its home (R1)
- [ ] In `container/compose.yml`, add to `KIT_ALLOWLIST`: `platform.claude.com` under a comment that Claude Code
      contacts it at start-up and to log in, and `models.opencode.ai` under a comment that OpenCode fetches its
      model catalog from it at start-up. Change the comment on `api.anthropic.com` only if it no longer reads true
      (R2)
- [ ] In `README.md`, add the two hosts to the two sentences that list what the kit admits itself, removing
      nothing (R5)

## Verification

- [ ] `npm test` passes, with the two new tests among them
- [ ] `npm run check-changes` reports nothing
- [ ] No line of the changed files is over 120 characters, and none holds an em dash
- [ ] In Norareit, with this branch packed by `npm pack` and installed with `npm install --no-save`, after
      `./agent.sh --rebuild`: `grep ' /tmp ' /proc/mounts` shows no `noexec` and shows `nosuid` and `nodev`, and
      `cp /bin/true /tmp/probe && /tmp/probe` exits 0 (R1)
- [ ] In that sandbox, `opencode` and `claude` each reach their first screen, and
      `grep 'not allowlisted' /run/egress-proxy.log` shows the canary and `raw.githubusercontent.com` alone (R4)
- [ ] Human: log in to Claude Code in that sandbox, send one prompt in each harness, and run the same `grep`. A
      host refused there is logged in `record.md` and is a new unit, not part of this one
- [ ] Norareit's `node_modules` is restored to its released kit afterwards with `npm ci`

## Commit Points

- [ ] The failing test
- [ ] `container/compose.yml`, with the test passing
- [ ] `README.md`
