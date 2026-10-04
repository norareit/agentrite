---
kind: bug
status: draft
timestamp: 2026-10-04T00:39:14Z
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

## Amendments
