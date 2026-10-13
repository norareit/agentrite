---
kind: feature
status: draft
timestamp: 2026-10-13T20:22:53Z
---

# 0047 A second run of a unit

## Log

- 2026-10-13T20:22:53Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `4d36473`, on the human's request for a second, separate clone of a unit in a container of its
  own, so that two models can implement one unit and the results be compared. The request reached the specifier
  through the agent that launched it, with the human's words as that agent quoted them. Made the unit as a
  feature. Numbered 0047: the highest number in `changes/` is 0046, and `origin` holds `master` alone, at the same
  commit.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: `SANDBOX.md`, and the wrapper and its git work in this repository's own copy under `container/`, which
  is what `master` holds and differs from the installed copy by unit 0045, which no release holds yet. Checked
  there what the spec says of the sandbox today: the container's name as the lock and the refusal that names
  `--connect`, where the clone is, how the work is brought back, what the runs of one project share, and that a
  number which two branches hold is refused.
  Wrote `spec.md` as a sketch, as the human asked: "a very minimal, not worked out spec", since other features are
  built first and may change the sandbox. It has five requirements, which are what the request fixes, and no
  decision. Left open on purpose, and listed under "Decisions": the form of the command, where the second run's
  commits go, what the second clone starts from, how the second run is named afterwards, how the two results are
  compared and one is taken, and what the two runs share. The human was asked about none of them, by their own
  wish. So the spec does not yet let someone implement the unit without coming back to ask, and it says so in its
  first paragraph. It is worked out before it is approved.
  Not checked: anything that needs Docker. The status is `draft`

## Amendments
