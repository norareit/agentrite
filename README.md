# agent-kit

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `@ritenoar/agent-kit` and keep only what is
specific to them.

## What is here

| Path                 | What it holds                                                                             |
|----------------------|-------------------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards         |
| `roles/`             | The planner, implementer and reviewer instructions                                        |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit                       |
| `templates/project/` | The files `agent-kit init` fills in and writes into a project                             |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agent-kit` and `agent-kit-roles` commands |
| `tests/`             | The kit's own unit tests, run by node's built-in test runner                              |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, base Compose file and wrapper         |
| `infra/`             | The CDK app that serves release tarballs from `agent-kit.ritenoar.com`                    |
| `deploy.sh`          | The release script, which deploys `infra/` and uploads the packed kit                     |

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
`process.md`, `roles/`, `templates/`, `scripts/check-changes.mjs`, `scripts/agent-kit-roles.mjs`,
`scripts/agent-kit.mjs` and `container/`, plus the `package.json` and this README that npm always ships. It does not
receive this repository's `changes/`, `tests/`, `infra/` or `deploy.sh`.

The kit assumes npm: `init` reads `package-lock.json`, and the sandbox's image installs from it.

Then set the project up from its root, naming only the harnesses it uses:

```sh
npx agent-kit init claude opencode
```

It prints each file it wrote, changed or skipped. It writes:

| File                        | What it is for                                                                       |
|-----------------------------|--------------------------------------------------------------------------------------|
| `.claude/agents/*.md`       | For `claude`: a wrapper per role for Claude Code, pointing at the kit's role file    |
| `.opencode/agents/*.md`     | For `opencode`: the same for OpenCode                                                |
| `AGENTS.md`                 | The project's agent instructions, pointing at the kit's `process.md` and role files  |
| `CLAUDE.md`                 | The bridge that imports `AGENTS.md` into Claude Code, written whatever the harnesses |
| `agent.sh`                  | The shim that runs the kit's sandbox from the project root, as described below       |
| `agent/compose.project.yml` | The project's half of the sandbox configuration                                      |

The role wrappers are the ones `npx agent-kit-roles claude opencode` writes, which is still there for a project that
wants only those. Unlike `init`, it refuses to overwrite a file that already exists. A model per role goes in the
project's own wrapper.

Every generated file is the project's own once written, and the project may edit any of them. `init` never
regenerates one: a file it would create that already exists is left as it is and reported as skipped, so running it
again only adds what is missing. What a kit release needs from every project is kept in the kit instead, where
updating the kit delivers it. The files a project is expected to edit are these:

* `AGENTS.md` has a marked section for what is specific to the project, such as its house style, its code rules and
  how its tests run, and keeps only that: what holds for every project is in the kit. The three sections above it,
  Development Guidelines, Roles and Changes in this project, are what make the kit's instructions reach an agent, and
  are best kept
* `agent/compose.project.yml` holds the Compose project and image names, both derived from the `name` in
  `package.json`, the `PLAYWRIGHT_VERSION` build argument, the memory and CPU limits, and the project's `ALLOWLIST`.
  The allowlist lists only what the project needs beyond what the kit admits itself, which is the Anthropic API, the
  npm registry and `agent-kit.ritenoar.com`; the kit's hosts need no listing. Add the API host of any other model
  provider the project's agents use, and whatever its tools and tests reach
* The role wrappers, to pin a model per role

`CLAUDE.md` and `agent.sh` are best left as written.

When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste in
whichever it lacks. When `CLAUDE.md` already exists, it is left untouched too, and must import `AGENTS.md` with a line
holding `@AGENTS.md`.

`init` also amends two files, adding only what is missing:

* `package.json` gains a `check-changes` script, unless it has one, keeping every other key, their order and the
  indentation:

  ```json
  "scripts": {
    "check-changes": "node node_modules/@ritenoar/agent-kit/scripts/check-changes.mjs"
  }
  ```

  `npm run check-changes` then compares the committed work on the current branch with `master`, and exits non-zero
  with a list of the offending units when a frozen `spec.md` or `plan.md` changed or an implemented plan has unticked
  tasks. It takes the repository root as an optional argument and defaults to the working directory. The npm script
  is one way to wire the check; a project may run the kit's script with `node` from a command of its own instead
* `.dockerignore` is written when there is none, and when it excludes `node_modules` without letting the kit's
  `container/` directory back in, that exception is appended, so that the image build can reach the kit. Otherwise it
  is left alone

The sandbox requires the project to depend on Playwright, because the image takes Playwright's browsers at the
version the project resolved. `init` takes that version from `package-lock.json`. When the lockfile resolves no
`playwright`, it writes everything else, but not `agent/compose.project.yml`, says why on standard error, and exits
non-zero. It also refuses to run, writing nothing, when `package.json` has no `name`.

`init` fills in the templates in the kit's `templates/project/`, which ship in the package, at
`node_modules/@ritenoar/agent-kit/templates/project/`. A project set up or repaired by hand starts from the same
files, filling in each `{{placeholder}}` itself.

A missing or altered kit is then npm's error, like any other dependency's, and needs no check of the project's own.

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

An improvement found while working in a project is made here, in the kit repository, and committed here. The
installed copy under a project's `node_modules` is not a working copy of this repository, and nothing in it reaches
here. The improvement reaches that project, and every other, as a new release that each one updates to as above.

## Where to run it

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike: the
sandbox admits the npm registry and `agent-kit.ritenoar.com` itself, through the kit's `KIT_ALLOWLIST`. A project's
`agent.sh` runs the wrapper from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox
can start.

## Running the sandbox

`container/agent.sh` layers a project's compose file over the kit's base and runs the container. A project gives it
two files:

* `agent.sh` at the project root, a shim that execs `node_modules/@ritenoar/agent-kit/container/agent.sh` with the
  project root as its first argument, so that the documented command stays one command from the repository root.
  The wrapper takes the root from its caller because how deep the kit sits under `node_modules` is npm's to decide
* `agent/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and the `PLAYWRIGHT_VERSION` build argument. The wrapper reads the merged
  configuration before it builds, and refuses to go on without `PLAYWRIGHT_VERSION`, naming this file

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
agent/compose.project.yml. Find the exact name with docker volume ls, then:
  docker volume rm <project>_agent-home
```

That is: the home volume was created by an image for a different user, and the agent cannot write it. `<project>`
is not the repository's name but the Compose project's, the `name:` key in the project's own
`agent/compose.project.yml`, and the volume Docker names after it. A mismatched home is a one-off state: once the
volume is removed, the next start creates a new one owned by the agent.

### Egress

The sandbox's egress is bounded by hostname. What leaves the container is DNS to its resolvers, the local model
server's host and port, and HTTPS on port 443 to the allowlisted hosts. Everything else is denied, whatever its port
or address.

The allowlist is two lists together. `KIT_ALLOWLIST`, in the kit's `container/compose.yml`, holds the hosts the kit
itself needs: `api.anthropic.com`, which is the probe host and the API Claude Code uses, the npm registry and
`agent-kit.ritenoar.com`. `ALLOWLIST`, in the project's `agent/compose.project.yml`, holds what the project needs
besides, and may be empty or left out. Both are checked the same way, and a host in both is admitted once. A kit
release that needs another host adds it to `KIT_ALLOWLIST`, with no change to any project.

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

## The kit's own tests

```sh
npm test
```

It runs node's built-in test runner over `tests/`, and the tests need no install. Releasing does: `infra/` needs
`aws-cdk-lib` and the CDK CLI, which are the kit's devDependencies, so run `npm ci` first. `deploy.sh` does that
itself.

The kit's own `changes/` go through the change check like any project's, wired the same way:

```sh
npm run check-changes
```

It runs the check from the released kit in `node_modules`, not from this repository's `scripts/`, so it needs
`npm ci` first.

## The kit's own copy of the kit

The kit is also a devDependency of itself, installed from a release by its URL like in any project, so that
`node_modules/@ritenoar/agent-kit/` exists here too. `AGENTS.md` sends agents to the process and roles there, which
means work on the kit follows the released instructions rather than the working copy it may be changing. Changes are
made at the repository root, never under `node_modules`, and the installed copy moves to a newer release only by a
deliberate update, as described above.

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
the tarball under the name `npm pack` gives it, which carries the version. Then it fetches the tarball's URL with no
credential and fails unless it is served, and prints the line to put in a project's `package.json`.

A released tarball is never replaced or removed. Projects pin it by its integrity hash, and two projects may sit on
different versions indefinitely, so the script refuses to upload over a name that already exists. It uploads with
`aws s3 cp` rather than a CDK `BucketDeployment` for the same reason: a `BucketDeployment` prunes by default and
would delete versions that a project still installs.

Releasing runs on the host only. It needs AWS credentials, and those never enter the sandbox.
