import { createHash } from 'node:crypto';
import { messageOf } from './agentrite-instructions.mjs';
import { isObject, parseJsonc } from './agentrite-json.mjs';

/** @typedef {import('./agentrite-instructions.mjs').ProjectFile} ProjectFile */

/**
 * The local model server as the container reaches it: the host and the port that `container/compose.yml` sets as
 * `MODEL_SERVER_HOST` and `MODEL_SERVER_PORT`, which a test holds equal.
 */
export const MODEL_SERVER = { host: 'host.docker.internal', port: '11434' };

/** The host names by which a `baseURL` of the host's file names the host's own loopback address. */
const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'];

/** The keys of a local provider that cross whole, beside `options` with its `baseURL` alone and `models`. */
const PROVIDER_KEYS = ['npm', 'name'];

/** The keys of a model of a local provider that cross, each whole. */
const MODEL_KEYS = ['name', 'limit', 'options', 'variants'];

/**
 * A `baseURL` split where its host is: the scheme with `://`, the user information with its `@`, the host, and the
 * rest from the `:` of the port on. A backslash ends the authority as the URL parser takes it to for `http`.
 */
const BASE_URL_PARTS = /^([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^/?#\\]*@)?(\[[^\]]*\]|[^:/?#\\]*)(:.*)$/s;

/**
 * The file of the host's OpenCode configuration in `directory`, the absolute path of `~/.config/opencode`, as the two
 * reads of its `opencode.json` and its `opencode.jsonc` give them, or `undefined` when neither is there. Throws for
 * both there and for one that cannot be read.
 *
 * @param {string} directory
 * @param {ProjectFile} json
 * @param {ProjectFile} jsonc
 * @returns {{ path: string, text: string } | undefined}
 */
export function chosenFile(directory, json, jsonc) {
  if (json.found && jsonc.found) {
    throw new Error(
      `${directory}/ holds both opencode.json and opencode.jsonc, and the sandbox reads one alone. Keep one, with ` +
        'what the other holds moved into it, and start again',
    );
  }
  const [name, read] = json.found ? ['opencode.json', json] : ['opencode.jsonc', jsonc];
  if (!read.found) return undefined;
  const path = `${directory}/${name}`;
  if ('error' in read) {
    throw new Error(`cannot read ${path}: ${read.error}. Make it readable, or remove it, and start again`);
  }
  return { path, text: read.text };
}

/**
 * The configuration that `text`, the file at `path`, holds, read as OpenCode reads it. Throws for a text that is no
 * JSON object once its comments and trailing commas are taken out.
 *
 * @param {string} text
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
export function readConfiguration(text, path) {
  /** @type {unknown} */ let parsed;
  /** @type {string} */ let reason;
  try {
    parsed = parseJsonc(text);
    if (isObject(parsed)) return parsed;
    reason = `it holds ${JSON.stringify(parsed)}`;
  } catch (error) {
    reason = messageOf(error);
  }
  throw new Error(
    `${path} is not a JSON object once its comments and trailing commas are taken out: ${reason}. Correct it as ` +
      'OpenCode reads it, and start again',
  );
}

/**
 * The `baseURL` of a local provider with its host replaced by the model server's, or `undefined` for one that is not
 * local: no string, no URL, not `http`, not on the host's loopback address or not on the model server's port. The
 * text is kept as written but for the host, since the URL parser's own text would normalize the path.
 *
 * @param {unknown} baseURL
 * @returns {string | undefined}
 */
function containerBaseURL(baseURL) {
  if (typeof baseURL !== 'string' || !isLocal(baseURL)) return undefined;
  const parts = BASE_URL_PARTS.exec(baseURL);
  if (parts === null) return undefined;
  const [, scheme, user = '', , rest] = parts;
  const replaced = `${scheme}${user}${MODEL_SERVER.host}${rest}`;
  // A text the parser reads otherwise than the pattern splits it is no local provider's.
  return isAt(replaced, MODEL_SERVER.host) ? replaced : undefined;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function isLocal(text) {
  return LOOPBACK.some((host) => isAt(text, host));
}

/**
 * True when `text` is an `http` URL whose host is `host` and whose port is the model server's.
 *
 * @param {string} text
 * @param {string} host
 * @returns {boolean}
 */
function isAt(text, host) {
  /** @type {URL} */ let url;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  return url.protocol === 'http:' && url.hostname === host && url.port === MODEL_SERVER.port;
}

/**
 * The keys of `source` named in `keys`, in the order of `keys`, each only when `source` holds it.
 *
 * @param {Record<string, unknown>} source
 * @param {string[]} keys
 * @returns {[string, unknown][]}
 */
function keptEntries(source, keys) {
  return keys.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]);
}

/**
 * The models of the local provider `name`, of each its kept keys alone. Throws for models, or a model, that is no
 * JSON object.
 *
 * @param {unknown} models
 * @param {string} name
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
function keptModels(models, name, path) {
  if (!isObject(models)) {
    throw new Error(
      `${path}: the models of the local provider ${JSON.stringify(name)} are not a JSON object. Correct them, and ` +
        'start again',
    );
  }
  return Object.fromEntries(
    Object.entries(models).map(([model, value]) => {
      if (isObject(value)) return [model, Object.fromEntries(keptEntries(value, MODEL_KEYS))];
      throw new Error(
        `${path}: the model ${JSON.stringify(model)} of the local provider ${JSON.stringify(name)} is not a JSON ` +
          'object. Correct it, and start again',
      );
    }),
  );
}

/**
 * The local providers of `configuration`, the host's file at `path`, by their names in the order of the file, each
 * with its kept keys alone and the host of its `baseURL` replaced by the model server's. A `provider` that is absent
 * or no object holds none. Throws for the models of a local provider, or a model of them, that is no JSON object.
 *
 * @param {Record<string, unknown>} configuration
 * @param {string} path
 * @returns {Record<string, Record<string, unknown>>}
 */
export function localProviders(configuration, path) {
  const { provider } = configuration;
  if (!isObject(provider)) return {};
  return Object.fromEntries(
    Object.entries(provider).flatMap(([name, value]) => {
      if (!isObject(value) || !isObject(value.options)) return [];
      const baseURL = containerBaseURL(value.options.baseURL);
      if (baseURL === undefined) return [];
      const models = Object.hasOwn(value, 'models') ? [['models', keptModels(value.models, name, path)]] : [];
      return [[name, Object.fromEntries([...keptEntries(value, PROVIDER_KEYS), ['options', { baseURL }], ...models])]];
    }),
  );
}

/**
 * The configuration OpenCode in the container is given: the kit's, of the text `kit`, with `providers` as its
 * `provider`, on one line.
 *
 * @param {string} kit
 * @param {Record<string, Record<string, unknown>>} providers
 * @returns {string}
 */
export function opencodeConfiguration(kit, providers) {
  const configuration = /** @type {Record<string, unknown>} */ (JSON.parse(kit));
  return JSON.stringify({ ...configuration, provider: providers });
}

/**
 * The name of the file of the project's log directory that holds `content`, after its hash, so that a start never
 * changes the file a run under way mounts.
 *
 * @param {string} content
 * @returns {string}
 */
export function configurationName(content) {
  return `opencode-configuration-${createHash('sha256').update(content).digest('hex').slice(0, 16)}.json`;
}

/**
 * The line a start prints of the local providers `names` of the host's file at `path` that OpenCode is given.
 *
 * @param {string} path
 * @param {string[]} names
 * @returns {string}
 */
export function providersNote(path, names) {
  if (names.length === 0) {
    return `${path} holds no local provider on port ${MODEL_SERVER.port}, so OpenCode is given none`;
  }
  const quoted = names.map((name) => JSON.stringify(name));
  const listed = quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(', ')} and ${quoted.at(-1)}`;
  return `OpenCode is given the local provider${quoted.length === 1 ? '' : 's'} ${listed} of ${path}`;
}

/**
 * The line a start prints when `directory`, the absolute path of `~/.config/opencode`, holds no file of OpenCode's.
 *
 * @param {string} directory
 * @returns {string}
 */
export function noFileNote(directory) {
  return `there is no opencode.json or opencode.jsonc in ${directory}/, so OpenCode is given no local provider`;
}
