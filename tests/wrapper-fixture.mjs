// The host the two wrapper tests run the wrapper on: a `bin` directory that is the whole PATH, so that no test
// depends on which harnesses the host that runs the suite has, or at which version.
import { chmodSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, delimiter, join } from 'node:path';

// What the fake harnesses print, in the two forms the real commands use. The versions are ones no release of either
// harness has, so that no test comes to depend on what the registry holds.
export const hostVersions = { claude: '99.1.0', opencode: '98.2.0' };

// What the fake `npm` gives as the latest published version of each harness's package. They differ from
// `hostVersions`, so that the tests tell the two sources apart by their values.
export const latestVersions = { claude: '97.3.0', opencode: '96.4.0' };

// The two directories the wrapper mounts from the host, as they lie in a home: Claude Code's sessions and OpenCode's
// data. In the project's log directory they have these places, and in the container the same under /home/agent.
export const logDirectories = ['.claude/projects', '.local/share/opencode'];

// The log directory of the project at `root` on a host whose data directory is `data`.
export function logDirectory(data, root) {
  return join(data, 'agentrite', basename(root));
}

// The two flags the wrapper passes for the log directory `logs`, as a recorded call holds them, each followed by a
// space.
export function logMounts(logs) {
  return logDirectories.map((directory) => `--volume ${logs}/${directory}:/home/agent/${directory} `).join('');
}

// The commands the wrapper, the dev shim and the fakes below run, besides `docker`, `npm` and the harnesses, and
// those a unit run and the scripts that play its agent run: `git` and what follows it. A node's own directory
// cannot be put on the PATH instead, because a harness installed with `npm install -g` sits in it, and so does the
// real `npm`.
const linkedCommands = [
  'bash',
  'basename',
  'cat',
  'chmod',
  'dirname',
  'id',
  'git',
  'grep',
  'mkdir',
  'mktemp',
  'mv',
  'rm',
];

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
// * a `docker` that records each call in `calls`, opened by the variables named in `recorded` as it saw them. Three
//   questions it answers without recording them:
//     * `config --format json`, with the merged configuration: the image name, and the build arguments the base
//       Compose file takes from the wrapper's two variables with the JSON object in `projectBuildArgs` over them,
//       which stands for what the project's Compose file gives. An empty file stands for a configuration Compose
//       refuses
//     * `image inspect`, with the content of `imageLabels`, which is the image's two version labels as
//       `<claude>|<opencode>`, or with exit 1 when the file is not there, which stands for a missing image
//     * `ps`, with the content of the file `runningContainer` when that is there, which stands for a container
//       running under the name the file holds, and with nothing otherwise. It fails instead, as it does with no
//       daemon to ask, when the file `psFails` is there
//   A `build` is recorded and then fails when the file `buildFails` is there. An `rm` is recorded and does
//   nothing. A `run` is recorded and then plays the agent when the file `agentScript` is there: it runs that file
//   with `bash` in the directory the call mounts at `/work`, and exits with its status
// * an `npm` that records each call, which `npmCalls` reads, and answers `view <package> version` with the
//   package's version of `latestVersions`. It prints the content of the file `npmPrints` instead when that is
//   there, and fails, as the real one does with no registry to reach, when the file `npmFails` is. A test that
//   wants a host without `npm` removes its file
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
  const runningContainer = join(base, 'running-container');
  const agentScript = join(base, 'agent-script');
  const psFails = join(base, 'ps-fails');
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
if [ "$1" = "ps" ]; then
  if [ -f "${psFails}" ]; then echo "Cannot connect to the Docker daemon" >&2; exit 1; fi
  [ ! -f "${runningContainer}" ] || cat "${runningContainer}"
  exit 0
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
if [[ " $* " == *" build "* ]] && [ -f "${buildFails}" ]; then echo "failed to solve: no network" >&2; exit 17; fi
if [[ " $* " == *" run "* ]] && [ -f "${agentScript}" ]; then
  for argument in "$@"; do
    case "$argument" in *:/work) work="\${argument%:/work}" ;; esac
  done
  cd "$work" && exec bash "${agentScript}"
fi`,
  );

  const npmRecord = join(base, 'npm-calls');
  const npmPrints = join(base, 'npm-prints');
  const npmFails = join(base, 'npm-fails');
  writeCommand(
    bin,
    'npm',
    `echo "npm $*" >> "${npmRecord}"
if [ -f "${npmFails}" ]; then echo "npm error code ECONNREFUSED" >&2; exit 1; fi
if [ -f "${npmPrints}" ]; then cat "${npmPrints}"; exit 0; fi
[ "$1 $3" = "view version" ] || exit 64
case "$2" in
  @anthropic-ai/claude-code) echo '${latestVersions.claude}' ;;
  opencode-ai) echo '${latestVersions.opencode}' ;;
  *) echo "npm error code E404" >&2; exit 1 ;;
esac`,
  );

  const linesOf = (file) => () => {
    try {
      return readFileSync(file, 'utf-8').trim().split('\n');
    } catch {
      return [];
    }
  };
  const dockerCalls = linesOf(calls);
  const npmCalls = linesOf(npmRecord);
  return {
    bin,
    projectBuildArgs,
    imageLabels,
    buildFails,
    runningContainer,
    agentScript,
    psFails,
    dockerCalls,
    npmPrints,
    npmFails,
    npmCalls,
  };
}
