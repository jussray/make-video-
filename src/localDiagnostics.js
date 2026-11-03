// Standalone local diagnostics. Not a general-purpose shell.
// Never expose this module directly to unauthenticated HTTP clients.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ALLOWED = Object.freeze({
  node: [['--version']],
  ffmpeg: [['-version']],
  ffprobe: [['-version']]
});

export function runLocalDiagnostic(command, args = [], options = {}) {
  if (!Object.hasOwn(ALLOWED, command) ||
      !Array.isArray(args) ||
      !ALLOWED[command].some(allowed => JSON.stringify(allowed) === JSON.stringify(args))) {
    throw new TypeError('Diagnostic command is not permitted');
  }
  if (options && (typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).some(key => !['cwd'].includes(key)))) {
    throw new TypeError('Unsupported diagnostic options');
  }
  const cwd = resolve(options.cwd || process.cwd());
  const result = spawnSync(command, args, {
    cwd,
    shell: false,
    timeout: 3000,
    maxBuffer: 64 * 1024,
    encoding: 'utf8',
    windowsHide: true,
    env: { PATH: process.env.PATH || '' }
  });
  return Object.freeze({
    command,
    args: [...args],
    exitCode: result.status,
    timedOut: result.error?.code === 'ETIMEDOUT',
    stdout: String(result.stdout || '').slice(0, 4000),
    stderr: String(result.stderr || '').slice(0, 4000)
  });
}
