#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * What `npm publish` says of a version whose release notes are missing, or `undefined` when a line of the changelog
 * is exactly the heading of the version.
 *
 * @param {string | undefined} changelog the text of `CHANGELOG.md`, or `undefined` when there is no such file
 * @param {string} version
 * @returns {string | undefined}
 */
export function missingReleaseNotes(changelog, version) {
  const heading = `## ${version}`;
  if (changelog !== undefined && changelog.split('\n').includes(heading)) return undefined;
  return (
    `✗ CHANGELOG.md has no section headed "${heading}". Write the release notes as RELEASING.md\n` +
    '  describes, commit them, and run npm publish again.'
  );
}

/**
 * What `npm publish` says of a working tree in which a tracked file holds a change that is not committed, or
 * `undefined` when there is none.
 *
 * @param {string} status what `git status --porcelain --untracked-files=no` printed
 * @returns {string | undefined}
 */
export function uncommittedChanges(status) {
  // A line is two status letters, a space and the path.
  const paths = status
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.slice(3));
  if (paths.length === 0) return undefined;
  return [
    '✗ These tracked files hold a change that is not committed:',
    ...paths.map((path) => `  ${path}`),
    '  Commit the changes or put them aside, and run npm publish again.',
  ].join('\n');
}

/**
 * @returns {string} what git printed of the tracked files of the working directory that differ from the last commit
 */
function trackedFileStatus() {
  // `git status` and not `git diff HEAD`, which does not show a change that is staged and then undone in the
  // working tree.
  return execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * The first refusal there is, of the version and the working tree in the working directory, which npm sets to the
 * root of the package.
 *
 * @returns {string | undefined}
 */
function refusal() {
  const { version } = JSON.parse(readFileSync('package.json', 'utf-8'));
  const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf-8') : undefined;
  return missingReleaseNotes(changelog, version) ?? uncommittedChanges(trackedFileStatus());
}

/**
 * True when this file is the entry point, and false when a test imports it.
 *
 * @returns {boolean}
 */
function isMain() {
  if (process.argv[1] === undefined) return false;
  const self = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  const invoked = pathToFileURL(realpathSync(process.argv[1])).href;
  return self === invoked;
}

if (isMain()) {
  let message;
  try {
    message = refusal();
  } catch (error) {
    // A failure of git carries what git printed, which says more than the message of the error.
    message = `✗ ${String(error?.stderr || error?.message || error).trim()}`;
  }
  if (message !== undefined) {
    console.error(message);
    process.exit(1);
  }
}
