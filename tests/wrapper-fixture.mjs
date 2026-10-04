// The host the two wrapper tests run the wrapper on: a `bin` directory that is the whole PATH, so that no test
// depends on which harnesses the host that runs the suite has, or at which version.
import { chmodSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

// What the fake harnesses print, in the two forms the real commands use.
export const hostVersions = { claude: '2.1.289', opencode: '1.18.34' };

// The commands the wrapper, the dev shim and the fakes below run, besides `docker` and the harnesses. A node's own
// directory cannot be put on the PATH instead, because a harness installed with `npm install -g` sits in it.
const linkedCommands = ['bash', 'basename', 'cat', 'dirname', 'id', 'sed'];

function findOnPath(command) {
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = join(directory, command);
    if (directory !== '' && existsSync(candidate)) return candidate;
  }
  throw new Error(`${command} is not on the PATH of the suite, and the wrapper needs it`);
}

export function writeCommand(bin, name, script) {
  writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${script}\n`);
  chmodSync(join(bin, name), 0o755);
}

// Creates `bin` under `base` and returns what a test needs of it:
//
// * `claude` and `opencode` that print `hostVersions`. A test that wants a harness absent removes its file, and
//   one that wants it to misbehave rewrites it with `writeCommand`
// * a `docker` that records each call in `calls`, opened by the variables named in `recorded` as it saw them. Two
//   questions it answers without recording them:
//     * `config --format json`, with the merged configuration: the image name, and the build arguments the base
//       Compose file takes from the wrapper's two variables with the JSON object in `projectBuildArgs` over them,
//       which stands for what the project's Compose file gives. An empty file stands for a configuration Compose
//       refuses
//     * `image inspect`, with the content of `imageLabels`, which is the image's two version labels as
//       `<claude>|<opencode>`, or with exit 1 when the file is not there, which stands for a missing image
//   A `build` is recorded and then fails when the file `buildFails` is there
export function fakeHost(base, recorded) {
  const bin = join(base, 'bin');
  mkdirSync(bin);
  symlinkSync(process.execPath, join(bin, 'node'));
  for (const command of linkedCommands) symlinkSync(findOnPath(command), join(bin, command));
  writeCommand(bin, 'claude', `echo '${hostVersions.claude} (Claude Code)'`);
  writeCommand(bin, 'opencode', `echo '${hostVersions.opencode}'`);

  const calls = join(base, 'docker-calls');
  const projectBuildArgs = join(base, 'project-build-args.json');
  const imageLabels = join(base, 'image-labels');
  const buildFails = join(base, 'build-fails');
  writeFileSync(projectBuildArgs, '{}');
  writeFileSync(imageLabels, `${hostVersions.claude}|${hostVersions.opencode}\n`);
  const record = recorded.map((variable) => `${variable}=$${variable}`).join(' ');
  writeCommand(
    bin,
    'docker',
    `if [ "$1 $2" = "image inspect" ]; then
  [ -f "${imageLabels}" ] || exit 1
  cat "${imageLabels}"; exit 0
fi
if [[ " $* " == *" config --format json "* ]]; then
  [ -s "${projectBuildArgs}" ] || { echo "validating compose.project.yml: invalid" >&2; exit 15; }
  exec node -e '
    let json = "";
    process.stdin.on("data", (chunk) => (json += chunk));
    process.stdin.on("end", () => {
      const args = {
        CLAUDE_CODE_VERSION: process.env.AGENT_CLAUDE_CODE_VERSION,
        OPENCODE_VERSION: process.env.AGENT_OPENCODE_VERSION,
        ...JSON.parse(json),
      };
      console.log(JSON.stringify({ name: "project-agent", services: { agent: { image: "image", build: { args } } } }));
    });
  ' < "${projectBuildArgs}"
fi
echo "${record} docker $*" >> "${calls}"
if [[ " $* " == *" build "* ]] && [ -f "${buildFails}" ]; then echo "failed to solve: no network" >&2; exit 17; fi`,
  );

  const dockerCalls = () => {
    try {
      return readFileSync(calls, 'utf-8').trim().split('\n');
    } catch {
      return [];
    }
  };
  return { bin, projectBuildArgs, imageLabels, buildFails, dockerCalls };
}
