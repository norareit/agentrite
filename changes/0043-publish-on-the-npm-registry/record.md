---
kind: feature
status: approved
timestamp: 2026-10-09T10:45:52Z
---

# 0043 The kit is published on the npm registry

## Log

- 2026-10-09T10:45:52Z [human] in a session of Claude Code on the host, said that the kit is about to be public: the
  repository gets GitHub as its default remote, with Bitbucket kept as a second remote to push to, everything in it
  becomes open under the MIT license, and the package moves to the npm registry. Asked what the repository holds of
  them besides the name and the email in the commits. Was told that no secret is in the tree or in the history, and
  that three things stand in the way of the two moves: `"private": true` in `package.json`, no license, and the
  documents and pointers that name the release host and Bitbucket. Asked for a change that fixes the three, and for
  the CDK part to go with it: "there will be no reason left to publish on agentrite.ritenoar.com anymore". Wanted
  the move to GitHub in the unit as well, "as steps I have to take". Asked three things, answered: the repository is
  `github.com/ritenoar/agentrite`, the copyright holder is Stef Klaassen, and `deploy.sh` is replaced by
  `npm publish` with the two checks kept. Said that the repository on GitHub is public from the start, since
  nothing in it or in its history is to be kept back. Said of the name that the kit is published as `agentrite`,
  the name the pointer holds, and proposed a pointer at `@ritenoar/agentrite` to it. Said that the two other
  projects are moved to the release right after it, so that the host can be taken down. Took two of the things
  the specifier listed as beyond the request: the four fields that describe the package, and the refusal by
  `npm publish` of a working tree that is not clean, without the refusal off `master`, since releasing from another
  branch is allowed
- 2026-10-09T10:45:52Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `ccebd05`, which holds the release 5.0.0. Read `process.md` and `roles/specifier.md` of the
  installed release, which are the same as the working copy's. Made the unit as a feature: it takes decisions on
  the name, on what replaces `deploy.sh`, on the kit's own dependency, on what happens to the host and on the
  order of the human's steps. Left the proposed pointer at `@ritenoar/agentrite` out, for the reason the spec
  gives. Numbered 0043: the plain directories run from 0001 to 0042 without a gap, and the `history-` directories
  do not count. Wrote `spec.md`. The status is `draft`
- 2026-10-09T12:44:12Z [human] read the spec and approved it. The status is `approved`
