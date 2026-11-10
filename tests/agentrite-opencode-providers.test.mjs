import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  chosenFile,
  configurationName,
  localProviders,
  MODEL_SERVER,
  noFileNote,
  opencodeConfiguration,
  providersNote,
  readConfiguration,
} from '../scripts/agentrite-opencode-providers.mjs';
import { environmentEntry } from './compose-entries.mjs';

// Unit 0106: the local providers of the host's OpenCode configuration, and what OpenCode in the sandbox is given of
// them.

const DIRECTORY = '/home/developer/.config/opencode';
const JSON_PATH = `${DIRECTORY}/opencode.json`;
const JSONC_PATH = `${DIRECTORY}/opencode.jsonc`;
const KIT = '{\n  "$schema": "https://opencode.ai/config.json",\n  "autoupdate": false\n}\n';
const NONE = /** @type {const} */ ({ found: false });

/**
 * @param {string} text
 * @returns {{ found: true, text: string }}
 */
function found(text) {
  return { found: true, text };
}

/**
 * A configuration with one provider of `baseURL`.
 *
 * @param {unknown} baseURL
 * @returns {Record<string, unknown>}
 */
function withBaseURL(baseURL) {
  return { provider: { ollama: { npm: '@ai-sdk/openai-compatible', options: { baseURL } } } };
}

/**
 * @param {string} message
 * @returns {(error: unknown) => true}
 */
function refusedWith(message) {
  return (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, message);
    return true;
  };
}

// R4, R5

test('the model server is the host and the port that container/compose.yml sets', () => {
  assert.deepEqual(MODEL_SERVER, {
    host: environmentEntry('MODEL_SERVER_HOST'),
    port: environmentEntry('MODEL_SERVER_PORT'),
  });
});

// R3, R8, R10

test('opencode.json alone and opencode.jsonc alone are read', () => {
  assert.deepEqual(chosenFile(DIRECTORY, found('{"a": 1}'), NONE), { path: JSON_PATH, text: '{"a": 1}' });
  assert.deepEqual(chosenFile(DIRECTORY, NONE, found('{"b": 2}')), { path: JSONC_PATH, text: '{"b": 2}' });
});

test('with neither file there is no file', () => {
  assert.equal(chosenFile(DIRECTORY, NONE, NONE), undefined);
});

test('both files are refused', () => {
  assert.throws(
    () => chosenFile(DIRECTORY, found('{}'), found('{}')),
    refusedWith(
      `${DIRECTORY}/ holds both opencode.json and opencode.jsonc, and the sandbox reads one alone. Keep one, with ` +
        'what the other holds moved into it, and start again',
    ),
  );
});

test('a file that cannot be read is refused', () => {
  assert.throws(
    () => chosenFile(DIRECTORY, { found: true, error: 'EACCES: permission denied' }, NONE),
    refusedWith(`cannot read ${JSON_PATH}: EACCES: permission denied. Make it readable, or remove it, and start again`),
  );
  assert.throws(
    () => chosenFile(DIRECTORY, NONE, { found: true, error: 'EISDIR: illegal operation on a directory' }),
    refusedWith(
      `cannot read ${JSONC_PATH}: EISDIR: illegal operation on a directory. Make it readable, or remove it, and ` +
        'start again',
    ),
  );
});

// R3, R10

test('an opencode.jsonc with comments and trailing commas is read', () => {
  const text = '{\n  // local\n  "provider": {\n    /* one */ "ollama": {"name": "Ollama",},\n  },\n}\n';
  assert.deepEqual(readConfiguration(text, JSONC_PATH), { provider: { ollama: { name: 'Ollama' } } });
});

test('a text that is not JSON is refused with the parse error', () => {
  let reason = '';
  try {
    JSON.parse('{"provider": }');
  } catch (error) {
    reason = /** @type {Error} */ (error).message;
  }
  assert.throws(
    () => readConfiguration('{"provider": }', JSON_PATH),
    refusedWith(
      `${JSON_PATH} is not a JSON object once its comments and trailing commas are taken out: ${reason}. Correct ` +
        'it as OpenCode reads it, and start again',
    ),
  );
});

for (const text of ['[1]', '"text"', 'null']) {
  test(`a file holding ${text} is refused as no JSON object`, () => {
    assert.throws(
      () => readConfiguration(text, JSON_PATH),
      refusedWith(
        `${JSON_PATH} is not a JSON object once its comments and trailing commas are taken out: it holds ${text}. ` +
          'Correct it as OpenCode reads it, and start again',
      ),
    );
  });
}

// R4, R5

for (const host of ['localhost', '127.0.0.1', '[::1]']) {
  test(`a provider at ${host} crosses with the host of baseURL replaced`, () => {
    const providers = localProviders(withBaseURL(`http://${host}:11434/v1`), JSON_PATH);
    assert.deepEqual(providers, {
      ollama: { npm: '@ai-sdk/openai-compatible', options: { baseURL: 'http://host.docker.internal:11434/v1' } },
    });
  });
}

test('a baseURL without a path gains no /, and one with user information keeps it', () => {
  const bare = localProviders(withBaseURL('http://localhost:11434'), JSON_PATH);
  assert.deepEqual(bare.ollama.options, { baseURL: 'http://host.docker.internal:11434' });
  const user = localProviders(withBaseURL('http://me:word@localhost:11434/v1?x=1'), JSON_PATH);
  assert.deepEqual(user.ollama.options, { baseURL: 'http://me:word@host.docker.internal:11434/v1?x=1' });
});

for (const baseURL of [
  'http://192.168.1.2:11434/v1',
  'https://api.openai.com/v1',
  'http://localhost:1234/v1',
  'http://localhost/v1',
  'http://localhost:80/v1',
  'https://localhost:11434/v1',
  'not a url',
  42,
  null,
  undefined,
]) {
  test(`a provider with the baseURL ${JSON.stringify(baseURL)} does not cross`, () => {
    assert.deepEqual(localProviders(withBaseURL(baseURL), JSON_PATH), {});
  });
}

test('a provider with no options, or options that are no object, does not cross', () => {
  assert.deepEqual(localProviders({ provider: { a: { npm: 'x' }, b: { options: 'x' }, c: 'x' } }, JSON_PATH), {});
});

test('a provider that is absent or not an object gives no provider', () => {
  for (const configuration of [{}, { provider: null }, { provider: [] }, { provider: 'x' }, { model: 'x' }]) {
    assert.deepEqual(localProviders(configuration, JSON_PATH), {});
  }
});

test('of several providers only the local ones cross, in the order of the file', () => {
  const configuration = {
    provider: {
      lmstudio: { options: { baseURL: 'http://127.0.0.1:11434/v1' } },
      openai: { options: { baseURL: 'https://api.openai.com/v1', apiKey: 'secret' } },
      ollama: { options: { baseURL: 'http://localhost:11434/v1' } },
    },
  };
  assert.deepEqual(Object.keys(localProviders(configuration, JSON_PATH)), ['lmstudio', 'ollama']);
});

// R5

test('only the kept keys of a provider and of its models cross, each as written', () => {
  const configuration = {
    provider: {
      ollama: {
        npm: '@ai-sdk/openai-compatible',
        name: 'Ollama',
        apiKey: 'secret',
        headers: { Authorization: 'Bearer secret' },
        id: 'ollama',
        env: ['OLLAMA_KEY'],
        whitelist: ['m'],
        unknown: 1,
        options: { baseURL: 'http://localhost:11434/v1', apiKey: '{env:KEY}', headers: { X: 'y' }, timeout: 5 },
        models: {
          'qwen3:8b': {
            name: 'Qwen 3',
            limit: { context: 32768, output: 4096 },
            options: { reasoningEffort: 'high', extra: { deep: [1, 2] } },
            variants: { fast: { options: { reasoningEffort: 'low' } } },
            id: 'qwen3',
            apiKey: 'secret',
            headers: { X: 'y' },
            reasoning: true,
            unknown: 2,
          },
          bare: {},
        },
      },
    },
  };
  assert.deepEqual(localProviders(configuration, JSON_PATH), {
    ollama: {
      npm: '@ai-sdk/openai-compatible',
      name: 'Ollama',
      options: { baseURL: 'http://host.docker.internal:11434/v1' },
      models: {
        'qwen3:8b': {
          name: 'Qwen 3',
          limit: { context: 32768, output: 4096 },
          options: { reasoningEffort: 'high', extra: { deep: [1, 2] } },
          variants: { fast: { options: { reasoningEffort: 'low' } } },
        },
        bare: {},
      },
    },
  });
});

test('a provider without models crosses without it', () => {
  const providers = localProviders(withBaseURL('http://localhost:11434/v1'), JSON_PATH);
  assert.equal(Object.hasOwn(providers.ollama, 'models'), false);
});

// R11

for (const models of [[], 'x', null]) {
  test(`models of ${JSON.stringify(models)} are refused`, () => {
    const configuration = { provider: { ollama: { options: { baseURL: 'http://localhost:11434/v1' }, models } } };
    assert.throws(
      () => localProviders(configuration, JSON_PATH),
      refusedWith(
        `${JSON_PATH}: the models of the local provider "ollama" are not a JSON object. Correct them, and start again`,
      ),
    );
  });
}

for (const model of [[], 'x', null, 1]) {
  test(`a model of ${JSON.stringify(model)} is refused`, () => {
    const models = { good: {}, 'qwen3:8b': model };
    const configuration = { provider: { ollama: { options: { baseURL: 'http://localhost:11434/v1' }, models } } };
    assert.throws(
      () => localProviders(configuration, JSON_PATH),
      refusedWith(
        `${JSON_PATH}: the model "qwen3:8b" of the local provider "ollama" is not a JSON object. Correct it, and ` +
          'start again',
      ),
    );
  });
}

test('the models of a provider that is not local are not judged', () => {
  const configuration = { provider: { far: { options: { baseURL: 'http://example.com:11434' }, models: 'x' } } };
  assert.deepEqual(localProviders(configuration, JSON_PATH), {});
});

// R2, R6, R7

test("the configuration for OpenCode is the kit's with the local providers, and nothing else of the host's", () => {
  const host = {
    $schema: 'https://opencode.ai/config.json',
    model: 'ollama/qwen3:8b',
    plugin: ['x'],
    mcp: { a: { type: 'local', command: ['a'] } },
    permission: { bash: 'allow' },
    provider: { ollama: { apiKey: 'secret', options: { baseURL: 'http://localhost:11434/v1' } } },
  };
  const content = opencodeConfiguration(KIT, localProviders(host, JSON_PATH));
  assert.deepEqual(JSON.parse(content), {
    $schema: 'https://opencode.ai/config.json',
    autoupdate: false,
    provider: { ollama: { options: { baseURL: 'http://host.docker.internal:11434/v1' } } },
  });
  assert.doesNotMatch(content, /[\n\r\t]/);
  assert.doesNotMatch(content, /secret|plugin|mcp|permission|qwen3/);
});

test('a tab in a value is written escaped, so the content stays one field', () => {
  const content = opencodeConfiguration(KIT, { 'a\tb': { name: 'line\nbreak' } });
  assert.doesNotMatch(content, /[\n\r\t]/);
});

test("the name of the configuration's file holds the hash of its content", () => {
  const content = opencodeConfiguration(KIT, { ollama: { options: { baseURL: 'http://host.docker.internal:11434' } } });
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  assert.equal(configurationName(content), `opencode-configuration-${hash}.json`);
  assert.match(configurationName(content), /^opencode-configuration-[0-9a-f]{16}\.json$/);
  assert.notEqual(configurationName(content), configurationName(`${content} `));
});

// R9

test('the note names one provider handed to OpenCode, and the file', () => {
  assert.equal(
    providersNote(JSON_PATH, ['ollama']),
    `OpenCode is given the local provider "ollama" of ${JSON_PATH}`,
  );
});

test('the note names two and three providers', () => {
  assert.equal(
    providersNote(JSON_PATH, ['ollama', 'lmstudio']),
    `OpenCode is given the local providers "ollama" and "lmstudio" of ${JSON_PATH}`,
  );
  assert.equal(
    providersNote(JSONC_PATH, ['a', 'b', 'c']),
    `OpenCode is given the local providers "a", "b" and "c" of ${JSONC_PATH}`,
  );
});

test('a name with a tab or a line break is written so that the note stays one line', () => {
  assert.doesNotMatch(providersNote(JSON_PATH, ['a\tb', 'c\nd']), /[\n\r\t]/);
});

test('the note of a file with no local provider', () => {
  assert.equal(
    providersNote(JSON_PATH, []),
    `${JSON_PATH} holds no local provider on port 11434, so OpenCode is given none`,
  );
});

test('the note of no file', () => {
  assert.equal(
    noFileNote(DIRECTORY),
    `there is no opencode.json or opencode.jsonc in ${DIRECTORY}/, so OpenCode is given no local provider`,
  );
});
