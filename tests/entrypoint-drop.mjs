import assert from 'node:assert/strict';

/**
 * The last line of `container/entrypoint.sh`, which drops to the agent: `setpriv` becomes the agent and `env` gives
 * the agent's command the PATH the entrypoint was started with, after the `--`, so that it reaches what runs as the
 * agent alone. The command runs through the script the one group captures.
 */
export const DROP_TO_AGENT =
  /^exec setpriv --reuid=\S+ --regid=\S+ --init-groups -- env "PATH=\$image_path" (\S+) "\$@"$/m;

/**
 * The path of the script the entrypoint runs the agent's command through, read from the text of the entrypoint.
 *
 * @param {string} entrypoint
 * @returns {string}
 */
export function commandWrapperPath(entrypoint) {
  const drop = entrypoint.match(DROP_TO_AGENT);
  assert.ok(drop, "the entrypoint's last command drops to the agent and runs the command through a script");
  return drop[1];
}
