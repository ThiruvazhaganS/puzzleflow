import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const archivePath = resolve(root, 'puzzleflow-chrome-web-store.zip');

if (!existsSync(dist)) {
  throw new Error('dist/ does not exist. Run npm run build first.');
}

if (existsSync(archivePath)) rmSync(archivePath);

const execFileAsync = promisify(execFile);
await execFileAsync('zip', ['-qr', archivePath, '.'], { cwd: dist });
console.log(`Created ${archivePath}`);