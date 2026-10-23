// The paths that the `RUN chmod +x` of container/Dockerfile makes executable, read from its text across the lines a
// trailing backslash continues it on.
export function executablePaths(dockerfile) {
  const chmod = dockerfile.match(/^RUN chmod \+x ((?:.*\\\n)*.*)$/m);
  if (!chmod) return [];
  return chmod[1].split(/[\s\\]+/).filter((path) => path !== '');
}
