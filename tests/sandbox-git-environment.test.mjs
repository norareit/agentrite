import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { environmentEntry } from './compose-entries.mjs';

const root = join(import.meta.dirname, '..');
const FILES = [
  'agentrite-init.test.mjs',
  'agentrite-refresh.test.mjs',
  'commit-msg-hook.test.mjs',
  'sandbox-update.test.mjs',
  'settings-update.test.mjs',
].map((name) => join(import.meta.dirname, name));
const ENTRIES = ['GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'GIT_CONFIG_KEY_1'];
// The compose file takes the hooks directory from the wrapper, which names this one in a project with the process.
const HOOKS_WITH_PROCESS = '/usr/local/lib/agentrite/hooks';

test("the tests that start init and refresh pass with the sandbox's git environment configuration", () => {
  const environment = { ...process.env };
  // node sets NODE_TEST_CONTEXT in every test file it runs, and a `node --test` that inherits it reports to a parent
  // runner that is not there instead of running as a runner of its own.
  delete environment.NODE_TEST_CONTEXT;
  for (const key of ENTRIES) environment[key] = environmentEntry(key);
  environment.GIT_CONFIG_VALUE_1 = HOOKS_WITH_PROCESS;
  const result = spawnSync(process.execPath, ['--test', ...FILES], { cwd: root, encoding: 'utf-8', env: environment });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
