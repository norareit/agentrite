---
kind: feature
status: draft
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
