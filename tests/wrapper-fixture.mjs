// The host the two wrapper tests run the wrapper on: a `bin` directory that is the whole PATH, so that no test
// depends on which harnesses the host that runs the suite has, or at which version.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESS_NAMES, HARNESSES } from '../scripts/agentrite-harness.mjs';
import { copyKitInstructions, kitSettingsText } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

// The version each fake harness prints, by its name, for every harness of the list. The versions are ones no release
// of a harness has, so that no test comes to depend on what the registry holds.
export const hostVersions = Object.fromEntries(
  HARNESSES.map(({ name }, index) => [name, `${99 - index}.${index + 1}.0`]),
);

// What the fake `npm` gives as the latest published version of each harness's package. They differ from
// `hostVersions`, so that the tests tell the two sources apart by their values.
export const latestVersions = Object.fromEntries(
  HARNESSES.map(({ name }, index) => [name, `${97 - index}.${index + 3}.0`]),
);

// What a fake harness prints for --version: the first of the bare version, its name and the version, its command and
// the version, and its command with -cli and the version, as Codex prints it, that its module reads as the version.
// A harness whose module reads none of them fails here, naming it, so that a harness added to the list gets a fake
// of its own.
export function versionPrinted({ name, start, sandbox }, version) {
  const candidates = [version, `${name} ${version}`, `${start.command} ${version}`, `${start.command}-cli ${version}`];
  const printed = candidates.find(
    (candidate) => sandbox.readVersion(`${candidate}\n`) === version,
  );
  assert.ok(printed, `the fake ${name} prints no version that its readVersion reads`);
  return printed;
}

// The version of the kit that `installKitPackage` installs, which no release has, so that no test comes to depend on
// the version of the working tree.
export const kitVersion = '97.0.0';

// Writes the `package.json` of an installed kit into `installed`, a directory that stands for one, with the version
// `kitVersion`. The wrapper reads it beside its `container/`.
export function installKitPackage(installed) {
  mkdirSync(installed, { recursive: true });
  writeFileSync(join(installed, 'package.json'), `${JSON.stringify({ name: 'agentrite', version: kitVersion })}\n`);
}

// The record of the harnesses an image holds, as its label writes it: `<name>@<version>` of each harness of `versions`,
// a map of names to versions, in the order of the list, a version left out or empty leaving its harness out.
export function harnessRecord(versions) {
  return HARNESS_NAMES.filter((name) => versions[name])
    .map((name) => `${name}@${versions[name]}`)
    .join(' ');
}

// The packages of the harnesses of `versions` at their versions, as the wrapper hands them to the build.
export function harnessPackages(versions) {
  return HARNESSES.filter(({ name }) => versions[name])
    .map(({ name, sandbox }) => `${sandbox.package}@${versions[name]}`)
    .join(' ');
}

// The content of a fake host's `imageLabels`: the image's two labels, the record of the harnesses of `versions` and
// the version of the kit, as `<record>|<kit>`. The kit's is `kitVersion` unless it is given as `kit`.
export function imageLabelsText({ kit = kitVersion, ...versions }) {
  return `${harnessRecord(versions)}|${kit}\n`;
}

// The lines of a fake `docker` that answer `image inspect` with the labels in `imageLabels`, which the wrapper's
// format asks for both of.
function labelsAnswer(imageLabels) {
  return `cat "${imageLabels}"; exit 0`;
}

// The harnesses of the list named `names`, in the order of the list.
const harnessesNamed = (names) => HARNESSES.filter(({ name }) => names.includes(name));

// The directories the wrapper mounts from the host for the harnesses named `names`, as they lie in a home, in the
// order of the list. In the project's log directory they have these places, and in the container the same under
// /home/agent.
export function logDirectoriesOf(names = HARNESS_NAMES) {
  return harnessesNamed(names).flatMap(({ sandbox }) => sandbox.logDirectories);
}

// The directories of every harness of the list.
export const logDirectories = logDirectoriesOf();

// The flags of the environment a run is given for the harnesses named `names` that turn off each one's updates, each
// followed by a space.
export function updateEnvironment(names = HARNESS_NAMES) {
  return harnessesNamed(names)
    .flatMap(({ sandbox }) => sandbox.updates.environment)
    .map((entry) => `--env ${entry} `)
    .join('');
}

// The flags of the environment a run with "bell": true is given for the harnesses named `names` that ring the bell.
export function bellEnvironment(names = HARNESS_NAMES) {
  return harnessesNamed(names)
    .flatMap(({ sandbox }) => sandbox.bell.environment)
    .map((entry) => `--env ${entry} `)
    .join('');
}

// The flag of a file of the kit at `container` that a harness mounts of its own directory.
const kitMount = (container, name) => ({ path, target }) =>
  `--volume ${container}/harnesses/${name}/${path}:${target}:ro `;

// The flags of the files of the kit at `container` that a run mounts for the harnesses named `names` to turn off each
// one's updates.
export function updateMounts(container, names = HARNESS_NAMES) {
  return harnessesNamed(names)
    .flatMap(({ name, sandbox }) => sandbox.updates.mounts.map(kitMount(container, name)))
    .join('');
}

// The flags of the files of the kit at `container` that a run with "bell": true mounts: the script every harness's
// bell runs, then the files of the bell of each harness named `names`.
export function bellMounts(container, names = HARNESS_NAMES) {
  return [
    `--volume ${container}/bell/ring-bell.sh:/etc/agentrite/bell/ring-bell.sh:ro `,
    ...harnessesNamed(names).flatMap(({ name, sandbox }) => sandbox.bell.mounts.map(kitMount(container, name))),
  ].join('');
}

// Writes the agentrite.json of a start of the sandbox into `root`: `bell`, and `harnesses`, every harness of the list
// unless it is given, the two keys a start reads.
export function writeStartSettings(root, { bell = false, harnesses = HARNESS_NAMES } = {}) {
  writeFileSync(join(root, 'agentrite.json'), `${JSON.stringify({ bell, harnesses })}\n`);
}

// Asserts that `stderr` lists the four forms of the wrapper, as it does with every refusal of its arguments.
export function assertFormsListed(stderr) {
  assert.match(stderr, /sandbox\.sh UNIT /);
  assert.match(stderr, /sandbox\.sh --in-place /);
  assert.match(stderr, /sandbox\.sh --workdir DIR /);
  assert.match(stderr, /sandbox\.sh --connect UNIT /);
}

// The log directory of the project at `root` on a host whose data directory is `data`.
export function logDirectory(data, root) {
  return join(data, 'agentrite', basename(root));
}

// The flags the wrapper passes for the log directory `logs` and the harnesses named `names`, as a recorded call holds
// them, each followed by a space.
export function logMounts(logs, names = HARNESS_NAMES) {
  return logDirectoriesOf(names)
    .map((directory) => `--volume ${logs}/${directory}:/home/agent/${directory} `)
    .join('');
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

// The text of the base Compose file's KIT_ALLOWLIST block as Compose gives it, with the variable it holds replaced by
// `harnessAllowlist`: the block's lines without their indentation, and one line break at the end.
const baseCompose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');
export function kitAllowlist(harnessAllowlist) {
  const lines = baseCompose.split('\n');
  const block = [];
  for (const line of lines.slice(lines.indexOf('      KIT_ALLOWLIST: |') + 1)) {
    if (line.trim() !== '' && !line.startsWith('        ')) break;
    block.push(line.slice(8));
  }
  while (block.at(-1) === '') block.pop();
  return `${block.join('\n').replace(/\$\{SANDBOX_HARNESS_ALLOWLIST:\?[^}]*\}/, harnessAllowlist)}\n`;
}

// The node script with which both hosts' `docker` answers `config --format json`: it reads the JSON object of the
// project's build arguments on its input, the project's environment from PROJECT_ENVIRONMENT, a file of a JSON object,
// and the project's Compose file from PROJECT_COMPOSE. The base file's build arguments and KIT_ALLOWLIST come from
// the wrapper's variables, as Compose interpolates them, and the project's stand over them.
const mergedConfiguration = `
    let json = "";
    process.stdin.on("data", (chunk) => (json += chunk));
    process.stdin.on("end", () => {
      const fs = require("fs");
      const env = process.env;
      const args = {
        HARNESS_PACKAGES: env.SANDBOX_HARNESS_PACKAGES,
        HARNESS_RECORD: env.SANDBOX_HARNESS_RECORD,
        HARNESS_DIRECTORIES: env.SANDBOX_HARNESS_DIRECTORIES,
        AGENTRITE_VERSION: env.SANDBOX_AGENTRITE_VERSION,
        ...JSON.parse(json),
      };
      const environment = {
        KIT_ALLOWLIST: JSON.parse(env.KIT_ALLOWLIST_TEXT).replace("\\u0000", env.SANDBOX_HARNESS_ALLOWLIST),
        ...JSON.parse(fs.readFileSync(env.PROJECT_ENVIRONMENT, "utf-8")),
      };
      const file = env.PROJECT_COMPOSE;
      const project = file && fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
      const literal = project.match(/^name: (\\S+)$/m)?.[1];
      const name = literal ?? "project-sandbox";
      const sandbox = { image: literal ?? "image", build: { args }, environment };
      // Compose merges a service the project still names agent beside the kit, which gives no image
      const services = /^  agent:$/m.test(project) ? { agent: sandbox, sandbox: { build: { args } } } : { sandbox };
      console.log(JSON.stringify({ name, services }));
    });
  `;

// The variables that the kit's base Compose file requires with `${NAME:?...}`, which Compose refuses to read the file
// without, whatever it is asked.
const requiredVariables = [
  ...readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8').matchAll(/\$\{(\w+):\?/g),
].map((match) => match[1]);

// The lines of a fake `docker` that answer `config --format json` with the build arguments of the file
// `projectBuildArgs` and the environment of the file `projectEnvironment`, as `fakeHost` describes. As Compose does,
// it refuses when a variable of `requiredVariables` is missing a value.
function configAnswer(projectBuildArgs, projectEnvironment) {
  const required = requiredVariables
    .map((name) => `  [ -n "\${${name}:-}" ] || { echo "required variable ${name} is missing a value" >&2; exit 15; }`)
    .join('\n');
  const allowlistText = JSON.stringify(kitAllowlist('\u0000')).replaceAll("'", "'\\''");
  return `if [[ " $* " == *" config --format json "* ]]; then
${required}
  export PROJECT_ENVIRONMENT="${projectEnvironment}" KIT_ALLOWLIST_TEXT='${allowlistText}'
  [ -s "${projectBuildArgs}" ] || { echo "validating compose.project.yml: invalid" >&2; exit 15; }
  for argument in "$@"; do
    [ "$previous" != "-f" ] || export PROJECT_COMPOSE="$argument"
    previous="$argument"
  done
  exec node -e '${mergedConfiguration}' < "${projectBuildArgs}"
fi`;
}

// The lines of `file` as a function that reads them each time it is called, with none for a file not there.
const linesOf = (file) => () => {
  try {
    return readFileSync(file, 'utf-8').trim().split('\n');
  } catch {
    return [];
  }
};

// Creates `bin` under `base`, holding `node`, the commands of `linkedCommands`, the command of each harness of the
// list and the `npm` that `fakeHost` describes, and no `docker`, and returns `bin` and what a test needs of `npm`.
function hostBin(base) {
  const bin = join(base, 'bin');
  mkdirSync(bin);
  symlinkSync(process.execPath, join(bin, 'node'));
  for (const command of linkedCommands) symlinkSync(findOnPath(command), join(bin, command));
  for (const harness of HARNESSES) {
    writeCommand(bin, harness.start.command, `echo '${versionPrinted(harness, hostVersions[harness.name])}'`);
  }

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
${HARNESSES.map(({ name, sandbox }) => `  ${sandbox.package}) echo '${latestVersions[name]}' ;;`).join('\n')}
  *) echo "npm error code E404" >&2; exit 1 ;;
esac`,
  );

  return { bin, npmPrints, npmFails, npmCalls: linesOf(npmRecord) };
}

// Creates `bin` under `base` and returns what a test needs of it:
//
// * the command of each harness of the list, which prints its version of `hostVersions`. A test that wants a harness
//   absent removes its file, and one that wants it to misbehave rewrites it with `writeCommand`
// * a `docker` that records each call in `calls`, opened by the variables named in `recorded` as it saw them. Three
//   questions it answers without recording them:
//     * `config --format json`, with the merged configuration: the image name, the build arguments the base
//       Compose file takes from the wrapper's variables with the JSON object in `projectBuildArgs` over them, which
//       stands for what the project's Compose file gives, and the environment, the base file's KIT_ALLOWLIST with
//       the JSON object in `projectEnvironment` over it. An empty `projectBuildArgs` stands for a configuration
//       Compose refuses. The name and the services come from the file of the last `-f` of the call: a line
//       `name: <name>` at the left margin gives the name and the image, and a line `  agent:` makes a service
//       `agent` beside a `sandbox` that has no image, as Compose merges the two files
//     * `image inspect`, with the content of `imageLabels`, which is the image's two labels as `imageLabelsText`
//       writes them, or with exit 1 when the file is not there, which stands for a missing image. An
//       `image inspect` whose format names the label of a project's Dockerfile is answered with the content of
//       `imageProjectDockerfile` instead, which is empty unless a test writes it, and with exit 1 likewise
//     * `ps`, with the content of the file `runningContainer` when that is there, which stands for a container
//       running under the name the file holds, and with nothing otherwise. It fails instead, as it does with no
//       daemon to ask, when the file `psFails` is there
//   Every call it records writes the SANDBOX_HARNESS_ALLOWLIST it saw, which `harnessAllowlist` reads. A `build` is
//   recorded and then fails when the file `buildFails` is there. An `rm` is recorded and does nothing. An `exec`
//   is recorded, runs nothing, and exits with the status the file `execStatus` holds when that is there, which
//   stands for the status of the command Docker ran in the container. A `run` is recorded and then plays the agent
//   when the file `agentScript` is there: it runs that file with `bash` in the directory the call mounts at
//   `/work`, and exits with its status
// * an `npm` that records each call, which `npmCalls` reads, and answers `view <package> version` for the package of
//   each harness of the list with the harness's version of `latestVersions`. It prints the content of the file
//   `npmPrints` instead when that is there, and fails, as the real one does with no registry to reach, when the
//   file `npmFails` is. A test that wants a host without `npm` removes its file
export function fakeHost(base, recorded) {
  const host = hostBin(base);
  const { bin } = host;

  const calls = join(base, 'docker-calls');
  const projectBuildArgs = join(base, 'project-build-args.json');
  const projectEnvironment = join(base, 'project-environment.json');
  const imageLabels = join(base, 'image-labels');
  const imageProjectDockerfile = join(base, 'image-project-dockerfile');
  const buildFails = join(base, 'build-fails');
  const runningContainer = join(base, 'running-container');
  const agentScript = join(base, 'agent-script');
  const psFails = join(base, 'ps-fails');
  const execStatus = join(base, 'exec-status');
  const harnessAllowlist = join(base, 'harness-allowlist');
  writeFileSync(projectBuildArgs, '{}');
  writeFileSync(projectEnvironment, '{}');
  writeFileSync(imageLabels, imageLabelsText(hostVersions));
  writeFileSync(imageProjectDockerfile, '');
  const record = recorded.map((variable) => `${variable}=$${variable}`).join(' ');
  writeCommand(
    bin,
    'docker',
    `if [ "$1 $2" = "image inspect" ]; then
  [ -f "${imageLabels}" ] || exit 1
  [[ " $* " != *com.ritenoar.agentrite.project-dockerfile* ]] || { cat "${imageProjectDockerfile}"; exit 0; }
  ${labelsAnswer(imageLabels)}
fi
if [ "$1" = "ps" ]; then
  if [ -f "${psFails}" ]; then echo "Cannot connect to the Docker daemon" >&2; exit 1; fi
  [ ! -f "${runningContainer}" ] || cat "${runningContainer}"
  exit 0
fi
${configAnswer(projectBuildArgs, projectEnvironment)}
echo "${record} docker $*" >> "${calls}"
printf '%s' "\${SANDBOX_HARNESS_ALLOWLIST:-}" > "${harnessAllowlist}"
if [ "$1" = "exec" ]; then
  [ ! -f "${execStatus}" ] || exit "$(cat "${execStatus}")"
  exit 0
fi
if [[ " $* " == *" build "* ]] && [ -f "${buildFails}" ]; then echo "failed to solve: no network" >&2; exit 17; fi
if [[ " $* " == *" run "* ]] && [ -f "${agentScript}" ]; then
  for argument in "$@"; do
    case "$argument" in *:/work) work="\${argument%:/work}" ;; esac
  done
  cd "$work" && exec bash "${agentScript}"
fi`,
  );

  const dockerCalls = linesOf(calls);
  return {
    ...host,
    projectBuildArgs,
    projectEnvironment,
    imageLabels,
    imageProjectDockerfile,
    buildFails,
    runningContainer,
    agentScript,
    psFails,
    execStatus,
    harnessAllowlist: () => readFileSync(harnessAllowlist, 'utf-8'),
    dockerCalls,
  };
}

// The Dockerfile of the stand-in for the kit's image that `dockerHost` builds: an image of one marker file, with the
// two labels the kit's image has, from the build arguments the kit's image sets them from, and the working directory,
// the entrypoint and the command of the kit's. It runs nothing, so it builds without the network. The label
// `standInLabel` marks it, and every image built on it, so that a test can remove the ones its builds left unnamed.
export const standInLabel = 'com.ritenoar.agentrite.test-stand-in';
const standInDockerfile = `FROM scratch
COPY kit-marker /kit-marker
LABEL ${standInLabel}=true
ARG HARNESS_RECORD
ARG AGENTRITE_VERSION
LABEL com.ritenoar.agentrite.harnesses="$HARNESS_RECORD"
LABEL com.ritenoar.agentrite.kit-version=$AGENTRITE_VERSION
WORKDIR /work
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]
`;

// Creates `bin` under `base` as `fakeHost` does, with the same harnesses and `npm`, and a `docker` that is
// the real one of the suite's PATH but for Compose, so that images are built and read without building the kit's
// image, which needs the network and minutes. Its `docker` records each call it records in `calls`, opened by the
// variables named in `recorded` as it saw them:
//
// * `config --format json` it answers as `fakeHost`'s does, from `projectBuildArgs`, without recording it
// * `compose ... build` it records, and then runs a real `docker build` of the stand-in for the kit's image under
//   `base`, tagged with the image name of the merged configuration and given the record of the harnesses and the
//   kit's version of the wrapper's variables. It fails instead, without building, when the file `buildFails` is there
// * `compose ... run` it records, and runs nothing
// * every other call it passes to the real `docker`, recording a `build` and a `tag`. It gives the real one the
//   suite's DOCKER_CONFIG and DOCKER_HOST, which the home of a test would otherwise hide
export function dockerHost(base, recorded) {
  const host = hostBin(base);
  const { bin } = host;
  const docker = findOnPath('docker');
  const standIn = join(base, 'kit-stand-in');
  mkdirSync(standIn);
  writeFileSync(join(standIn, 'Dockerfile'), standInDockerfile);
  writeFileSync(join(standIn, 'kit-marker'), 'the kit\n');

  const calls = join(base, 'docker-calls');
  const projectBuildArgs = join(base, 'project-build-args.json');
  const projectEnvironment = join(base, 'project-environment.json');
  const buildFails = join(base, 'build-fails');
  writeFileSync(projectBuildArgs, '{}');
  writeFileSync(projectEnvironment, '{}');
  const record = recorded.map((variable) => `${variable}=$${variable}`).join(' ');
  const passed = [
    `export DOCKER_CONFIG="${process.env.DOCKER_CONFIG ?? join(homedir(), '.docker')}"`,
    ...(process.env.DOCKER_HOST ? [`export DOCKER_HOST="${process.env.DOCKER_HOST}"`] : []),
  ].join('\n');
  writeCommand(
    bin,
    'docker',
    `${passed}
${configAnswer(projectBuildArgs, projectEnvironment)}
if [ "$1" = "compose" ]; then
  echo "${record} docker $*" >> "${calls}"
  [[ " $* " == *" build "* ]] || exit 0
  if [ -f "${buildFails}" ]; then echo "failed to solve: no network" >&2; exit 17; fi
  # The image is the name the merged configuration gives, from the project's file of the last -f.
  for argument in "$@"; do
    [ "$previous" != "-f" ] || project_compose="$argument"
    previous="$argument"
  done
  image=image
  while read -r line; do
    [[ ! "$line" =~ ^name:\\ (.+)$ ]] || image="\${BASH_REMATCH[1]}"
  done < "$project_compose"
  exec "${docker}" build --quiet --tag "$image" \\
    --build-arg "HARNESS_RECORD=$SANDBOX_HARNESS_RECORD" \\
    --build-arg "AGENTRITE_VERSION=$SANDBOX_AGENTRITE_VERSION" "${standIn}"
fi
[ "$1" != "build" ] && [ "$1" != "tag" ] || echo "${record} docker $*" >> "${calls}"
exec "${docker}" "$@"`,
  );

  return { ...host, projectBuildArgs, projectEnvironment, buildFails, dockerCalls: linesOf(calls) };
}

// Creates `bin` under `base` as `fakeHost` does, with the same harnesses and `npm`, and a `docker` that
// runs real containers of `image`, so that the containers of several runs of one unit can run at once. The image is
// one that is on the host already, and no image is built. Its `docker` records each call it records in `calls`,
// opened by the variables named in `recorded` as it saw them:
//
// * `config --format json` and `image inspect` it answers as `fakeHost`'s does, from `projectBuildArgs` and
//   `imageLabels`, without recording them
// * `compose ... run` it records, and turns into a real `docker run --rm --name <name>` of `image`, with the volumes
//   of the call, the user and group of the suite, `/work` as its working directory, `HOME` in `/tmp`, and the
//   call's command. The flags of the call besides its name and its volumes are not passed on. The image is not the
//   kit's, so the working tree's `container/install-dependencies.sh` is mounted read-only at the path the kit's
//   image holds it at, and a unit run of a new clone runs the real script with the `npm` of the image
// * `exec` it records, and turns into a real `docker exec` as the user and group of the suite, with the call's working
//   directory, environment and command. The image has no `agent` account and no `known-terminal.sh`, so the call's
//   user is replaced and the script is left out
// * every other call, `ps` and `rm` among them, it passes to the real `docker`, giving it the suite's DOCKER_CONFIG
//   and DOCKER_HOST, which the home of a test would otherwise hide
export function containerHost(base, recorded, image) {
  const host = hostBin(base);
  const { bin } = host;
  const docker = findOnPath('docker');
  const installDependencies = fileURLToPath(new URL('../container/install-dependencies.sh', import.meta.url));

  const calls = join(base, 'docker-calls');
  const projectBuildArgs = join(base, 'project-build-args.json');
  const projectEnvironment = join(base, 'project-environment.json');
  const imageLabels = join(base, 'image-labels');
  writeFileSync(projectBuildArgs, '{}');
  writeFileSync(projectEnvironment, '{}');
  writeFileSync(imageLabels, imageLabelsText(hostVersions));
  const record = recorded.map((variable) => `${variable}=$${variable}`).join(' ');
  const passed = [
    `export DOCKER_CONFIG="${process.env.DOCKER_CONFIG ?? join(homedir(), '.docker')}"`,
    ...(process.env.DOCKER_HOST ? [`export DOCKER_HOST="${process.env.DOCKER_HOST}"`] : []),
  ].join('\n');
  writeCommand(
    bin,
    'docker',
    `${passed}
if [ "$1 $2" = "image inspect" ]; then
  [[ " $* " != *com.ritenoar.agentrite.project-dockerfile* ]] || exit 1
  ${labelsAnswer(imageLabels)}
fi
${configAnswer(projectBuildArgs, projectEnvironment)}
if [ "$1" = "compose" ]; then
  echo "${record} docker $*" >> "${calls}"
  # A call of Compose that is no run, as a build, runs nothing. Without this the loops below would shift forever.
  [[ " $* " == *" run "* ]] || exit 0
  while [ $# -gt 0 ] && [ "$1" != "run" ]; do shift; done
  shift
  flags=()
  while [ $# -gt 0 ] && [ "$1" != "sandbox" ]; do
    case "$1" in
      --name | --volume) flags+=("$1" "$2"); shift 2 ;;
      *) shift ;;
    esac
  done
  shift
  exec "${docker}" run --rm "\${flags[@]}" \\
    --volume "${installDependencies}:/usr/local/bin/install-dependencies.sh:ro" \\
    --user "$(id -u):$(id -g)" --workdir /work --env HOME=/tmp "${image}" "$@"
fi
if [ "$1" = "exec" ]; then
  echo "${record} docker $*" >> "${calls}"
  shift
  flags=()
  while [[ "$1" == --* ]]; do
    case "$1" in
      --user) flags+=(--user "$(id -u):$(id -g)"); shift 2 ;;
      --workdir | --env) flags+=("$1" "$2"); shift 2 ;;
      *) shift ;;
    esac
  done
  name="$1"
  shift 2
  exec "${docker}" exec "\${flags[@]}" "$name" "$@"
fi
exec "${docker}" "$@"`,
  );

  return { ...host, projectBuildArgs, projectEnvironment, imageLabels, dockerCalls: linesOf(calls) };
}

const kitContainer = fileURLToPath(new URL('../container/', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');
const kitPath = 'node_modules/agentrite/container';

// The branch of the unit of `containerProject`, one commit ahead of `master`.
export const containerUnitBranch = 'task-0026-doc';

// A project under a temporary directory named from `prefix`, whose unit runs start real containers: a git repository
// on `master`, with `task-0026-doc` one commit ahead, the kit's wrapper installed under its ignored `node_modules`,
// and the host of `containerHost`, whose containers are of the image the kit's Dockerfile builds on. Its Compose
// project is `name`, which its containers are named after, and its clones are under `state`.
export function containerProject(testContext, prefix, name) {
  const base = temporaryDirectory(testContext, prefix);
  const root = join(base, 'project');
  const container = join(root, kitPath);
  mkdirSync(container, { recursive: true });
  for (const file of ['sandbox.sh', 'unit-clone.sh', 'compose.yml']) {
    copyFileSync(join(kitContainer, file), join(container, file));
  }
  chmodSync(join(container, 'sandbox.sh'), 0o755);
  cpSync(kitScripts, join(container, '..', 'scripts'), { recursive: true });
  copyKitInstructions(join(container, '..'));
  installKitPackage(join(container, '..'));
  writeFileSync(
    join(root, 'agentrite.json'),
    kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: true, bell: false }),
  );
  mkdirSync(join(root, 'sandbox'));
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), `name: ${name}\n`);
  writeFileSync(join(root, '.gitignore'), 'node_modules\n.reviews\n.env\n');
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
  assert.ok(image, 'the Dockerfile has a base stage');
  const host = containerHost(base, [], image);
  // The image holds Claude Code alone, the one harness the project names, so that no start has a build due.
  writeFileSync(host.imageLabels, imageLabelsText({ claude: hostVersions.claude }));

  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: { HOME: home, PATH: process.env.PATH } }).trim();
  git('init', '--quiet', '--initial-branch', 'master');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the project');
  git('checkout', '--quiet', '-b', containerUnitBranch);
  writeFileSync(join(root, 'unit.md'), 'the unit\n');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the unit');
  git('checkout', '--quiet', 'master');

  const state = join(home, '.local', 'state', 'agentrite', name);
  const wrapper = join(container, 'sandbox.sh');
  const environment = { HOME: home, PATH: host.bin };
  const clone = (branch) => join(state, branch);
  return { base, root, home, git, state, clone, wrapper, environment, host };
}
