import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The names that make a temporary directory. The test of this helper fails for every other file of the suite that
// holds one, so they are written here and nowhere else.
export const temporaryDirectoryNames = /\b(?:mkdtemp(?:Sync)?|tmpdir)\b/;

// Makes a directory for a test under the temporary directory, removes it when the test ends, and gives its path
// with symbolic links resolved. A command started in the directory reports that path, and not the one node names
// the temporary directory by: on macOS `/var` is a link to `/private/var`, so a test that expects the unresolved
// path fails there and passes on Linux, where the two are the same.
export function temporaryDirectory(testContext, prefix) {
  // The space after the prefix puts every test that runs the kit's code in a directory of its own under a path that
  // holds a space, so that the suite keeps the kit's commands working from such a path.
  const directory = realpathSync(mkdtempSync(join(tmpdir(), `${prefix} `)));
  testContext.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
