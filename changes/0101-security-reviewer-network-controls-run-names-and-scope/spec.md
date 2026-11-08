# 0101 The security reviewer: the network controls, a name for each run, and the scope of an audit

## Context

The security reviewer, one of this repository's own roles, reviews a unit's diff for security or, on the human's
request, audits the code base, always in the sandbox. Its file is `extra-roles/security-reviewer.md`, and "Security
findings" of `AGENTS.md` holds the rules on what it finds.

The human started an audit of the whole code base in the sandbox, and the run was stopped partway through by a safety
classifier of the harness. They will start it again in a fresh clone of the default branch, limited to fewer files,
with the instruction to report from reading the code and to build no working way past the network controls. Talking
that restart through showed three gaps in the role, which this unit closes. It changes how the role works, and holds
no finding of a review and describes none.

The three gaps:

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
12. The role file says that after an audit the human moves the findings file from `<clone>/.reviews/security-audits/`
    to the project's `.reviews/security-audits/`, making that directory when it is not there, and then removes the
    clone
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

Everywhere else:

18. No document, script, test or configuration of the repository but the role file and its wrappers names the old
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
  `.reviews` as the mounted directory and not a file in it, and `CHANGELOG.md` names neither path. Requirement 18
  keeps it so
- **A limited audit reads past its scope only to judge what is in it.** Its findings are of the scope. Code outside it
  that the scope calls, or that calls it, may be read to judge a finding within the scope, which is how a review of
  part of a code base can be made at all
- **The scope opens the file, before any finding**, so that a reader who opens the file, or reads only its start,
  cannot take it for a full audit

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
