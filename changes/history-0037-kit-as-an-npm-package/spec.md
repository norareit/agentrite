# 0037 The agent kit as an npm package

Distribute the kit as an npm package, so that versioning, pinning and bootstrapping are the package manager's job
rather than four bespoke pieces this project maintains.

## Context

Unit 0036 replaced `git subtree` with a copy-in installer, because subtree reconstructed the upstream repository from
the consumer's copy and a contribution could silently delete history in another repository. The installer fixed that
and works. What it did not fix is that all of it is custom: `install.sh` resolves and extracts a pinned commit,
`agent-kit.md` records the pin, `.installed-commit` marks the installed tree, and `scripts/check-agent-kit.mjs`
fails the build when the two disagree.

Every one of those is a thing npm already does. The kit is a dependency: a versioned artifact a project consumes and
does not edit. `package.json` and `package-lock.json` pin it exactly, `npm ci` installs it, `files` declares what a
consumer receives, and a missing or mismatched install is npm's error rather than ours. Both projects that will use
the kit are Node projects, so nothing is excluded by the choice.

One constraint decides how the package is distributed. The agent sandbox runs `npm ci` inside the container, and its
egress allowlist holds `registry.npmjs.org` but not `bitbucket.org`, by unit 0033's design: no git credential
reaches the container and the allowlist is deliberately narrow. A `git+ssh` dependency on the private kit repository
therefore cannot be installed inside the sandbox at all. That rules the obvious "private for now" option out.

The kit is instead served as a tarball from `agent-kit.ritenoar.com`, which npm installs from directly. That needs
one allowlist entry, and under the address boundary 0033 built it would mean admitting CloudFront's shared ranges.
Unit `0039-sni-filtering-proxy` replaced that boundary with a hostname one, reducing the entry to a single name.
**That unit is implemented and on `master`, so this one is no longer blocked.** `agent/compose.project.yml` now
takes hostnames only and refuses an address or a CIDR range.

## Requirements

1. The kit is an npm package under a scope, so that changing its distribution later needs no rename in any consumer
2. `package.json`'s `files` declares what a consumer receives: `process.md`, `roles/`, `templates/` and
   `scripts/check-changes.mjs`, plus `container/`. The kit's `changes/` and `tests/` are not installed. npm always
   ships `package.json` and the README regardless of `files`, and that is accepted rather than worked around
3. This project declares the kit as a dependency, `npm ci` installs it, and `package-lock.json` pins the exact
   version and integrity hash
4. Moving a project to a newer kit is a change to `package.json` and `package-lock.json`, visible and reviewable in
   that project's own diff
5. `npm ci` resolves the kit inside the agent sandbox with no credential of any kind entering the container, and
   the only allowlist entry it needs is the one hostname the package is served from
6. `install.sh`, `agent-kit.md`, `.installed-commit` and `scripts/check-agent-kit.mjs` are gone, and `npm ci` is the
   only bootstrap a project needs
7. No project script runs a kit-specific installation check. A missing kit is a missing dependency, reported by npm
8. Both harnesses resolve the three role files from the package, and `npm run check:changes` runs the kit's script
   from it
9. The sandbox builds and starts with the kit under `node_modules`: the build context reaches it, and the wrapper
   locates the project root without assuming how deep it is installed
10. Both suites pass on the host and inside the sandbox, and the site build is unchanged
11. No document in either repository tells a reader to run `install.sh`, or to read a pinned commit from
    `agent-kit.md`

## Decisions

* **npm, rather than keeping the installer.** The installer is correct, and it is four files of logic that exist
  only because the kit was not a package. npm gives pinning, integrity, bootstrap and distribution as things every
  contributor already understands. The honest cost is that this is the third mechanism in as many units; the honest
  benefit is that it is the first one that is not ours to maintain.
* **Served as a tarball from `agent-kit.ritenoar.com`, which is why this unit depends on 0039.** npm installs a
  dependency from an HTTPS tarball URL as readily as from a registry, and records the resolved URL and an integrity
  hash in the lockfile, so `npm ci` verifies it exactly as it would a published package. A public-read object
  behind CloudFront needs no credential in the container, is in no registry index, and is destroyed by deleting the
  object, which is what a registry cannot offer.
  What it does need is one allowlist entry, and under the address boundary 0033 built that entry would be
  CloudFront's shared ranges, admitting a large part of the CDN-fronted internet. Unit 0039 replaces that boundary
  with a hostname one, after which the entry is the single name `agent-kit.ritenoar.com`. That unit is implemented,
  so the entry costs one name.
* **Publishing to npmjs.com was the alternative, and is the fallback.** It is the only option that costs nothing at
  the boundary, because `registry.npmjs.org` is already allowlisted, and the package holds nothing secret: it is
  prose and two scripts, and the sensitive file, the egress allowlist, is project-owned and never ships. It was
  not taken because publishing is effectively irreversible, npm permitting an unpublish only within 72 hours and
  only when nothing depends on the package, and because self-hosting keeps the option of publishing later while
  the reverse is not true. If 0039 is abandoned, this unit should publish rather than widen the allowlist.
* **The other private options were rejected outright.** A committed `npm pack` tarball works offline but puts a
  binary blob in the repository and makes every kit update an opaque diff; a self-hosted private registry is
  another host to run and keep up; AWS CodeArtifact authenticates with a token obtained using AWS credentials, so
  the container would need the one credential 0033 most deliberately keeps out, which is why `./deploy.sh` cannot
  run inside it, and that token expires within hours of a long unattended run; and a read-only, repository-scoped
  Bitbucket access key answers the "could it push?" objection, since such keys are per-repository and read-only,
  but still needs `bitbucket.org` allowlisted and guards only the content publishing would release anyway.
* **The tarball's infrastructure belongs to the kit, as a CDK app in the kit's own repository.** The kit owns how it
  is distributed, so the thing that changes when its distribution changes is the kit and nothing else. An earlier
  version of this decision put the stack in `~/projects/ritenoar-site` on the grounds that the domain lives there.
  That was wrong, and for two reasons that do not hold up. Shipping the infrastructure to consumers is not a real
  risk, because `files` governs what npm sends and an `infra/` directory simply is not in it. And "the kit would
  contain the thing that distributes it" describes every repository that holds its own release tooling, which is
  ordinary rather than circular. What the earlier version did cost is real: a change to the kit's hosting would
  have touched a website's repository, coupling two things that have no reason to change together, and every
  project that vendors the kit depends on that hosting while none of them care about ritenoar.com the website.
* **The stack looks the hosted zone up rather than owning it, and uses `ritenoar.com` only as a name.** The zone is
  a `fromLookup` in `ritenoar-site` and in `~/projects/thoryn` alike, so it is not owned by any one stack and the
  kit's can reach it the same way. The certificate must be its own in us-east-1 for CloudFront, which it would have
  needed wherever the stack lived, since the existing certificate covers `ritenoar.com` and `www.ritenoar.com` with
  no wildcard. So nothing is shared with the website either way, and the only question this decision settles is
  which repository holds the code.
* **The kit gains devDependencies for its own deployment, and stops being dependency-free in that narrow sense.**
  Today it has none at all, which was 0035's decision, and a CDK app means `aws-cdk-lib` and `constructs` at the
  least. This is stated rather than absorbed as a side effect: the payload stays dependency-free, because `files`
  excludes the infrastructure and a consumer installs none of it, and `scripts/check-changes.mjs` still runs on a
  bare Node. What changes is that working *on* the kit now needs an install, where before it did not.
* **Versioning is plain semver and bumping is manual, documented in the kit's README.** `npm version
  patch|minor|major` does it, semver as npm already means it governs what to pick, and this project adds no rule of
  its own: a bespoke scheme for a package of instructions would be more to remember than to obey. The bump is not
  optional, because `npm pack` names the tarball from the version and the release script refuses to upload over an
  existing object, so a release without a bump fails rather than overwriting what a lockfile pins. Each version is
  its own immutable object and none is ever removed, which is what lets two projects sit on different versions
  indefinitely.
* **Losing staleness detection is accepted rather than replaced.** Unit 0036's installer reported on every run how
  far the kit had moved past what a project had installed. A URL dependency cannot do that: the URL is the pin, so
  nothing knows a newer version exists and `npm outdated` has nothing to consult. A project can therefore sit on an
  old kit indefinitely with no signal, which is a real regression against 0036 and works against the reason the kit
  exists at all. It is accepted for now because closing it means publishing a `latest` pointer and a check to read
  it, which is new machinery in the unit that was meant to remove machinery. If projects do drift, that is the unit
  to write.
* **The version is the pin, and the lockfile is the record.** `package-lock.json` already does what `agent-kit.md`
  was invented to do, with an integrity hash the pin never had, and a fresh clone reproduces it by `npm ci` alone.
* **`agent.sh` passes the project root explicitly.** The kit's wrapper currently finds the project by counting two
  directories up from itself, which was true at `agent-kit/container/`. Under `node_modules` the depth changes with
  the scope, with hoisting and with the package manager, so the shim at the project root passes its own location
  instead of the wrapper inferring it.
* **The harness wrappers are repointed, not taken over by the kit.** Making the kit own and rewrite
  `.claude/agents/*.md` and `.opencode/agent/*.md` is worth doing and is not this unit. It still has an undecided
  question, namely where a per-role model lives once the kit rewrites the file that would hold it, and a plan may
  not defer a decision. This unit only changes the path the existing wrappers point at.
* **Recorded in this project, spanning both repositories.** The kit's own change process, kit unit 0001, is still
  `draft`, so this follows the shape of 0035 and 0036. This unit also substantially changes this project, so it is
  not the pure-kit case that belongs in the kit's own `changes/`.

## Non-goals

* Kit-managed harness wrappers, a `bin` command, and the `--harnesses` flag
* Moving the OpenCode roles out of `opencode.json` into `.opencode/agent/`, and the `mode` change from `subagent`
  to `all` that would let a role be selected directly
* Implementing kit unit 0001, the kit's own `changes/` process
* Migrating finrite onto the package, or any change to another project
* Any change to the content of the roles, `process.md` or the templates, or to what the container does
* Rewriting history to remove the files 0035 and 0036 committed
* Automatic or scheduled updating of a project to a newer kit
