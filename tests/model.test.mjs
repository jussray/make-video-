import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, newShot, normalizeProject, shotAtTime, totalDuration, formatTime, SCHEMA } from '../assets/model.js';
test('new storyboard is valid and local-only', () => {
 const project = newProject();
 assert.equal(project.schema, SCHEMA);
 assert.equal(project.shots.length, 1);
 assert.equal(totalDuration(project), 4);
 assert.equal(formatTime(totalDuration(project)), '00:04');
 assert.doesNotThrow(() => normalizeProject(project));
});
test('timeline resolves shots correctly', () => {
 const p = newProject(); p.shots.push(newShot(2));
 assert.equal(shotAtTime(p, 0).index, 0);
 assert.equal(shotAtTime(p, 3.99).index, 0);
 assert.equal(shotAtTime(p, 4).index, 1);
 assert.equal(shotAtTime(p, 88).index, 1);
});
test('untrusted import validation bounds shots, duration and content', () => {
 const p = newProject(); p.shots[0].duration = 9999;
 p.shots[0].caption = 'a'.repeat(500); p.shots[0].palette = 'bogus';
 const loaded = normalizeProject(p);
 assert.equal(loaded.shots[0].duration, 12);
 assert.equal(loaded.shots[0].caption.length, 180);
 assert.equal(loaded.shots[0].palette, 'midnight');
 assert.throws(() => normalizeProject({ schema: 'unknown', shots: [] }));
 p.shots = Array.from({ length: 25 }, () => newShot());
 assert.throws(() => normalizeProject(p));
});
test('duplicate import IDs are rejected', () => {
 const p = newProject(); p.shots.push({ ...p.shots[0] });
 assert.throws(() => normalizeProject(p), /unique/);
});
