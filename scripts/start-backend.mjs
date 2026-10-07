#!/usr/bin/env node
/** Run from monorepo root when Render Root Directory is blank. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const child = spawn('npm', ['start'], {
  cwd: backend,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));
