---
kind: feature
status: approved
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
