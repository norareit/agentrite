---
kind: task
status: in-progress
timestamp: 2026-11-10T16:10:06Z
---

# 0107 The advisories of a release are created at the release

## Description

Step 8 of `RELEASING.md`, "The advisories", has the human publish the draft security advisory of each finding of
the security reviewer that a release fixes, but no document says who creates that draft or when, nor where its text
comes from. "Security findings" of `AGENTS.md` says nothing of advisories. Task 0102 decided who publishes a draft
and who prints the command, and not who creates it. The spec of unit 0101 rules out that any script or role creates,
reads or links to an advisory. In the release of 8.5.0, which ships the fixes of units 0103 and 0104, no draft
existed, so step 8 had nothing to publish, and the human created and published the two advisories in GitHub's web
form, logged in as the repository's owner.

The human decided, during and after that release, on two things: the security reviewer writes each finding with the
fields of GitHub's advisory form, so that the text of an advisory exists before any release, and step 8 creates and
publishes the advisories in GitHub's web form, from that text, as 8.5.0 did.

### The change, to `extra-roles/security-reviewer.md`

Each finding, of a unit review and of an audit alike, is written with the fields that GitHub's form for a security
advisory asks for, so that the human can copy them into the form as they stand:

* **Summary**: one line that names the weakness, fit to be the advisory's title
* **Details**: where it is, as the file and the line, or the command and the option, and what is wrong
* **Proof of concept**: the proof of concept that confirmed it, with its full text, the command that ran it and what
  it printed, as "Proofs of concept" of the role file already says. For a finding about the network controls, which
  the role makes no proof of concept against, the field holds the steps for the human to run on the host that the
  role already writes for such a finding, and no working way past them. For any other finding that is plausible from
  reading, the field says so and gives the check that would confirm it
* **Impact**: how it is exploited, from what position of the adversary, and which promise of the threat model it
  breaks
* **Severity**: the role's own scale, `critical`, `high`, `medium` or `low`, as it stands, which is also the
  suggested severity of the advisory. GitHub's form names the third `moderate`
* **CWE**: a suggested weakness identifier of the CWE list, or a statement that none fits
* **Affected versions**: the suggested range of released versions that hold the weakness. Its lower bound is the
  first release whose tag holds the commit that brought the weakness in, when the tree under review has the tags,
  and otherwise that commit, named, with the lower bound left for the human. A weakness in code no release holds yet,
  as in the diff of a unit not yet released, says that no release is affected. The upper bound is left open, since
  the patched version is the release that will ship the fix

The fields the role gives each finding now, the fix, how weaknesses of its kind can be kept out in future, and the
entry of the list of accepted risks it relates to, stay, after the fields above. The rule of "Proofs of concept"
that the role makes no proof of concept against the network controls stays as it is, and the field above follows
it. The wrappers of the role that `npx agentrite refresh` writes, `.claude/agents/security-reviewer.md` and
`.opencode/agents/security-reviewer.md`, change only if refresh changes them, which it does only when the role's
description in its frontmatter changes, and this change does not need it to.

### The change, to step 8 of `RELEASING.md`

* Step 8 is taken only in a release that ships the fix of a finding of the security reviewer, after the push of step
  7, as now. For each unit of the release that fixes such a finding, one advisory is created and published
* The default way is GitHub's web form, by the human logged in as the owner of the repository, on any device. Step 8
  says that only the owner can create and publish the advisories of `norareit/agentrite`, which a user account owns
* The human copies the Summary, Details, Proof of concept, Impact, severity and CWE of the finding the security
  reviewer wrote into the form. The agent reads no finding and nothing of `.reviews`, reads nothing of any advisory,
  and runs no command against GitHub
* The agent gives the rest, from what the release holds: the ecosystem `npm` and the package `agentrite`, the
  release's version, the `version` in `package.json`, as the patched version, and a proposed lower bound of the
  affected range from the release's history: the first release whose tag holds the code that the unit's commits
  change, found with git. The human compares it with the range of the finding and decides the range
* Step 8 says where publishing is on a draft's page: the green button reads "Request CVE", and "Publish advisory" is
  in the dropdown of its arrow. A CVE is optional, and may be requested after the advisory is published
* Step 8 says that a published advisory reaches `npm audit` and Dependabot only once GitHub has reviewed it for its
  global advisory database, which is not at once
* Step 8 creates a new advisory for each such unit and changes no advisory that exists. A draft advisory that the
  human keeps for an accepted risk, the "Recorded elsewhere" of an entry in `extra-roles/security-reviewer.md`, is
  not touched by a release
* The commands of `gh` stay as an alternative, for a login that is allowed to create and publish the repository's
  advisories, which another login is not: GitHub answers it with 404. The agent prints them with placeholders for
  what the human copies from the finding: a `gh api -X POST repos/norareit/agentrite/security-advisories` that
  creates the advisory from a JSON body on standard input, with the Details, Proof of concept and Impact as sections
  of its `description`, and takes its `ghsa_id` from the response, then a
  `gh api -X PATCH repos/norareit/agentrite/security-advisories/<ghsa_id>` that sets its `state` to `published`
* The current text of step 8, which asks the human for the ID of an existing draft and its affected range and prints
  a PATCH command that publishes it, is replaced by the above
* The paragraph on `npm deprecate`, which is the human's to take or leave, stays as it is

### The change, to the rest of `RELEASING.md`

* Item 8 of the list at the top says that the human creates and publishes the advisories in GitHub's form, from the
  security reviewer's findings, only in a release that ships the fix of a finding of the security reviewer
* The paragraph under that list on what the agent runs and where it stops says that in step 8 the agent gives the
  package, the patched version and the proposed lower bound of each advisory, and the commands of the alternative,
  and runs nothing
* Step 3 keeps asking whether a unit of the release fixes a finding of the security reviewer. Its sentence on what
  follows from that changes only as far as it needs to say that step 8 creates the advisory of such a unit

### The change, to "Security findings" of `AGENTS.md`

A line saying that the advisory of a fix is created and published by the human at the release that ships the fix, in
step 8 of `RELEASING.md`, from the fields of the security reviewer's finding, and that no role creates one on GitHub
before. The line is added because a role reads `AGENTS.md` and not `RELEASING.md`, and the gap was that no document
said who creates the advisory. It describes no weakness. The rest of the section holds as it is: nothing committed
describes a weakness, the documents of a fix state only what will be true, and no role but the security reviewer
reads a file of `.reviews` whose name begins with `security-`.

### Why one task

The finding's fields and step 8 serve the same step, the creation of the advisory: the fields are what step 8 copies,
and step 8 is the only reader of the fields beyond the human's decision on the finding. Specified apart, either would
refer to a form of the other that does not yet exist.

Nothing else changes: no command and no script. The release session acts in no role and creates nothing on GitHub,
and the security reviewer writes only into its findings file under the ignored `.reviews`, so neither does what the
spec of unit 0101 rules out for a script or a role. The human creates the advisory, as they publish the package and
push.

### What is established

From the release of 8.5.0, on 2026-11-10:

* GitHub's form "Open a draft security advisory" requires a Title, Summary, Details, Proof of concept and Impact,
  and the affected products: the ecosystem, the package, the affected versions and the patched versions. Severity,
  with a CVSS vector, the CVE identifier, which defaults to requesting one later, the weaknesses as CWE and the
  credits are optional. Through the API, those sections of the form are all part of the advisory's `description`
* `norareit/agentrite` is owned by the user account `norareit`, and only the owner can create and publish its
  advisories. A `gh api -X PATCH` that publishes, run with another login, was answered with 404 Not Found
* On a draft's page, publishing is in the dropdown of the arrow beside the green button "Request CVE". Requesting a
  CVE has GitHub review the advisory and assign one before it is published. Publishing first and requesting a CVE
  later is possible
* A published repository advisory was not in GitHub's global advisory database right after publishing. GitHub
  reviews it first, and only then do `npm audit` and Dependabot alert

From GitHub's public API documentation, the page on repository security advisories of the REST API, read on
2026-11-10:

* The create endpoint, `POST /repos/{owner}/{repo}/security-advisories`, requires `summary`, `description` and
  `vulnerabilities`. Each item of `vulnerabilities` requires `package` with its `ecosystem`, `npm` among the values,
  and takes `name`, `vulnerable_version_range`, `patched_versions` and `vulnerable_functions` as optional. It also
  takes `cve_id`, `cwe_ids`, `credits`, `severity` or `cvss_vector_string`, and `start_private_fork`, all optional
* The create endpoint takes no `state`, so an advisory cannot be created already published in one call
* The update endpoint, `PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}`, takes `state` with the values
  `published`, `closed` and `draft`

What is not established: the state an advisory created through the API is given, which the page does not state and
which is taken to be `draft`, as the form's is, and whether the API refuses to publish an advisory that lacks
something the form requires. The commands of `gh` were not run with the owner's login.

## Log

- 2026-11-10T16:10:06Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `e0aeea5`, on the
  human's decision during the release of 8.5.0 that the advisories of a release are created in its step 8. Read
  `RELEASING.md`, "Security findings" of `AGENTS.md`, the record of task 0102, the spec of unit 0101 on advisories,
  "Recorded elsewhere" of `extra-roles/security-reviewer.md` and GitHub's public API documentation of repository
  security advisories. Wrote the record. The status is `draft`
- 2026-11-10T17:07:42Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `c259f3f`, on the
  human's two further decisions: the security reviewer writes each finding with the fields of GitHub's advisory
  form, and step 8 creates and publishes the advisories in GitHub's web form, as the repository's owner, from those
  fields, with the commands of `gh` as an alternative. Replaced the earlier design, in which the agent wrote the text
  of the advisory from the line of `CHANGELOG.md` and printed the commands as the default. Added what the release of
  8.5.0 established, and folded the change of the role file into this task, since it serves the same step. Read
  "Proofs of concept", "What needs the host" and "Reporting" of `extra-roles/security-reviewer.md`. The status is
  `draft`
- 2026-11-10T17:24:06Z [human] approved the record. The status is `approved`
- 2026-11-10T17:24:18Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, cut
  `task-0107-the-advisories-are-created-at-the-release` from `master` at `031ccd6` and began the work. The status is
  `in-progress`
- 2026-11-10T17:26:54Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the change in `a6d9235` and
  `ece462a`. In `extra-roles/security-reviewer.md`, "Reporting" gives each finding the fields of GitHub's advisory form
  first, Summary, Details, Proof of concept, Impact, Severity with its scale, CWE and Affected versions, and then the
  fix, how such weaknesses are kept out and the related accepted risk. In `RELEASING.md`, step 8 is rewritten as the
  description gives it, with the `gh` commands as the alternative, and item 8 of the list at the top, the paragraph on
  what the agent runs and the line of step 3 are brought in line. "Security findings" of `AGENTS.md` gains the line on
  who creates the advisory. Took the only reading that works for the lower bound the agent proposes: the first tag that
  `git tag --contains <commit> --sort=v:refname` prints for the earliest commit that brought in the code the unit
  changes. `npm run kit -- refresh` printed every file up to date, so the wrappers are unchanged. No line of the three
  files outside a table row is longer than 120 characters. On `ece462a`, `npm test` passes, 1898 tests with none failed
  or skipped, and `npm run check-changes` exits 0. Not checked: the `gh` commands, which were not run. Handed over for
  review. The status stays `in-progress`
- 2026-11-10T17:30:16Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of 0107 at
  `0532a7ecc83f0f107fdc8ca964e4954f58581dff` against merge base `031ccd6` with `master`. Returned C1 and C2,
  both non-blocking, in
  `.reviews/0107-the-advisories-are-created-at-the-release/review-0532a7ecc83f-20261110T173016Z.md`.
  `npm test` passed all 1898 tests with none failed or skipped; `npm run check-changes` and
  `git diff --check master...HEAD` exited 0. The owner-authenticated commands and live web form were not verified.
- 2026-11-10T17:34:54Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied C1 and C2 of the review of
  `0532a7ecc83f`, which the human accepted, in `3b4f8f5`. C1: step 8 of `RELEASING.md` says to escape each backslash of
  the copied text as `\\` before its line breaks and double quotes. C2: it says to leave out the line of `cwe_ids` when
  the finding names no CWE. The outcome of both is applied. On `3b4f8f5`, `npm test` passes, 1898 tests with none failed
  or skipped, `npm run check-changes` and `git diff --check master...HEAD` exit 0, and no line of `RELEASING.md` outside
  a table row is longer than 120 characters. The status stays `in-progress`
- 2026-11-10T17:36:44Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a delta review of 0107 at
  `a6709b710f65d3f60dd7190a206e87cb9b5fec59` from `0532a7ecc83f0f107fdc8ca964e4954f58581dff`. Verified the
  corrections of C1 and C2 and returned no findings. Saved the review in
  `.reviews/0107-the-advisories-are-created-at-the-release/review-a6709b710f65-20261110T173644Z.md`.
  `npm test` passed all 1898 tests with none failed or skipped; `npm run check-changes` and
  `git diff --check master...HEAD` exited 0. Three local JSON round-trip checks passed. The owner-authenticated
  commands and live web form remain unverified.

## Amendments
