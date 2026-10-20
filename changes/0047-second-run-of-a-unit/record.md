---
kind: feature
status: approved
timestamp: 2026-10-13T20:22:53Z
---

# 0047 A second run of a unit

## Log

- 2026-10-13T20:22:53Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `4d36473`, on the human's request for a second, separate clone of a unit in a container of its
  own, so that two models can implement one unit and the results be compared. The request reached the specifier
  through the agent that launched it. Made the unit as a
  feature. Numbered 0047: the highest number in `changes/` is 0046, and `origin` holds `master` alone, at the same
  commit.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: `SANDBOX.md`, and the wrapper and its git work in this repository's own copy under `container/`, which
  is what `master` holds and differs from the installed copy by unit 0045, which no release holds yet. Checked
  there what the spec says of the sandbox today: the container's name as the lock and the refusal that names
  `--connect`, where the clone is, how the work is brought back, what the runs of one project share, and that a
  number which two branches hold is refused.
  Wrote `spec.md` as a sketch, as the human asked for a minimal spec that is not worked out, since other features
  are built first and may change the sandbox. It has five requirements, which are what the request fixes, and no
  decision. Left open on purpose, and listed under "Decisions": the form of the command, where the second run's
  commits go, what the second clone starts from, how the second run is named afterwards, how the two results are
  compared and one is taken, and what the two runs share. The human was asked about none of them, by their own
  wish. So the spec does not yet let someone implement the unit without coming back to ask, and it says so in its
  first paragraph. It is worked out before it is approved.
  Not checked: anything that needs Docker. The status is `draft`
- 2026-10-20T20:05:38Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `e20449c`, on the human's request to check whether the unit needs updating before it is implemented,
  and then to work it out. Read `roles/specifier.md` of the installed release. Checked what the spec said of the
  sandbox against `SANDBOX.md`, `README.md` and `container/unit-clone.sh` of `master`: it still held, apart from the
  wrapper now cutting a unit's branch itself, `agentrite run` with `--model`, and two checkouts sharing a branch's
  clone. Found that no branch, no directory of `changes/` and no file of `.reviews` holds `--`. Proposed an answer
  to each of the six open questions; the human took all six, made clear that the option is optional, and added that
  a variant's reviews are kept apart by their file's name and that its implementer reads only those. Rewrote
  `spec.md`: a variant is a unit run of the branch `<unit's branch>--<name>`, started with the optional
  `--variant <name>`; its reviews end in `--<name>`; a role reads its variant from its branch; a record's entry made
  on a variant names it. Reworded the two places of the first entry above that quoted the human, whom the standards
  of release 7.2.0 forbid quoting in anything committed. The status is `draft`
- 2026-10-20T20:11:35Z [human] approved the spec. The status is `approved`

## Amendments
