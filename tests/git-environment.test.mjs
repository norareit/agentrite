import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withoutGitEnvironmentConfiguration } from './git-environment.mjs';

const KEPT = {
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/home/tester/.gitconfig',
  GIT_CONFIG_PARAMETERS: "'user.name'='Tester'",
  HOME: '/home/tester',
  PATH: '/usr/bin',
};

test("withoutGitEnvironmentConfiguration removes git's numbered environment entries and their count alone", () => {
  const environment = {
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'safe.directory',
    GIT_CONFIG_VALUE_0: '*',
    GIT_CONFIG_KEY_1: 'core.hooksPath',
    GIT_CONFIG_VALUE_1: '/usr/local/lib/agentrite/hooks',
    GIT_CONFIG_KEY_12: 'user.name',
    GIT_CONFIG_VALUE_12: 'Tester',
    ...KEPT,
  };
  assert.deepEqual(withoutGitEnvironmentConfiguration(environment), KEPT);
});

test('withoutGitEnvironmentConfiguration keeps an environment without the entries as it is', () => {
  assert.deepEqual(withoutGitEnvironmentConfiguration(KEPT), KEPT);
});

test('withoutGitEnvironmentConfiguration leaves its argument unchanged and returns a new object', () => {
  const environment = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', ...KEPT };
  const before = { ...environment };
  const result = withoutGitEnvironmentConfiguration(environment);
  assert.deepEqual(environment, before);
  assert.notEqual(result, environment);
});
