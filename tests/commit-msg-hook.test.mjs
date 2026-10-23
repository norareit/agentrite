// The commit-msg hook end to end on the host: a git repository set up by `init`, and `git commit` in it.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { installKit } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const kit = join(import.meta.dirname, '..');
const agentrite = join(kit, 'scripts', 'agentrite.mjs');
const CHECKER = 'node_modules/agentrite/container/check-commit-message.mjs';
const REFUSED = /The standards forbid the trailers Co-Authored-By and Claude-Session, so remove these lines/;

// A repository set up by `init`, with the kit installed as a project installs it, and a first commit.
function repository(testContext) {
  const base = temporaryDirectory(testContext, 'commit-msg-hook-');
  const root = join(base, 'project');
  mkdirSync(root);
  writeFileSync(join(root, 'package.json'), '{\n  "name": "my-app"\n}\n');
  writeFileSync(join(root, '.gitignore'), 'node_modules\n');
  installKit(root);
  mkdirSync(join(root, dirname(CHECKER)), { recursive: true });
  copyFileSync(join(kit, 'container', 'check-commit-message.mjs'), join(root, CHECKER));
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const env = { HOME: home, PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' };
  const git = (args, extra = {}) => spawnSync('git', args, { cwd: root, encoding: 'utf-8', env: { ...env, ...extra } });
  const ok = (args) => {
    const result = git(args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  ok(['init', '--quiet', '--initial-branch', 'main']);
  const initialized = spawnSync(process.execPath, [agentrite, 'init', '--no-sandbox', 'claude'], {
    cwd: root,
    encoding: 'utf-8',
  });
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.match(initialized.stdout, /^wrote \.git\/hooks\/commit-msg$/m);
  ok(['add', '.']);
  ok(['commit', '--quiet', '--message', 'Set up the project']);
  const head = () => ok(['rev-parse', 'HEAD']);
  const change = (name) => {
    writeFileSync(join(root, name), `${name}\n`);
    ok(['add', name]);
  };
  return { base, root, git, ok, head, change };
}

// R12, R22
for (const trailer of ['Co-Authored-By: Claude <noreply@anthropic.com>', 'Claude-Session: https://example.com/a']) {
  test(`git commit -m is refused for a message with ${trailer.split(':')[0]}, and made without it`, (testContext) => {
    const { git, head, change } = repository(testContext);
    change('one');
    const before = head();

    const refused = git(['commit', '--quiet', '--message', `Add one\n\n${trailer}`]);

    assert.equal(refused.status, 1);
    assert.match(refused.stderr, new RegExp(`^line 3: ${trailer.replace(/[.?*+()[\]]/g, '\\$&')}$`, 'm'));
    assert.match(refused.stderr, REFUSED);
    assert.equal(head(), before);

    const made = git(['commit', '--quiet', '--message', 'Add one']);

    assert.equal(made.status, 0, made.stderr);
    assert.notEqual(head(), before);
  });
}

// R12, R22
test('a message written by an editor is refused with a trailer, and made without it', (testContext) => {
  const { base, git, head, change } = repository(testContext);
  change('one');
  const before = head();
  const editor = (message) => {
    const path = join(base, 'editor.sh');
    writeFileSync(path, `#!/bin/sh\nprintf '%s\\n' '${message}' > "$1"\n`);
    chmodSync(path, 0o755);
    // Git runs the editor through the shell, and the path holds a space.
    return `'${path}'`;
  };

  const refused = git(['commit', '--quiet'], { GIT_EDITOR: editor('Add one\n\nCo-authored-by: Codex') });

  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^line 3: Co-authored-by: Codex$/m);
  assert.equal(head(), before);

  const made = git(['commit', '--quiet'], { GIT_EDITOR: editor('Add one') });

  assert.equal(made.status, 0, made.stderr);
  assert.notEqual(head(), before);
});

// R12, R22
test('git commit --amend that adds a trailer is refused, and leaves the commit as it was', (testContext) => {
  const { git, ok, head } = repository(testContext);
  const before = head();
  const message = ok(['log', '-1', '--format=%B']);

  const refused = git(['commit', '--quiet', '--amend', '--message', `${message}\n\nClaude-Session: abc`]);

  assert.equal(refused.status, 1);
  assert.match(refused.stderr, REFUSED);
  assert.equal(head(), before);
});

// R8, R22
test('a commit is refused with the hook message when the checker is not under node_modules', (testContext) => {
  const { root, git, head, change } = repository(testContext);
  change('one');
  const before = head();
  renameSync(join(root, CHECKER), join(root, `${CHECKER}.away`));

  const refused = git(['commit', '--quiet', '--message', 'Add one']);

  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^commit-msg: the commit message checker is not at .+check-commit-message\.mjs\.$/m);
  assert.match(refused.stderr, /Install the project's dependencies in this work tree, as with npm ci/);
  assert.equal(head(), before);
});

// R8, R22
test('a commit is refused with the hook message when node is not on the PATH git gives the hook', (testContext) => {
  const { base, git, head, change } = repository(testContext);
  change('one');
  const before = head();
  // A PATH that holds git and no node.
  const bin = join(base, 'bin');
  mkdirSync(bin);
  const gitPath = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf-8' }).trim();
  symlinkSync(gitPath, join(bin, 'git'));
  assert.ok(!process.env.PATH.split(delimiter).includes(bin));

  const refused = git(['commit', '--quiet', '--message', 'Add one'], { PATH: bin });

  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^commit-msg: node is not on the PATH that git gives the hook/m);
  assert.match(refused.stderr, /Make node reachable from git/);
  assert.equal(head(), before);
});
