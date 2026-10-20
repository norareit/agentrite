import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const testsDirectory = dirname(fileURLToPath(import.meta.url));

// Every module of the suite under `directory`, at any depth, so that a test of the suite's own text reads them all.
export function moduleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return moduleFiles(path);
    return entry.name.endsWith('.mjs') ? [path] : [];
  });
}
