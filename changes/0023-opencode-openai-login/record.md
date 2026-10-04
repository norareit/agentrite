---
kind: bug
status: implemented
timestamp: 2026-10-04T01:54:18Z
---

# 0023 OpenCode cannot log in to OpenAI in the sandbox

## Log

- 2026-10-04T00:29:54Z [human] while carrying out the last verification task of 0015 in a sandbox with a new home
  volume, tried to log OpenCode in to OpenAI through the browser. The browser on the host was sent to
  `localhost:1455/auth/callback` and could not connect. Said "if those ports aren't exposed, I guess they should,
  right?! because obviously you need to be able to login to OpenAI in OpenCode", and asked for a new unit with the
  fix for the login
- 2026-10-04T00:39:14Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in a worktree of this
  repository, and wrote `spec.md` and `plan.md` on the branch `bugfix-0023-opencode-openai-login`, made from
  `master`. A bug, with a plan because the fix comes with a regression test, three documentation edits and a check
  that needs the human's account. The number was given by the session that dispatched the planner, since 0021 and
  0022 were being written at the same time. What the spec's root cause rests on, gathered on Linux with Docker
  Engine 28.4.0 and Compose 2.39.2:
  * The binary of OpenCode 1.18.30, copied out of the existing image `ritenoar-agentrite-agent`: the three login
    methods for `openai`, the port 1455 and its `localhost` redirect, the device-code requests to
    `auth.openai.com`, and `https://chatgpt.com/backend-api/codex/responses` as where a ChatGPT login's prompts go
  * Two containers from that image, under `master`'s `container/compose.yml` and this repository's
    `agent/compose.project.yml`, each with a Compose project name, a home volume and a working directory of its
    own, and an extra Compose file outside the repository that set `ALLOWLIST`. Both lists held the two hosts of
    0015, which is not on `master`. One also held `auth.openai.com` and `chatgpt.com`
  * In the first: the firewall's rules, no port bindings, the browser method listening on `*:1455`, a request from
    the host to the container's address on 1455 timing out, the same request over loopback inside answered with
    400 for its made-up state, a second browser login failing on the port in use, and the headless method failing
    with `auth.openai.com` refused
  * In the second: the start-up check passing with both hosts, and the headless method printing the device page and
    a code, with `auth.openai.com` allowed in the proxy's log. The login was stopped there
  * OpenCode's documentation of its providers, which names the browser method and the API key for OpenAI and not
    the headless method
  Both containers, both volumes and both networks are removed. No container, volume or image of the human's was
  touched, and nothing was logged in to
- 2026-10-04T00:39:14Z [Claude Code, anthropic/claude-opus-5-5] as planner, what the spec decides and what it leaves
  open:
  * The port is not published. The firewall would drop the callback anyway, and OpenCode has a login that needs no
    callback. The two hosts go in the project's allowlist, here in this repository's, and not in the kit's
  * Not established, and the plan's last verification task is the human's for that reason: that the headless login
    completes, and that a prompt after it needs `chatgpt.com` and no third host
  * One check was not made. Delivering a callback with a made-up code to the pending browser login, to see whether
    the token exchange is what the proxy refuses, was denied by the session's permission system, and was not
    pursued another way. The spec lists it as not established
  * For the human to decide: whether a ChatGPT account is how this repository's agents use OpenAI, or an API key,
    for which `api.openai.com` is already admitted and nothing but documentation is missing; and whether admitting
    `chatgpt.com`, which serves all of ChatGPT, is acceptable in this repository's sandbox
  Status left at `draft` for the human's approval
- 2026-10-04T01:28:52Z [human] answered the planner's questions, in the session that implemented 0015, 0021 and
  0022: the login is with a ChatGPT account; admitting `chatgpt.com` is acceptable; and, told that the draft gave
  other projects documentation only, with the kit's own allowlist as an alternative that the draft and the
  implementer both advised against, decided for the kit's allowlist: "Add it to the kits allowlist. If someone
  opposes this, they'll have to complain about it then and we'll see from there. PRAGMATISM."
- 2026-10-04T01:28:52Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in that session, and rewrote
  `spec.md` and `plan.md` for the decision. The branch was first taken out of the first planner's worktree, which
  was clean and was removed, and rebased onto `master` at `afb0b0e`, which holds 0015, 0021 and 0022, without
  conflict. The first planner's commit is `6e0bdeb` since. What changed in the documents:
  * `auth.openai.com` and `chatgpt.com` go in the kit's own allowlist and not in this repository's. The spec
    records the decision as the human's, with the human's words, against the first draft, and says what it costs:
    every project's sandbox admits both hosts, whether or not it uses OpenAI. The boundary paragraph says so too
  * R4's regression test is now 0015's test of the kit's allowlist, extended, in place of a new test of this
    repository's project Compose file. R5 says that the kit admits the hosts and a project adds nothing. R6 is
    the rule 0015 had, that every place listing the kit's hosts names the new ones, and brings this repository's
    own copy of the generated comment in line, which 0015 left stale. R7 no longer says the kit's allowlist is
    unchanged
  * A login with an API key is a non-goal, and `api.openai.com` stays in the project's allowlist. Moving it to the
    kit's as well is listed as beyond the request. The provider argument to `init` is gone from that list, since
    nothing is left for it to write
  * The plan's real run and the human's check use `./agent-dev.sh`, which 0021 added, in place of an extra
    Compose file written by hand. The human's login therefore lands in the dev home volume
  Nothing new was run for this rewrite. The evidence is the first planner's, and what it lists as not established
  still is: that the headless login completes, and that a prompt after it needs `chatgpt.com` and no third host.
  The first planner admitted the two hosts through the project's allowlist. The entrypoint joins both lists into
  one, by the README, so the kit's list is expected to behave the same, and the implementer's run is where that is
  seen. Status left at `draft` for the human's approval
- 2026-10-04T01:30:02Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the same session, on
  the host, on Linux. The human's words were an instruction to make the change, "Add it to the kits allowlist", and
  the human let the same reading stand for 0021 and 0022, so the implementer took them as the approval of the
  rewritten spec and plan and moved the status through approved to in-progress. The human had not read the
  rewritten documents when the work began. That reading is the implementer's, and the human is told of it
- 2026-10-04T01:33:00Z [Claude Code, anthropic/claude-opus-5-5] implemented the plan's four tasks in two commits,
  `7faf72d` with the regression test and the two hosts and `699dc40` with the lists of the kit's hosts and the
  README section. The unit stays in-progress: the human's check is open, and so is the last commit point, which
  waits for it, and no review has been made. What was verified:
  * `tests/compose-allowlist.test.mjs` failed on the tree before the fix, naming `auth.openai.com` and
    `chatgpt.com` as the two hosts missing from `KIT_ALLOWLIST`, and passes after it
  * On the host, on `699dc40`: `npm test` reported 188 passing and 0 failing. `git diff master -- container
    scripts` shows the four lines added to `KIT_ALLOWLIST` and nothing else (R7). `npm pack --dry-run` lists 23
    files, the same list as an export of `master`. No line of a file changed against `master` is over 120
    characters and none holds an em dash. `npm run check-changes` exited 0 on the commit that holds this entry
  * The implementer's run, on Linux with Docker Engine 28.4.0 and Compose 2.39.2, with `./agent-dev.sh`, on a dev
    home volume that did not exist before the run. The proxy listened for the two new hosts and the start-up check
    found both reachable. `opencode auth list` named no credential. Under `script`, so on a pseudo-terminal,
    `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"` printed `Go to:
    https://auth.openai.com/codex/device` and `Enter code:` with a code, and waited (R1). It was stopped after 45
    seconds, and nothing was logged in to. The proxy's log then held `allowed auth.openai.com` once after
    start-up, and its only refusal for want of an allowlist entry was the canary's, `example.com`
  * A first attempt, with the command's output piped and no terminal, printed `Add credential` and nothing more
    in 20 seconds, and made no connection to `auth.openai.com`. The command wants a terminal, which a developer
    in the sandbox's shell has
  * Left on the host for the human's check: the dev image, network and home volume, the volume holding no login
  * Not checked: that the login completes, that a prompt is answered, and what a prompt contacts, which are the
    human's check (R2, R3); Docker Desktop for macOS; `./agent.sh`, which runs the released kit and gets the
    hosts only with a release
- 2026-10-04T01:39:18Z [human] carried out the plan's check, on Linux with Docker Engine 28.4.0 and Compose 2.39.2, in
  a sandbox started with `./agent-dev.sh` on this branch: ran the headless login with a ChatGPT account, and
  reported that OpenCode answered a prompt on an OpenAI model. Pasted the output of
  `grep 'not allowlisted' /run/egress-proxy.log`, which was one line, the refusal of `example.com`
- 2026-10-04T01:39:18Z [Claude Code, anthropic/claude-opus-5-5] as implementer, read the same container while it ran
  and ticked the plan's last task and commit point on what the human reported and this showed:
  * `opencode auth list` named one credential, `OpenAI oauth` (R2)
  * The proxy's log held no refusal for want of an allowlist entry but the canary's, so none of `auth.openai.com`
    or `chatgpt.com` (R3), and no other host was refused during the login and the prompt (R8)
  * After the start-up check, `auth.openai.com` was allowed twice and `chatgpt.com` twice. `api.openai.com` was
    allowed once, which is the start-up check alone, so in this session a ChatGPT login did not use it
  * That settles two things the spec lists as not established, for this account on this host: the headless login
    completes, and a prompt after it needs `chatgpt.com` and no third host
  * The login is in the dev sandbox's home volume. Every task in `plan.md` is ticked. The status stays in-progress
    until a review has been made. No file but the plan and this record changed since `699dc40`, on which the
    suite reported 188 passing and 0 failing, so it was not run again. `npm run check-changes` exited 0 on the
    commit that holds this entry
- 2026-10-04T01:49:20Z [OpenCode, openai/gpt-6.1-sol] reviewed `0023-opencode-openai-login` at commit
  `b17b00a8ec322bb6aaa1813b7e799d18015a17f5`. Full review, with no previous review, against the merge base with
  master, `afb0b0ec1d8d2846819f7667667c75a7760c264d`. Returned C1 (code quality, blocking); spec conformance and
  plan fidelity have no findings. Complete findings:
  `.reviews/0023-opencode-openai-login/review-20261004T014701Z-b17b00a-openai-gpt-6.1-sol.md`.
  Independently ran `npm test` on the reviewed tree: 188 passing, 0 failing, 0 skipped, including end-to-end cases;
  the targeted allowlist/init suites: 46 passing; and `npm run check-changes`: exit 0. Verified the regression's
  expected failure against pre-fix Compose content, the two-host-only merged Compose change with no ports, the
  23-file package filename set and the changed files' wrapping. Could not independently verify R1-R3's original
  clean-home run, human login, answered prompt and proxy observations, or R8's historical host inventory: no dev
  container remains and the transient log is unavailable. The original test-first sequence and historical suite
  run also cannot be independently established. No fresh sandbox or authentication was started. Account/workspace
  eligibility, token refresh, further prompts and their hosts, macOS, API-key login, the original browser refusal's
  cause, manual callback delivery and the released sandbox after a future release remain unverified. The complete
  report distinguishes these limits from the settled allowlist/security decisions. No finding outcome is recorded
- 2026-10-04T01:52:47Z [human] asked the implementer to check the review's remarks
- 2026-10-04T01:52:47Z [Claude Code, anthropic/claude-opus-5-5] as implementer, read the review. It returned one
  finding, C1, which blocks: the entry of 01:39:18Z cites the suite's run on `699dc40` and says it was not run
  again after the plan and the record changed, where the implementer's instructions ask for the suites on the
  final tree and say that an earlier run does not count. C1 is right. That entry stands as it was written, since
  no run was made then. The correction is this one: `npm test` was run on the tree of the commit that holds this
  entry, with this entry already written, and reported 188 passing and 0 failing. `npm run check-changes` exited 0
  on that commit. The reviewer's own run on `b17b00a` reported the same count. Whether C1 is accepted, and whether
  this settles it, is the human's to decide, and the status stays in-progress until then
- 2026-10-04T01:54:18Z [human] told of C1 and of the suite's run on the final tree that answers it, asked for the
  unit to be marked completed. The human raised nothing against the implementer's reading of 01:30:02Z, that the
  instruction to add the hosts to the kit's allowlist was the approval of the rewritten spec and plan
- 2026-10-04T01:54:18Z [Claude Code, anthropic/claude-opus-5-5] took the human's request as the acceptance of C1 with
  the run of 01:52:47Z as its correction, and set the status to implemented: every task in `plan.md` is ticked,
  and the review's one finding is decided. No delta review of the correction was made. `npm test` was run on the
  tree of the commit that holds this entry, with this entry already written, and reported 188 passing and 0
  failing. `npm run check-changes` exited 0 on that commit

## Amendments
