import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');

// The lines of the sandbox service's `volumes:` list, read by indentation since the kit has no YAML parser: the lines
// after `    volumes:` up to the first that is not blank, not a comment and not indented by more than four spaces. The
// top-level `volumes:` is not indented, so it ends the list rather than being taken for it.
function serviceVolumeLines(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('    volumes:');
  assert.notEqual(start, -1, 'the sandbox service has a volumes list');
  const list = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed !== '' && !trimmed.startsWith('#') && !line.startsWith('     ')) break;
    list.push(line);
  }
  return list;
}

const unquoted = (value) => value.replace(/^(["'])(.*)\1$/, '$2');

// The line without its trailing comment, as YAML has one: from a # that follows whitespace and is outside quotes, to
// the end. A quote counts only where it opens a value, after whitespace, so that one inside a plain value, as in
// `./it's`, opens nothing.
function withoutComment(line) {
  let quote = '';
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const afterWhitespace = index === 0 || /\s/.test(line[index - 1]);
    if (quote) {
      if (character === quote) quote = '';
    } else if ((character === '"' || character === "'") && afterWhitespace) {
      quote = character;
    } else if (character === '#' && afterWhitespace) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

// Whether a line of the list mounts at /work. A long-form entry does when one of its lines is `target: /work`. A
// short-form entry, `- source:target[:mode]`, does when a field after the first is `/work`: any field and not only
// the second, so that a source with a colon in it, as `${SOURCE:-.}`, is still caught. A trailing comment is no
// part of either.
function mountsAtWork(volumeLine) {
  const line = withoutComment(volumeLine);
  const trimmed = line.trim();
  const target = /^(?:- )?target:(.*)$/.exec(trimmed);
  if (target) return unquoted(target[1].trim()) === '/work';
  if (!line.startsWith('      - ') || trimmed.includes(': ')) return false;
  return unquoted(trimmed.slice('- '.length).trim()).split(':').slice(1).includes('/work');
}

// The lines of the sandbox service's volumes that mount at /work, trimmed.
function workVolumes(text) {
  return serviceVolumeLines(text)
    .filter(mountsAtWork)
    .map((line) => line.trim());
}

// A compose file of the kit's shape, with `entries` as the lines of the sandbox service's volumes list, and a
// top-level volume named `work` that is no mount at /work.
function composeWith(entries) {
  const lines = ['services:', '  sandbox:', '    working_dir: /work', '    volumes:', ...entries];
  return [...lines, '', 'volumes:', '  work:', ''].join('\n');
}

// The wrapper passes its mount at /work as a `docker compose run --volume`. A Compose older than 2.35.0 mounts a
// volume the file declares at the same target in its place, and a unit run then works in the project root.
test('the base compose file declares no volume of the sandbox at /work', () => {
  const found = workVolumes(compose);
  assert.deepEqual(
    found,
    [],
    `container/compose.yml declares ${found.join(', ')} at /work. The wrapper passes the mount at /work for every ` +
      "run, and a Compose older than 2.35.0 mounts the file's volume instead, so a unit run would work in the " +
      'project root and not in its clone',
  );
});

test('a short-form volume at /work is found, whatever its source and mode', () => {
  const text = composeWith([
    '      # The working directory.',
    '      - .:/work',
    '      # Read-only.',
    '      - ./source:/work:ro',
    '      - "${SOURCE:-.}:/work"',
    '      - agent-home:/home/agent',
  ]);
  assert.deepEqual(workVolumes(text), ['- .:/work', '- ./source:/work:ro', '- "${SOURCE:-.}:/work"']);
});

test('a long-form volume at /work is found, with the target on its first line or a later one', () => {
  const text = composeWith([
    '      - type: bind',
    '        source: .',
    '        target: /work',
    '      - target: "/work"',
    '        type: bind',
    '        source: ./other',
  ]);
  assert.deepEqual(workVolumes(text), ['target: /work', '- target: "/work"']);
});

test('a volume under /work, from /work or elsewhere is not one at /work', () => {
  const text = composeWith([
    '      - .:/work/.reviews',
    '      - agent-home:/home/agent',
    '      - ${HOME}/.gitconfig:/etc/gitconfig:ro',
    '      - /work:/elsewhere',
    '      - type: bind',
    '        source: ./reviews',
    '        target: /work/.reviews',
  ]);
  assert.deepEqual(workVolumes(text), []);
});

// A comment at the end of the line does not hide the volume. A # is a comment only after whitespace and outside
// quotes, as YAML has it, so one inside a quoted source or with no whitespace before it is part of the entry.
test('a volume at /work is found with a trailing comment, and a # that is no comment is part of the entry', () => {
  const text = composeWith([
    '      - .:/work # the checkout',
    '      - type: bind',
    '        source: .',
    '        target: /work # the checkout',
    '      - "./a #b:/work"',
    '      - ./a#b:/work',
    "      - ./it's:/work # the checkout",
    '      - "./a #b:/elsewhere"',
  ]);
  assert.deepEqual(workVolumes(text), [
    '- .:/work # the checkout',
    'target: /work # the checkout',
    '- "./a #b:/work"',
    '- ./a#b:/work',
    "- ./it's:/work # the checkout",
  ]);
});
