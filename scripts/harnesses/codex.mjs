import { isRecord, jsonRecord, jsonRecords, stringOrNone, textFollowed } from '../agentrite-headless.mjs';
import { INSTRUCTIONS_SECTION, instructionPaths, isOwnStandards, STANDARDS_PATH } from '../agentrite-instructions.mjs';
import { isWrapperBody, wrapperBody, wrapWords } from '../agentrite-roles.mjs';

/**
 * @typedef {import('../agentrite-headless.mjs').Followed} Followed
 * @typedef {import('../agentrite-instructions.mjs').ProjectFile} ProjectFile
 * @typedef {import('../agentrite-roles.mjs').Role} Role
 */

/** The file Codex reads the kit's instructions from, through its `developer_instructions`. */
const CODEX_FILE = '.codex/config.toml';

/** The line of a wrapper, and of the instruction file, that opens the instructions, which run to the file's end. */
const INSTRUCTIONS_LINE = 'developer_instructions = """';

/** The quotes that close a multi-line basic string of TOML, on a line of their own after the instructions. */
const CLOSING = '"""\n';

// The longest line of a wrapper is 120 characters: a description's line holds 117, and ` \` or `"""` after them.
const DESCRIPTION_WIDTH = 117;

/**
 * `text` as it is written inside a basic string of TOML, single-line or multi-line: a backslash and a quote escaped,
 * and every other control character as `\uXXXX`, so that nothing of the text ends the string or breaks its line.
 *
 * @param {string} text
 * @returns {string}
 */
export function tomlEscaped(text) {
  return text.replace(/[\\"\u0000-\u001f\u007f]/g, (character) => {
    if (character === '\\' || character === '"') return `\\${character}`;
    return `\\u${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  });
}

/**
 * The description as a multi-line basic string that TOML reads as the one line it is written from: each line but
 * the last ends with a backslash, which trims the line break and the indent of the next line.
 *
 * @param {string} description
 * @returns {string}
 */
function descriptionString(description) {
  const lines = wrapWords(tomlEscaped(description), DESCRIPTION_WIDTH, '  ');
  return `description = """\\\n${lines.join(' \\\n')}"""\n`;
}

/**
 * @param {Role} role
 * @returns {string}
 */
function codexFile(role) {
  const name = `name = "${tomlEscaped(role.name)}"\n`;
  const instructions = `${INSTRUCTIONS_LINE}\n${wrapperBody(tomlEscaped(role.path))}${CLOSING}`;
  return `${name}${descriptionString(role.description)}${instructions}`;
}

/**
 * The lines of a TOML file, each without its LF or CRLF.
 *
 * @param {string} text
 * @returns {string[]}
 */
function linesOf(text) {
  return text.split(/\r?\n/);
}

/**
 * True when `text` is a Codex wrapper as the kit writes it, whatever role, path or pinned model it holds: a first
 * line that names the agent, a line that opens the instructions, and after it the body the kit writes and the
 * closing quotes. What stands between the two lines is not looked into.
 *
 * @param {string} text
 * @returns {boolean}
 */
function isCodexWrapper(text) {
  const lines = linesOf(text);
  if (!lines[0].startsWith('name = "')) return false;
  const opening = lines.indexOf(INSTRUCTIONS_LINE);
  if (opening === -1) return false;
  return isWrapperBody(lines.slice(opening + 1).join('\n'), '', CLOSING);
}

/**
 * What to write over a Codex wrapper a project already has: the wrapper as this release renders it, with the lines
 * of the existing one that pin a model put in before the instructions, as they are written. A pin is a line before
 * the instructions that opens with the key `model`. A description's lines are indented, so none is taken for one,
 * and nothing after the instructions is looked into. No TOML is read: the wrappers are tracked files.
 *
 * @param {string} existing
 * @param {string} rendered
 * @returns {string}
 */
function refreshedCodexWrapper(existing, rendered) {
  const lines = linesOf(existing);
  const opening = lines.indexOf(INSTRUCTIONS_LINE);
  const pins = lines.slice(0, Math.max(opening, 0)).filter((line) => /^model\s*=/.test(line));
  if (pins.length === 0) return rendered;
  const at = rendered.indexOf(`\n${INSTRUCTIONS_LINE}\n`) + 1;
  return `${rendered.slice(0, at)}${pins.join('\n')}\n${rendered.slice(at)}`;
}

/**
 * The item of an `item.completed` event of Codex's, or `undefined` for any other line.
 *
 * @param {Record<string, unknown> | undefined} event
 * @returns {Record<string, unknown> | undefined}
 */
function completedItem(event) {
  return event?.type === 'item.completed' && isRecord(event.item) ? event.item : undefined;
}

/**
 * What `codex exec --json` printed: one JSON event per line. The session is the `thread_id` of the first
 * `thread.started`, which a resumed run prints again with the same id, and the final response is the text of the
 * last completed `agent_message`.
 *
 * @param {string} stdout
 * @returns {{ response: string | undefined, session: string | undefined }}
 */
function readCodex(stdout) {
  const events = jsonRecords(stdout);
  const session = stringOrNone(events.find((event) => event.type === 'thread.started')?.thread_id);
  const message = events.map(completedItem).findLast((item) => item?.type === 'agent_message');
  return { response: stringOrNone(message?.text), session };
}

/**
 * What Codex makes known in one line of its JSON events: the text of a completed `agent_message`. Codex prints no
 * item for a shell command and no time for an event, so a follower sees the messages alone, with no instant.
 *
 * @param {string} line
 * @returns {Followed[]}
 */
function followCodex(line) {
  const item = completedItem(jsonRecord(line));
  return item?.type === 'agent_message' ? textFollowed(undefined, item.text) : [];
}

/**
 * The text of a missing `.codex/config.toml`, whose `developer_instructions` tells Codex to read the instruction
 * files before anything else.
 *
 * @param {string} standards
 * @returns {string}
 */
function codexInstructions(standards) {
  const paths = instructionPaths(standards).map((path) => `- ${tomlEscaped(path)}\n`);
  return (
    `${INSTRUCTIONS_LINE}\n` +
    'Before anything else, read the files below in the project root and follow them. ' +
    "They hold the project's process \\\n" +
    `and its standards.\n\n${paths.join('')}${CLOSING}`
  );
}

/**
 * The paths of `instructionPaths(standards)` that a `.codex/config.toml` does not name, in their order. It names a
 * path when its text holds the path as the kit writes it in TOML. A file that is missing or cannot be read names
 * none, as Codex reads nothing from it.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {string[]}
 */
export function codexLacks(read, standards) {
  const wanted = instructionPaths(standards);
  if (!('text' in read)) return wanted;
  return wanted.filter((path) => !read.text.includes(tomlEscaped(path)));
}

/**
 * What `init` tells a project whose `.codex/config.toml` exists and does not name `lacks`.
 *
 * @param {string[]} lacks
 * @returns {string}
 */
export function codexInitNotice(lacks) {
  return (
    `${CODEX_FILE} exists and was left as it is. Codex reads the kit's instructions only when its\n` +
    'developer_instructions names the paths below, and init does not amend a TOML file. Add them by hand:\n\n' +
    `${lacks.join('\n')}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * What `refresh` tells a project whose `.codex/config.toml` does not load the kit's instructions, because of
 * `problem`, and does not name `lacks`.
 *
 * @param {string} problem
 * @param {string[]} lacks
 * @returns {string}
 */
export function codexRefreshNotice(problem, lacks) {
  return (
    `${CODEX_FILE} does not load the kit's instructions, because ${problem}. Codex does not read them\n` +
    'unless its developer_instructions names the paths below, and refresh does not add them:\n\n' +
    `${lacks.join('\n')}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * What `init` and `refresh` tell a project whose `.codex/config.toml` names the kit's standards beside its own.
 *
 * @param {string} standards
 * @returns {string}
 */
export function codexKitStandardsNotice(standards) {
  return (
    `${CODEX_FILE} names the kit's standards.md, and the project's standards are ${standards}.\n` +
    'Codex then reads both sets of rules. Remove this path from its developer_instructions, which init and refresh\n' +
    'do not remove:\n\n' +
    `${STANDARDS_PATH}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * The notice of a `.codex/config.toml` that names the kit's standards beside the project's own, or none.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {string[]}
 */
function kitStandardsNotices(read, standards) {
  const names = isOwnStandards(standards) && 'text' in read && read.text.includes(tomlEscaped(STANDARDS_PATH));
  return names ? [codexKitStandardsNotice(standards)] : [];
}

/**
 * Why a `.codex/config.toml` that does not name `lacks` does not load the kit's instructions.
 *
 * @param {ProjectFile} read
 * @param {string[]} lacks
 * @returns {string}
 */
function codexProblem(read, lacks) {
  if (!read.found) return 'it is missing';
  if ('error' in read) return `it cannot be read: ${read.error}`;
  return `it does not name ${lacks.join(' or ')}`;
}

/**
 * Codex, as the kit knows it.
 *
 * @type {import('../agentrite-harness.mjs').Harness}
 */
export const codex = {
  name: 'codex',
  title: 'Codex',
  wrappers: {
    directory: '.codex/agents',
    render: codexFile,
    // The names of the agents Codex 0.167.0 has of its own, as its spawn tool lists them on 2026-11-06, read with
    // `codex debug prompt-input`.
    ownAgents: ['default', 'worker', 'explorer'],
    extension: '.toml',
    isKit: isCodexWrapper,
    refreshed: refreshedCodexWrapper,
  },
  start: {
    command: 'codex',
    skipPermissions: '--dangerously-bypass-approvals-and-sandbox',
    interactive: (options, prompt) => [...options, '--', prompt],
    headless: (options, prompt) => ['exec', ...options, '--', prompt],
    // Codex has no option that starts a session as one of its agents, so the prompt opens with the role.
    role: (role, file) => ({
      options: [],
      opening:
        `You act as the ${role}. Read \`${file}\` in the project root and follow it: ` +
        'it is the instruction of your role.',
    }),
  },
  headless: {
    // A new run chooses no session: Codex makes the thread, whose id it prints. Its options stand before `resume`.
    arguments(session) {
      return { args: ['--json', ...(session === undefined ? [] : ['resume', session])], session };
    },
    read: readCodex,
    follow: followCodex,
    // `exec` never asks for an approval, so no refusal can be read of what it printed.
    refused: () => [],
  },
  instructions: {
    file: CODEX_FILE,
    // A TOML file cannot be amended safely without a parser, so one that exists is left and judged by its text.
    init(read, standards) {
      if (!read.found) {
        return { content: codexInstructions(standards), line: `wrote ${CODEX_FILE}`, notices: [] };
      }
      const kitStandards = kitStandardsNotices(read, standards);
      const lacks = codexLacks(read, standards);
      if (lacks.length === 0) {
        const line = `skipped ${CODEX_FILE}, which loads ${instructionPaths(standards).join(' and ')}`;
        return { content: undefined, line, notices: kitStandards };
      }
      return {
        content: undefined,
        line: `skipped ${CODEX_FILE}, which does not name the kit's instructions`,
        notices: [codexInitNotice(lacks), ...kitStandards],
      };
    },
    refresh(read, standards) {
      const lacks = codexLacks(read, standards);
      return [
        ...(lacks.length > 0 ? [codexRefreshNotice(codexProblem(read, lacks), lacks)] : []),
        ...kitStandardsNotices(read, standards),
      ];
    },
  },
  sandbox: {
    package: '@openai/codex',
    versionArgument: 'CODEX_VERSION',
    // `codex-cli 0.167.0`: the version is the word after the name on the first line.
    readVersion(printed) {
      const [name, version] = printed.split('\n')[0].trim().split(/\s+/);
      return name === 'codex-cli' && version !== undefined ? version : undefined;
    },
    // Codex's managed configuration, which stands above the home's and the project's configuration, so the agent can
    // neither turn the update check back on nor write the file. It also trusts /work, so that Codex loads the
    // project's .codex/ in every run: Codex reads one managed configuration, and the bell's file is given only with
    // "bell": true.
    updates: {
      environment: [],
      mounts: [{ from: 'kit', path: 'managed_config.toml', target: '/etc/codex/managed_config.toml' }],
    },
    // Its home, which holds its login, its configuration, its sessions and the SQLite files that index them, which
    // resuming a thread needs beside the session's file.
    logDirectories: ['.codex'],
    hosts: [
      { host: 'api.openai.com', reason: 'the OpenAI API, which Codex sends the prompts of a login with an API key to' },
      { host: 'chatgpt.com', reason: 'Codex sends the prompts of a ChatGPT login here' },
      {
        host: 'auth.openai.com',
        reason: "Codex's login with a ChatGPT account, by a device code among it, and every refresh of its token",
      },
    ],
    // Its notify command, in its system configuration, which runs ring-bell.sh when a turn ends.
    bell: {
      environment: [],
      mounts: [{ from: 'kit', path: 'bell-config.toml', target: '/etc/codex/config.toml' }],
    },
    host: () => ({ environment: [], mounts: [], files: [], notes: [] }),
  },
};
