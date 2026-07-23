/**
 * Production start for Render/Railway.
 * If dist/server.js is missing (build step skipped or failed), build first.
 */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverJs = path.join(root, 'dist', 'server.js');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

try {
  if (!existsSync(serverJs)) {
    console.log('[start] dist/server.js not found — running build...');
    await run('npx', ['prisma', 'generate']);
    await run('npx', ['tsc', '-p', 'tsconfig.json']);
  }

  if (!existsSync(serverJs)) {
    console.error('[start] Build finished but dist/server.js is still missing.');
    console.error('[start] Falling back to tsx src/server.ts');
    await run('npx', ['tsx', 'src/server.ts']);
  } else {
    console.log('[start] Starting', serverJs);
    await run('node', [serverJs]);
  }
} catch (err) {
  console.error('[start] Failed:', err);
  process.exit(1);
}
