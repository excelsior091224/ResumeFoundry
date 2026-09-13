import { readFile, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const devVarsPath = resolve(projectRoot, '.dev.vars');
const backupPath = resolve(projectRoot, '.dev.vars.build-backup');

function parsePublicClerkKey(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*(.+?)\s*$/);
    if (match) {
      return match[1].replace(/^['"]|['"]$/g, '');
    }
  }
  return process.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
}

function runAstro(command, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npm', ['exec', '--', 'astro', command], {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`astro ${command} failed (${signal || `exit ${code}`})`));
      }
    });
  });
}

if (existsSync(backupPath) && !existsSync(devVarsPath)) {
  await rename(backupPath, devVarsPath);
}
if (existsSync(backupPath)) {
  throw new Error(`Cannot build while ${backupPath} already exists.`);
}

let movedDevVars = false;
let publishableKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

try {
  if (existsSync(devVarsPath)) {
    if (!publishableKey) {
      publishableKey = parsePublicClerkKey(await readFile(devVarsPath, 'utf8'));
    }
    await rename(devVarsPath, backupPath);
    movedDevVars = true;
  }

  const env = {
    ...process.env,
    PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey || '',
    CLERK_SECRET_KEY: '',
  };
  await runAstro('check', env);
  await runAstro('build', env);
} finally {
  if (movedDevVars) {
    await rename(backupPath, devVarsPath);
  }
}
