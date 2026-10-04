# 0023 OpenCode cannot log in to OpenAI in the sandbox

## Approach

The fix is two hosts more in `KIT_ALLOWLIST` in `container/compose.yml`, the places that list the kit's hosts, and a
README section on logging in. The regression test is the one 0015 added, `tests/compose-allowlist.test.mjs`, whose
list of hosts the kit must admit gains the two, so it runs on the host without Docker and no second reader of the
block is written. Nothing else under `container/` changes, and neither does `init`.

What only a running container and the human's account can show, requirements 1 to 3, is checked with
`./agent-dev.sh`, which 0021 added: it runs the working copy's base Compose file, where the two hosts are, under an
image and a home volume of its own. `./agent.sh` runs the released kit and gets the hosts only with a release.

The dev home volume starts without an OpenCode login when it is new. The implementer removes it before the run, so
that it is new, and leaves it in place afterwards for the human's check, which logs in there. That login stays in
the dev home volume until the human removes it with the command the README gives.

## Files

- `tests/compose-allowlist.test.mjs`: the two hosts in the list the kit must admit
- `container/compose.yml`: two hosts in `KIT_ALLOWLIST`, each under its comment
- `README.md`: the two hosts in both sentences that list what the kit admits itself, a new section "Logging in to a
  model provider" under "Running the sandbox", after "The status line", and one sentence where the files `init`
  writes are described
- `templates/project/agent/compose.project.yml`: the two hosts in the comment above `ALLOWLIST` that lists what the
  kit admits itself
- `agent/compose.project.yml`: that same comment, brought to what the template's says

## Tasks

- [x] In `tests/compose-allowlist.test.mjs`, add `auth.openai.com` and `chatgpt.com` to the hosts the first test
      holds `KIT_ALLOWLIST` to include, and say in its comment what each is for. Run it and see it fail for want of
      the two (R4)
- [x] In `container/compose.yml`, add to `KIT_ALLOWLIST`: `auth.openai.com`, under a comment that OpenCode's login
      with a ChatGPT account, and every refresh of its token, goes there, and `chatgpt.com`, under a comment that
      OpenCode sends the prompts of a ChatGPT login there. See the test pass (R1, R2, R3, R7)
- [x] In `README.md`, add the two hosts to the two sentences that list what the kit admits itself, removing nothing.
      In `templates/project/agent/compose.project.yml`, add them to the comment that lists what the kit admits
      itself, and make the comment above `ALLOWLIST` in `agent/compose.project.yml` list the same hosts as the
      template's. Run the `init` tests, which hold the lines of the generated file to 120 characters (R6)
- [x] In `README.md`, add the section "Logging in to a model provider" after "The status line", removing nothing. It
      says, in this order: a login is done once per home volume, from the sandbox's shell; a login that sends the
      browser to a port on `localhost` cannot complete, because the browser is on the host, the sandbox publishes no
      port and its firewall drops inbound connections, and that this is deliberate; for OpenAI in OpenCode with a
      ChatGPT account, the command `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"`, that it prints
      an address and a code to enter in any browser, and that the kit admits `auth.openai.com` and `chatgpt.com`
      itself, so the project adds nothing; with an API key, that the project's `ALLOWLIST` needs `api.openai.com`;
      and that a host missing from the allowlist shows as a refusal in `/run/egress-proxy.log`. In the bullet on
      `agent/compose.project.yml` under "Installing it into a project", add after "Add the API host of any other
      model provider the project's agents use" that a provider's login may need further hosts, pointing at the new
      section (R5)

## Verification

- [x] `npm test` passes on the host
- [x] `git diff master -- container scripts` shows the lines added to `KIT_ALLOWLIST` and nothing else: no port, no
      firewall rule, and `init` as it was (R7)
- [x] `npm pack --dry-run` lists the same files as on `master`
- [x] `npm run check-changes` passes
- [x] No line of a changed file is over 120 characters, and none holds an em dash
- [x] The implementer's run, without logging in, with `./agent-dev.sh` on a new dev home volume:
      `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"` prints the device page's address and a code
      (R1), and `grep 'not allowlisted' /run/egress-proxy.log` does not name `auth.openai.com`. Stop the login
      there. What was seen is in the record, with the Docker and Compose versions (R8)
- [x] The human's check, which needs their ChatGPT account, in a sandbox started with `./agent-dev.sh`: run the
      command, enter the code in the host's browser, and see the login complete; `opencode auth list` names OpenAI;
      send one prompt to an OpenAI model in OpenCode and see it answered (R2). Then `grep 'not allowlisted'
      /run/egress-proxy.log` names neither `auth.openai.com` nor `chatgpt.com` (R3). Every other host refused there
      during the login and the prompt is logged in the record (R8). If the login does not complete, or the prompt
      needs a host that is not admitted, the record says what was seen and the unit goes back to the planner, since
      the spec's fix rests on what it lists as not established

## Commit Points

- [x] The regression test and the two hosts
- [x] The lists of the kit's hosts and the README section
- [x] The record of the implementer's run, and later of the human's check
