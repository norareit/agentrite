# 0015 The sandbox refuses two hosts its harnesses need

## Approach

The fix is one edit to `container/compose.yml`: two hosts more in `KIT_ALLOWLIST`. A regression test goes ahead of
it, reading the file as text the way `tests/compose-tmpfs.test.mjs` does, so it runs on the host without Docker. The
places that list the kit's hosts follow. What only a running container can show, requirements 1 and 2, is checked in
this repository's own sandbox with the working copy's Compose file, the way 0020 was checked.

## Files

- `tests/compose-allowlist.test.mjs`: new, the regression test
- `container/compose.yml`: two hosts in `KIT_ALLOWLIST`, each under its comment
- `README.md`: the two hosts in both sentences that list what the kit admits itself, one under the files `init`
  writes and one under the egress description
- `templates/project/agent/compose.project.yml`: the two hosts in the comment above `ALLOWLIST` that lists what the
  kit admits itself

## Tasks

- [ ] Add `tests/compose-allowlist.test.mjs`, reading `container/compose.yml` as text. It takes the lines of the
      `KIT_ALLOWLIST` block by their indentation, drops comments and blank lines, and holds that the hosts include
      `platform.claude.com` and `models.opencode.ai`, and still include `api.anthropic.com`, `registry.npmjs.org`
      and `agentrite.ritenoar.com`. Run it and see it fail for want of the two (R4)
- [ ] In `container/compose.yml`, add to `KIT_ALLOWLIST`: `platform.claude.com`, under a comment that Claude Code
      contacts it at start-up when it holds no saved login, and `models.opencode.ai`, under a comment that OpenCode
      fetches its model catalog from it. See the test pass (R1, R2, R3)
- [ ] In `README.md`, add the two hosts to the two sentences that list what the kit admits itself, removing nothing
      (R6)
- [ ] In `templates/project/agent/compose.project.yml`, add the two hosts to the comment that lists what the kit
      admits itself, and run the `init` tests, which hold the lines of that file to 120 characters (R6)

## Verification

- [ ] `npm test` passes on the host
- [ ] `npm pack --dry-run` lists the same files as on `master`
- [ ] `npm run check-changes` passes
- [ ] No line of a changed file is over 120 characters, and none holds an em dash
- [ ] The real run, in this repository's sandbox with the working copy's `container/compose.yml` and a home volume
      that holds no login for Claude Code, such as a new one: `claude` reaches its first-run screen (R1). After
      `claude` and `opencode` have each been started, `grep 'not allowlisted' /run/egress-proxy.log` names neither
      `platform.claude.com` nor `models.opencode.ai` (R2). What each check showed is in the record, with the Docker
      and Compose versions (R5)
- [ ] Human: log in to Claude Code in that sandbox, send one prompt in each harness, and run the same `grep`. A
      host refused there is logged in `record.md` and is a new unit, not part of this one

## Commit Points

- [ ] The regression test and the fix
- [ ] The README and the template
- [ ] The record of the real run
