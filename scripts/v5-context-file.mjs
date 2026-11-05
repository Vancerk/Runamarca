// Reproduce the overlap between the end-of-match save and simultaneous survey submissions.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFeedbackStore} from '../mesa-nova/feedback-store.mjs';

const out = path.resolve(process.argv[2] || await fs.mkdtemp(path.join(os.tmpdir(), 'runamarca-ctx-')));
await fs.mkdir(out, {recursive: true});
const dir = await fs.mkdtemp(path.join(out, 'store-'));
const store = await createFeedbackStore({databaseUrl: '', dir});
const matchId = 'v5-pvp-partida-1', otherId = 'v5-pvp-partida-2';
for (let turn = 0; turn < 10; turn++) {
 const snap = {matchId, finished: true, turn};
 await Promise.all([store.saveContext(snap), store.saveContext({...snap, last: true}), store.saveContext({matchId: otherId, turn})]);
 assert.deepEqual(await store.getContext(matchId), {...snap, last: true});
 assert.equal((await store.getContext(otherId)).turn, turn);
}
// An unwritable final target must be reported, leave no partial file, and allow retry on the same instance.
const retryId = 'v5-pvp-partida-3', ctxDir = path.join(dir, 'contexts'), target = path.join(ctxDir, retryId + '.json');
await fs.mkdir(target);await assert.rejects(store.saveContext({matchId: retryId}));
assert.ok(!(await fs.readdir(ctxDir)).some(name => name.endsWith('.tmp')));
await fs.rmdir(target);await store.saveContext({matchId: retryId});
assert.equal((await store.getContext(retryId)).matchId, retryId);
const result = {sameMatchWrites: 20, independentMatchWrites: 10, finalSnapshotsInOrder: true, failureReported: true, noTempFileAfterFailure: true, retryRecovered: true};
await fs.writeFile(path.join(out, 'resultado.json'), JSON.stringify(result, null, 2));
console.log(result);
