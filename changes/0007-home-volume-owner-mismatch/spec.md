# 0007 Agent's home volume owned by another uid

## Context

The agent's home, `/home/agent`, is a named Docker volume, the one writable place that survives a container. It holds
both harnesses' credentials and state and the npm cache. Docker fills a named volume from the image, ownership
included, only the first time an empty volume is mounted, and never changes it afterwards. The agent's uid is the
host user's, set when the image is built. When the volume was first filled by an image whose agent had another uid,
the agent cannot write its own home, and nothing says so.

It was found while fixing Norareit's `0040-sandbox-firewall-dns`, the first time the sandbox started on a Mac with
Docker Desktop.

## Observed behavior

The sandbox starts, but the agent cannot write to its home. `npm ci` fails:

```
npm error syscall mkdir
npm error path /home/agent/.npm
npm error errno -13
```

npm goes on to say that the cache folder "contains root-owned files". That is wrong: the cache does not exist. The
harnesses cannot save state there either.

## Expected behavior

Either the agent owns its home, or the sandbox refuses to start and says why and how to recover.

## Steps to reproduce

On the machine where it was found, Norareit's `norareit-agent_agent-home` volume shows it as it stands:

1. `./agent.sh -- touch /home/agent/probe`
2. Observe `Permission denied`

Reproducing it from an empty volume needs an image built for another uid to fill the volume first, which, since
0037, only a build outside `agent.sh` could produce. That sequence was not run.

## Root cause

Observed on macOS with Docker Desktop, Docker Engine 24.0.7, with Norareit on kit 1.0.2:

* The agent runs as uid 501, the host user's, and `/home/agent` and everything in it are `1000:1000`
* The volume was created on 2026-09-22 at 12:14 UTC by the Compose project `norareit-agent`, before 0037
* The container's root holds only `NET_ADMIN`, `SETUID` and `SETGID`, so the entrypoint cannot change the owner
  either

Every image `agent.sh` builds gets the caller's uid: it has passed `id -u` since Norareit's 0033. The build arguments
fall back to 1000 when that is missing, in `container/compose.yml` and in the Dockerfile. So the volume was filled by
an image built without the wrapper. How that happened on 2026-09-22 is not known. Since 0037 the image cannot be built
that way, because `compose.yml` requires `AGENT_KIT_CONTAINER`, which only `agent.sh` supplies. What remains is a
volume filled before that, like this one, or a host user whose uid changed.

## Fix description

Before dropping to the agent, the entrypoint compares the owner of `/home/agent` with the agent's uid. When they
differ, it stops, naming both uids, saying that the agent could not write its home, and saying how to recover:
remove the project's `agent-home` volume, which discards the harnesses' saved logins, and start again.

## Requirements

1. With a home volume owned by a uid other than the agent's, the sandbox does not start, and its message names both
   uids and the recovery
2. With a home volume the agent owns, including a new one, the sandbox starts as before
3. The kit's README says, where it describes the home volume, what the message means and how to recover

## Decisions

* **Fail loudly rather than repair.** Repairing needs `CAP_CHOWN` for the entrypoint, one more capability on a
  container that keeps them to the three the firewall and the privilege drop need, and a recursive `chown` over
  credentials and caches. The case it would repair is now rare: 0037 already stops the build that produced it, and
  what is left is an old volume or a changed host uid. Removing the volume, once, is the whole recovery, at the cost
  of logging in again
* **The check compares only the top of the home.** A volume filled by one image is owned throughout by one uid. A
  mixed volume would take a hand-made change, which the check does not try to find
* **No change to the build's fallback uid.** The fallback of 1000 in `compose.yml` and the Dockerfile is unreachable
  through the wrapper, and since 0037 a build without the wrapper stops before it matters
* **The regression check is manual.** No automated suite covers the container. The failure above is the failing case
  and the requirements, checked on the same machine, the passing one. Requirement 1 is checked against this volume
  before it is removed, and requirement 2 after

## Non-goals

* Keeping the saved logins in a mismatched volume
* Naming volumes by uid, so that one project could keep a home per host user
* Git refusing the mounted repository, which is `0006-workdir-dubious-ownership`
