import { existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const projectDirectory = process.cwd();
const buildDirectory = resolve(projectDirectory, 'dist-test');
const archivePath = join(projectDirectory, 'ConstruleadsTest-IIS.zip');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectDirectory,
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(npmCommand, ['run', 'build:test']);

if (existsSync(archivePath)) unlinkSync(archivePath);

run('zip', [
  '-q',
  '-r',
  archivePath,
  '.',
  '-x',
  '*.DS_Store',
  '__MACOSX/*',
], { cwd: buildDirectory });

console.log(`Paquete IIS creado: ${archivePath}`);
