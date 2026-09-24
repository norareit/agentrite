# 0037 The agent kit as an npm package

## Approach

This unit waited on `0039-sni-filtering-proxy`, which is now implemented and on `master`. The kit is served from
`agent-kit.ritenoar.com`, which needs one allowlist entry; under the address boundary 0033 built, that entry would
have been CloudFront's shared ranges, and 0039 is what reduced it to a single hostname. The first task below
confirms that, and it is now a check rather than a wait.

Make the kit a package and put the tarball where a project can fetch it before this project depends on it, because
a dependency cannot be installed from a URL that does not serve it yet. Prove the package contents with `npm pack`
first: the payload boundary that `files` draws is the one thing here that silently ships too much, and a tarball
that is already fetched by a lockfile should not need replacing under the same name.

Releasing the kit is one script, `deploy.sh` in the kit's own repository, in the shape of the `deploy.sh` this
project and `~/projects/ritenoar-site` already have: sign in if needed, deploy the stacks, then publish. It lives
with the kit for the same reason the infrastructure does, that a kit release is the kit's concern and no other
project's. The tarball is uploaded by the script with `aws s3 cp` rather
than by a CDK `BucketDeployment`, because a `BucketDeployment` prunes by default, which would delete older versions
that a lockfile somewhere still pins, and because a release is not an infrastructure change. For the same reason
the script refuses to upload over a name that already exists, and needs no cache invalidation: a released name is
never replaced, so there is nothing stale to invalidate.

Then switch this project over in one direction only. `npm ci` must work on the host before the installed
`agent-kit/` directory is deleted, because every suite depends on the kit resolving, and the sandbox has to be
rebuilt before the old container paths go, for the same reason 0036 sequenced it that way.

The sandbox is where this unit is most likely to fail, so it is verified early rather than last. Three things move
at once there: the build context has to reach `node_modules`, the Dockerfile's `COPY` path changes, and the wrapper
can no longer infer the project root from its own depth.

The work spans both repositories, and the kit has no `changes/` of its own yet, so kit commits are named in
`record.md` by their message.

## Files

In `~/projects/agent-kit`, a CDK app of its own, excluded from `files` so no consumer receives it:

- `infra/bin/app.ts`, `infra/lib/hosting-stack.ts`, `infra/lib/certificate-stack.ts`: new, the bucket,
  distribution, us-east-1 certificate and DNS record for `agent-kit.ritenoar.com`
- `infra/cdk.json`, `infra/tsconfig.json`: new
- `package.json`: `aws-cdk-lib` and `constructs` as devDependencies, a deploy script, and `files` excluding
  `infra/`
- `deploy.sh`: new, deploys the kit's stacks, packs the kit, uploads the tarball and checks it is served
- `README.md`: `infra/`, `deploy.sh` and how a release is made
- `infra/lib/record-name.ts`: new, the subdomain guard and record-name derivation, moved out of the hosting stack so
  it can be tested without `aws-cdk-lib`
- `tests/record-name.test.mjs`, `tests/deploy.test.mjs`, `tests/agent-wrapper.test.mjs`: new, unit tests for the
  logic this unit adds to the kit

In `~/projects/agent-kit`:

- `package.json`: scoped name, version, and `files` declaring the payload
- `install.sh`: deleted, replaced by the package manager
- `tests/install.test.mjs`: deleted with the installer it tests
- `container/agent.sh`: takes the project root from its caller instead of counting directories, and passes the
  kit's container directory, relative to that root, to Compose
- `container/compose.yml`, `container/Dockerfile`: the `dockerfile` path and the two `COPY` lines take that
  relative directory instead of naming `agent-kit/container/`
- `README.md`: install and update become npm; the installer sections go

In this project:

- `agent/compose.project.yml`: one hostname added for the tarball's host
- `package.json`: the kit as a dependency; `check:changes` runs from the package; the `check:agent-kit` script and
  its three call sites go
- `package-lock.json`: the pin, with an integrity hash
- `scripts/check-agent-kit.mjs`: deleted, and `scripts/` with it if nothing else lands there
- `tests/unit/check-agent-kit.test.ts`: deleted with the check it tests
- `agent-kit.md`: deleted
- `agent-kit/`: the installed directory deleted, and its `.gitignore` entry with it
- `.gitignore`: the `agent-kit/` entry removed
- `.dockerignore`: `node_modules` stays excluded, with the kit's package negated so the build context reaches it
- `agent.sh`: passes its own directory to the kit's wrapper
- `AGENTS.md`, `README.md`: the kit's path, install and update
- `CLAUDE.md`, `agent/compose.project.yml`: the kit's path, in a link and in the header comment
- `.claude/agents/planner.md`, `implementer.md`, `reviewer.md`: one path each
- `opencode.json`: the three `{file:...}` prompts
- `tests/unit/roles.test.ts`: the kit's path, the moved-path list, and the instruction files it reads

## Tasks

Precondition:

- [x] Confirm `0039-sni-filtering-proxy` is `implemented` and on `master`, and that `agent/compose.project.yml`
      takes hostnames only, before any other task here begins (R5)

Hosting, in the kit's own repository:

- [x] Add `infra/` to the kit as a CDK app: a bucket, a distribution in front of it, and the DNS record for
      `agent-kit.ritenoar.com`. It looks the hosted zone up on the apex, takes the zone and subdomain as props,
      guards that the subdomain is inside the zone and derives the record name by slicing the apex off, all as
      `~/projects/thoryn`'s stack does. It references no resource of any other project's stacks (R5)
- [x] Put the certificate in us-east-1, which CloudFront requires and which `~/projects/thoryn` did not need
      because API Gateway takes a regional one. Follow `ritenoar-site`'s split, a certificate stack plus
      `crossRegionReferences`, rather than inventing a second mechanism for the same problem (R5)
- [x] Add `aws-cdk-lib` and `constructs` as devDependencies and a deploy script, and confirm `files` excludes
      `infra/` so that no consumer receives it and `npm pack` is unchanged by its presence (R2, R5)
- [x] Write `deploy.sh`, working relative to its own directory, which is the kit's root, and taking no arguments.
      It signs in with `aws sso login` when `aws sts get-caller-identity` fails, deploys the
      certificate and hosting stacks by name with `--require-approval broadening`, runs `npm pack`, reads the
      bucket name from a stack output, refuses to upload when an object of that name already exists, uploads with
      `aws s3 cp`, and fetches the tarball's URL with `curl` and no credential, failing unless it gets a 200. It
      prints the URL to put in a consumer's `package.json` (R1, R5)
- [x] Describe `infra/` and `deploy.sh` in the kit's `README.md`, so that a reader learns how a release happens
      from the repository that performs it (R5)
- [x] Confirm `npx cdk synth` in `infra/` succeeds, which needs AWS credentials for the hosted zone lookup but
      deploys nothing (R5)

Kit repository:

- [x] Give `package.json` the name `@ritenoar/agent-kit`, a `1.x` version and a `files` list of `process.md`,
      `roles`, `templates`, `scripts/check-changes.mjs` and `container` (R1, R2)
- [x] Run `npm pack` and confirm the tarball holds exactly that payload plus the `package.json` and README npm
      always ships, and none of `changes/`, `tests/` or `install.sh` (R2)
- [x] Change `container/agent.sh` to take the project root from an argument its caller supplies, and fail with a
      clear message when it is missing (R9)
- [x] Have `container/agent.sh` export the kit's container directory relative to the project root, failing when
      the kit is not inside the root and so outside the build context, and use it for `dockerfile` in
      `container/compose.yml` and as a build argument for the two `COPY` lines in `container/Dockerfile`, so the
      build finds the kit wherever it is installed (R9)
- [x] Delete `install.sh` and `tests/install.test.mjs`, which tests it, and confirm the kit's `npm test` still
      passes (R6)
- [x] Rewrite the kit's `README.md`: install and update with npm, and the installer sections removed (R11)
- [x] Document releasing in the kit's `README.md`: bump with `npm version patch|minor|major`, following semver as
      npm means it and no rule of this project's own, then run `deploy.sh`, then put the printed URL in the
      consuming project's `package.json`. Say that a released version is never replaced, so a bump is required
      before every release and the script refuses the upload without one (R11)

Release:

- [x] **Ask the human before running `deploy.sh`.** Its first run creates live AWS resources and a DNS
      record, the certificate validates over DNS and is not instant, and none of it is the implementer's to apply
      unprompted (R5)
- [x] Run `./deploy.sh` in the kit, which uploads the tarball under a versioned name and
      confirms `agent-kit.ritenoar.com` serves it over HTTPS with no credential. This comes **before** the
      allowlist entry is added: the entrypoint fails the container's start when a listed host is unreachable, so
      adding the name first would break every sandbox start (R1, R5)
- [x] Add `agent-kit.ritenoar.com` to the allowlist in `agent/compose.project.yml`, as one hostname, which is all
      that file now accepts (R5)

Review finding C1, unit tests for the kit's new logic:

- [x] Move the subdomain guard and record-name derivation out of `infra/lib/hosting-stack.ts` into
      `infra/lib/record-name.ts`, a module with no imports, and use it from the stack, with `npx tsc -p infra` and
      `npx cdk synth` unchanged in result (R5)
- [x] Test it in `tests/record-name.test.mjs`: a subdomain inside the zone gives its record name, and one outside the
      zone, or one merely ending in the zone's name without the dot, is refused naming both (R5)
- [x] Test `deploy.sh` in `tests/deploy.test.mjs`, running a copy of it with `aws`, `npm`, `npx` and `curl` replaced
      by stubs on `PATH` that record their calls: an unreleased version is uploaded to the stack's bucket under the
      tarball's name with the immutable cache header and the consumer line printed; a released one is refused with no
      upload; a failure to check other than "Not Found" is reported with no upload; a URL answering other than 200
      fails; and an expired session triggers `aws sso login` (R1, R5)
- [x] Test `container/agent.sh` in `tests/agent-wrapper.test.mjs`, with `docker` replaced by a stub: no project root
      and a root that is not a directory each exit 2 naming the shim; a kit outside the root exits 2 saying the build
      cannot reach it; and a kit inside the root runs Compose with `--project-directory` set to the root and
      `AGENT_KIT_CONTAINER` set to the kit's `container/` relative to it (R9)
- [x] Confirm each new test fails when the behavior it covers is broken, by breaking it once by hand, and that the
      kit's `npm test` passes on the kit's final tree

This project:

- [x] Add the kit to `dependencies` as the tarball's HTTPS URL, run `npm install`, and commit `package.json` and
      `package-lock.json` together, confirming the lockfile carries an integrity hash (R3, R4)
- [x] Point `check:changes` at the package, and confirm `npm run check:changes` still passes (R8)
- [x] Repoint the three `.claude/agents/` stubs and the three `opencode.json` prompts at the package (R8)
- [x] Update `tests/unit/roles.test.ts` for the package path, and replace the moved-path list with the paths this
      unit retires, so a stale reference still fails a test (R8, R11)
- [x] Negate the kit's `container/` in `.dockerignore` so the build context reaches it while `node_modules` stays
      excluded. The `Dockerfile`'s `COPY` lines are the kit's, and change in the kit task above (R9)
- [x] Reduce `agent.sh` to a shim that passes its own directory to the kit's wrapper, and rebuild and start the
      sandbox before anything else is deleted (R9)
- [x] Confirm `npm ci` resolves the kit inside the sandbox, over the single hostname added to the allowlist and
      with no credential present (R5)
- [x] Remove the `check:agent-kit` script and its three call sites from `package.json`, and delete
      `scripts/check-agent-kit.mjs` and `tests/unit/check-agent-kit.test.ts`, which tests it (R6, R7)
- [x] Delete `agent-kit.md`, the installed `agent-kit/` directory and its `.gitignore` entry (R6)
- [x] Update `AGENTS.md` and `README.md` for the package: how it is installed, how a project moves to a newer
      version, and that neither is a sandbox task any more (R11)

## Verification

- [x] A second run of `deploy.sh` for the same kit version refuses to upload and leaves the object as it
      was (R5)
- [x] `npm pack --dry-run` in the kit lists the payload, `package.json` and the README, and nothing else (R2)
- [x] A scratch directory with only a `package.json` can `npm install` the kit from its URL with no credential,
      and the installed tree holds no `changes/` or `tests/` (R1, R2)
- [x] `git status` after an update to a newer kit version shows `package.json` and `package-lock.json` changed and
      nothing else (R4)
- [x] A clone of this repository into a scratch directory has no kit until `npm ci`, and every suite passes after
      it with no other step (R3, R6, R7)
- [x] `npm run test:unit` and `PORT=3100 npm test` pass on the host (R10)
- [x] `./agent.sh` builds and starts, the firewall self-check passes and the agent lands unprivileged; inside it
      `npm ci`, `npm run build`, `npm run test:unit` and `PORT=3100 npm test` all pass (R5, R9, R10)
- [x] `agent/compose.project.yml` gains exactly one hostname and no address ranges (R5)
- [x] `opencode debug agent` resolves the three roles and inlines the package's role files, and the three Claude
      Code stubs name files that exist (R8)
- [x] `grep -rn 'install\.sh\|agent-kit\.md\|installed-commit' README.md AGENTS.md package.json` and the kit's
      `README.md` return nothing (R11)
- [x] `npm run check:changes` passes, and `changes/0036-install-the-agent-kit/` is untouched by this branch's diff

## Commit Points

- [x] `feature-0037 Add the spec and plan for the kit as an npm package`
- [x] `feature-0037 Serve the agent kit from agent-kit.ritenoar.com` (kit: `infra/`, `deploy.sh`, `package.json`,
      `README.md`)
- [x] `feature-0037 Make the kit an npm package` (kit: `package.json`, `container/`, deleted `install.sh` and its
      test)
- [x] `feature-0037 Document installing the kit with npm` (kit: `README.md`)
- [x] `feature-0037 Move the record name out of the hosting stack` (kit: `infra/lib/`)
- [x] `feature-0037 Test the release script, the wrapper and the record name` (kit: `tests/`)
- [x] `feature-0037 Allow the kit's host in the sandbox` (`agent/compose.project.yml`, after the release)
- [x] `feature-0037 Depend on the agent kit package` (`package.json`, `package-lock.json`, the wrappers, the roles
      test)
- [x] `feature-0037 Run the sandbox from the installed package` (`.dockerignore`, `agent.sh`)
- [x] `feature-0037 Drop the installer's bootstrap` (`scripts/`, its test, `agent-kit.md`, `.gitignore`, the
      installed directory)
- [x] `feature-0037 Document the kit as a dependency` (`README.md`, `AGENTS.md`, `CLAUDE.md`, the compose file's
      comment, the roles test's retired paths)
