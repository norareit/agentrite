---
kind: bug
status: draft
timestamp: 2026-10-04T01:28:52Z
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

## Amendments
