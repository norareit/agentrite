# 0043 The kit is published on the npm registry

## Context

A release of the kit is a tarball on `agentrite.ritenoar.com`, a host of the kit's own: a private bucket behind
CloudFront, which `infra/` deploys and `deploy.sh` uploads to. A project installs the kit by the URL of a release.
The package is named `@ritenoar/agentrite`, and the registry holds two packages that are only pointers:
`agentrite`, which is the name of the kit's command, and `agentrite-roles`.

The kit is about to be public. The repository moves to GitHub, as open source under the MIT license, and a public
npm package belongs on the npm registry: a project installs it by its name, `npm outdated` says when a newer release
exists, and nothing has to be hosted for it. On the registry the kit takes the name it already holds there,
`agentrite`, so that the package and its command have one name.

Three things in the repository stand in the way:

* `package.json` says `"private": true`, which makes `npm publish` refuse
* There is no `LICENSE` file and no `license` field
* `README.md`, `RELEASING.md`, `CONTRIBUTING.md`, `SANDBOX.md` and the two packages under `pointers/` say that the
  kit is installed from `agentrite.ritenoar.com` and not from a registry, and the pointers send a reader to the
  repository on Bitbucket

Once a release is a version on the registry, the host has nothing left to serve, so `infra/` and `deploy.sh` go.

Part of the move is not a change to a file: the repository on GitHub, the remotes, the first release on the
registry, the pointer, the projects that use the kit, and the host that is taken down at the end. Those are steps
the human takes, and the unit writes them down.

## Requirements

1. The `name` in `package.json` is `agentrite`. The file has no `private` field. It has `"license": "MIT"` and a
   `repository` of type `git` with the URL `git+https://github.com/ritenoar/agentrite.git`. Its `bin` and its
   `files` are unchanged
2. `LICENSE` is a file at the root of the repository. It holds the text of the MIT License as the SPDX identifier
   `MIT` gives it, with the line `Copyright (c) 2026 Stef Klaassen`. "What is here" of `README.md` has a row for it
3. `npm pack` makes `agentrite-<version>.tgz`. It holds what the tarball held before this unit, and `LICENSE`, and
   nothing else
4. The kit names itself `agentrite` and its installed files `node_modules/agentrite/`, wherever it named
   `@ritenoar/agentrite` and `node_modules/@ritenoar/agentrite/`:
    * in the role wrappers that `init` and `refresh` write
    * in the `AGENTS.md`, the `CLAUDE.md`, the `sandbox.sh` and the `sandbox/compose.project.yml` that `init` writes
    * in the `check-changes` script that `init` adds to a project's `package.json`
    * in the `.dockerignore` that `init` writes, and in the exception it looks for in one that exists
    * in what a command of the kit prints
    * in `README.md`, `SANDBOX.md`, `process.md`, the role files and every other file of the package but
      `CHANGELOG.md`

   What a command does is otherwise unchanged
5. A project that the release 5.0.0 set up, with the files as `init` of that release wrote them, works with this
   release after these steps and no others: its roles are found, its change check runs and its sandbox starts.
    1. `npm uninstall @ritenoar/agentrite`, then `npm install agentrite`
    2. `npx agentrite refresh` with the project's harnesses
    3. Replace `node_modules/@ritenoar/agentrite` with `node_modules/agentrite` in `AGENTS.md`, `CLAUDE.md`,
       `.dockerignore`, `sandbox/compose.project.yml` and the `check-changes` script of `package.json`, and
       `@ritenoar/agentrite` with `agentrite` where `AGENTS.md` names the package
    4. `./sandbox.sh --in-place --rebuild true`

   The implementer tries this before the package is on the registry, installing in step 1 the tarball that
   `npm pack` makes, and logs what was seen
6. `npm publish`, run at the root, refuses a version whose release notes are missing: when no line of
   `CHANGELOG.md` is exactly `## <version>`, with the `version` of `package.json`. It refuses before anything is
   sent to the registry, exits with a status other than 0, and its message says both why and what to do: that
   `CHANGELOG.md` has no section headed `## <version>`, and to write the release notes as `RELEASING.md` describes,
   commit them and run it again
7. `npm publish`, run at the root, runs `npm test` before anything is sent to the registry, and publishes nothing
   when a test fails
8. None of the checks of requirements 6, 7 and 22 runs on `npm install`, `npm ci` or `npm pack`, in this
   repository or in a project that installs the kit
9. These are gone: `infra/`, `deploy.sh`, the script `deploy` of `package.json`, the line `cdk.out/` of
   `.gitignore`, the tests of `deploy.sh` and of `infra/`, the devDependencies `aws-cdk`, `aws-cdk-lib`,
   `constructs`, `tsx` and `typescript`, and `pointers/agentrite/` with its tests. `npm test` passes on what is left
10. No tracked file names `agentrite.ritenoar.com`, `infra/`, `deploy.sh`, the CDK, AWS or `@ritenoar/agentrite`,
    apart from the files under `changes/`, `CHANGELOG.md`, and what requirement 18 leaves as it is
11. `KIT_ALLOWLIST` in `container/compose.yml` does not hold `agentrite.ritenoar.com`, so a sandbox reaches that
    host only when the project lists it in its own `ALLOWLIST`. The table of the hosts the kit admits in
    `SANDBOX.md` has no row for it. The comment that lists the hosts the kit admits itself, in the
    `compose.project.yml` that `init` writes, no longer names the kit's release host
12. "Installing it into a project" of `README.md` says that the kit is the package `agentrite` on the npm registry,
    and installs it with:

    ```sh
    npm install agentrite
    ```

    It says what npm then writes into the project's `package.json` and `package-lock.json`
13. "Updating a project to a newer kit" of `README.md` updates with:

    ```sh
    npm install agentrite@latest
    ```

    It says that `npm outdated` reports a newer release. No command in `README.md` names a version of the kit
14. The pointer `agentrite-roles` says, in what it prints and in its `README.md`, that AgentRite is the package
    `agentrite`, that it is installed with `npm install agentrite`, and that its README is at
    `https://github.com/ritenoar/agentrite`. It does not say that the kit is installed from a release URL or that
    it is not on the npm registry, and neither does the `description` of its `package.json`. It still exits with
    the status it exits with now. Its version is `2.0.1`
15. `RELEASING.md` describes a release through the registry:
    * Step 5 is what the human runs, `npm version <patch|minor|major>` and then `npm publish`. An agent runs
      neither. It says that `npm publish` runs on the host with the npm login that owns the package `agentrite`,
      and that this login never enters the sandbox
    * It says what `npm publish` refuses and how to go on from each: the missing section of requirement 6, with
      the move of the annotated tag that the file gives now, a failing test, the working tree of requirement 22,
      and a version that is already on the registry, which the registry refuses itself
    * Step 4 commits `CHANGELOG.md` alone. Nothing in the file moves a version in `README.md`, and step 2 has no
      line about one
    * Step 6 installs the release with `npm install --save-dev --save-exact agentrite@<version>`, on the human's
      word that `npm publish` succeeded. Its other four commands, what it checks afterwards and what it commits
      are unchanged, with the one line of `package.json` that differs being a version and not a URL. The line of
      step 2 about that devDependency says the same
    * Step 7 is unchanged
16. The description of the `/release` skill says "once it is published" where it says "once it is deployed"
17. `CONTRIBUTING.md` describes the repository as it is after this unit:
    * "What the repository holds besides the package" has no row for `infra/` or `deploy.sh`, and its row for
      `pointers/` names the one package that is left
    * "Commands" has `npm publish` in the place of `deploy.sh`: what it checks before it publishes, that it runs on
      the host, and that an agent does not run it
    * "Releasing" says that a release is a version of the package on the npm registry
    * "The kit's own tests" does not say that releasing needs an install
    * "The kit's own copy of the kit" says that `npm publish` stays on the host because it needs the npm login,
      where it says that of `./deploy.sh` and the AWS credentials
18. This repository's own setup as a project of the kit is unchanged by this unit, and still follows the release
    5.0.0 under its old name: the devDependency `@ritenoar/agentrite` and the `check-changes` script in
    `package.json`, `package-lock.json`, `AGENTS.md`, the role wrappers under `.claude/agents/` and
    `.opencode/agents/`, `sandbox.sh`, `.dockerignore`, `sandbox/compose.project.yml`, and what "The kit's own copy
    of the kit" of `CONTRIBUTING.md` says of where that copy is and where it is installed from
19. `CHANGELOG.md` is unchanged by this unit
20. `plan.md` has a section "Human steps". It holds what the human does once the unit is on `master`, as a numbered
    list and not as tasks to tick, each step with the exact commands it takes, what it waits for and what is seen
    when it has worked. The steps are these, in this order:
    1. Create the repository `ritenoar/agentrite` on GitHub, public and empty: with no README, no license and no
       `.gitignore`, so that the first push is not refused
    2. On this computer, make GitHub the remote that `origin` fetches from and give `origin` two addresses to push
       to, GitHub's and Bitbucket's, so that one `git push` reaches both. Then push `master` and every tag
    3. Make the release, as `RELEASING.md` gives it after this unit, with a major version, and without its step 6,
       which this release cannot run: see step 5. Then mark `agentrite@1.0.0`, the pointer the name held until
       now, as deprecated on the registry
    4. Publish the pointer `agentrite-roles`. See in an empty directory that `npx agentrite-roles` prints the new
       text, and that `npx agentrite` runs the kit's command
    5. Have the unit specified that moves this repository to the release, by the steps of requirement 5, and
       approve it
    6. On the other computer, set the remotes as in step 2
    7. Move each other project that uses the kit to the release, by the steps of requirement 5, as a unit of its
       own there
    8. Delete the two stacks and the bucket, once steps 5 and 7 are on the main branch of each repository and
       pulled on both computers
21. `package.json` has these four fields:
    * `description`: `A kit for running coding agents by a fixed process`
    * `keywords`: `agents`, `coding-agents`, `claude-code`, `opencode`, `sandbox`, `process`
    * `homepage`: `https://github.com/ritenoar/agentrite#readme`
    * `bugs`, with the `url` `https://github.com/ritenoar/agentrite/issues`
22. `npm publish`, run at the root, refuses a working tree in which a tracked file holds a change that is not
    committed. It refuses before anything is sent to the registry, exits with a status other than 0, and its
    message says both why and what to do: which files are changed, and to commit the changes or put them aside and
    run it again. It does not look at the branch

## Decisions

* **The package is named `agentrite`, on the human's word.** The registry already holds that name for the kit, as
  a pointer, and it is the name of the command. A reader then installs `agentrite` and runs `agentrite`, and there
  is no scope to explain. It costs a rename of every path under `node_modules/@ritenoar/agentrite`, in the kit and
  in each project. That is cheapest now: every project has to move from the URL to the registry anyway, three
  repositories use the kit, and nobody else has installed it. Publishing as `@ritenoar/agentrite` and keeping the
  pointer was the alternative, and would have left the kit with two names in public for good
* **No pointer at `@ritenoar/agentrite`.** The human proposed one. The scoped name was never on the registry: it
  was served from the kit's own host, so nobody looks for it there, and the three repositories that use it are
  moved by hand. A pointer would need the scope `ritenoar` on the registry for a package that says "use the other
  name" to no reader
* **No old path keeps working.** No package or link at `node_modules/@ritenoar/agentrite`, and no command that
  rewrites a project's files for it. Either would stay in the kit for good to serve three repositories for one
  update, as unit 0041 decided for the names of the sandbox. It is a breaking change, so the release that carries
  this unit is a major one
* **`npx agentrite` in a project without the kit runs the kit.** Until now it fetched the pointer, which said that
  the kit is not installed and exited with an error. Now npx fetches the kit itself and runs its command from a
  cache, so `npx agentrite init` there writes files that name `node_modules/agentrite/`, which the project does not
  have. The README installs first, and a refusal is left out. See "Beyond the request"
* **What is named after Ritenoar and is not the package keeps its name.** The image labels
  `com.ritenoar.agentrite.claude-code-version` and `com.ritenoar.agentrite.opencode-version` are a namespace of
  their own, and the wrapper reads them from images that exist. This repository's Compose project,
  `ritenoar-agentrite-sandbox`, names its home volume, which holds a login
* **MIT, with Stef Klaassen as the copyright holder, on the human's word.** The year is that of the first public
  release, 2026
* **The checks of `deploy.sh` move into `npm publish`, on the human's word.** `deploy.sh` did four things besides
  uploading. Two are kept, as a `prepublishOnly` script of `package.json`: refusing a version without release notes,
  and running the suite. They sit in the publish itself so that there is no way to publish that passes them by,
  which a script wrapped around `npm publish` would leave open. The third, never replacing a released version, the
  registry does itself. The fourth, fetching the release to see that it is served, is what the install of step 6 of
  `RELEASING.md` does. Plain `npm publish` with no check, and a `deploy.sh` cut down to the two checks, were the
  alternatives the human turned down
* **`npm publish` also refuses a working tree that is not clean, on the human's word.** It is a third check in the
  same `prepublishOnly` script, and `deploy.sh` had none like it. What is published is then what a commit holds.
  The specifier listed it together with a refusal off `master`, and the human took the first and not the second:
  releasing from another branch is allowed
* **The package says what it is on the registry, on the human's word.** The description is the first line of
  `README.md`. The keywords are what the kit is and what it runs. `homepage` and `bugs` are the README and the
  issues of the repository on GitHub
* **`infra/` and `deploy.sh` are removed by the unit, and what they deployed by the human.** The human asked for the
  CDK part to go. Every release up to 5.0.0 is installed by its URL: the lockfile of each repository that uses the
  kit pins that URL with an integrity hash, and `npm ci` there fails once the host stops answering. So the host
  goes last, when this repository and the other projects have moved, and after that no commit of any of them from
  before its move can run `npm ci`. After this unit no file outside `changes/` says that the stacks exist, so they
  are named here: `AgentRiteHostingStack` in eu-west-1 and `AgentRiteCertStack` in us-east-1. The bucket is
  retained when its stack is deleted, and is emptied and deleted by hand
* **This repository moves to the release in a unit of its own.** It installs its own release as a devDependency and
  follows it: its `AGENTS.md` sends agents to the installed `process.md`, and `./sandbox.sh` runs the installed
  sandbox. No version is on the registry until this unit is released, so the unit cannot make the move, and it
  leaves every file of that setup as it is, so that the repository keeps working until then. Step 6 of
  `RELEASING.md` cannot make it either, this once: the move takes the steps of requirement 5 and not that step's
  five commands, which is the case in which that step says to stop and make it a unit. Unit 0012 did the same after
  the rename of unit 0011. Not established: that npm installs a package from the registry into a project of the
  same name. It does so from a URL today
* **Step 6 pins one version.** `--save-exact` writes `<version>` and not a range into `package.json`, so that the
  file names the one release the repository follows, as the URL did, and the diff that step 6 checks stays one line
* **No version in the commands of `README.md`.** The registry resolves the newest release, so the README has no
  version for a release to move, and step 4 of `RELEASING.md` loses that edit. Updating uses `@latest` because it
  moves a project across a major version, which `npm update` does not
* **The kit stops admitting its old host.** A release that holds this unit is installed from the registry, which
  the kit admits already. A project that stays on an older release keeps that release's sandbox, which admits the
  host
* **Earlier releases are not published on the registry.** The first version of the kit on the registry is the
  release that holds this unit, and a project reaches it by the steps of requirement 5. The releases before it stay
  where they are for as long as the host answers
* **The pointer `agentrite` goes and `agentrite-roles` stays.** The first becomes the kit. The second still holds
  the name of a command the kit had, and gets new text. Its version moves by a patch because the registry takes a
  version once, and publishing it is the human's
* **The move to GitHub is the human's, and the plan holds it.** The human asked for it to be part of the unit, as
  steps to take. An agent has no account on GitHub or on the registry and does not publish, so the unit's part is
  to write the steps down, with their commands, in the order that works. They are in the plan because that is where
  unit 0011 put the steps of the last move, and as a list because they are taken after the unit is `implemented`,
  when an open box would stop that status
* **The order of the human's steps.** The repository is made only once the unit is on `master`, so that the first
  thing GitHub holds has the license and names GitHub and not Bitbucket. It is public from the start, on the
  human's word: nothing in the repository or its history is to be kept back, so a private stage would protect
  nothing. Between the first push and the release its README names a package that is still the pointer, which
  lasts as long as the steps take. The pointer `agentrite-roles` comes after the release, because it sends a reader
  to a package that has to be there. The host goes last, for the reason above
* **One remote with two addresses to push to.** The human asked for GitHub as the default to pull from and push
  to, with Bitbucket kept as a second place to push. A second push address on `origin` does that with the one
  `git push --follow-tags origin master` that step 7 of `RELEASING.md` already gives, so that file does not change
  and Bitbucket cannot be forgotten. A second remote named for Bitbucket would need a push of its own every time

## Non-goals

* Doing any of the human's steps of requirement 20. The unit writes them down, and is `implemented` before the
  first of them is taken
* Moving this repository to the release. It is a unit of its own, after the release
* A unit in another project. Each project's move is its own, and requirement 20 only lists it
* Changing or removing anything in the git history, or in the records under `changes/`
* Publishing a release before this one on the registry
* A package or a pointer named `@ritenoar/agentrite` on the registry
* Renaming the command, the image labels, a Compose project, or the directories the sandbox keeps on the host
* A section in `CHANGELOG.md`. It is written when the release is made
* A change to what the sandbox does, beyond the one host it no longer admits and the path its files are at

## Beyond the request

* A refusal by `agentrite` when it is run from a copy that is not the project's own `node_modules/agentrite`,
  saying that the kit is not installed and to run `npm install agentrite`. It would keep what the pointer did. It
  would cost a check of where the command runs from, and a `node_modules/agentrite` in every test that runs the
  command in a scratch project. Without it, `npx agentrite init` in a project without the kit writes its files and
  exits 0, and the first thing that fails is `./sandbox.sh`, with the shell's "No such file or directory", or an
  agent that does not find `process.md`. `npm install agentrite` then repairs it
* A refusal by `sandbox.sh` of a `.dockerignore` that still excepts `node_modules/@ritenoar/agentrite/container`,
  for a project that skipped step 3 of requirement 5. It would cost a check and its tests for one update. Without
  it the build of the image fails on a file it cannot copy, and the release notes say which step was skipped
* Publishing from a pipeline on GitHub, with provenance. It would cost a workflow, a token kept as a secret, and a
  release process that no longer ends on the host. Without it the human publishes by hand, as now
