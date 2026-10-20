---
kind: feature
status: implemented
timestamp: 2026-09-23T10:31:35Z
---

# 0037 The agent kit as an npm package

## Log

- 2026-09-23T10:31:35Z [human] proposed that the kit should be an npm dependency rather than files installed by a
  script, on the grounds that it is a dependency and that fewer custom parts means fewer parts that break
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] agreed the reframe was sound and reported that npm
  would retire `install.sh`, `agent-kit.md`, `.installed-commit` and `scripts/check-agent-kit.mjs`, but that it
  would not solve the open-source access problem that prompted it: a private package is private however it is
  distributed, so an outside contributor is blocked either way, and npm makes the wall harder because `npm ci`
  itself fails rather than only the agent tooling
- 2026-09-23T10:31:35Z [human] asked whether a private npm repository would do for now, and noted that publishing on
  npmjs.com stays available as soon as someone genuinely wants to contribute
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] confirmed a git URL needs no registry at all, and
  raised scoping the name from the start so a later publish needs no rename, `files` as the standard replacement for
  the installer's payload list, and that the friction of a private kit is invisible because a visitor who cannot
  build simply leaves
- 2026-09-23T10:31:35Z [human] asked for this to be planned, from `master`, now that 0036 is merged
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] took the planner role and found the constraint that
  decides the distribution. The sandbox runs `npm ci` inside the container, and `agent/compose.project.yml`
  allowlists `registry.npmjs.org` but not `bitbucket.org`, with no git credential reaching the container by unit
  0033's design. A `git+ssh` dependency on the private kit repository therefore cannot be installed inside the
  sandbox at all, which rules out the "private for now" option the discussion had assumed was available
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] weighed the four ways out and wrote publishing the
  package publicly into `spec.md` as a decision, with the rejected alternatives and their reasons: widening the
  allowlist and mounting a deploy key undoes a boundary 0033 drew deliberately; a committed `npm pack` tarball puts
  a binary blob in the repository and makes every kit update an opaque diff; a private registry is another host to
  run and still would not be allowlisted. The package is prose and two scripts with no credentials, and the
  sensitive file, the egress allowlist, is project-owned and never ships. This is the decision most likely to be
  sent back at approval, because it changes what the human said they wanted for now
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] `spec.md` and `plan.md` written, status `draft`,
  awaiting approval. Eleven requirements, six decisions and seven non-goals; six kit tasks, eleven here, ten
  verification items and seven commit points. Kit-managed harness wrappers are a non-goal: that work still has an
  undecided question, where a per-role model lives once the kit rewrites the file holding it, and the planner
  instructions forbid a plan that defers a decision. This unit only repoints the existing wrappers
- 2026-09-23T10:31:35Z [human] asked whether a container-specific SSH key could be mounted instead, and noted the
  objection themselves: that it would also let the container push to the remotes
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] confirmed that objection is avoidable but the option
  is not worth taking. Bitbucket Cloud repository access keys are per-repository, read-only and not bound to a user
  account, so no push and no other repository; workspace-level keys are the read/write case. The widening is the
  allowlist rather than the key, because `bitbucket.org` would have to be admitted and 0033's firewall is an
  address boundary. And the key's only power is reading the content that publishing would release, so it guards
  nothing if publishing is acceptable, and is the wrong direction if it is not
- 2026-09-23T10:31:35Z [human] raised a private AWS registry and identified the same credential problem
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] agreed, for a sharper reason: CodeArtifact
  authenticates with a token obtained using AWS credentials, so the container would need the credential 0033 keeps
  out by design, and the token expires within hours of a long unattended run. Added both rejected alternatives to
  `spec.md`
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] scanned what publishing would release, rather than
  assuming it: the payload is `process.md`, `roles/`, `templates/`, `scripts/check-changes.mjs` and `container/`,
  with no addresses, keys, tokens, account or workspace names, and the README npm ships alongside them names no
  repository. What is published is the working method itself, which is not a secret but is the thing to decide
  about knowingly
- 2026-09-23T11:17:58Z [human] traced the hosting question back to the sandbox's egress boundary, chose to build
  the SNI-filtering proxy that 0033 declined, and asked that this unit become the subdomain solution that depends
  on it. Separately asked that the dependency be logged here rather than left implicit
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] replaced this unit's central decision. It no longer
  publishes to npmjs.com; the kit is served as a tarball from `agent-kit.ritenoar.com`, which npm installs from
  directly and records in the lockfile with an integrity hash. **This unit is blocked on
  `0039-sni-filtering-proxy`**, because the tarball's host needs an allowlist entry and under 0033's address
  boundary that entry would be CloudFront's shared ranges; 0039 reduces it to one hostname. The dependency is
  stated in `spec.md` under both the context and the decision, and `plan.md` opens with it and carries it as the
  first task, so an implementer cannot start without checking it
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] kept publishing as the recorded fallback rather than
  deleting it. It is the only option that costs nothing at the boundary, since `registry.npmjs.org` is already
  allowlisted, and the package holds nothing secret. It was not taken because npm permits an unpublish only within
  72 hours and only when nothing depends on the package, so publishing is close to irreversible, while
  self-hosting keeps the option of publishing later and the reverse is not true. If 0039 is abandoned, this unit
  should publish rather than widen the allowlist
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] two statements left over from the publishing version
  contradicted the new decision and were corrected: the approach said a published version cannot be taken back,
  and a task required the allowlist to be unchanged, which is now false by one hostname. Added the hosting stack
  and `agent/compose.project.yml` to the file list, two hosting tasks and a commit point for them
- 2026-09-24T12:41:28Z [human] asked for this unit to be implemented, and the implementer reported three obstacles
  before starting: the hosting stack was not decided, the hosting work changes live AWS resources, and the spec and
  plan still described 0039's allowlist change as future
- 2026-09-24T12:41:28Z [Claude Code, anthropic/claude-opus-5] took the planner role. The first is a planning
  failure of mine: "in `~/projects/ritenoar-site`, or a stack of its own" is the placeholder the planner
  instructions forbid, which say to decide it or write a task that does the deciding. Decided it from the tree
  rather than by preference. `ritenoar-site` looks its hosted zone up with `HostedZone.fromLookup` in both existing
  stacks, so any stack can reach it, and its certificate covers `ritenoar.com` and `www.ritenoar.com` with no
  wildcard, so the subdomain needs its own certificate either way. There is nothing to reuse, so the choice is
  about coupling: a new stack in that project, sharing no resource with `SiteStack`. Extending the website's
  certificate would have tied the kit's availability to that certificate's revalidation and let a kit release
  threaten the website's distribution
- 2026-09-24T12:41:28Z [Claude Code, anthropic/claude-opus-5] agreed the AWS work is not the implementer's to
  apply unprompted, and made that a task in its own right rather than a note, so it cannot be passed over. Creating
  a bucket, a distribution, a certificate and a DNS record is outward-facing and slow to undo, and the certificate
  validates over DNS rather than instantly
- 2026-09-24T12:41:28Z [Claude Code, anthropic/claude-opus-5] found an ordering constraint the plan did not carry,
  from how 0039 turned out: the entrypoint fails the container's start when a listed host is unreachable, so adding
  `agent-kit.ritenoar.com` to the allowlist before the tarball is actually served would break every sandbox start.
  The upload and its check now precede the allowlist entry as separate tasks
- 2026-09-24T12:41:28Z [Claude Code, anthropic/claude-opus-5] updated the wording 0039 made stale. The spec and
  plan said this unit was blocked and could not be implemented; they now say 0039 is implemented and that the
  allowlist takes hostnames only. Nothing in either document contradicted 0039 as built, which the implementer had
  also checked
- 2026-09-24T12:41:28Z [human] pointed at `~/projects/thoryn`, a POC that served a subdomain of ritenoar.com and is
  no longer live, as worth checking for the hosting pattern
- 2026-09-24T12:41:28Z [Claude Code, anthropic/claude-opus-5] read it, and it both confirmed the decision and
  corrected a detail. Confirmed: `lib/thoryn-stack.ts` is a self-contained stack for `thoryn.ritenoar.com` that
  looks the hosted zone up on the apex with `fromLookup`, takes the zone and the subdomain as props, guards that
  the subdomain lies inside the zone, and derives the record name by slicing the apex off. So a stack of its own
  for a subdomain is this codebase's established pattern rather than something invented here, and those three
  touches are worth copying. Corrected: thoryn creates its certificate in the stack's own region, which is valid
  only because API Gateway takes a regional certificate. CloudFront requires one in us-east-1, so thoryn's
  certificate pattern does not carry over, and `ritenoar-site`'s does, since its certificate stack plus
  `crossRegionReferences` already solves exactly that for the apex. `plan.md` now says to follow that rather than
  invent a second mechanism
- 2026-09-24T12:43:28Z [human] approved the unit. Status `draft` to `approved`, with eleven requirements, the
  hosting stack decided and the block on 0039 lifted, so implementation can begin
- 2026-09-24T13:10:53Z [human] asked, before implementation started, that the kit be released with a
  `./deploy.sh`-style script rather than a plain `cdk deploy`, and that the spec and plan be updated if necessary
- 2026-09-24T13:10:53Z [Claude Code, anthropic/claude-opus-5-5] as implementer, changed `plan.md` and not `spec.md`.
  The spec decides what serves the kit, a stack of its own in `~/projects/ritenoar-site`, and how a release reaches
  it is a plan matter. Added `deploy-agent-kit.sh` beside that repository's existing `deploy.sh`, as a script of
  its own for the reason the stacks are separate. It uploads with `aws s3 cp` rather than a `BucketDeployment`,
  whose default pruning would delete older versions a lockfile still pins, refuses to overwrite a released name,
  and so needs no cache invalidation. Added a task for it, a task for `ritenoar-site`'s `CLAUDE.md` and a
  `cdk synth` check, a verification item for the refusal to overwrite, and the script to the approach and files
- 2026-09-24T13:10:53Z [Claude Code, anthropic/claude-opus-5-5] reordered the hosting tasks, because deploying,
  uploading and allowlisting had been listed before the kit was packed, which cannot work: they are now a
  "Release" section after the kit tasks, and the kit section's own upload task, which duplicated the hosting one,
  is folded into it. Split the allowlist out of the "Serve the agent kit" commit point into a commit point of its
  own, because it is a file in this repository and that commit is in `ritenoar-site`
- 2026-09-24T13:10:53Z [Claude Code, anthropic/claude-opus-5-5] noted from `ritenoar-site`'s `CLAUDE.md` that its
  commits carry no `Co-Authored-By` line and its text no em dashes, and wrote the first into the commit point. That
  file also asks for plans to be stored in its `.claude/plans/`; this unit's plan lives here, and whether that
  repository should hold a pointer to it is left to the human. Its existing `deploy.sh` runs `npm run build` at a
  root with no `package.json`, which looks broken; that is outside this unit and was not checked further
- 2026-09-24T13:20:10Z [human] confirmed the unit stays approved after the plan change for `deploy-agent-kit.sh`,
  and asked for it to be implemented
- 2026-09-24T13:20:10Z [Claude Code, anthropic/claude-opus-5-5] started the implementation. Status `approved` to
  `in-progress`. Removed a `Co-Authored-By` trailer from the unpushed commit before this one, which `process.md`
  forbids in every project and not only in `ritenoar-site`
- 2026-09-24T13:20:10Z [Claude Code, anthropic/claude-opus-5-5] precondition met: `master` holds
  `0039-sni-filtering-proxy` at `implemented`, this branch contains `master`, and the installed kit's
  `container/entrypoint.sh` refuses an address or CIDR entry in `ALLOWLIST`, so the allowlist takes hostnames only
- 2026-09-24T13:41:43Z [human] said the hosting was never meant to live in `~/projects/ritenoar-site`, having noticed
  the
  implementer create a branch there. The CDK that deploys the kit's tarball belongs to the kit
- 2026-09-24T13:41:43Z [Claude Code, anthropic/claude-opus-5] accepted the correction and, on rereading my own decision,
  found both
  its reasons weak. "It would ship the infrastructure to every consumer" is false, because `files` governs what npm
  sends and an `infra/` directory is simply not in it. "The kit would contain the thing that distributes it"
  describes every repository holding its own release tooling, which is ordinary rather than circular. What the
  decision did cost is real and I had not weighed it: a change to the kit's hosting would have touched a website's
  repository, coupling two things with no reason to change together, and every project vendoring the kit depends on
  that hosting while none cares about ritenoar.com the website
- 2026-09-24T13:41:43Z [Claude Code, anthropic/claude-opus-5] moved the hosting into the kit's repository as an `infra/`
  CDK app,
  and with it the release script, which becomes the kit's own `deploy.sh`. The implementer's design for that script
  is kept as it stood, because its reasoning is sound: `aws s3 cp` rather than a CDK `BucketDeployment`, which
  prunes by default and would delete older tarballs a lockfile somewhere still pins; a refusal to upload over a
  name that already exists; and no cache invalidation, because a released name is never replaced
- 2026-09-24T13:41:43Z [Claude Code, anthropic/claude-opus-5] recorded a consequence the move carries that the earlier
  placement
  did not. The kit has no dependencies at all today, which was 0035's decision, and a CDK app means `aws-cdk-lib`
  and `constructs` at least. The payload stays dependency-free, since `files` excludes `infra/` and
  `scripts/check-changes.mjs` still runs on a bare Node, but working on the kit now needs an install where before
  it did not. That is in `spec.md` as its own decision rather than left to surface during implementation
- 2026-09-24T13:41:43Z [Claude Code, anthropic/claude-opus-5] deleted the branch `feature-0037-agent-kit-hosting` from
  `~/projects/ritenoar-site`, which held no commits beyond `master`, so nothing was lost. Status from
  `in-progress` back to `draft`: the spec has changed since it was approved, and the human has said they had not
  read it, so it needs approving again before implementation resumes
- 2026-09-24T14:31:00Z [human] reviewed spec and plan. Renamed `deploy-agent-kit.sh` to simply `deploy.sh`. It is easier
  if this is the same across projects. Changed default version to 1.x, not 0.x. 
- 2026-09-24T14:50:46Z [human] asked how releasing works and whether a version bump is part of it, then asked whether a deploy
  uploads a specific version or the same name each time, since projects may pin different ones
- 2026-09-24T14:50:46Z [Claude Code, anthropic/claude-opus-5] answered from the documents: each release is its own immutable
  object, because `npm pack` names the tarball from the version, the upload is `aws s3 cp` rather than a CDK
  `BucketDeployment` that would prune older versions a lockfile still pins, and the script refuses to upload over
  an existing name. The version therefore lives in the URL, so a project's `package.json` URL is itself the pin and
  two projects can sit on different versions indefinitely. That part of the design already answered the question
- 2026-09-24T14:50:46Z [Claude Code, anthropic/claude-opus-5] the question exposed three gaps in my own planning, and the first was
  real: nothing in either document said to bump the version. The refusal to overwrite makes a bump mandatory, but
  only as a safety check that an implementer would meet as a confusing failure on its second release. There was also
  no rule for what to bump, and the package name was never fixed, only called "the scoped name"
- 2026-09-24T14:50:46Z [human] decided the README carries how to bump, that plain semver as npm means it is enough with no rule of
  this project's own, and that the lost staleness detection is accepted
- 2026-09-24T14:50:46Z [Claude Code, anthropic/claude-opus-5] wrote both as decisions in `spec.md`, fixed the name as
  `@ritenoar/agent-kit`, and added a task for the README section covering `npm version patch|minor|major`, the
  deploy, and putting the printed URL into the consuming project. Recorded the staleness loss explicitly as a
  regression against 0036 rather than leaving it unmentioned: 0036's installer reported how far the kit had moved
  past a project on every run, a URL dependency cannot, and closing it would mean a `latest` pointer and a check to
  read it, which is machinery in the unit meant to remove machinery. If projects drift, that is the unit to write
- 2026-09-24T14:50:46Z [Claude Code, anthropic/claude-opus-5] left the version at `1.x`, which the implementer changed from the
  `0.x` I first wrote without recording why. Under semver that is a claim the surface is stable rather than
  provisional. Noting it rather than reverting it, since the human has now twice declined to treat the kit as
  unsettled
- 2026-09-24T14:56:28Z [human] read the spec and plan and approved them. Status `draft` to `approved`, with the
  hosting in the kit's own repository, versioning settled on semver, and the package named `@ritenoar/agent-kit`
- 2026-09-24T15:06:22Z [Claude Code, anthropic/claude-opus-5-5] as implementer, reported four leftovers from the
  `ritenoar-site` version of the plan before starting: `deploy.sh` still took the kit's path as an argument, whose
  only valid value is now its own directory; the files list still named `deploy-agent-kit.sh` and a `CLAUDE.md`
  the kit does not have, where the task names the kit's `README.md`; deleting `install.sh` would fail the kit's
  suite through `tests/install.test.mjs`, which the plan did not mention; and the 14:50:46Z entry attributes the
  `0.x` to `1.x` change to the implementer, where the human made it
- 2026-09-24T15:06:22Z [human] decided `deploy.sh` works relative to its own location and takes no argument, renamed
  the files-list entry to `deploy.sh`, agreed the test goes with the installer, and chose to leave the attribution
  as it stands
- 2026-09-24T15:06:22Z [Claude Code, anthropic/claude-opus-5-5] applied those to `plan.md`: the argument is gone from
  the `deploy.sh` task and the release task, the files list names the kit's `README.md` in place of `CLAUDE.md`,
  and `tests/install.test.mjs` is deleted with `install.sh`, in the files list, the task and the commit point.
  Status `approved` to `in-progress`
- 2026-09-24T15:09:13Z [Claude Code, anthropic/claude-opus-5-5] committed `infra/`, `deploy.sh` and the kit's README
  section on releasing as kit commit "feature-0037 Serve the agent kit from agent-kit.ritenoar.com", on the kit's
  branch `feature-0037-kit-as-an-npm-package`. `AgentKitCertStack` in us-east-1 holds the certificate and
  `AgentKitHostingStack` in eu-west-1 the bucket, distribution and A record, joined by `crossRegionReferences` as
  `ritenoar-site` does; the account and the cached eu-west-1 zone lookup are copied from `~/projects/thoryn`. The
  bucket is private and reached through CloudFront with origin access control, as `ritenoar-site`'s is, which is
  how "public-read behind CloudFront" is met: readable with no credential, but only through the distribution. It
  is retained on stack deletion, since consumers still install what it holds
- 2026-09-24T15:09:13Z [Claude Code, anthropic/claude-opus-5-5] three implementation choices the plan left open.
  The CDK app runs under `tsx` rather than `ts-node`, because the kit's `package.json` is `"type": "module"` and the
  `ts-node` setup `ritenoar-site` and thoryn use is CommonJS; so the devDependencies are `aws-cdk-lib`,
  `constructs`, `aws-cdk`, `tsx` and `typescript`, beyond the two the spec names as the least. `infra/cdk.json`
  sets cross-stack references to `strong` explicitly, which CDK otherwise warns it is defaulting to. And
  `deploy.sh` also runs `npm ci`, a type-check of `infra/` and the kit's tests before deploying, as thoryn's does,
  and uploads with an immutable cache header, since a released name is never replaced
- 2026-09-24T15:09:13Z [Claude Code, anthropic/claude-opus-5-5] `npx tsc -p infra` passes and the kit's `npm test`
  passes, 70 of 70. `npx cdk synth` does not yet: the us-east-1 hosted zone lookup needs AWS credentials, and the
  SSO session on this machine has expired, which only the human can renew. That task stays open, and so does the
  one confirming `files` excludes `infra/`, which waits on `files` itself. `deploy.sh` has been syntax-checked with
  `bash -n` and not run
- 2026-09-24T15:10:02Z [Claude Code, anthropic/claude-opus-5-5] added a kit task to `plan.md` before doing it. The
  image build names `agent-kit/container/` in three places, not one: the two `COPY` lines in `container/Dockerfile`
  and `dockerfile` in `container/compose.yml`, which the plan did not list. Replacing them with
  `node_modules/@ritenoar/agent-kit/container/` would be the depth assumption R9 rules out for the wrapper, so the
  wrapper, which now knows both the root and its own directory, exports the kit's container directory relative to
  the root, and Compose and the `Dockerfile` take it from there. The project task that named the `Dockerfile`'s
  `COPY` now says it is the kit's, and names only `.dockerignore`
- 2026-09-24T15:11:49Z [Claude Code, anthropic/claude-opus-5-5] kit commits "feature-0037 Make the kit an npm package"
  and "feature-0037 Document installing the kit with npm". The package is `@ritenoar/agent-kit` at `1.0.0`, kept
  `"private": true` so an accidental `npm publish` is refused, which does not affect `npm pack`. `npm pack
  --dry-run` lists `README.md`, `package.json`, `process.md`, the three roles, the three templates,
  `scripts/check-changes.mjs` and the six files of `container/`, and nothing from `changes/`, `tests/`, `infra/`,
  `deploy.sh` or `install.sh`
- 2026-09-24T15:11:49Z [Claude Code, anthropic/claude-opus-5-5] `container/agent.sh` takes the project root as its
  first argument and exports `AGENT_KIT_CONTAINER`, which `compose.yml` uses for `dockerfile` and passes to the
  `Dockerfile` as `KIT_CONTAINER` for its two `COPY` lines. Checked with a stand-in `docker` that prints its
  arguments, in four cases: no argument and a non-directory argument each exit 2 with a message naming the shim; a
  kit outside the project root exits 2 saying the build cannot reach it; and a kit at
  `node_modules/@ritenoar/agent-kit` runs `compose build` and `compose run` with
  `AGENT_KIT_CONTAINER=node_modules/@ritenoar/agent-kit/container`. A real image build is not checked yet; it comes
  with the sandbox task. `install.sh` and `tests/install.test.mjs` are deleted, and the kit's `npm test` passes, 53
  of 53, the difference from 70 being the installer's tests
- 2026-09-24T15:11:49Z [Claude Code, anthropic/claude-opus-5-5] the kit's README now installs and updates with npm,
  says a project's `.dockerignore` must re-include `node_modules/@ritenoar/agent-kit/container`, documents a
  release as `npm version patch|minor|major` then `./deploy.sh`, and says nothing reports a newer release, which
  is the staleness loss the spec accepts. `grep` for `install.sh`, `agent-kit.md`, `installed-commit` and
  `--update` in it returns nothing
- 2026-09-24T16:41:41Z [human] signed in to AWS and ran the kit's `./deploy.sh`, the first release, which created
  both stacks and uploaded `ritenoar-agent-kit-1.0.0.tgz` at 16:35:59Z
- 2026-09-24T16:41:41Z [Claude Code, anthropic/claude-opus-5-5] verified the release.
  `https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.0.0.tgz` answers 200 through CloudFront with
  `application/gzip` and the immutable cache header, and its extracted contents are identical to a fresh `npm pack`
  of kit commit `11f10a0`. `npx cdk synth` in `infra/` now succeeds; the deploy's synth had cached the us-east-1
  zone lookup, committed in the kit as "feature-0037 Cache the us-east-1 hosted zone lookup"
- 2026-09-24T16:41:41Z [Claude Code, anthropic/claude-opus-5-5] ran `./deploy.sh` a second time for 1.0.0. The kit's
  tests passed, both stacks reported no changes, and the script exited 1 with "ritenoar-agent-kit-1.0.0.tgz is
  already released and is never replaced"; the object's ETag and LastModified were the same before and after
- 2026-09-24T16:41:41Z [Claude Code, anthropic/claude-opus-5-5] in a scratch directory holding only a `package.json`,
  and with `HOME` pointed there so that no `.npmrc` or credential was read, `npm install` of the URL succeeded. The
  lockfile records the URL as `resolved` with a `sha512` integrity hash, and the installed package holds
  `container`, `process.md`, `roles`, `scripts`, `templates`, `package.json` and `README.md`, with no `changes/` or
  `tests/`
- 2026-09-24T16:46:07Z [Claude Code, anthropic/claude-opus-5-5] committed "feature-0037 Allow the kit's host in the
  sandbox", after the host was serving, and "feature-0037 Depend on the agent kit package". The roles test was
  changed to expect `node_modules/@ritenoar/agent-kit/roles/` first, and failed three tests, the Roles section,
  the Claude Code stubs and the OpenCode prompts, before anything was repointed; after `npm install` of the URL and
  repointing it passes 10 of 10. The Roles section of `AGENTS.md` was repointed in that commit rather than with
  the rest of `AGENTS.md`, because the roles test reads it and would otherwise fail until the last commit
- 2026-09-24T16:46:07Z [Claude Code, anthropic/claude-opus-5-5] the roles test task stays open: its list of paths
  this unit retires would fail against `agent-kit.md`, `package.json`'s `check:agent-kit` and the rest of
  `AGENTS.md` and `README.md` until they are removed, so it lands with the last commit, when it can pass
- 2026-09-24T16:46:07Z [Claude Code, anthropic/claude-opus-5-5] on the host, after the dependency commit,
  `npm run test:unit` passed 52 of 52 and `PORT=3100 npm test` 86 of 86. `npm install` warns `EBADENGINE`
  because the host runs Node 24 against the project's `>=26`, which predates this unit
- 2026-09-24T16:46:07Z [Claude Code, anthropic/claude-opus-5-5] committed "feature-0037 Run the sandbox from the
  installed package". `./agent.sh --rebuild` built the image with the two `COPY` lines resolved to
  `node_modules/@ritenoar/agent-kit/container/`, the entrypoint verified the firewall, including that every
  allowlisted host is reachable, and dropped to `uid=1000(agent)`. Inside it, with no `~/.npmrc` and no
  environment variable matching `aws`, `token` or `secret`, `npm ci` installed 120 packages and the egress proxy
  logged `allowed agent-kit.ritenoar.com`; `npm run build` succeeded and `npm run test:unit` passed 52 of 52
- 2026-09-24T16:46:07Z [Claude Code, anthropic/claude-opus-5-5] `PORT=3100 npm test` inside the sandbox failed once:
  85 passed and `callouts.spec.ts` "highlight callout matches snapshot" failed, on the first run after `npm ci` and
  the build. The config has no retries, so that was a failure and not a flake that recovered. It did not recur: a
  second full run passed 86 of 86, and `callouts.spec.ts` with `--repeat-each=2` five times passed 30 of 30. Its
  output was cut off before the diff, so the cause is not known; nothing in this unit touches the page or the
  baselines, which is a reason to suspect the environment but not evidence of it
- 2026-09-24T16:52:24Z [Claude Code, anthropic/claude-opus-5-5] committed "feature-0037 Drop the installer's
  bootstrap". `tests/unit/check-agent-kit.test.ts`, which tests the deleted check, was not in the plan and failed
  the unit suite once the script was gone; it was added to `plan.md` and deleted in the same commit, the same gap
  as the kit's installer test. `scripts/` is gone with its only file
- 2026-09-24T16:52:24Z [Claude Code, anthropic/claude-opus-5-5] committed "feature-0037 Document the kit as a
  dependency" and "feature-0037 Rewrap the compose file's header comment". The roles test's list of paths that
  moved in 0035 is replaced, as the plan says, by the installer paths this unit retires: `agent-kit/` other than
  under `@ritenoar/`, `agent-kit.md`, `install.sh`, `.installed-commit` and `check-agent-kit`, checked across the
  instruction files with `.gitignore` added and `agent-kit.md` removed. Written first, it failed on `AGENTS.md`.
  `CLAUDE.md` and the header comment of `agent/compose.project.yml` also named `agent-kit/`, which the plan did not
  list; both were repointed and added to `plan.md`. The kit repository's address, which only `agent-kit.md` held,
  moved into README.md's "Install the agent kit"
- 2026-09-24T16:52:24Z [Claude Code, anthropic/claude-opus-5-5] verification on `15e8384`. A clone of the branch into
  a scratch directory had no `node_modules` and no `agent-kit/`, and `npm run check:changes` failed there with
  Node's module-not-found error; after `npm ci` alone, `npm run build`, `npm run test:unit` (48 of 48),
  `npm run check:changes` and `PORT=3101 npm test` (86 of 86) passed. On the host, `npm run test:unit` passed 48 of
  48 and `PORT=3100 npm test` 86 of 86. `./agent.sh --rebuild` built, verified the firewall and dropped to
  `uid=1000(agent)`; inside it `npm ci` fetched the kit through `agent-kit.ritenoar.com`, and `npm run build`,
  `npm run test:unit` (48 of 48), `npm run check:changes` and `PORT=3100 npm test` (86 of 86) passed. The kit's
  `npm test` passed 53 of 53 on its branch
- 2026-09-24T16:52:24Z [Claude Code, anthropic/claude-opus-5-5] `opencode debug agent` for each role reports
  `mode=subagent` and a prompt identical to the package's role file, and each Claude Code stub names a file that
  exists. The plan's `grep` for `install.sh`, `agent-kit.md` and `installed-commit` over README.md, AGENTS.md,
  `package.json` and the kit's README returns nothing. `git diff master` of `agent/compose.project.yml` adds the one
  hostname and otherwise changes only its comments. `npm run check:changes` passes, and the branch's diff does not
  touch `changes/0036-install-the-agent-kit/`
- 2026-09-24T16:52:24Z [Claude Code, anthropic/claude-opus-5-5] one verification item is open and blocks
  `implemented`: that updating to a newer kit changes only `package.json` and `package-lock.json` (R4). It needs a
  second release to exist, and only 1.0.0 does; making one is a live release, which is the human's to approve
- 2026-09-24T19:57:17Z [human] ran `npm version patch` in the kit, amended its commit message to
  "feature-0037 Release 1.0.1" and moved the annotated tag `v1.0.1` onto it, then released 1.0.1 with `./deploy.sh`
- 2026-09-24T19:57:17Z [Claude Code, anthropic/claude-opus-5-5] verified R4.
  `https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.0.1.tgz` answers 200. On a clean tree, `npm install` of that
  URL left `git status` showing `package.json` and `package-lock.json` modified and nothing else, the diff being
  the URL in both, and the version, `resolved` URL and `sha512` integrity hash in the lockfile. Kept as
  "feature-0037 Move to agent kit 1.0.1", so the project is on the latest release
- 2026-09-24T19:57:17Z [Claude Code, anthropic/claude-opus-5-5] suites on `cafe74c`. Host: `npm run test:unit` 48 of
  48, `npm run check:changes` passes, `PORT=3100 npm test` 86 of 86. Sandbox: the firewall verified, `npm ci`
  fetched the kit through `agent-kit.ritenoar.com`, `npm run build` succeeded and `npm run test:unit` passed 48 of
  48, and `PORT=3100 npm test` failed one test, 85 passed
- 2026-09-24T19:57:17Z [Claude Code, anthropic/claude-opus-5-5] that failure is the same test as at 16:46:07Z,
  `callouts.spec.ts` "highlight callout matches snapshot", and this time its artifacts were read: no pixels were
  compared, because `toHaveScreenshot` timed out after 5000ms "waiting for fonts to load". The web fonts come from
  the two Google font hosts through the egress proxy. Across six full sandbox runs it failed twice, both times the
  first run in a container straight after `npm ci` and `npm run build`; four later full runs, two of them in fresh
  containers, passed 86 of 86, and the spec alone passed 3 of 3 in fresh containers and 30 of 30 earlier. It has
  not occurred on the host. The cause is not established. Nothing in this unit touches the fonts, the proxy, the
  page or the tests, so it is not fixed here; it is raised with the human as a bug of its own
- 2026-09-24T19:57:17Z [Claude Code, anthropic/claude-opus-5-5] every task and verification item in `plan.md` is
  ticked. Status stays `in-progress`: the unit has not been reviewed, and `implemented` waits on the human deciding
  the review's blocking findings
- 2026-09-24T20:24:00Z [OpenCode, openai/gpt-6-sol] full review of unit 0037 at project commit `57434cc` and kit
  commit `9ca436e`, against their respective merge bases. Findings S1 and C1, saved in
  `.reviews/0037-kit-as-an-npm-package/2026-09-24-full-57434cc.md`. Live AWS deployment, the same-version release
  refusal and historical scratch-clone and update checks were not independently rerun
- 2026-09-24T20:46:39Z [Claude Code, anthropic/claude-opus-5-5] S1, proposed decline, open until the human
  decides. The failure predates this unit and is planned as its own bug, `0041-sandbox-font-timeout`, on branch
  `bugfix-0041-sandbox-font-timeout`. Checked on `master` rather than argued: a scratch clone of `master` at
  `9b23c88`, with the kit installed by `master`'s installer at `dc27d56` and its own image rebuilt, ran fresh
  containers of `npm ci`, `npm run build` and `PORT=3100 npm test`. It passed six in a row at first, while this
  branch failed three of six in the same window, which suggested this unit mattered. Alternating the two in one
  window on one image, `master` failed two of eight and this branch one of eight; and `master` on its own rebuilt
  image then failed on its second run with the same test, `callouts.spec.ts` "highlight callout matches snapshot",
  timing out "waiting for fonts to load". R10 cannot hold in the sandbox on this machine until 0041 is fixed, with or
  without this unit, so the proposal is to settle S1 by that dependency rather than by a change here. Not proposed:
  merging 0041 into this unit, which would put a site change into a unit about the kit
- 2026-09-24T20:46:39Z [Claude Code, anthropic/claude-opus-5-5] C1, accepted. The kit logic this unit adds had no
  unit tests: `deploy.sh`'s refusal and error branches, the hosting stack's subdomain guard, and the wrapper's
  argument and path checks. Added to `plan.md` before doing it: the guard moves into a module of its own so that it
  can be tested without `aws-cdk-lib`, and three test files cover the three, with `deploy.sh` and the wrapper run
  against stubbed commands; each test is to be shown failing once against broken behavior
- 2026-09-24T20:49:55Z [Claude Code, anthropic/claude-opus-5-5] C1 applied, in two kit commits. "feature-0037 Move
  the record name out of the hosting stack" puts the guard in `infra/lib/record-name.ts`; `npx tsc -p infra` passes
  and the two synthesized templates are byte-identical before and after. "feature-0037 Test the release script, the
  wrapper and the record name" adds 14 tests: five for the record name, imported as TypeScript by Node's type
  stripping so the kit's tests still need no install; four for the wrapper against a stubbed `docker`; and five for
  `deploy.sh` against stubbed `aws`, `npm`, `npx` and `curl`
- 2026-09-24T20:49:55Z [Claude Code, anthropic/claude-opus-5-5] each covered behavior was broken once by hand and its
  test failed, and only its test: the refusal of a released version, the report of a check failure other than "Not
  Found", the 200 check, the SSO renewal, the immutable cache header, the wrapper's directory check, its
  inside-the-root check and its relative kit path, and the guard's dot. Not mutated: the wrapper's missing-argument
  check, which the directory mutation left in place. The kit's `npm test` passes 67 of 67 at `c26feb7`. The changes
  are in `infra/` and `tests/`, neither of which ships, and the payload's files are unchanged since `9ca436e`, so no
  new release is needed and this project stays on 1.0.1
- 2026-09-24T20:49:55Z [Claude Code, anthropic/claude-opus-5-5] suites on `e550b96`, whose tree this entry's commit
  changes only in `changes/`. Host: `npm run test:unit` 48 of 48, `npm run check:changes` passes, `PORT=3100 npm test`
  86 of 86. Sandbox, rebuilt from the package: the firewall verified, the agent ran as `agent`, `npm ci`, `npm run
  build` and `npm run test:unit` (48 of 48) passed, and the first `PORT=3100 npm test` failed `callouts.spec.ts`
  "highlight callout matches snapshot" waiting for fonts, 85 passed; the next run passed 86 of 86. That is S1, which
  is open as a proposed decline, and it will recur in the sandbox until 0041 is fixed
- 2026-09-24T20:49:55Z [Claude Code, anthropic/claude-opus-5-5] every task, verification item and commit point in
  `plan.md` is ticked. Status stays `in-progress`: S1 needs the human's decision before the unit can be `implemented`
- 2026-09-24T20:57:34Z [OpenCode, openai/gpt-6-sol] delta review of unit 0037 at project commit `a22fdeb` from
  `57434cc` and kit commit `c26feb7` from `9ca436e`. C1 was corrected; S1 remains open. Findings returned: S1,
  saved in `.reviews/0037-kit-as-an-npm-package/2026-09-24-delta-a22fdeb.md`. The reported `master`-branch font
  timeout and live AWS deployment were not independently rerun
- 2026-09-24T22:54:37Z [human] accepted the proposed decline of S1: the intermittent sandbox font-loading timeout
  is tracked separately as `0041-sandbox-font-timeout`, and resolving it is not part of unit 0037. This accepts the
  known limitation in R10 for this unit; the sandbox suite has both passed and failed on fresh runs
- 2026-09-24T22:54:37Z [OpenCode, openai/gpt-6-sol] status `in-progress` to `implemented`. C1 was corrected and
  confirmed in the delta review, the human decided S1, and every plan task is ticked. On the final code tree at
  project commit `a22fdeb` and kit commit `c26feb7`, the host unit suite passed 48 of 48, the host end-to-end suite
  passed 86 of 86, the kit suite passed 67 of 67, and the sandbox unit and end-to-end suites passed 48 of 48 and 86
  of 86 on the review run. The intermittent sandbox failure remains for unit 0041

## Amendments
