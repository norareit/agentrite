# 0036 Install the agent kit with a script

Replace `git subtree` vendoring with a copy-in installer, so that the kit's files arrive in a project as an
installed artifact rather than as a live mirror of another repository.

## Context

Unit 0035 vendored the kit with `git subtree`. Using it exposed a failure that rules the mechanism out.

`git subtree push` reconstructs the upstream repository from the consumer's copy of it, so a path missing from the
copy is deleted upstream. This was demonstrated on a pair of scratch repositories: a project vendored a kit holding
`roles/` and `changes/`, deleted its local `agent-kit/changes/`, then sent a genuine improvement to
`roles/planner.md` back with `git subtree push`. The push reported success, the improvement landed, and the kit's
entire `changes/` history was gone from its `master`. Contributing a fix silently destroyed unrelated history in
another repository.

0035's own round-trip verification missed this because it only ever pushed a tree that still held everything. The
property is not a quirk to route around. A mechanism in which the consumer's directory is a live bidirectional
mirror of the upstream repository carries that risk permanently, and nothing on the surface of `agent-kit/` says so.
A directory that looks like ordinary committed files behaves like a remote working copy.

The same property causes a second problem. Because subtree copies the whole repository, the kit's own `changes/`
lands in every consumer, where a bare unit reference resolves ambiguously. In this project today there is no
root-level `0001-*` unit, so "review change 0001" would find exactly one match, the kit's, and act on it with no
sign anything was wrong.

An installer removes both. The kit's payload is copied in at a pinned commit, the copy is gitignored so editing it
is visibly pointless, and the installer chooses what to copy, so the kit's `changes/` and tests never arrive. There
is no path by which a project can write to the kit, which is the point: kit work belongs in the kit, where unit
0001 of the kit's own change process will record it.

## Requirements

1. The kit holds an installer that copies its vendorable payload into a named directory of a named project. The
   payload is the roles, the process document, the templates, the check script and the container files, and nothing
   else: not the kit's `changes/`, its `tests/`, its `package.json` or its own README
2. The installer is idempotent. Running it twice with the same pin leaves byte-identical content, and running it
   over an older or partial installation leaves no file that the pinned commit does not contain
3. The installer refuses to write to a directory that is neither empty nor a previous installation, so that a
   mistyped target cannot destroy an unrelated directory
4. The installer reads the kit at a given commit without disturbing the kit clone it runs from: no checkout, no
   detached HEAD, no change to that clone's working tree
5. A project carries a tracked `agent-kit.md` whose first field is the pinned kit commit, and which states that the
   installed files are not part of the repository, must not be edited, and are refreshed by re-running the installer
6. Run without `--update`, the installer installs the pinned commit and does not rewrite the pin
7. Run with `--update`, the installer installs the kit's current `master` and rewrites the pin to that commit. On a
   project that has no `agent-kit.md` yet, the same invocation creates one, so first adoption needs no separate mode
8. After installing, the installer reports whether the kit has moved past the pin, and says how to move to it.
   Staleness is reported and never applied
9. The installed tree records the commit it was installed from, so that a missing installation, a stale one and a
   correct one are distinguishable from each other
10. The project's build fails when the installation is missing or does not match the pin, naming the command that
    fixes it. The check works with no part of the kit present, so it belongs to the project
11. The installed directory is gitignored, and the project no longer tracks it or carries a git remote for the kit
12. Everything 0035 delivered that does not depend on the mechanism still works: both harnesses resolve the three
    roles, `npm run check:changes` runs the kit's script, the sandbox builds and starts from the kit's container
    files, and both suites pass
13. No document in either repository tells a reader to vendor, update or contribute with `git subtree`
14. No change unit left in `draft` in either repository still rests on the mechanism this unit replaces. This means
    the kit's `0001-kit-change-process`, whose requirement that unit numbering be scoped per repository exists only
    because `git subtree` copies the kit's `changes/` into every consumer

## Decisions

* **An installer, not a mirror.** The alternatives were kept in view. Staying on subtree and living with the
  destructive push was rejected because the failure is silent, is triggered by the documented way to contribute, and
  damages a repository other than the one being worked in. Splitting the kit so only a payload branch is vendored
  was rejected as more machinery around a mechanism whose core property is still wrong. Copying files in is the
  ordinary thing that vendoring was always meant to be, and it fails safe: the worst an installer can do is write
  the wrong files into the directory it owns.
* **The pin is authoritative and staleness is only reported.** Installing the kit's latest on every run would mean
  two people cloning the same project on different days run agents under different instructions, with nothing in
  the project's history showing it. That is the drift the kit exists to end, moved from two copies of a file to two
  moments in time. Obeying the pin makes a clone reproducible, and makes an update a deliberate act that produces a
  reviewable one-line diff, which is better than subtree's opaque squashed import.
* **`git archive` is the extraction primitive.** It takes a commit and a path list, writes no state, and leaves the
  kit clone's HEAD and working tree untouched, which requirement 4 needs. Checking the kit out at the pin, or
  copying from its working tree, would both mutate the operator's clone or depend on its current state.
* **The installation records its own commit, in the installed tree.** Without it a project can only tell present
  from absent, so a half-updated tree would pass the bootstrap check while running the wrong instructions.
* **The bootstrap check is the project's, not the kit's.** This is forced rather than chosen: the check has to run
  when the kit may be entirely absent, so it cannot be a kit file. It is the one piece of this that each project
  carries itself.
* **The payload list lives in the kit.** The kit knows what it ships, and putting the list in each project would
  mean editing every project whenever the kit gains a directory.
* **The installed files are gitignored.** This is what makes "do not edit these" structural instead of a rule to
  remember: an edit is neither committed nor kept, so it is visibly pointless rather than quietly harmful. It also
  keeps the project's history free of a second repository's files.
* **0035 is not rewritten.** Its documents describe what was built and verified, and that history is what makes
  this unit's reasoning legible. It is marked `implemented` and amended to point here, rather than edited to
  pretend the installer was always the plan.
* **This unit is recorded in this project.** The kit's own change process is unit 0001 of the kit and is not yet
  implemented, so this unit follows 0035's shape and spans both repositories from here.
* **The kit's draft unit 0001 loses its numbering requirement rather than keeping it as insurance.** That
  requirement was added because a vendoring project's tree held change directories that were not its own, so a bare
  reference like "review change 0001" could resolve to the kit's unit. The installer's payload excludes the kit's
  `changes/`, so no consumer receives it and the collision cannot occur. Keeping the rule would be solving a problem
  that no longer exists, which the code standards rule out for code and which is no better in a document. The
  reason it was dropped is recorded in that unit, so a later reader can tell a removed rule from one never
  considered. Its separate claim, that the roles are always dispatched with a unit directory rather than a bare
  number, is removed regardless: it was shown false, and correcting it is not conditional on this unit.

## Non-goals

* Rewriting the history of the 0035 branch to remove the files subtree committed. They are deleted going forward;
  the commits that added them stay as they are
* Any automatic update, scheduled check or CI job that reports a project as behind the kit
* Migrating finrite onto the installer, or any change to a third project
* A package manager, a registry, or any distribution beyond a git clone and a script
* Any change to the content of the roles, `process.md`, the templates or the check script's behavior, and any
  change to what the container does
* Resolving where the installer prints the kit's location from, beyond a sensible default. How a project finds the
  operator's kit clone is a convenience question, not a correctness one
