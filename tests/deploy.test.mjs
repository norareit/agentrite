import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const script = new URL('../deploy.sh', import.meta.url).pathname;
const bucket = 'release-bucket';
const baseUrl = 'https://agentrite.example.test';
const version = '1.2.3';
const tarball = `ritenoar-agentrite-${version}.tgz`;
// A changelog with a section for the version under release, which is what deploy.sh asks for before anything else.
const releasedChangelog = `# Changelog\n\n## ${version}\n\n### What changed\n\n* Something\n`;

// Stubs for every command deploy.sh runs, each appending its arguments to one log. Their answers come from the
// environment: STS_OK for the session check, HEAD for the existing-release check ("exists", "missing" or
// "denied"), and SERVED for the status the tarball's URL answers.
const stubs = {
  aws: `
case "$1 $2" in
  "sts get-caller-identity") [ "$STS_OK" = 1 ] ;;
  "sso login") ;;
  "cloudformation describe-stacks")
    case "$*" in
      *BucketName*) echo ${bucket} ;;
      *BaseUrl*) echo ${baseUrl} ;;
    esac ;;
  "s3api head-object")
    case "$HEAD" in
      exists) ;;
      missing) echo "An error occurred (404) when calling the HeadObject operation: Not Found" >&2; exit 254 ;;
      denied) echo "An error occurred (403) when calling the HeadObject operation: Forbidden" >&2; exit 254 ;;
    esac ;;
  "s3 cp") ;;
esac`,
  npm: `
if [ "$1" = pack ]; then
  touch "$3/${tarball}"
  echo '[{"name":"@ritenoar/agentrite","filename":"${tarball}"}]'
fi`,
  npx: '',
  curl: 'printf "%s" "$SERVED"',
};

// Runs a copy of deploy.sh in a kit that holds only a package.json at the version under release and a
// CHANGELOG.md with the content `changelog`, or no changelog when that is null.
function release(t, { stsOk = true, head = 'missing', served = '200', changelog = releasedChangelog } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'deploy-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'kit');
  mkdirSync(join(root, 'infra'), { recursive: true });
  copyFileSync(script, join(root, 'deploy.sh'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version }));
  if (changelog !== null) writeFileSync(join(root, 'CHANGELOG.md'), changelog);
  const bin = join(base, 'bin');
  mkdirSync(bin);
  const log = join(base, 'calls');
  writeFileSync(log, '');
  for (const [name, body] of Object.entries(stubs)) {
    writeFileSync(join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  }
  const result = spawnSync('bash', [join(root, 'deploy.sh')], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      STS_OK: stsOk ? '1' : '0',
      HEAD: head,
      SERVED: served,
    },
  });
  const calls = readFileSync(log, 'utf-8').trim().split('\n');
  return { ...result, calls, uploads: calls.filter((call) => call.startsWith('aws s3 cp')) };
}

test('an unreleased version is uploaded under its tarball name, immutable, and the consumer line printed', (t) => {
  const { status, stdout, stderr, uploads } = release(t);
  assert.equal(status, 0, stderr);
  assert.equal(uploads.length, 1);
  assert.match(uploads[0], new RegExp(`/${tarball} s3://${bucket}/${tarball} `));
  assert.match(uploads[0], /--cache-control public, max-age=31536000, immutable/);
  assert.match(stdout, new RegExp(`"@ritenoar/agentrite": "${baseUrl}/${tarball}"`));
});

test('a version that is already released is refused, with no upload', (t) => {
  const { status, stderr, uploads } = release(t, { head: 'exists' });
  assert.equal(status, 1);
  assert.match(stderr, new RegExp(`${tarball} is already released and is never replaced`));
  assert.match(stderr, /npm version patch\|minor\|major/);
  assert.deepEqual(uploads, []);
});

test('a failure to check for an existing release, other than Not Found, is reported with no upload', (t) => {
  const { status, stderr, uploads } = release(t, { head: 'denied' });
  assert.equal(status, 1);
  assert.match(stderr, new RegExp(`Could not check whether ${tarball} is already released`));
  assert.match(stderr, /Forbidden/);
  assert.deepEqual(uploads, []);
});

test('a release whose URL does not answer 200 fails, naming the status', (t) => {
  const { status, stderr } = release(t, { served: '403' });
  assert.equal(status, 1);
  assert.match(stderr, new RegExp(`${baseUrl}/${tarball} answered 403, not 200`));
});

test('an expired AWS session is renewed with aws sso login, and a live one is not', (t) => {
  assert.ok(release(t, { stsOk: false }).calls.includes('aws sso login'));
  assert.ok(!release(t).calls.includes('aws sso login'));
});

// A release with no notes is refused before anything is touched: no AWS session, no install, no upload. The
// section is its heading as a whole line, so the version of another release that only begins with the same
// characters, a deeper heading, and the version in running text are all not the section.
for (const [what, changelog] of [
  ['no changelog', null],
  ['sections for other versions only', `# Changelog\n\n## 1.2.30\n\n* Later\n\n## 1.2.2\n\n* Earlier\n`],
  ['the version only in text and in a deeper heading', `# Changelog\n\nSince 1.2.3.\n\n### 1.2.3\n\n ## 1.2.3 \n`],
]) {
  test(`a version whose release notes are missing is refused before anything is called: ${what}`, (t) => {
    const { status, stderr, calls } = release(t, { changelog });
    assert.equal(status, 1);
    assert.match(stderr, /CHANGELOG\.md has no section headed "## 1\.2\.3"/);
    assert.match(stderr, /RELEASING\.md/);
    assert.deepEqual(
      calls.filter((call) => /^(aws|npm|npx)\b/.test(call)),
      [],
    );
  });
}
