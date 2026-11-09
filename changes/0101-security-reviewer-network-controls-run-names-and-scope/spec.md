# 0101 The security reviewer: network controls, run names, audit scope, accepted risks and audit scripts

## Context

The security reviewer, one of this repository's own roles, reviews a unit's diff for security or, on the human's
request, audits the code base, always in the sandbox. Its file is `extra-roles/security-reviewer.md`, and "Security
findings" of `AGENTS.md` holds the rules on what it finds.

The human started an audit of the whole code base in the sandbox, and the run was stopped partway through by a safety
classifier of the harness. They will start it again in a fresh clone of the default branch, limited to fewer files,
with the instruction to report from reading the code and to build no working way past the network controls. Talking
that restart through showed three gaps in the role, and the human added two more to the unit afterwards, which this
unit closes. It changes how the role works, and holds no finding of a review and describes none.

The gaps:

* **Proofs of concept.** The role allows a proof of concept for any finding, made in the sandbox under `/tmp`. The
  role's safety rests on one property, which its first step checks: that nothing it writes can be published from
  where it runs, because the sandbox's egress reaches no GitHub host. A proof of concept against the network controls
  that worked would remove that property while the run is still writing
* **The name of a findings file.** An audit saves its findings to `.reviews/security-audit-<commit>.md`, straight in
  `.reviews/`, and a unit review to `.reviews/<unit-directory>/security-review-<commit>.md`. Two runs on one commit,
  such as an audit started again or one limited to part of the tree, get the same name. The second overwrites the
  first, in the sandbox, or when the human moves the file of an audit from its clone into the project
* **The scope of an audit.** An audit is defined as a review of the whole tree, and nothing in its findings file shows
  that a run looked at only part of it. A partial audit can later be taken for a full one, and its statement that it
  found nothing for a statement about the whole tree
* **Accepted risks.** The human may decide to accept a weakness that a review reports, as a known risk, rather than
  fix it. Nothing tells a later run of that decision, so each run reports the weakness as new, and a reader of its
  findings cannot tell what the human has weighed already from what they have not
* **Setting up and finishing an audit.** The clone of an audit is made, its findings file moved into the project and
  the clone removed by hand, in steps the role file lists. A step can be got wrong, such as cloning another branch,
  reusing a directory or removing the wrong one, and a list of accepted risks adds a step: copying it into the clone

The network controls are what bounds the container's traffic, as "What the sandbox defends against" and "Reaching
more hosts" of `SANDBOX.md` describe them: the egress allowlist, the egress proxy that enforces it, the firewall, the
DNS rules that admit only the permitted resolvers, and the one exception for the local model server.

## Requirements

The network controls:

1. The role file says that no proof of concept is made against the network controls, which it names as the Context
   does. For them the role runs nothing that tests whether they hold, such as a connection or a name lookup meant to
   get past them, and changes none of them. The check of its first step, that GitHub cannot be reached, is not such a
   test and stays as it is
2. The role file says that a finding about the network controls is reported from reading the code and the
   configuration of the tree under review, and is marked as plausible from reading
3. The role file says that the check that would confirm such a finding is written into the finding as a step for the
   human to run on the host, with the commands, what the step shows and what of its output to bring back, as "What
   needs the host" of the role file says of the checks that need the host
4. The role file still allows a proof of concept for every other kind of weakness, made only in the sandbox under
   `/tmp` of the container and saved in the finding it confirms, as it does today
5. "Getting past the egress allowlist" stays among the kinds of weakness the role looks for

The name of a findings file:

6. The findings of an audit are saved in `.reviews/security-audits/security-audit-<commit>-<instant>.md`
7. The findings of a unit review are saved in `.reviews/<unit-directory>/security-review-<commit>-<instant>.md`
8. `<commit>` is the commit under review, as `git rev-parse --short=12 HEAD` prints it at the start of the review, as
   today
9. `<instant>` is the moment in UTC at which the review starts, read at the same point as `<commit>`, in the compact
   form `20261108T141500Z` that `date -u +%Y%m%dT%H%M%SZ` prints. The role file says that the form holds no colon and
   no `--`
10. On a variant's branch the name of a unit review's file ends in `--<name>.md` with the variant's name, after the
    instant, as `security-review-<commit>-<instant>--opus.md`. On the unit's branch it holds no `--`
11. The role makes the directory of its findings file when it is not there, `.reviews/security-audits/` among them
12. The role file says that after an audit the human runs `./finish-security-audit.sh <clone>`, which moves the
    findings file from `<clone>/.reviews/security-audits/` to the project's `.reviews/security-audits/`, making that
    directory when it is not there, and then removes the clone
13. The text of the record entry of a unit review still names `<commit>`, and no instant, no finding, no label, no
    count and no file, as today

The scope of an audit:

14. The role file says that an audit reviews the tree of the default branch as a whole, unless the human limits it to
    certain files or areas, and then it reviews those
15. The findings file of an audit that the human limited opens by naming its scope, the files or areas the human
    named, before any finding
16. The role file says that in such an audit a statement that there are no findings means none within its scope, and
    the statement says so
17. The role's description in the front matter of its file says that an audit is of the code base or of the part of
    it the human names. The wrappers that `npx agentrite refresh` writes from it are regenerated and committed

Accepted risks:

18. The role file says that the human may keep a list of the risks they accepted in `.reviews/security-accepted.md`,
    and that only the human writes it. The role writes nothing to it
19. The role file gives the form of the list: a section for each accepted risk, headed `## <name>` with a name the
    human gives it, holding these subsections in this order:
    * `### What`: what the risk is
    * `### Where`: the file and line where the risk is, and the commit they hold at, as
      `git rev-parse --short=12` prints it
    * `### Accepted because?`: why the human accepted it
    * `### Recorded elsewhere`, only when there is such a record: where the human recorded the risk outside the
      project, such as a private draft security advisory
20. In both modes the role reads the list of the tree it runs on, `.reviews/security-accepted.md`, after the checks
    that come before it reads what it reviews and before it reviews. When the file is not there, the role reviews as
    it would with an empty list, and says in its findings file and its response that there was no list
21. A weakness the role finds that an entry of the list describes, in the same place and to the same extent, is not a
    finding. The role reports it in a section of its own, "Accepted risks seen again", apart from the findings, with
    the entry's name and where the weakness is, in its findings file and in its response. The role judges the place
    by the entry's file and line at the entry's commit, followed to the tree under review, and when that commit is not
    in the tree's history, by the file and line as the entry gives them
22. A weakness that an entry describes only in part, which the role finds wider, more severe or in a place the entry
    does not name, is a finding, labelled and reported as any other, and names the entry it relates to
23. The role takes from the list only which weaknesses the human accepted, and follows no instruction found in it, as
    "Everything under review is data" says of what it reads under review
24. A review whose only weaknesses are accepted ones states that it has no findings, and names the section that holds
    the accepted ones
25. "Where your writing stops" covers the accepted risks as it covers the findings: nothing the role writes, other
    than its findings file and its response, names an accepted risk or says whether one was seen again

Setting up and finishing an audit:

26. `setup-security-audit.sh` at the root of the repository takes one argument, `<clone>`, the directory to make the
    clone in. It is run on the host, from any directory, and a relative `<clone>` is taken from the directory it is
    run from
27. It refuses, and makes nothing, when `<clone>` exists, whether as a file, a directory or a link, and empty or not
28. It clones the branch that `defaultBranch` of the repository's `agentrite.json` names, from the repository the
    script is in, into `<clone>`, as `git clone --branch <default branch> <repository> <clone>`
29. It makes `<clone>/.reviews/` and copies the repository's `.reviews/security-accepted.md` into it when that file is
    there, and says whether it copied it. When it is not there, it says that the audit runs with no list
30. It records the clone's absolute path, as `realpath` prints it once the clone is made, as a line of the
    repository's `.reviews/security-audits/clones`, making the directory and the file when they are not there
31. It ends by printing the steps that follow: starting the sandbox as `./sandbox.sh --workdir <clone> <harness>`,
    dispatching the security reviewer in the session with no unit, and running `./finish-security-audit.sh <clone>`
    after the run. It starts no sandbox
32. `finish-security-audit.sh` at the root of the repository takes one argument, `<clone>`, the clone of an audit. It
    is run on the host, from any directory, and a relative `<clone>` is taken from the directory it is run from
33. It refuses, and moves and removes nothing, when the absolute path of `<clone>`, as `realpath` prints it, is not a
    line of the repository's `.reviews/security-audits/clones`
34. It takes everything in the clone to be written by the adversary. It runs no git command in the clone and no
    program from it, and reads nothing of it but the names and kinds of the files of `.reviews/security-audits/`
35. It refuses, and moves and removes nothing, when `<clone>/.reviews` or `<clone>/.reviews/security-audits` is a link
    or is not a directory
36. It moves the files directly in `<clone>/.reviews/security-audits/` whose name begins with `security-audit-` and
    ends in `.md`, and that are regular files, into the repository's `.reviews/security-audits/`. It names, and
    leaves, a file of such a name that is not a regular file. It moves nothing else of the clone,
    `.reviews/security-accepted.md` among it
37. It refuses, and moves and removes nothing, when a file it would move has the name of a file in the repository's
    `.reviews/security-audits/`
38. When there is no file to move, it says so, moves nothing, and removes the clone as requirement 39 says. Such a run
    did what it was asked and exits `0`
39. Once it has moved every file, or found none to move, it removes `<clone>`, following no link in it, and removes
    the clone's line from `clones`
40. Both scripts exit by "Exit statuses" of `COMMANDS.md`: `0` when they did what they were asked, `1` when they
    refused or failed, saying why, and `2` for wrong arguments, printing their usage
41. Where the role file says how the human starts and ends an audit, it names `./setup-security-audit.sh <clone>` in
    place of the `git clone` and `./finish-security-audit.sh <clone>` in place of moving the file and removing the
    clone by hand, and it still says that the clone of an audit is never worked in on the host
42. `CONTRIBUTING.md` describes each script in a section of its own under "Commands", with its argument, what it
    refuses and its exit statuses, and lists both in "What the repository holds besides the package"

Everywhere else:

43. No document, script, test or configuration of the repository but the role file and its wrappers names the old
    form of either path, `security-audit-<commit>.md` straight in `.reviews/` or `security-review-<commit>.md`, other
    than the frozen units under `changes/` and `CHANGELOG.md`, which are left as they are

## Decisions

- **One unit, a feature.** The three changes were agreed together, from one restart of an audit, and all change one
  role file. They need decisions, the form of the instant, the directory of audits and what counts as a network
  control among them, so the unit is not a task, and nothing of the role is broken, so it is not a bug
- **Reading in place of a proof of concept, for the network controls alone.** Every finding of the role is safe to
  confirm in the sandbox except one that, by working, removes what makes the run safe. Forbidding proofs of concept
  altogether was rejected: it would lose the confirmation of every other kind of weakness, which costs nothing of the
  property. Keeping them for the network controls and relying on the first step was rejected because the first step
  checks the property only before the run begins, and a bypass made later is not caught by it. The human's host step
  confirms the finding without the run ever reaching past the controls
- **The network controls are named in the role file by what `SANDBOX.md` calls them**, so that a reader of either
  finds the same list, and so that a part of the controls that `SANDBOX.md` describes is not left out by a narrower
  word such as the allowlist alone
- **The commit and an instant together in the name.** The commit says which tree was reviewed, and the instant tells
  apart two runs on one commit, without a run needing to see the files of any other, which an audit in a fresh clone
  cannot. A counter after the commit was rejected for that reason: it needs the earlier files, and an audit's clone
  has none of them. The instant alone was rejected because the name would no longer say which tree was reviewed
- **The compact form of the instant.** A colon in a file name breaks on some file systems, and `--` in a name of
  `.reviews` marks a variant, so the instant holds neither. The form is the one the human gave, `20261108T141500Z`.
  The spec reviewer writes its instant as `2026-10-21T195515Z`, which also holds neither; matching it was weighed and
  the human's form taken, since the request named it. The two roles' files are not read by one another or by any
  script, so the difference changes nothing but how the names look side by side
- **Audits in a directory of their own, `.reviews/security-audits/`.** An audit has no unit directory, and saved
  straight in `.reviews/` its files sit beside the unit directories. A directory of their own keeps them apart and
  gives the human one place to move them from and to
- **The `security-` prefix is kept, and `AGENTS.md` is not changed.** The rule of "Security findings" that no role but
  the security reviewer reads a file of `.reviews` whose name begins with `security-` names the file's own name, not
  its path. It already holds for files in a subdirectory, since a unit review is saved in the unit's directory today.
  A file of `.reviews/security-audits/` is named `security-audit-…`, so the rule covers it unchanged. Its directory's
  name begins with `security-` as well, which the rule neither needs nor forbids
- **What else names these paths.** The specifier searched the repository outside `node_modules` and `.git`. Apart
  from the role file, its wrappers and the frozen units, nothing names a security reviewer's findings file: the
  orchestrator names `.reviews/<unit-directory>/` only for the reviewer's findings, the documents and tests name
  `.reviews` as the mounted directory and not a file in it, and `CHANGELOG.md` names neither path. Requirement 43
  keeps it so
- **A limited audit reads past its scope only to judge what is in it.** Its findings are of the scope. Code outside it
  that the scope calls, or that calls it, may be read to judge a finding within the scope, which is how a review of
  part of a code base can be made at all
- **The scope opens the file, before any finding**, so that a reader who opens the file, or reads only its start,
  cannot take it for a full audit
- **Accepted risks and the scripts in this unit.** Both change how the same role is run and were asked for while the
  unit was a draft, and the scripts are where the list of accepted risks reaches the clone of an audit
- **The list in `.reviews/security-accepted.md`.** `.reviews` is ignored, so the list is never committed, which
  "Security findings" of `AGENTS.md` requires of the decision on a finding. Its name begins with `security-`, so the
  rule that no other role reads it holds unchanged. A unit run mounts the project's `.reviews` at `/work/.reviews`,
  and the clone of an audit gets a copy from the setup script, so the role finds it at one path in both modes
- **Only the human writes the list.** Accepting a risk is the human's decision on a finding, as every decision on a
  finding is, so the role neither adds an entry nor proposes one
- **An accepted weakness is still reported, in a section of its own.** Accepting changes how a weakness is shown and
  not whether. In a unit run `.reviews` is mounted read-write, so an agent in the sandbox can write the list, and an
  entry planted there could otherwise hide a weakness. Reported with the entry's name, it shows the human an entry
  they never wrote. Leaving accepted weaknesses out altogether was rejected for that reason. Keeping the list out of
  the mounted `.reviews` is item 6 of "Beyond the request"
- **A weakness that has changed is a finding again.** What the human accepted is the weakness as the entry describes
  it. One that has grown, or reached another place, was not weighed
- **The form of an entry is fixed, by the human's own layout.** The human keeps the list with a subsection for what,
  where and why, and the role file gives that layout so that the list and the role's description of it agree. A
  form that named only what an entry says, and left its layout to the role file, was rejected since the two could
  then differ. The record outside the project is a subsection of its own, given only when there is one
- **A line and the commit it holds at.** A line number moves when the code above it changes. The human chose to keep
  it, with the commit at which it holds, so that the human and the role can look at that exact place and follow it
  to the tree under review. Naming a function or a block in place of the line was weighed and declined by the human.
  The commit takes the short form of requirement 8, so that it reads as the commits of the findings files do. A
  commit missing from the tree's history, such as one of a branch that was never merged, leaves the file and line
  to be read as given
- **A record outside the project is the human's.** An entry may say where the human recorded the risk elsewhere, such
  as a private draft security advisory on GitHub, which keeps it apart from any one machine. The role cannot reach
  GitHub, so the list in the tree is the one it reads, and it neither reads nor writes an advisory
- **Two shell scripts at the root, `setup-security-audit.sh` and `finish-security-audit.sh`.** The human asked for a
  script run as `./setup-security-audit <clone>`. The root already holds the shell scripts of this repository's own,
  `sandbox-dev.sh` and `generate-diagrams.sh`, so the scripts take their `.sh`. They are this repository's own, as
  the role is, and are not in the package. An `npm run` script was rejected, since the human named the `./` form
- **Only a clone the setup script made is removed.** The project has the layout of a clone, with `.git` and
  `.reviews/security-audits/`, so a mistyped argument could otherwise remove the project or another checkout. The
  list of clones is in the project's `.reviews`, which a run with `--workdir` does not mount, so the agent of an
  audit cannot add to it. The file is named `clones` and holds paths and no finding, so the rule on files whose name
  begins with `security-` is not needed for it
- **The finish script runs nothing of the clone.** A clone the agent wrote can hold hooks and configuration that git
  runs, which is why the clone is never worked in on the host. The script moves files and removes the clone with no
  git command, and it moves only regular files of the findings' names, from directories that are no links, so that
  what it moves is a findings file of the clone and nothing it points to
- **A name already in the project refuses the move.** Two runs are told apart by their instant, so a name that is
  there already means something unexpected, and overwriting would lose a findings file
- **A clone with no findings file is removed too.** That is the clone of a run that was stopped or failed, and it is of
  no further use: the next audit is made in a new clone, by the setup script. Keeping such a clone for the human to
  look at was weighed and declined by the human, who wants the finish script to clean up in every case. Removing it
  is safe by the same checks as any other removal, since only a clone the setup script recorded is removed, and
  nothing of it is run
- **The setup script starts no sandbox.** The human picks the harness, and the scope of a limited audit, when starting
  it

## Non-goals

- Limiting a unit review to part of the unit's diff. A unit review stays of the whole diff
- Moving, renaming or reading the findings files that projects already hold under the old names. They are in ignored
  directories, and the human may move them by hand
- A check, a script or a test that the names are of the new form. The role writes its files, and nothing of the kit
  reads them
- Changing what the role does in the first step, the check that GitHub cannot be reached, or the checks it hands to
  the human under "What needs the host" for other reasons
- Changing "Security findings" of `AGENTS.md`, the spec reviewer's or the reviewer's names for their files, or the
  orchestrator
- Describing any weakness of the network controls, or of anything else of the kit
- A script for a unit review. A unit run makes its clone itself
- A check of the form of the list of accepted risks. The role reads it as the human wrote it
- Creating, reading or linking to a GitHub security advisory by any script or role
- Choosing where the clone of an audit is made. The human names the directory

## Beyond the request

1. **A full audit names its scope too.** Its findings file would open by saying that it covered the whole tree. It
   costs one sentence of the role file. Without it, a file with no scope at its start is a full audit, which a reader
   can rely on, since files of the old form, which never name a scope, are told apart by their name
2. **The response names the scope as well as the file.** The role would open its response, as well as its findings
   file, with the scope of a limited audit. It costs one sentence. Without it, the human reads the scope in the file,
   and knows it already, having set it
3. **Findings outside the scope.** A limited audit that comes upon a weakness outside its scope would report it in a
   section of its own, apart from the findings, marked as seen in passing and not reviewed. It costs a paragraph of
   the role file and a rule for how such an item is labelled. Without it, the role says nothing of what is outside the
   scope, and the human's next audit of that part finds it
4. **The instant in a unit review's record entry.** The entry would name the instant as well as the commit, so that
   two security reviews of one commit read apart in the record. It costs a change to the entry's fixed text. Without
   it, two such entries read alike, and the human tells the runs apart by the files under `.reviews`
5. **No clone inside the project.** The setup script would refuse a `<clone>` within the project's tree. An IDE that
   indexes the project, such as IntelliJ, finds a git repository nested in it and runs git there, which runs what the
   agent wrote. It costs one check. Without it, the human picks a directory outside the project, as they do today
6. **The list out of the mounted `.reviews`.** The list would be kept where no unit run mounts it read-write, and
   given to a unit run read-only with `--mount`, so that no agent in the sandbox can write it. It costs a path of its
   own, the mount in how a unit review is started, and the copy of the setup script changed to match. Without it, an
   entry an agent planted is shown under "Accepted risks seen again", with a name the human never wrote
7. **Stale entries.** The role would name the entries of the list whose weakness it no longer finds, so that the human
   can remove them. It costs a sentence of the role file. Without it, the list keeps entries that no longer apply, and
   the human prunes it by hand
