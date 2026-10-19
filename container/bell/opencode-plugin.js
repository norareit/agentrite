// OpenCode's plugin of the bell. container/sandbox.sh names it in OPENCODE_CONFIG_CONTENT when the project's
// agentrite.json holds "bell": true. It runs ring-bell.sh, which lies beside it, each time a session goes idle and
// each time OpenCode asks for a permission, the moments Claude Code's hooks in claude-managed-settings.json ring at.
//
// The script is not detached, so that it has OpenCode's controlling terminal. The handler waits for it and resolves
// whether it ran or not: OpenCode is given no rejected promise and nothing is printed. It imports nothing but node:
// modules, since OpenCode installs nothing for a plugin it is given by a file URL.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./ring-bell.sh', import.meta.url));

const RINGING = new Set(['session.idle', 'permission.asked']);

function ring() {
  return new Promise((resolve) => {
    const child = spawn('sh', [script], { stdio: 'ignore' });
    child.on('exit', () => resolve(undefined));
    child.on('error', () => resolve(undefined));
  });
}

export const RingBell = async () => ({
  event: async ({ event }) => {
    if (RINGING.has(event.type)) await ring();
  },
});
