# agent-kit

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `@ritenoar/agent-kit` and keep only what is
specific to them.

## What is here

| Path                 | What it holds                                                                     |
|----------------------|-----------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards |
| `roles/`             | The planner, implementer and reviewer instructions                                |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit               |
| `scripts/`           | `check-changes.mjs`, which enforces the freeze on implemented units               |
| `tests/`             | The kit's own unit tests, run by node's built-in test runner                      |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, base Compose file and wrapper |
| `infra/`             | The CDK app that serves release tarballs from `agent-kit.ritenoar.com`            |
| `deploy.sh`          | The release script, which deploys `infra/` and uploads the packed kit             |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## Installing it into a project

The kit is the npm package `@ritenoar/agent-kit`. It is served as a tarball from `agent-kit.ritenoar.com` rather than
from a registry, so a project adds it by the URL of a release, which `deploy.sh` prints when it makes one:

```sh
npm install https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.0.0.tgz
```

npm writes the URL into the project's `package.json`, and the resolved URL with an integrity hash into
`package-lock.json`. A project receives what `files` in this repository's `package.json` lists, which is
`process.md`, `roles/`, `templates/`, `scripts/check-changes.mjs` and `container/`, plus the `package.json` and this
README that npm always ships. It does not receive this repository's `changes/`, `tests/`, `infra/` or `deploy.sh`.

Then, in the project:

* Point `AGENTS.md` at `node_modules/@ritenoar/agent-kit/process.md` and the three files in its `roles/`, and keep in
  it only what is specific to the project
* Point the harness wrappers at the kit's role files: `.claude/agents/*.md` for Claude Code, and the `agent` block in
  `opencode.json` for OpenCode
* Wire the change check to a command of the project's own, running
  `node_modules/@ritenoar/agent-kit/scripts/check-changes.mjs`
* Add `agent/compose.project.yml` and an `agent.sh` shim, and let the image build reach the kit, as the sandbox
  section below describes

A missing or altered kit is then npm's error, like any other dependency's, and needs no check of the project's own.

## Running the sandbox

`container/agent.sh` layers a project's compose file over the kit's base and runs the container. A project gives it
two files:

* `agent.sh` at the project root, a shim that execs `node_modules/@ritenoar/agent-kit/container/agent.sh` with the
  project root as its first argument, so that the documented command stays one command from the repository root.
  The wrapper takes the root from its caller because how deep the kit sits under `node_modules` is npm's to decide
* `agent/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and the `PLAYWRIGHT_VERSION` build argument

Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`. The harness
versions are pinned in `container/Dockerfile`, so a project updates Claude Code and OpenCode by updating the kit, as
below, and rebuilding.

The build context is the project root, not the kit directory, because the Dockerfile installs the project's own
dependencies to get Playwright's system libraries at the version the project resolved. The wrapper passes
`--project-directory` so that relative paths in both compose files resolve from the project root, and passes the
kit's `container/` directory, relative to that root, as `AGENT_KIT_CONTAINER`, which the compose file and the
Dockerfile use to find the kit's files. A project whose `.dockerignore` excludes `node_modules` must let that one
directory back in:

```
node_modules
!node_modules/@ritenoar/agent-kit/container
```

### The home volume

The agent's home, `/home/agent`, is a named volume in `container/compose.yml`, the one writable place that survives a
container. It holds both harnesses' credentials and state and the npm cache, so authentication happens once.

Docker fills a named volume from the image, ownership included, only the first time an empty volume is mounted, and
never changes it afterwards. The agent is always the host user's uid, set when the image is built. So a volume first
filled by an image whose agent had another uid stays owned by that uid, and the agent then cannot write its own home.
The entrypoint checks the owner of `/home/agent` against the agent's uid before it drops to the agent, and when they
differ it refuses to start, naming both uids and how to recover:

```
[entrypoint] FATAL: /home/agent is owned by uid 1000, but the agent is uid 501, so the agent cannot write its home.
Recover by removing the project's agent-home volume, which discards the harnesses' saved logins, and starting again.
The volume is named <project>_agent-home, where <project> is the Compose project's name, set as 'name:' in
agent/compose.project.yml (for example norareit-agent). List them with docker volume ls:
  docker volume rm <project>_agent-home
```

That is: the home volume was created by an image for a different user, and the agent cannot write it. `<project>`
is not the repository's name but the Compose project's, the `name:` key in the project's own
`agent/compose.project.yml`, and the volume Docker names after it. Find the exact name with `docker volume ls`, then
remove it and start again, which discards the harnesses' saved logins, and log in again. A mismatched home is a
one-off state: once the volume is removed, the next start creates a new one owned by the agent.

## Installing on a fresh clone

A fresh clone of a project has no kit. `npm ci` installs it with the project's other dependencies, at exactly the
release and integrity hash `package-lock.json` records, and fails rather than install anything else.

The lockfile is authoritative. Installing the kit's latest on every run would mean two people cloning the same
project on different days run agents under different instructions, with nothing in the project's history showing it.
The lockfile makes a clone reproducible.

## Updating a project to a newer kit

Install the newer release by its URL:

```sh
npm install https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.1.0.tgz
```

That changes only `package.json` and `package-lock.json`, which the project commits like any other change. Nothing
reports that a newer release exists: the URL is the pin, and `npm outdated` has no registry to ask. Moving to a newer
kit is a deliberate change to the project.

## Sending an improvement back

Make the change here, in the kit repository, and commit it. The installed copy under a project's `node_modules` is not
a working copy of this repository and nothing in it reaches here: an improvement found while working in one project
is made in the kit, released, and picked up by each project by updating to that release.

### Egress

The sandbox's egress is bounded by hostname. What leaves the container is DNS to its resolvers, the local model
server's host and port, and HTTPS on port 443 to the hosts in the project's `ALLOWLIST`. Everything else is denied,
whatever its port or address.

The entrypoint redirects every outbound connection on port 443 to `container/egress-proxy.mjs`, which runs as its own
unprivileged account. The proxy reads the hostname from the TLS ClientHello, where it travels in the clear, and
admits the connection only if that host is allowlisted. It then resolves the host itself and connects there, never to
the address the client asked for, so an allowlisted name sent to some other address does not reach that address. It
terminates no TLS and installs no certificate: it forwards the connection's bytes unchanged, and the client validates
the origin's own certificate. A refused client fails with a TLS `unrecognized_name` alert, and the proxy logs one
line for each connection it allows or refuses to `/run/egress-proxy.log`, which the agent can read.

What follows from that:

* Another host served from the same address as an allowlisted one is refused. So is plain HTTP, and so is TLS on any
  port but 443
* Allowlist entries are hostnames, matched exactly. A subdomain needs its own entry, and an address or CIDR range is
  refused at start-up
* A host whose addresses rotate stays reachable, because the proxy resolves it per connection
* Encrypted ClientHello is judged by its outer hostname, the one sent in the clear. Chromium sends the extension as
  GREASE and puts the real hostname there, so it is checked like any other. A genuine ECH connection carries the
  provider's public name there, and is refused unless that public name is itself allowlisted, in which case the real
  hostname inside is not seen
* If the proxy stops, egress stops. The redirect still points at its port and nothing else admits port 443

It does not stop data leaving through a host that is allowlisted, or through DNS to the permitted resolvers.

At start-up the entrypoint proves the boundary before it drops to the agent, and refuses to start if any check
fails:

* the canary host (`FIREWALL_CANARY`) cannot be reached on port 80
* every allowlisted host, and the probe host (`FIREWALL_PROBE`), can be reached through the proxy
* the canary's hostname, presented at the probe's own address, is refused by the proxy, which shows that the check
  is on the hostname and not the address

## Releasing

A release is a tarball of the kit served from `https://agent-kit.ritenoar.com/`, which a project installs from its
URL. `infra/` is the CDK app that serves it: a private bucket, a CloudFront distribution in front of it, a certificate
in us-east-1 because CloudFront takes no other, and the DNS record in the existing `ritenoar.com` hosted zone, which
it looks up rather than owns. None of it ships to a project.

A release starts with a version bump, then `deploy.sh`, from the repository root and with AWS credentials for the
account:

```sh
npm version patch   # or minor, or major
./deploy.sh
```

Pick the part to bump as semver means it; there is no rule of the kit's own. `npm version` updates `package.json` and
`package-lock.json`, and commits and tags the change. The bump is not optional: the tarball's name comes from the
version, and `deploy.sh` refuses to upload a name that is already released, so a release without a bump fails.

`deploy.sh` signs in with `aws sso login` if needed, deploys the two stacks, packs the kit with `npm pack`, and uploads
the
tarball under the name `npm pack` gives it, which carries the version. Then it fetches the tarball's URL with no
credential and fails unless it is served, and prints the line to put in a project's `package.json`.

A released tarball is never replaced or removed. Projects pin it by its integrity hash, and two projects may sit on
different versions indefinitely, so the script refuses to upload over a name that already exists. It uploads with
`aws s3 cp` rather than a CDK `BucketDeployment` for the same reason: a `BucketDeployment` prunes by default and
would delete versions that a project still installs.

## Where to run it

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike,
provided the project's `ALLOWLIST` holds `agent-kit.ritenoar.com`. A project's `agent.sh` runs the wrapper from
`node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox can start.

Releasing runs on the host only. It needs AWS credentials, and those never enter the sandbox.

## The kit's own tests

```sh
npm test
```

It runs node's built-in test runner over `tests/`, and the tests need no install. Releasing does: `infra/` needs
`aws-cdk-lib` and the CDK CLI, which are the kit's devDependencies, so run `npm ci` first. `deploy.sh` does that
itself.

## The kit's own copy of the kit

The kit is also a devDependency of itself, installed from a release by its URL like in any project, so that
`node_modules/@ritenoar/agent-kit/` exists here too. `AGENTS.md` sends agents to the process and roles there, which
means work on the kit follows the released instructions rather than the working copy it may be changing. Changes are
made at the repository root, never under `node_modules`, and the installed copy moves to a newer release only by a
deliberate update, as described above.
