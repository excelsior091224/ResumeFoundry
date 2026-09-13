import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const secretPattern = /\bsk_(?:test|live)_[A-Za-z0-9._-]{12,}\b/;
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.mjs', '.txt']);

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (textExtensions.has(extname(entry.name))) {
      yield path;
    }
  }
}

for await (const path of walk(root)) {
  const contents = await readFile(path, 'utf8');
  if (secretPattern.test(contents)) {
    console.error(`Clerk secret key detected in build output: ${path}`);
    process.exit(1);
  }
}

console.log('Build output contains no Clerk secret keys.');
