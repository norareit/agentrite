import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';

const installer = join(import.meta.dirname, '..', 'install.sh');

function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
    cwd,
    encoding: 'utf-8',
  }).trim();
}

function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

// A kit repository with two commits on master. Each holds a role file the other does not, which is what shows
// whether an install in either direction leaves files behind.
function scratchKit() {
  const kit = mkdtempSync(join(tmpdir(), 'kit-'));
  git(kit, 'init', '--quiet', '--initial-branch=master');
  copyFileSync(installer, join(kit, 'install.sh'));
  chmodSync(join(kit, 'install.sh'), 0o755);
  write(kit, 'process.md', 'process v1\n');
  write(kit, 'roles/planner.md', 'planner\n');
  write(kit, 'roles/retired.md', 'retired\n');
  write(kit, 'templates/changes/spec.md', 'spec template\n');
  write(kit, 'scripts/check-changes.mjs', 'check\n');
  write(kit, 'scripts/kit-only.mjs', 'not shipped\n');
  write(kit, 'container/agent.sh', '#!/usr/bin/env bash\n');
  chmodSync(join(kit, 'container/agent.sh'), 0o755);
  write(kit, 'changes/0001-kit-unit/record.md', 'record\n');
  write(kit, 'tests/kit.test.mjs', 'test\n');
  write(kit, 'package.json', '{}\n');
  write(kit, 'README.md', 'kit readme\n');
  git(kit, 'add', '.');
  git(kit, 'commit', '--quiet', '-m', 'old');
  const older = git(kit, 'rev-parse', 'HEAD');
  write(kit, 'process.md', 'process v2\n');
  git(kit, 'rm', '--quiet', 'roles/retired.md');
  write(kit, 'roles/added.md', 'added\n');
  git(kit, 'add', '.');
  git(kit, 'commit', '--quiet', '-m', 'new');
  const newer = git(kit, 'rev-parse', 'HEAD');
  return { kit, older, newer };
}

function scratchProject(pin) {
  const project = mkdtempSync(join(tmpdir(), 'project-'));
  if (pin) {
    write(project, 'agent-kit.md', `---\ncommit: ${pin}\n---\n\n# Agent kit\n\nThe project's own words.\n`);
  }
  return project;
}

function install(kit, ...args) {
  return spawnSync('bash', [join(kit, 'install.sh'), ...args], { encoding: 'utf-8' });
}

// Every file under root, with its content and whether it is executable, keyed by its relative path.
function snapshot(root) {
  const files = {};
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        files[relative(root, path)] = {
          content: readFileSync(path, 'utf-8'),
          executable: (statSync(path).mode & 0o100) !== 0,
        };
      }
    }
  };
  walk(root);
  return files;
}

function withScratch(body) {
  const scratch = scratchKit();
  const directories = [scratch.kit];
  try {
    body({
      ...scratch,
      project: (pin) => {
        const project = scratchProject(pin);
        directories.push(project);
        return project;
      },
    });
  } finally {
    for (const directory of directories) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}

test('an install holds the payload and nothing else, at the pinned commit', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    const result = install(kit, target, 'agent-kit');
    assert.equal(result.status, 0, result.stderr);
    const installed = snapshot(join(target, 'agent-kit'));
    assert.deepEqual(Object.keys(installed).sort(), [
      '.installed-commit',
      'container/agent.sh',
      'process.md',
      'roles/planner.md',
      'roles/retired.md',
      'scripts/check-changes.mjs',
      'templates/changes/spec.md',
    ]);
    assert.equal(installed['process.md'].content, 'process v1\n');
    assert.equal(installed['container/agent.sh'].executable, true);
    assert.equal(installed['.installed-commit'].content, `${older}\n`);
  });
});

test('a second install with the same pin leaves the installed tree byte-identical', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    assert.equal(install(kit, target, 'agent-kit').status, 0);
    const first = snapshot(join(target, 'agent-kit'));
    assert.equal(install(kit, target, 'agent-kit').status, 0);
    assert.deepEqual(snapshot(join(target, 'agent-kit')), first);
  });
});

test('an install over an older, locally edited installation leaves nothing the pinned commit does not contain', () => {
  withScratch(({ kit, older, newer, project }) => {
    const target = project(older);
    assert.equal(install(kit, target, 'agent-kit').status, 0);
    write(join(target, 'agent-kit'), 'roles/local-edit.md', 'an edit nobody should have made\n');
    const result = install(kit, '--update', target, 'agent-kit');
    assert.equal(result.status, 0, result.stderr);
    const installed = snapshot(join(target, 'agent-kit'));
    assert.equal(installed['roles/retired.md'], undefined);
    assert.equal(installed['roles/local-edit.md'], undefined);
    assert.equal(installed['process.md'].content, 'process v2\n');
    assert.equal(installed['.installed-commit'].content, `${newer}\n`);
  });
});

test('an install of an older commit over a newer installation leaves nothing the older commit does not contain', () => {
  withScratch(({ kit, older, newer, project }) => {
    const target = project(newer);
    assert.equal(install(kit, target, 'agent-kit').status, 0);
    assert.ok(existsSync(join(target, 'agent-kit', 'roles/added.md')));
    write(target, 'agent-kit.md', `---\ncommit: ${older}\n---\n`);
    const result = install(kit, target, 'agent-kit');
    assert.equal(result.status, 0, result.stderr);
    const installed = snapshot(join(target, 'agent-kit'));
    assert.equal(installed['roles/added.md'], undefined);
    assert.equal(installed['roles/retired.md'].content, 'retired\n');
    assert.equal(installed['.installed-commit'].content, `${older}\n`);
  });
});

test('an install refuses a non-empty directory that holds no installation, and leaves it untouched', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    write(target, 'agent-kit/notes.md', 'somebody else\'s\n');
    const result = install(kit, target, 'agent-kit');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not empty/);
    assert.deepEqual(snapshot(join(target, 'agent-kit')), {
      'notes.md': { content: 'somebody else\'s\n', executable: false },
    });
  });
});

// A marker file alone does not make a directory an installation: a mistyped target can hold a file of that name.
test('an install refuses a directory whose marker does not name a commit in the kit clone, and leaves it untouched', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    write(target, 'agent-kit/.installed-commit', 'something else entirely\n');
    write(target, 'agent-kit/notes.md', 'somebody else\'s\n');
    const before = snapshot(join(target, 'agent-kit'));
    const result = install(kit, target, 'agent-kit');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not a previous installation/);
    assert.deepEqual(snapshot(join(target, 'agent-kit')), before);
  });
});

test('an install refuses a directory whose marker is a full hash of no commit in the kit clone', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    write(target, 'agent-kit/.installed-commit', `${'0'.repeat(40)}\n`);
    write(target, 'agent-kit/notes.md', 'somebody else\'s\n');
    const before = snapshot(join(target, 'agent-kit'));
    const result = install(kit, target, 'agent-kit');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not a previous installation/);
    assert.deepEqual(snapshot(join(target, 'agent-kit')), before);
  });
});

// What lands beside an installation, such as the .DS_Store macOS writes, does not stop it being one.
test('an install replaces a previous installation that has gained a file at its top level', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    assert.equal(install(kit, target, 'agent-kit').status, 0);
    write(target, 'agent-kit/.DS_Store', 'finder\n');
    write(target, 'agent-kit/notes.md', 'an edit nobody should have made\n');
    const result = install(kit, target, 'agent-kit');
    assert.equal(result.status, 0, result.stderr);
    const installed = snapshot(join(target, 'agent-kit'));
    assert.equal(installed['.DS_Store'], undefined);
    assert.equal(installed['notes.md'], undefined);
    assert.equal(installed['.installed-commit'].content, `${older}\n`);
  });
});

test('an install into an existing empty directory succeeds', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    mkdirSync(join(target, 'agent-kit'));
    const result = install(kit, target, 'agent-kit');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(target, 'agent-kit', 'process.md')));
  });
});

test('an install refuses a directory that is not a direct child of the project', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    for (const directory of ['.', '..', 'tools/agent-kit', '/tmp/agent-kit', '']) {
      const result = install(kit, target, directory);
      assert.notEqual(result.status, 0, `accepted ${JSON.stringify(directory)}`);
    }
  });
});

test('without --update the pinned commit is installed and agent-kit.md is not rewritten', () => {
  withScratch(({ kit, older, project }) => {
    const target = project(older);
    const pinFile = readFileSync(join(target, 'agent-kit.md'), 'utf-8');
    assert.equal(install(kit, target, 'agent-kit').status, 0);
    assert.equal(readFileSync(join(target, 'agent-kit.md'), 'utf-8'), pinFile);
    assert.equal(readFileSync(join(target, 'agent-kit', '.installed-commit'), 'utf-8'), `${older}\n`);
  });
});

test('without --update and without agent-kit.md nothing is installed', () => {
  withScratch(({ kit, project }) => {
    const target = project();
    const result = install(kit, target, 'agent-kit');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--update/);
    assert.equal(existsSync(join(target, 'agent-kit')), false);
  });
});

test('with --update the kit\'s master is installed and only the pin line of agent-kit.md changes', () => {
  withScratch(({ kit, older, newer, project }) => {
    const target = project(older);
    const before = readFileSync(join(target, 'agent-kit.md'), 'utf-8');
    assert.equal(install(kit, '--update', target, 'agent-kit').status, 0);
    const after = readFileSync(join(target, 'agent-kit.md'), 'utf-8');
    assert.equal(after, before.replace(`commit: ${older}`, `commit: ${newer}`));
    assert.equal(readFileSync(join(target, 'agent-kit', '.installed-commit'), 'utf-8'), `${newer}\n`);
  });
});

test('with --update on a project that has no agent-kit.md, one is created pinning master', () => {
  withScratch(({ kit, newer, project }) => {
    const target = project();
    const result = install(kit, '--update', target, 'agent-kit');
    assert.equal(result.status, 0, result.stderr);
    const pinFile = readFileSync(join(target, 'agent-kit.md'), 'utf-8');
    assert.ok(pinFile.startsWith(`---\ncommit: ${newer}\n---\n`), pinFile);
    assert.match(pinFile, /not part of this repository/);
    assert.match(pinFile, /[Dd]o not edit/);
    assert.match(pinFile, /install\.sh/);
  });
});

test('a pin that is not a commit in the kit clone is refused', () => {
  withScratch(({ kit, project }) => {
    const target = project('0'.repeat(40));
    const result = install(kit, target, 'agent-kit');
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(join(target, 'agent-kit')), false);
  });
});

test('an install reports how far the kit\'s master has moved past the pin, and does not act on it', () => {
  withScratch(({ kit, older, newer, project }) => {
    const behind = project(older);
    const stale = install(kit, behind, 'agent-kit');
    assert.equal(stale.status, 0, stale.stderr);
    assert.match(stale.stdout, /1 commit/);
    assert.match(stale.stdout, /--update/);
    assert.equal(readFileSync(join(behind, 'agent-kit', '.installed-commit'), 'utf-8'), `${older}\n`);

    const current = project(newer);
    const fresh = install(kit, current, 'agent-kit');
    assert.equal(fresh.status, 0, fresh.stderr);
    assert.doesNotMatch(fresh.stdout, /--update/);
  });
});

test('an install leaves the kit clone\'s branch, HEAD and working tree as they were', () => {
  withScratch(({ kit, older, project }) => {
    git(kit, 'checkout', '--quiet', '-b', 'elsewhere', older);
    write(kit, 'process.md', 'an uncommitted edit\n');
    const before = {
      branch: git(kit, 'branch', '--show-current'),
      head: git(kit, 'rev-parse', 'HEAD'),
      status: git(kit, 'status', '--porcelain'),
    };
    const target = project(older);
    assert.equal(install(kit, '--update', target, 'agent-kit').status, 0);
    assert.deepEqual(
      {
        branch: git(kit, 'branch', '--show-current'),
        head: git(kit, 'rev-parse', 'HEAD'),
        status: git(kit, 'status', '--porcelain'),
      },
      before,
    );
    assert.equal(readFileSync(join(kit, 'process.md'), 'utf-8'), 'an uncommitted edit\n');
    assert.equal(readFileSync(join(target, 'agent-kit', 'process.md'), 'utf-8'), 'process v2\n');
  });
});
