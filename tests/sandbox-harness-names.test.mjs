import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HARNESSES } from '../scripts/agentrite-harness.mjs';

// 0097 R2: the files of the sandbox reach the harnesses through the helper alone, so none of them names one. Their
// comments may name a harness as an example, and so may the entrypoint's recovery message, which says what removing
// the home volume discards.
const FILES = [
  'container/Dockerfile',
  'container/compose.yml',
  'container/sandbox.sh',
  'container/entrypoint.sh',
  'templates/project/sandbox/compose.project.yml',
];

/**
 * The lines of `text` that are not comments, and of the entrypoint not those of the recovery message's function.
 *
 * @param {string} file
 * @param {string} text
 * @returns {string[]}
 */
function codeLines(file, text) {
  let lines = text.split('\n');
  if (file === 'container/entrypoint.sh') {
    const start = lines.indexOf('home_volume_recovery() {');
    assert.notEqual(start, -1, 'the entrypoint defines home_volume_recovery');
    const end = lines.indexOf('}', start);
    lines = [...lines.slice(0, start), ...lines.slice(end + 1)];
  }
  return lines.filter((line) => !line.trim().startsWith('#'));
}

/** The files of a home that gives each harness something of the host. */
const HOME_FILES = {
  '.claude/statusline-command.sh': 'echo status\n',
  '.claude/settings.json': '{"cleanupPeriodDays": 1}',
  '.config/opencode/opencode.json': '{"provider": {"ollama": {"options": {"baseURL": "http://localhost:11434/v1"}}}}',
};

/**
 * @param {string} path
 * @returns {import('../scripts/agentrite-instructions.mjs').ProjectFile}
 */
function homeReader(path) {
  return path in HOME_FILES ? { found: true, text: HOME_FILES[path] } : { found: false };
}

/**
 * The start of a project that admits the local model server, with the reader of the kit's own files of `name`.
 *
 * @param {string} name
 * @returns {import('../scripts/agentrite-harness.mjs').Start}
 */
function kitStart(name) {
  const directory = new URL(`../container/harnesses/${name}/`, import.meta.url);
  const readKit = (/** @type {string} */ path) => ({
    found: true,
    text: readFileSync(new URL(path, directory), 'utf-8'),
  });
  return { modelServer: true, readKit };
}

/**
 * Every word by which a file could name `harness`: its name, title, command, package and version argument, its
 * hosts and log directories, and the targets and environment names of what a run gives it, also of the host.
 *
 * @param {import('../scripts/agentrite-harness.mjs').Harness} harness
 * @returns {string[]}
 */
function wordsOf(harness) {
  const { sandbox } = harness;
  const host = sandbox.host('/home/developer', homeReader, kitStart(harness.name));
  const mounts = [...sandbox.updates.mounts, ...sandbox.bell.mounts, ...host.mounts];
  const environment = [...sandbox.updates.environment, ...sandbox.bell.environment, ...host.environment];
  return [
    harness.name,
    harness.title,
    harness.start.command,
    sandbox.package,
    sandbox.versionArgument,
    ...sandbox.hosts.map(({ host: name }) => name),
    ...sandbox.logDirectories,
    ...mounts.map(({ target }) => target),
    ...host.files.map(({ target }) => target),
    ...environment.map((entry) => entry.slice(0, entry.indexOf('='))),
  ];
}

test('no file of the sandbox names a harness, but in a comment or the recovery message', () => {
  const faults = [];
  for (const file of FILES) {
    const lines = codeLines(file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf-8'));
    for (const harness of HARNESSES) {
      for (const word of wordsOf(harness)) {
        const found = lines.find((line) => line.toLowerCase().includes(word.toLowerCase()));
        if (found !== undefined) faults.push(`${file} names ${JSON.stringify(word)} of ${harness.name}: ${found}`);
      }
    }
  }
  assert.deepEqual(faults, [], faults.join('\n'));
});

test('the words searched for hold every kind of what the sandbox knows of a harness', () => {
  const words = wordsOf(HARNESSES.find((harness) => harness.name === 'claude'));
  for (const word of [
    'claude',
    'Claude Code',
    '@anthropic-ai/claude-code',
    'CLAUDE_CODE_VERSION',
    'api.anthropic.com',
    '.claude/projects',
    '/etc/claude-code/statusline-command.sh',
    '/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json',
    'DISABLE_AUTOUPDATER',
  ]) {
    assert.ok(words.includes(word), word);
  }
  const opencode = HARNESSES.find((harness) => harness.name === 'opencode');
  const given = opencode.sandbox.host('/home/developer', homeReader, kitStart('opencode'));
  assert.equal(given.files.length, 1, 'the home gives OpenCode its configuration with the local provider');
  assert.ok(wordsOf(opencode).includes(given.files[0].target));
});

test('a line is searched unless it is a comment', () => {
  assert.deepEqual(codeLines('container/compose.yml', '# claude\n  # opencode\nKIT: claude # trailing'), [
    'KIT: claude # trailing',
  ]);
});
