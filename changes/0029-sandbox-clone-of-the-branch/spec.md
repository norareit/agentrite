# 0029 The sandbox works on a clone of the unit's branch

## Context

`./agent.sh` mounts the project root read-write at `/work`. The agent therefore works in the developer's own
checkout, `.git` and `node_modules` included, and three things follow:

* What the agent writes outside a commit stays on the host and runs there later, outside the sandbox: a git hook, a
  line in `.git/config`, a file in `node_modules`. The egress allowlist and the dropped capabilities confine the
  container, and none of them covers this
* One working tree is on one branch, so two sandboxes cannot work on two units at once. The README's answer is
  `--workdir` with a second clone made by hand, with the advice to "mount a separate clone and push branches back
  from it"
* The agent sees whatever the checkout holds that is not committed, such as a `.env`

On 2026-10-04 the human, taking stock of what the sandbox delivers before writing about it, asked that the mounted
directory no longer be the checked-out repository but a newly checked-out copy, made before the container starts and
cleaned up afterwards. The decisions below were made in that conversation:

* The clone is made on the host, and only commits come back
* A run names its unit, by ID or by branch, or says `--in-place`. One of the two is required
* Two runs never work on the same branch
* An ID that names more than one branch is not guessed at: the wrapper lists them and asks for one
* Planning is done on the host. The branch and its documents exist before the sandbox starts, and the sandbox is for
  the implement and review loop
* The reviewer's findings reach the host, by mounting the host's `.reviews` directory into the clone
* Commits land under `sandbox/<branch>`, and the host's branch is fast-forwarded when that is possible

Docker Sandboxes has the same idea as its clone mode: the repository is mounted read-only, the agent works on a
private clone inside the sandbox, and the host fetches from it as a git remote.

### What was found while planning

On Linux with git 2.43.0, Docker Engine 28.4.0 and Compose 2.39.2, in scratch repositories and with a Compose
project named `agentrite-0029-plan`. Everything created was removed afterwards.

* **A plain local clone shares files with its source.** `git clone` of a path hard-links the objects: an object
  file had the same inode in both. With `--no-hardlinks` the inodes differed
* **The clone holds the branch and the host's other branches as `origin/*`.** It has `origin/master` and no local
  `master`. `scripts/check-changes.mjs` tries `master` and then `origin/master`, so the freeze check finds its base
* **A git command run in the clone runs what the clone's configuration says.** With `core.fsmonitor` set in the
  clone to a command that leaves a marker file, `git status` in the clone left the marker
* **Fetching from the clone runs nothing of the clone's.** With that `core.fsmonitor`, an
  `uploadpack.packObjectsHook` and executable `post-checkout` and `pre-commit` hooks in the clone, each leaving a
  marker, `git ls-remote` and `git fetch` from the host left none, and the fetch brought the commit
* **The clone's tree can be compared without running git in it.** Run with the host repository as the git
  directory, the clone as the work tree and a scratch index read from the fetched commit, `git ls-files --modified
  --deleted --others --exclude-standard` named a changed file and an untracked one, left out an ignored
  `node_modules`, left no marker, and left the host's own index and `git status` untouched
* **`git ls-remote` of the clone lists every ref it has**, a second branch and the stash among them, so the host
  can tell which of the clone's commits it lacks
* **Git refuses to fetch into a branch that is checked out**, with "refusing to fetch into branch". `git merge
  --ff-only` moved the checked-out branch, a fetch moved one that was not checked out, and a diverged branch was
  rejected as a non-fast-forward
* **Docker creates what a mount lacks, as root.** With the clone at `/work` and a second directory mounted at
  `/work/.reviews`, a mount point missing from the clone was created on the host owned by root. A missing source
  directory was created owned by root too, and the agent could not write it. With both made beforehand, a file
  written at `/work/.reviews` appeared in the source directory and the clone's own `.reviews` stayed empty
* **A named container serves as a lock.** A second `docker compose run --name` with a name in use failed with
  "Conflict. The container name ... is already in use" and exit 1. `docker rm` refused the running container and
  removed a stopped one. The command's exit code, 7, passed through `docker compose run`
* **An ID matches as a whole number.** Among `feature-0010-init`, `feature-0010-init2` and `task-0026-doc`, `0010`
  matched two branches, `0026` one, and `026` and `26` none

## Requirements

Starting a run:

1. The wrapper starts a container only when told what to mount: a unit as the first argument after its options, or
   `--in-place`, or `--workdir DIR`. Given none of them, it starts nothing, exits non-zero and names the three forms
2. `--in-place` mounts the project root at `/work` as the wrapper does today, and `--workdir DIR` mounts `DIR` as
   it does today. Neither makes a clone, fetches anything or removes anything, and every argument after the options
   is the command
3. The unit is a local branch. An argument that is the name of a local branch is that branch. Otherwise an argument
   of digits only is the branch whose name holds it as a whole number, when exactly one does. When several do, the
   wrapper lists them and asks for one by name. When none does, it says so, and says that the branch is made on the
   host when the unit is planned. In both cases it starts nothing and exits non-zero
4. While a run for a branch has its container running, a second run for that branch is refused. The refusal names
   the running container, and the second run changes neither the clone nor the repository
5. A run does not start on a new clone while `sandbox/<branch>` holds commits that the host's branch does not. The
   wrapper says to merge or delete it first, so that an earlier run's commits are not overwritten

The clone:

6. A unit run mounts at `/work` a clone of the host repository with the branch checked out at the commit the
   host's branch is at. The clone has the host's `master` as `origin/master`. It shares no file with the host
   repository. It holds nothing the host has not committed, and no ignored file
7. The clone is in the developer's state directory, outside the project root and outside any directory the system
   empties at a restart, so that it outlives a crash of the container, of the wrapper and of the host
8. When a clone made for the branch is still there, the run mounts it as it is, without cloning again, and says so
9. The host's `.reviews` directory is mounted read-write at `/work/.reviews`. The wrapper creates it on the host and
   in the clone when missing, so that neither is created by Docker. What the reviewer writes there is on the host
   as it is written

After the container exits, whatever the command's exit code and also when the container was killed:

10. The clone's branch is fetched into the host repository as `sandbox/<branch>`
11. The host's branch is then fast-forwarded to it, whether or not that branch is checked out on the host, and
    `sandbox/<branch>` is removed. When git cannot fast-forward it, the host's branch is left as it is,
    `sandbox/<branch>` stays, and the wrapper says so and names the command that merges it
12. The clone is removed when nothing in it would be lost: its tree is that of the fetched commit, apart from
    ignored files, and the host repository holds every commit the clone's refs name. Otherwise it is kept, and the
    wrapper says where it is, what it still holds, and that the same command resumes it
13. Nothing is fetched or removed while the branch's container is still running
14. The wrapper exits with the command's exit code. When a step of 10 to 12 fails, it says which, keeps the clone
    and exits non-zero

What reaches the host:

15. On the host, the wrapper runs no git command that reads the clone's configuration or runs its hooks. It reads
    the clone only as the source of a fetch, and compares its tree using the host's own repository
16. From a unit run, the host repository gains the commits of the unit's branch, the ref of requirement 10 or 11,
    and files under `.reviews`. Its configuration, its hooks, its other branches and its uncommitted work are
    unchanged

Proof and documentation:

17. The suite, which runs no Docker, holds requirements 1 to 5 and 8 to 14 against a stand-in for `docker`, with
    real git in temporary repositories. It holds 6 as far as git shows it: the branch and commit, `origin/master`,
    no hard link to the host's objects, and the absence of uncommitted and ignored files. It holds 15 with a clone
    whose configuration and hooks leave a marker when run, and the marker absent after a whole run
18. The behavior is checked for real on a host with Docker, and what was seen is in the record with the Docker and
    Compose versions: a commit made inside reaching the host's branch and the clone gone; a run left with
    uncommitted work kept and then resumed; a second run for the same branch refused; two branches run at once; a
    file written to `/work/.reviews` on the host; a killed container still landing its commits; and the freeze
    check run inside a clone
19. The README describes the two ways to run the sandbox and which to use when: that planning is done on the host
    and the sandbox is for implementing and reviewing; that a run sees only what is committed; that a new clone
    needs `npm ci` before the roles and the suite can be used; where the clones are and how a leftover is resumed
    or discarded; how two units run side by side; and what the clone does and does not protect, as "The boundary"
    below states it. "The shared `node_modules`" says that it applies to `--in-place` and `--workdir`

## Decisions

* **The clone is a directory on the host, not inside the container.** The host then lands the work with plain git,
  and the work survives a container that is gone. Rejected: Docker Sandboxes' shape, a clone in a volume with the
  repository mounted read-only, which needs a git server or a helper container to get the commits out, and loses
  the clone with the container when `--rm` removes it
* **The boundary.** A unit run defends the host repository against an agent that was misled, for example by an
  instruction injected through a dependency, and that writes whatever it likes under `/work`, the clone's `.git`
  included. Against that agent, nothing it writes is run on the host by the wrapper, and nothing reaches the host
  repository but commits and review files. It does not defend against:
    * what a commit contains. A script in a commit runs on the host once the developer checks it out and runs it.
      The commit is in a diff the developer can read first, which the hook was not
    * what a review file says, to a human or to an agent that reads it on the host
    * a run with `--in-place` or `--workdir`, which mounts a directory as it is
    * a flaw in git's handling of a fetch from a hostile repository, or in Docker
    * anything the sandbox did not defend against before: the saved logins in the home volume, and data leaving
      through an allowlisted host or through DNS

  The supported usage is one developer, one host, branches made on the host, and a clone that only the wrapper and
  the sandbox touch
* **No hard links.** The clone copies the objects. A hard-linked object is one file in both repositories, which
  the agent owns and can rewrite. The cost is a copy of the object store for each run, 11 MB for this repository
* **The clone is compared from the host's side.** Requirement 12 needs to know whether the clone holds
  uncommitted work, and `git status` in the clone runs the clone's configuration. The host's repository with a
  scratch index answers the same question and reads only files. Rejected: asking from inside the container, which
  needs a second container start or an entrypoint that no longer execs the command
* **Docker is the lock.** The container of a unit run is named after the Compose project and the branch, and
  "running" is what Docker says of that name. It holds when the wrapper is gone and the container is not, as when
  a terminal is closed, which is the case where a lock matters most. A stopped container left under the name by a
  crash is removed at the next start. Rejected: `flock`, which macOS does not ship; and a pid file, which is stale
  after a restart and says nothing of a container that outlived its wrapper
* **One clone for each Compose project and branch.** The Compose project is already what the image and the home
  volume belong to on a host. Two checkouts of one project therefore share a branch's clone and its lock: the
  second is refused while the first runs, and a leftover is resumed from whichever checkout asks. See "Beyond the
  request"
* **The state directory, not `/tmp`, the cache or the project root.** `/tmp` is emptied at a restart, which is
  exactly when a leftover clone holds work. A cache is something cleaners remove. Inside the project root the
  clones would be in the image build context, in the developer's editor and in the mount of an `--in-place` run.
  The state directory is `XDG_STATE_HOME`, or `~/.local/state` without it, which Docker Desktop for macOS shares
  by default as part of the home
* **A positional unit, and no default.** `./agent.sh 0029` is the common command, so it is the short one. With no
  default, `./agent.sh claude` no longer starts a sandbox: it looks for a branch named `claude` and fails with the
  three forms. That is a change for every project that updates, and belongs in the release's "Worth knowing when
  you update"
* **The wrapper never makes a branch.** Planning is done on the host, where the planner has the web and the
  developer's review, and it leaves the branch with the unit's documents committed. A run for a branch that does
  not exist is a mistake to report, not a branch to create. This also keeps the numbering of units on the host,
  where it sees every branch
* **`--workdir` stays, and counts as a choice.** It names the directory outright, so nothing about it is implicit.
  It is still the way to mount something that is not this repository
* **A leftover is resumed as it is.** It is not updated from the host's branch, and nothing is merged into it. If
  the host's branch moved meanwhile, requirement 11 reports that it cannot fast-forward, and the developer merges
* **Fast-forward the host's branch, checked out or not.** The human asked that the checkout follow when it can. A
  branch that is not checked out is moved by the same rule, so that the result of a run does not depend on which
  branch the host happens to be on. A fast-forward discards nothing, and what cannot be fast-forwarded waits under
  `sandbox/<branch>` for the developer. Rejected: always stopping at `sandbox/<branch>`, a step after every run;
  and a forced update, which would drop commits made on the host
* **Only the unit's branch is fetched.** A commit the agent made on another branch stays in the clone, and
  requirement 12 keeps the clone because of it. Nothing is lost and nothing unasked for arrives
* **`.reviews` whole, at its own path.** The process has the reviewer write to `.reviews/<unit-directory>/` in the
  project, so mounting the host's directory at that path leaves the roles unchanged and the same in both modes.
  Rejected: `/reviews`, which would give the reviewer two paths to choose between; and mounting only the unit's
  subdirectory, which needs the unit directory's name and narrows a channel that carries text nothing runs
* **The wrapper sees the container out.** While the container runs it ignores the interrupt, terminate and hangup
  signals, so that a run interrupted from the terminal still reaches requirements 10 to 12, and requirement 13
  covers the container that is still running
* **Landing a leftover is a run.** After a crash nothing has been fetched. `./agent.sh <unit> true` resumes the
  clone, runs nothing of note and lands it. See "Beyond the request" for the command that would do only that

## Non-goals

* Any change to what confines the container: the firewall, the proxy, the allowlist, the capabilities, the image.
  An open-egress mode was discussed with this unit and is not in it
* Keeping the saved logins away from the agent, as Docker Sandboxes does with a proxy on the host
* Protecting a run with `--in-place` or `--workdir`
* Bringing the host's uncommitted work into the clone, or a `node_modules`. A run sees commits
* Updating a resumed clone from the host, or merging on the developer's behalf beyond a fast-forward
* Pushing to a remote from inside the sandbox. The clone's `origin` is the host's path, which the container cannot
  reach
* Submodules and Git LFS, which the clone gets however plain `git clone` leaves them
* A project root that is a git worktree, which no shim handles today
* Docker Desktop for macOS in requirement 18, which asks for the host the implementer has. Not being tried there is
  to be said in the record
* The release itself, its version and its notes, which are the human's

## Beyond the request

* **Running `npm ci` in a new clone automatically.** A new clone has no `node_modules`, and the role wrappers
  point at the kit's role files under it, so every new clone needs an install before an agent can read its role.
  Doing it in the wrapper costs a container start before the real one, or a marker and a branch in the entrypoint,
  and a decision on what a failing install does. Without it, the first command in a new clone is `npm ci`, the
  README says so, and a forgotten one shows as a role file that is not found
* **A command that lists and discards leftover clones**, such as `./agent.sh --clones`. It costs option parsing,
  output and tests. Without it, the README names the directory, `ls` lists it and `rm -rf` discards a clone
* **A command that only lands a leftover**, without starting a container. It costs another mode and its tests.
  Without it, `./agent.sh <unit> true` does the same with one container start
* **Refusing a leftover made from another checkout.** It costs recording the source path beside the clone and a
  comparison. Without it, two checkouts of one project on one host share a branch's clone, which nobody has had
* **A lock that also covers the moment before the container starts.** Two starts for one branch within the same
  second both see no container. Docker refuses the second container by its name and requirement 13 then keeps the
  second wrapper from touching the clone, so the cost of leaving it out is a confusing message
* **A sentence in `process.md`** that the planner works on the host and the sandbox is for the implementer and the
  reviewer. It costs a line in what every agent reads. Without it the README says so, and it is the developer, not
  the agent, who chooses where a session starts
