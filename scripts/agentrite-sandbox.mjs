import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HARNESS_NAMES, HARNESSES, harnessNamed } from './agentrite-harness.mjs';
import { messageOf } from './agentrite-instructions.mjs';
import { readStart } from './agentrite-settings.mjs';

/**
 * @typedef {import('./agentrite-harness.mjs').Harness} Harness
 * @typedef {import('./agentrite-harness.mjs').Given} Given
 * @typedef {import('./agentrite-harness.mjs').Mount} Mount
 * @typedef {import('./agentrite-instructions.mjs').ProjectFile} ProjectFile
 */

/** The file every harness's bell runs, relative to the kit's `container/`, and where it is in the container. */
const RING_BELL = { path: 'bell/ring-bell.sh', target: '/etc/agentrite/bell/ring-bell.sh' };

const USAGE = 'usage: node agentrite-sandbox.mjs start <project root> <home> | version <harness>';

/**
 * A reader of the files of the host under `home`, by a path relative to it. A file that is not there is not found,
 * and any other error of reading it is given as the error, so that a directory or a file that cannot be read is
 * neither.
 *
 * @param {string} home
 * @returns {(path: string) => ProjectFile}
 */
function hostReader(home) {
  return (path) => {
    try {
      return { found: true, text: readFileSync(join(home, path), 'utf-8') };
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return { found: false };
      return { found: true, error: messageOf(error) };
    }
  };
}

/**
 * The line of a mount, with a path of a harness's own directory made relative to the kit's `container/`.
 *
 * @param {string} name
 * @param {Mount} mount
 * @returns {string[]}
 */
function mountLine(name, { from, path, target }) {
  return ['mount', from, from === 'kit' ? `harnesses/${name}/${path}` : path, target];
}

/**
 * The lines a start of the sandbox prints, each as its fields, for the harnesses `harnesses`: whether the bell
 * rings; each harness; the directories of their logs; the hosts the allowlist admits for them; and the environment,
 * the mounts and the files of a run, those that turn off each harness's updates, then those of the host, then, with
 * `bell`, those of the bell.
 *
 * @param {boolean} bell
 * @param {Harness[]} harnesses
 * @param {(harness: Harness) => Given} given what each harness is given of the host
 * @returns {string[][]}
 */
function startLines(bell, harnesses, given) {
  /** @type {string[][]} */ const lines = [['bell', String(bell)]];
  for (const { name, title, start, sandbox } of harnesses) {
    lines.push(['harness', name, title, start.command, sandbox.package, sandbox.versionArgument]);
  }
  for (const { sandbox } of harnesses) lines.push(...sandbox.logDirectories.map((path) => ['directory', path]));
  for (const { sandbox } of harnesses) {
    lines.push(...sandbox.hosts.map(({ host, reason }) => ['allow', host, reason]));
  }

  const hosts = harnesses.map((harness) => ({ name: harness.name, ...given(harness) }));
  const updates = harnesses.map(({ name, sandbox }) => ({ name, ...sandbox.updates }));
  const bells = bell ? harnesses.map(({ name, sandbox }) => ({ name, ...sandbox.bell })) : [];
  for (const group of [...updates, ...hosts, ...bells]) {
    lines.push(...group.environment.map((entry) => ['env', entry]));
  }
  for (const group of [...updates, ...hosts]) lines.push(...group.mounts.map((mount) => mountLine(group.name, mount)));
  if (bell) lines.push(['mount', 'kit', RING_BELL.path, RING_BELL.target]);
  for (const group of bells) lines.push(...group.mounts.map((mount) => mountLine(group.name, mount)));
  for (const group of hosts) {
    lines.push(...group.files.map(({ name, content, target }) => ['file', name, content, target]));
  }
  return lines;
}

/**
 * The text of `lines`, one to a line with its fields separated by a tab. Throws for a field that is empty or holds a
 * tab or a line break, which the shell that reads the text would split or join wrongly.
 *
 * @param {string[][]} lines
 * @returns {string}
 */
function linesText(lines) {
  for (const line of lines) {
    const faulty = line.find((field) => field === '' || /[\t\n\r]/.test(field));
    if (faulty === undefined) continue;
    throw new Error(
      `the sandbox's ${line[0]} ${JSON.stringify(line.slice(1))} holds a field that is empty or holds a tab or a ` +
        'line break, which the wrapper cannot read',
    );
  }
  return lines.map((line) => `${line.join('\t')}\n`).join('');
}

/**
 * What a start of the sandbox prints for the project at `root`: its `bell` and its harnesses, read from its
 * `agentrite.json`, and what each harness is given of the host's home `home`, or nothing of it when `home` is empty.
 *
 * @param {string} root
 * @param {string} home
 * @returns {string}
 */
function startText(root, home) {
  const { bell, harnesses } = readStart(root);
  const chosen = HARNESSES.filter((harness) => harnesses.includes(harness.name));
  const nothing = { environment: [], mounts: [], files: [] };
  const read = hostReader(home);
  return linesText(startLines(bell, chosen, (harness) => (home === '' ? nothing : harness.sandbox.host(home, read))));
}

/**
 * True when this file is the entry point, which it is for the sandbox's wrapper: a shell script cannot import, so
 * it runs this file with `node` and reads what is printed.
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
  const [form, ...rest] = process.argv.slice(2);
  const isStart = form === 'start' && rest.length === 2;
  const isVersion = form === 'version' && rest.length === 1 && HARNESS_NAMES.includes(rest[0]);
  if (!isStart && !isVersion) {
    console.error(USAGE);
    process.exit(2);
  }
  try {
    if (isStart) {
      process.stdout.write(startText(rest[0], rest[1]));
    } else {
      const version = harnessNamed(rest[0]).sandbox.readVersion(readFileSync(0, 'utf-8'));
      if (version !== undefined) process.stdout.write(`${version}\n`);
    }
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
