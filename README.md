# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `@ritenoar/agentrite` and keep only what is
specific to them.

## The name

A rite is a prescribed way of doing something, and that is what this kit is at its core. `process.md` lays down how
a change is specified, planned, recorded and frozen, and the roles and the sandbox exist so that agents follow it.

The name reads three ways, and all three are meant:

* a **rite** for agents: the process they work by
* agents done **right**
* agents that **write**

The "rite" is also Ritenoar's, whose projects carry it.

## What is here

| Path                 | What it holds                                                                             |
|----------------------|-------------------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards         |
| `roles/`             | The planner, implementer and reviewer instructions                                        |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit                       |
| `templates/project/` | The files `agentrite init` fills in and writes into a project                             |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agentrite` and `agentrite-roles` commands |
| `tests/`             | The kit's own unit tests, run by node's built-in test runner                              |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, base Compose file and wrapper         |
| `infra/`             | The CDK app that serves release tarballs from `agentrite.ritenoar.com`                    |
| `deploy.sh`          | The release script, which deploys `infra/` and uploads the packed kit                     |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## Installing it into a project

The kit is the npm package `@ritenoar/agentrite`. It is served as a tarball from `agentrite.ritenoar.com` rather than
from a registry, so a project adds it by the URL of a release, which `deploy.sh` prints when it makes one:

```sh
npm install https://agentrite.ritenoar.com/ritenoar-agentrite-2.0.0.tgz
```

npm writes the URL into the project's `package.json`, and the resolved URL with an integrity hash into
`package-lock.json`. A project receives what `files` in this repository's `package.json` lists, which is
`process.md`, `roles/`, `templates/`, `scripts/check-changes.mjs`, `scripts/agentrite-roles.mjs`,
`scripts/agentrite.mjs` and `container/`, plus the `package.json` and this README that npm always ships. It does not
receive this repository's `changes/`, `tests/`, `infra/` or `deploy.sh`.

The kit assumes npm: `init` reads `package-lock.json`, and the sandbox's image installs from it.

Then set the project up from its root, naming only the harnesses it uses:

```sh
npx agentrite init claude opencode
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

The role wrappers are the ones `npx agentrite-roles claude opencode` writes, which is still there for a project that
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
  `package.json`, the `PLAYWRIGHT_VERSION` build argument when the project has Playwright, the memory and CPU limits,
  and the project's `ALLOWLIST`.
  The allowlist lists only what the project needs beyond what the kit admits itself, which is the Anthropic API,
  `platform.claude.com`, `models.opencode.ai`, the npm registry and `agentrite.ritenoar.com`; the kit's hosts need no
  listing. Add the API host of any other model provider the project's agents use, and whatever its tools and tests
  reach
* The role wrappers, to pin a model per role

`CLAUDE.md` is best left as written.

The role wrappers and `agent.sh` are the exception to a generated file being the project's own. They hold nothing
but what the kit put there, so `refresh`, described under "Updating a project to a newer kit", rewrites them as the
installed release writes them. The model pinned in a wrapper survives that. Anything else added to a wrapper, or to
`agent.sh`, does not, so `agent.sh` is not a file to edit.

When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste in
whichever it lacks. When `CLAUDE.md` already exists, it is left untouched too, and must import `AGENTS.md` with a line
holding `@AGENTS.md`.

`init` also amends two files, adding only what is missing:

* `package.json` gains a `check-changes` script, unless it has one, keeping every other key, their order and the
  indentation:

  ```json
  "scripts": {
    "check-changes": "node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs"
  }
  ```

  `npm run check-changes` then compares the committed work on the current branch with `master`, and exits non-zero
  with a list of the offending units when a frozen `spec.md` or `plan.md` changed or an implemented plan has unticked
  tasks. It takes the repository root as an optional argument and defaults to the working directory. The npm script
  is one way to wire the check; a project may run the kit's script with `node` from a command of its own instead
* `.dockerignore` is written when there is none. When it keeps any file of the kit's `container/` directory out of
  the build context, whatever its patterns, the exception is appended, so that the image build can reach the kit.
  `init` decides this by the rules BuildKit applies. Otherwise the file is left alone

A project that depends on Playwright gets a sandbox with its browser: `init` takes the version from
`package-lock.json` and writes it into `agent/compose.project.yml` as the `PLAYWRIGHT_VERSION` build argument. When the
lockfile resolves no `playwright`, `init` writes the compose file without the argument, and the sandbox is built
without a browser. `init` exits 0 either way. An existing `agent/compose.project.yml` is left as it is. `init` refuses
to run, writing nothing, when `package.json` has no `name`.

`init` fills in the templates in the kit's `templates/project/`, which ship in the package, at
`node_modules/@ritenoar/agentrite/templates/project/`. A project set up or repaired by hand starts from the same
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
npm install https://agentrite.ritenoar.com/ritenoar-agentrite-2.1.0.tgz
```

That changes only `package.json` and `package-lock.json`, which the project commits like any other change. Nothing
reports that a newer release exists: the URL is the pin, and `npm outdated` has no registry to ask. Moving to a newer
kit is a deliberate change to the project.

Then bring the kit's own files in the project up to date, from the project root, naming the harnesses it uses:

```sh
npx agentrite refresh claude opencode
```

It rewrites the role wrappers of those harnesses and `agent.sh` as the new release writes them, writes any that are
missing, and prints each file as written, refreshed or up to date. A release that changes a role's description, the
line that points at its role file, or the shim reaches a project this way; without it those copies stay as an older
release wrote them, and nothing says so.

* A model pinned in a wrapper survives: a line in its frontmatter that opens with `model:` is kept, as written,
  after the kit's own keys
* Everything else in a wrapper, and all of `agent.sh`, is replaced, other keys a project added to the frontmatter
  among them. The wrappers are tracked files, so `git diff` shows what a refresh changed, and git has what it
  replaced
* `AGENTS.md`, `CLAUDE.md`, `agent/compose.project.yml`, `package.json` and `.dockerignore` are never touched, and
  never created
* A path that holds something other than a regular file, such as a symbolic link, is left as it is and named on
  standard error. The other files are still refreshed, and the command exits non-zero

An improvement found while working in a project is made here, in the kit repository, and committed here. The
installed copy under a project's `node_modules` is not a working copy of this repository, and nothing in it reaches
here. The improvement reaches that project, and every other, as a new release that each one updates to as above.

## Where to run it

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike: the
sandbox admits the npm registry and `agentrite.ritenoar.com` itself, through the kit's `KIT_ALLOWLIST`. A project's
`agent.sh` runs the wrapper from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox
can start.

## Running the sandbox

`container/agent.sh` layers a project's compose file over the kit's base and runs the container. A project gives it
two files:

* `agent.sh` at the project root, a shim that execs `node_modules/@ritenoar/agentrite/container/agent.sh` with the
  project root as its first argument, so that the documented command stays one command from the repository root.
  The wrapper takes the root from its caller because how deep the kit sits under `node_modules` is npm's to decide
* `agent/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument

Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`. The harness
versions are pinned in `container/Dockerfile`, so a project updates Claude Code and OpenCode by updating the kit, as
below, and rebuilding.

The container's root filesystem is read-only. The agent writes the working directory, its home volume and `/tmp`.
`/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
that runs what it writes to the temporary directory works as on the host.

The browser is in the image when the project's compose file gives `PLAYWRIGHT_VERSION` under
`services.agent.build.args`, and not otherwise: the build argument alone decides. A project that starts using
Playwright adds the argument by hand, as the version its `package-lock.json` resolves, and one that stops removes it,
and both rebuild with `./agent.sh --rebuild`. `init` and `refresh` never rewrite `agent/compose.project.yml`, which is
the project's own.

The build context is the project root, not the kit directory, because the Dockerfile copies the kit's files from under
it and, for a project with Playwright, installs the project's own dependencies to get Playwright's system libraries at
the version the project resolved. The wrapper passes
`--project-directory` so that relative paths in both compose files resolve from the project root, and passes the
kit's `container/` directory, relative to that root, as `AGENTRITE_CONTAINER`, which the compose file and the
Dockerfile use to find the kit's files. A project whose `.dockerignore` excludes `node_modules` must let that one
directory's files back in:

```
node_modules
!node_modules/@ritenoar/agentrite/container/**
```

The exception names the files rather than the directory. BuildKit lets an exception for a directory reach the files
in it only when the directory itself was excluded, so `!node_modules/@ritenoar/agentrite/container` alone does not
bring back a kit file that a pattern excluded by name.

### The shared `node_modules`

The sandbox mounts the project at `/work` as it is on the host, `node_modules` included. The host and the sandbox
therefore share one `node_modules`: an install on either side writes into the same directory, and the container has
none of its own.

npm installs a package that is limited to some platforms only on those platforms, and `npm ci` removes `node_modules`
before it installs. So an install on either side installs for that side's platform and removes what only the other
side's platform used, and nothing reports it. On a Linux host both sides are the same platform and nothing is lost.
A macOS host is the case where it matters:

* After an install in the sandbox, the host's macOS-only packages are gone. `fsevents`, which Playwright uses to watch
  files, is one. Playwright still runs without it, so the loss goes unnoticed
* After an install on the host, the sandbox's Linux-only packages are gone in the same way
* A package that ships a native binary per platform, as a bundler may, then fails on the side that did not install
  last, because the binary it finds is the other platform's

`npm ci` on the side about to be used restores that side. On the host:

```sh
npm ci
```

And for the sandbox:

```sh
./agent.sh -- npm ci
```

Use `npm ci` rather than `npm install`. `npm install` swaps the platform-limited packages but leaves every package
that is already installed as the other side left it, including a binary that one of them set up for the other
platform.

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
itself needs: `api.anthropic.com`, which is the probe host and the API Claude Code uses, `platform.claude.com`, which
Claude Code contacts at start-up when it holds no saved login, `models.opencode.ai`, from which OpenCode fetches its
model catalog, the npm registry and `agentrite.ritenoar.com`. `ALLOWLIST`, in the project's
`agent/compose.project.yml`, holds what the project needs besides, and may be empty or left out. Both are checked the
same way, and a host in both is admitted once. A kit release that needs another host adds it to `KIT_ALLOWLIST`, with
no change to any project.

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
`node_modules/@ritenoar/agentrite/` exists here too. `AGENTS.md` sends agents to the process and roles there, which
means work on the kit follows the released instructions rather than the working copy it may be changing. Changes are
made at the repository root, never under `node_modules`, and the installed copy moves to a newer release only by a
deliberate update, as described above.

The repository also runs the kit's sandbox, from the installed release, with `./agent.sh`, as any project does. Work
on the sandbox itself is therefore done inside the sandbox the last release built, not the working copy's: a change
to `container/` does not alter the sandbox the agent making it runs in. Trying such a change is done from the host, as
described below. `./deploy.sh` stays on the host: releasing needs AWS credentials and hosts the sandbox does not
reach.

### Trying the working copy's sandbox

`./agent-dev.sh` runs the sandbox from the working copy: `container/agent.sh`, `container/compose.yml`, the
Dockerfile, the entrypoint and the proxy as they are in the working tree, with the repository's
`agent/compose.project.yml`. It takes what `./agent.sh` takes, for example `./agent-dev.sh npm test`.

* It is this repository's own file. It is not in the package, and `init` and `refresh` do not write it
* It builds the image on every start, so a change is in the sandbox that starts
* It has its own Compose project and image, `ritenoar-agentrite-agent-dev`, and its own home volume,
  `ritenoar-agentrite-agent-dev_agent-home`, through `AGENT_PROJECT_NAME` in `agent/compose.project.yml`. The image
  and the saved logins of `./agent.sh` are not touched, and both sandboxes can run at once
* It runs on the host. A sandbox has no Docker, so an agent working inside one cannot run it
* The home starts empty and lasts. To empty it again: `docker volume rm ritenoar-agentrite-agent-dev_agent-home`
* To remove everything it created: that volume, `docker network rm ritenoar-agentrite-agent-dev_default` and
  `docker image rm ritenoar-agentrite-agent-dev`

## Releasing

A release is a tarball of the kit served from `https://agentrite.ritenoar.com/`, which a project installs from its
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
