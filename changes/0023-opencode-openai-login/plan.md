# 0023 OpenCode cannot log in to OpenAI in the sandbox

## Approach

The fix is two hosts in this repository's own allowlist and three pieces of prose. A regression test goes ahead of
the hosts, reading `agent/compose.project.yml` as text the way `tests/compose-tmpfs.test.mjs` reads the base Compose
file, so it runs on the host without Docker. No file under `container/` changes, and neither does `init`.

What only a running container and the human's account can show, requirements 1 to 3, is checked in this
repository's sandbox with the working copy's `agent/compose.project.yml`, which is the file the sandbox reads, on a
new home volume given through an extra Compose file outside the repository, the way 0015 was checked.

Unit 0015 is implemented on its own branch and is not on `master` as this plan is written. It adds
`tests/compose-allowlist.test.mjs`, whose helper reads the `KIT_ALLOWLIST` block of the base Compose file, and it
edits the comment above `ALLOWLIST:` in the template, which is next to the comment this unit edits. If 0015 is on
`master` when the work starts, rebase onto it first; the first task says what then changes.

## Files

- `tests/project-allowlist.test.mjs`: new, the regression test
- `tests/compose-allowlist.test.mjs`: only if it exists, which is when 0015 has landed. Its block reader moves out
- `tests/allowlist-block.mjs`: only in that same case, new, the one reader both tests use
- `agent/compose.project.yml`: two hosts in `ALLOWLIST`, each under its comment, and the opening comment of the block
- `templates/project/agent/compose.project.yml`: the opening comment of the `ALLOWLIST` block
- `README.md`: a new section "Logging in to a model provider" under "Running the sandbox", after "The home volume",
  and one sentence where the files `init` writes are described

## Tasks

- [ ] Add `tests/project-allowlist.test.mjs`, reading `agent/compose.project.yml` as text. It takes the lines of the
      `ALLOWLIST` block by their indentation, skips whitespace-only lines, stops at the first line with text that is
      not indented deeper than the key, drops comments, and holds that the hosts include `auth.openai.com`,
      `chatgpt.com` and `api.openai.com`. When `tests/compose-allowlist.test.mjs` exists, do not write a second
      reader: first, in a commit of its own that changes no behavior, move its reader to `tests/allowlist-block.mjs`
      as a function taking the text and the key's name, and use it from both tests. Run the new test and see it
      fail for want of `auth.openai.com` and `chatgpt.com` (R4)
- [ ] In `agent/compose.project.yml`, add to `ALLOWLIST`: `auth.openai.com`, under a comment that OpenCode's login
      with a ChatGPT account, and every refresh of its token, goes there, and `chatgpt.com`, under a comment that
      OpenCode sends the prompts of a ChatGPT login there. Leave `models.dev` and `api.openai.com` as they are. See
      the test pass (R1, R2, R3)
- [ ] In `templates/project/agent/compose.project.yml`, extend the comment that opens the `ALLOWLIST` block, keeping
      what it says: a provider's login may need hosts besides its API host, and OpenCode logged in with a ChatGPT
      account needs `auth.openai.com` and `chatgpt.com`. Make the same edit to that comment in
      `agent/compose.project.yml`. Run the `init` tests, which hold the lines of the generated file to 120
      characters (R6)
- [ ] In `README.md`, add the section "Logging in to a model provider" after "The home volume", removing nothing. It
      says, in this order: a login is done once per home volume, from the sandbox's shell; a login that sends the
      browser to a port on `localhost` cannot complete, because the browser is on the host, the sandbox publishes no
      port and its firewall drops inbound connections, and that this is deliberate; for OpenAI in OpenCode with a
      ChatGPT account, the command `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"`, that it prints
      an address and a code to enter in any browser, and that the project's `ALLOWLIST` needs `auth.openai.com` and
      `chatgpt.com`; with an API key, that it needs `api.openai.com` alone; and that a host missing from the
      allowlist shows as a refusal in `/run/egress-proxy.log`. In the bullet on `agent/compose.project.yml` under
      "Installing it into a project", add after "Add the API host of any other model provider the project's agents
      use" that a provider's login may need further hosts, pointing at the new section (R5)

## Verification

- [ ] `npm test` passes on the host
- [ ] `git diff master -- container scripts` is empty, which is requirement 7: no port, no firewall rule and no
      host of the kit's own changed (R7)
- [ ] `npm pack --dry-run` lists the same files as on `master`
- [ ] `npm run check-changes` passes
- [ ] No line of a changed file is over 120 characters, and none holds an em dash
- [ ] The implementer's run, without logging in, in this repository's sandbox with the working copy's
      `agent/compose.project.yml` and a new home volume: `opencode auth login -p openai -m "ChatGPT Pro/Plus
      (headless)"` prints the device page's address and a code (R1), and `grep 'not allowlisted'
      /run/egress-proxy.log` does not name `auth.openai.com`. Stop the login there. What was seen is in the record,
      with the Docker and Compose versions (R8)
- [ ] The human's check, which needs their ChatGPT account, in the same kind of sandbox: run the command, enter the
      code in the host's browser, and see the login complete; `opencode auth list` names OpenAI; send one prompt to
      an OpenAI model in OpenCode and see it answered (R2). Then `grep 'not allowlisted' /run/egress-proxy.log`
      names neither `auth.openai.com` nor `chatgpt.com` (R3). Every other host refused there during the login and
      the prompt is logged in the record (R8). If the login does not complete, or the prompt needs a host that is
      not admitted, the record says what was seen and the unit goes back to the planner, since the spec's fix rests
      on what it lists as not established

## Commit Points

- [ ] When 0015 has landed: the reader moved to `tests/allowlist-block.mjs`, with no change in behavior
- [ ] The regression test and the two hosts
- [ ] The template's comment, this repository's copy of it, and the README
- [ ] The record of the implementer's run, and later of the human's check
