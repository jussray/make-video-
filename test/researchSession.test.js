import test from 'node:test';
import assert from 'node:assert/strict';
import { researchPage } from '../src/researchSession.js';

test('research session passes pinned addresses to isolated adapter', async () => {
  let args;
  const result = await researchPage('https://example.com/', {
    resolve: async () => [{address:'8.8.8.8',family:4}],
    navigate: async request => { args=request; return {title:'Example',text:'Original research'}; }
  });
  assert.deepEqual(args.pinnedAddresses,['8.8.8.8']);
  assert.equal(args.redirects,'manual');
  assert.equal(result.text,'Original research');
  assert.equal(result.verifiedNetworkIsolation,false);
});
test('research session rejects redirect into local network before navigation', async () => {
  let calls=0;
  await assert.rejects(researchPage('https://example.com/', {
    resolve: async () => ['8.8.8.8'],
    navigate: async () => { calls++; return {redirectUrl:'http://127.0.0.1/private'}; }
  }),TypeError);
  assert.equal(calls,1);
});
test('research session blocks private DNS answers before navigation', async () => {
  let called=false;
  await assert.rejects(researchPage('https://example.com/',{
    resolve:async()=>['8.8.8.8','10.0.0.5'],
    navigate:async()=>{called=true;return {title:'',text:''};}
  }),TypeError);
  assert.equal(called,false);
});
test('research session requires a separate isolated worker', async () => {
  await assert.rejects(researchPage('https://example.com/'),TypeError);
});
