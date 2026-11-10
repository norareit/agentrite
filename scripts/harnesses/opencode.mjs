import { join } from 'node:path';
import { callFollowed, isRecord, jsonRecord, jsonRecords, stringOrNone, textFollowed } from '../agentrite-headless.mjs';
import {
  INSTRUCTIONS_SECTION,
  instructionPaths,
  isOwnStandards,
  messageOf,
  STANDARDS_PATH,
} from '../agentrite-instructions.mjs';
import { formattedLike } from '../agentrite-json.mjs';
import {
  chosenFile,
  configurationName,
  localProviders,
  noFileNote,
  opencodeConfiguration,
  providersNote,
  readConfiguration,
} from '../agentrite-opencode-providers.mjs';
import { descriptionBlock, isKitWrapper, refreshedWrapper, wrapperBody } from '../agentrite-roles.mjs';

/**
 * @typedef {import('../agentrite-headless.mjs').Call} Call
 * @typedef {import('../agentrite-headless.mjs').Followed} Followed
 * @typedef {import('../agentrite-instructions.mjs').ProjectFile} ProjectFile
 * @typedef {import('../agentrite-roles.mjs').Role} Role
 * @typedef {import('../agentrite-harness.mjs').Given} Given
 * @typedef {import('../agentrite-harness.mjs').Start} Start
 */

/**
 * @param {Role} role
 * @returns {string}
 */
function opencodeFile(role) {
  return `---\n${descriptionBlock(role.description)}mode: all\n---\n\n${wrapperBody(role.path)}`;
}

/**
 * The fields of one event of OpenCode's that the reader uses, each a string or absent: its type, its session, and of
 * its part the message, the part's own id and its text.
 *
 * @typedef {{
 *   type: string | undefined,
 *   sessionID: string | undefined,
 *   messageID: string | undefined,
 *   id: string | undefined,
 *   text: string | undefined,
 * }} OpencodeEvent
 */

/**
 * The event that one line of OpenCode's output holds, narrowed to the fields the reader uses, or `undefined` for a
 * line that is no JSON object.
 *
 * @param {string} line
 * @returns {OpencodeEvent | undefined}
 */
function opencodeEvent(line) {
  const parsed = jsonRecord(line);
  if (parsed === undefined) return undefined;
  const part = isRecord(parsed.part) ? parsed.part : {};
  return {
    type: stringOrNone(parsed.type),
    sessionID: stringOrNone(parsed.sessionID),
    messageID: stringOrNone(part.messageID),
    id: stringOrNone(part.id),
    text: stringOrNone(part.text),
  };
}

/**
 * What OpenCode printed: one JSON event per line. Every call of the model is a message of its own, ended by a
 * `step_finish`, so a step that called a tool before it answered printed more than one, and the final response is
 * the text of the message that the last `step_finish` closes.
 *
 * @param {string} stdout
 * @returns {{ response: string | undefined, session: string | undefined }}
 */
function readOpencode(stdout) {
  const events = stdout.split('\n').flatMap((line) => {
    const event = line.trim() === '' ? undefined : opencodeEvent(line);
    return event === undefined ? [] : [event];
  });
  const session = events.map((event) => event.sessionID).find((id) => id !== undefined);
  const message = events.findLast((event) => event.type === 'step_finish')?.messageID;
  if (message === undefined) return { response: undefined, session };
  // One text per part: the last event of a part counts, in the place the part first took.
  /** @type {Map<string | undefined, string>} */ const parts = new Map();
  for (const event of events) {
    if (event.type !== 'text' || event.messageID !== message || event.text === undefined) continue;
    parts.set(event.id, event.text);
  }
  return { response: parts.size === 0 ? undefined : [...parts.values()].join('\n\n'), session };
}

const OPENCODE_TOOLS = { shell: 'bash', paths: ['filePath'] };

// The error OpenCode gives a call it refused for lack of permission. It has no field of its own for a refusal, so this
// text is the only thing that tells a refused call from one that failed otherwise.
const OPENCODE_REFUSAL = 'The user rejected permission to use this specific tool call.';

/**
 * What OpenCode makes known in one line of its JSON events: a text, or a tool call, which it prints once the call
 * has ended.
 *
 * @param {string} line
 * @returns {Followed[]}
 */
function followOpencode(line) {
  const event = jsonRecord(line);
  if (event === undefined || !isRecord(event.part)) return [];
  const { part } = event;
  const time = typeof event.timestamp === 'number' ? event.timestamp : undefined;
  if (event.type === 'text') return textFollowed(time, part.text);
  if (event.type !== 'tool_use' || typeof part.tool !== 'string') return [];
  const input = isRecord(part.state) && isRecord(part.state.input) ? part.state.input : {};
  return [callFollowed(time, part.tool, input, OPENCODE_TOOLS)];
}

/**
 * The calls OpenCode refused for lack of permission: every `tool_use` event whose call ended in an error, and whose
 * error is the one of a refusal. A refusal carries no instant.
 *
 * @param {string} stdout
 * @returns {Call[]}
 */
function refusedOpencode(stdout) {
  return jsonRecords(stdout).flatMap((event) => {
    if (event.type !== 'tool_use' || !isRecord(event.part) || typeof event.part.tool !== 'string') return [];
    const { tool, state } = event.part;
    if (!isRecord(state) || state.status !== 'error' || state.error !== OPENCODE_REFUSAL) return [];
    return [callFollowed(undefined, tool, isRecord(state.input) ? state.input : {}, OPENCODE_TOOLS)];
  });
}

/** OpenCode's configuration file at the project root, whose `instructions` list loads the kit's instructions. */
export const OPENCODE_FILE = 'opencode.json';

/** The schema of OpenCode's configuration, which OpenCode adds to `opencode.json` when it lacks it. */
const OPENCODE_SCHEMA = 'https://opencode.ai/config.json';

/**
 * The verdict on an `opencode.json` that does not load the kit's instructions: why, the paths of
 * `instructionPaths` it lacks, in their order, and the text that would make it load them, which is `undefined` for
 * a file that cannot be amended.
 *
 * @typedef {{ loads: false, problem: string, lacks: string[], content: string | undefined }} OpencodeFailure
 */

/**
 * Whether an `opencode.json` loads the kit's instructions, every path of `instructionPaths(standards)`, and when it
 * does not, the verdict on it.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {{ loads: true } | OpencodeFailure}
 */
export function opencodeVerdict(read, standards) {
  const all = instructionPaths(standards);
  if (!read.found) {
    const content = formattedLike('{}\n', { $schema: OPENCODE_SCHEMA, instructions: all });
    return { loads: false, problem: 'it is missing', lacks: all, content };
  }
  if ('error' in read) {
    return { loads: false, problem: `it cannot be read: ${read.error}`, lacks: all, content: undefined };
  }

  /** @type {unknown} */ let configuration;
  try {
    configuration = JSON.parse(read.text);
  } catch (error) {
    // OpenCode reads a file with comments in it, which JSON.parse does not, so the text is what is judged.
    const lacks = all.filter((path) => !read.text.includes(`"${path}"`));
    if (lacks.length === 0) return { loads: true };
    return { loads: false, problem: `it is not JSON: ${messageOf(error)}`, lacks, content: undefined };
  }
  if (typeof configuration !== 'object' || configuration === null || Array.isArray(configuration)) {
    return { loads: false, problem: 'it is not a JSON object', lacks: all, content: undefined };
  }

  const amend = (/** @type {unknown[]} */ instructions, /** @type {string[]} */ lacks) =>
    formattedLike(read.text, { ...configuration, instructions: [...instructions, ...lacks] });
  if (!('instructions' in configuration)) {
    return { loads: false, problem: 'it has no instructions list', lacks: all, content: amend([], all) };
  }
  const { instructions } = configuration;
  if (!Array.isArray(instructions)) {
    return { loads: false, problem: 'its instructions is not a list', lacks: all, content: undefined };
  }
  const lacks = all.filter((path) => !instructions.includes(path));
  if (lacks.length === 0) return { loads: true };
  return {
    loads: false,
    problem: `its instructions list does not hold ${lacks.join(' or ')}`,
    lacks,
    content: amend(instructions, lacks),
  };
}

/**
 * What `init` tells a project whose `opencode.json` it cannot amend, because of `problem`, and which lacks the paths
 * `lacks`.
 *
 * @param {string} problem
 * @param {string[]} lacks
 * @returns {string}
 */
export function opencodeInitNotice(problem, lacks) {
  return (
    `${OPENCODE_FILE} was left as it is, because ${problem}.\n` +
    "For OpenCode to read the kit's instructions, its instructions list must hold the paths below.\n" +
    `Add them by hand:\n\n${lacks.join('\n')}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * What `refresh` tells a project whose `opencode.json` does not load the kit's instructions, because of `problem`,
 * and lacks the paths `lacks`.
 *
 * @param {string} problem
 * @param {string[]} lacks
 * @returns {string}
 */
export function opencodeRefreshNotice(problem, lacks) {
  return (
    `${OPENCODE_FILE} does not load the kit's instructions,\nbecause ${problem}.\n` +
    'OpenCode does not read them without the paths below in its instructions list, and refresh\n' +
    `does not add them:\n\n${lacks.join('\n')}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * True when the project's standards are another file than the kit's and an `opencode.json` still lists the kit's:
 * in its `instructions` list, or, for a file that is not JSON, in quotes anywhere in its text, as `opencodeVerdict`
 * judges one. False for a file that is missing or cannot be read.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {boolean}
 */
export function opencodeLoadsKitStandards(read, standards) {
  if (!isOwnStandards(standards) || !('text' in read)) return false;
  /** @type {unknown} */ let configuration;
  try {
    configuration = JSON.parse(read.text);
  } catch {
    return read.text.includes(`"${STANDARDS_PATH}"`);
  }
  if (typeof configuration !== 'object' || configuration === null || !('instructions' in configuration)) return false;
  const { instructions } = configuration;
  return Array.isArray(instructions) && instructions.includes(STANDARDS_PATH);
}

/**
 * What `init` and `refresh` tell a project whose `opencode.json` lists the kit's standards beside its own.
 *
 * @param {string} standards
 * @returns {string}
 */
export function opencodeKitStandardsNotice(standards) {
  return (
    `${OPENCODE_FILE} lists the kit's standards.md, and the project's standards are ${standards}. ` +
    'OpenCode then loads\n' +
    'both sets of rules. Remove this entry from its instructions list, which init and refresh do not remove:\n\n' +
    `${STANDARDS_PATH}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * The notice of an `opencode.json` that lists the kit's standards beside the project's own, or none.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {string[]}
 */
function kitStandardsNotices(read, standards) {
  return opencodeLoadsKitStandards(read, standards) ? [opencodeKitStandardsNotice(standards)] : [];
}

/**
 * The kit's configuration of OpenCode, in its own directory, and where it is in the container: the file of OpenCode's
 * that stands above every other.
 */
const KIT_CONFIGURATION = { path: 'opencode.json', target: '/etc/opencode/opencode.json' };

/** The directory of the host's OpenCode configuration, relative to the host's home. */
const HOST_DIRECTORY = '.config/opencode';

/**
 * What OpenCode in the sandbox is given of the host: with the local model server admitted, the local providers of
 * the host's OpenCode configuration, with their kept keys alone, in a copy of the kit's configuration that takes the
 * place of the kit's mount, and the line that names them. Nothing else of the host's file crosses, since it can hold
 * secrets. Without the model server, nothing of it is read.
 *
 * @param {string} home
 * @param {(path: string) => ProjectFile} read
 * @param {Start} start
 * @returns {Given}
 */
function opencodeHost(home, read, { modelServer, readKit }) {
  /** @type {Given} */ const nothing = { environment: [], mounts: [], files: [], notes: [] };
  if (!modelServer) return nothing;
  const directory = join(home, HOST_DIRECTORY);
  const json = read(`${HOST_DIRECTORY}/opencode.json`);
  const file = chosenFile(directory, json, read(`${HOST_DIRECTORY}/opencode.jsonc`));
  if (file === undefined) return { ...nothing, notes: [noFileNote(directory)] };
  const providers = localProviders(readConfiguration(file.text, file.path), file.path);
  const notes = [providersNote(file.path, Object.keys(providers))];
  if (Object.keys(providers).length === 0) return { ...nothing, notes };
  const kit = readKit(KIT_CONFIGURATION.path);
  if (!('text' in kit)) {
    throw new Error(`the kit's container/harnesses/opencode/${KIT_CONFIGURATION.path} cannot be read`);
  }
  const content = opencodeConfiguration(kit.text, providers);
  const configuration = { name: configurationName(content), content, target: KIT_CONFIGURATION.target };
  return { ...nothing, files: [configuration], notes };
}

/**
 * OpenCode, as the kit knows it.
 *
 * @type {import('../agentrite-harness.mjs').Harness}
 */
export const opencode = {
  name: 'opencode',
  title: 'OpenCode',
  wrappers: {
    directory: '.opencode/agents',
    render: opencodeFile,
    // The names of the agents OpenCode has of its own, as its documentation writes them on 2026-10-19:
    // https://opencode.ai/docs/agents/
    ownAgents: ['build', 'plan', 'general', 'explore', 'scout', 'compaction', 'title', 'summary'],
    extension: '.md',
    isKit: isKitWrapper,
    refreshed: refreshedWrapper,
  },
  start: {
    command: 'opencode',
    skipPermissions: '--auto',
    interactive: (options, prompt) => [...options, '--prompt', prompt],
    headless: (options, prompt) => ['run', ...options, '--', prompt],
    role: (role) => ({ options: ['--agent', role], opening: undefined }),
  },
  headless: {
    arguments(session) {
      return { args: ['--format', 'json', ...(session === undefined ? [] : ['--session', session])], session };
    },
    read: readOpencode,
    follow: followOpencode,
    refused: refusedOpencode,
  },
  instructions: {
    file: OPENCODE_FILE,
    // Judged on the file as it was read, since amending only adds: the notice of the kit's standards beside the
    // project's own holds for the amended file too.
    init(read, standards) {
      const kitStandards = kitStandardsNotices(read, standards);
      const verdict = opencodeVerdict(read, standards);
      if (verdict.loads) {
        const line = `skipped ${OPENCODE_FILE}, which loads ${instructionPaths(standards).join(' and ')}`;
        return { content: undefined, line, notices: kitStandards };
      }
      if (verdict.content === undefined) {
        return {
          content: undefined,
          line: `skipped ${OPENCODE_FILE}, which cannot be amended`,
          notices: [opencodeInitNotice(verdict.problem, verdict.lacks), ...kitStandards],
        };
      }
      const line = `${read.found ? 'changed' : 'wrote'} ${OPENCODE_FILE}`;
      return { content: verdict.content, line, notices: kitStandards };
    },
    refresh(read, standards) {
      const verdict = opencodeVerdict(read, standards);
      return [
        ...(verdict.loads ? [] : [opencodeRefreshNotice(verdict.problem, verdict.lacks)]),
        ...kitStandardsNotices(read, standards),
      ];
    },
  },
  sandbox: {
    package: 'opencode-ai',
    versionArgument: 'OPENCODE_VERSION',
    // `1.18.33`, or a pre-release as `0.0.0-dev-202610030456`: the version is the first word of the first line.
    readVersion(printed) {
      const word = printed.split('\n')[0].trim().split(/\s+/)[0];
      return word === '' ? undefined : word;
    },
    // OpenCode has no switch in the environment, so it is pointed at a configuration that sets autoupdate false. Its
    // project opencode.json does not override that key. A file the host member gives at the same target replaces the
    // mount.
    updates: {
      environment: [`OPENCODE_CONFIG=${KIT_CONFIGURATION.target}`],
      mounts: [{ from: 'kit', ...KIT_CONFIGURATION }],
    },
    // Its data directory, which holds its sessions and its login.
    logDirectories: ['.local/share/opencode'],
    hosts: [
      { host: 'models.opencode.ai', reason: 'OpenCode fetches its model catalog from it' },
      { host: 'auth.openai.com', reason: "OpenCode's login with a ChatGPT account, and every refresh of its token" },
      { host: 'chatgpt.com', reason: 'OpenCode sends the prompts of a ChatGPT login here' },
    ],
    // Its plugin, named in a configuration that OpenCode merges over the others. The plugin runs ring-bell.sh, which
    // the wrapper mounts beside it.
    bell: {
      environment: ['OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]}'],
      mounts: [{ from: 'kit', path: 'bell-plugin.js', target: '/etc/agentrite/bell/opencode-plugin.js' }],
    },
    host: opencodeHost,
  },
};
