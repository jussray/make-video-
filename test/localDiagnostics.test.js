import test from 'node:test';
import assert from 'node:assert/strict';
import { runLocalDiagnostic } from '../src/localDiagnostics.js';

test('allows local Node version check without a shell', () => {
  const result = runLocalDiagnostic('node', ['--version']);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^v\d+/);
});
test('rejects arbitrary shell commands and arguments', () => {
  for (const [command,args] of [
    ['sh',['-c','echo hello']], ['node',['-e','process.exit(0)']],
    ['ffmpeg',['-i','file.mp4']], ['node',['--version',';','whoami']]
  ]) assert.throws(() => runLocalDiagnostic(command,args), TypeError);
});
test('rejects arbitrary spawn options', () => {
  assert.throws(() => runLocalDiagnostic('node',['--version'],{shell:true}), TypeError);
});
