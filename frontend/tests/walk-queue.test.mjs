import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PointQueue } from '../src/features/track/PointQueue.ts';

const point = { latitude: 35, longitude: 139, recorded_at: '2026-09-28T00:00:00Z' };
test('lost response retries identical batch and retains newer GPS points', async () => {
  const queue = new PointQueue();
  queue.add(point);
  let first;
  await assert.rejects(queue.flush(async batch => { first = batch; throw new Error('offline'); }));
  assert.equal(queue.pending, 1);
  queue.add(point);
  await queue.flush(async batch => {
    assert.deepEqual(batch[0], first[0]);
    assert.deepEqual(batch.map(p => p.sequence), [0, 1]);
  });
  assert.equal(queue.pending, 0);
});

test('finish waits for autosave, drains later points and respects batch limit', async () => {
  const queue = new PointQueue();
  for (let i = 0; i < 501; i++) queue.add(point);
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const sent = [];
  const save = queue.flush(async batch => { sent.push(batch); await barrier; });
  queue.add(point);
  const finish = queue.flush(async batch => { sent.push(batch); });
  release();
  await Promise.all([save, finish]);
  assert.deepEqual(sent.map(batch => batch.length), [500, 1, 1]);
  assert.deepEqual(sent.flat().map(p => p.sequence), Array.from({ length: 502 }, (_, i) => i));
  assert.equal(queue.pending, 0);
  assert.equal(new PointQueue().pending, 0);
});

test('a concurrent finish never treats a failed autosave as saved', async () => {
  const queue = new PointQueue();
  queue.add(point);
  let reject;
  const pending = new Promise((_, fail) => { reject = fail; });
  const saving = queue.flush(() => pending);
  const finishing = queue.flush(async () => assert.fail('must retry explicitly'));
  const results = Promise.allSettled([saving, finishing]);
  reject(new Error('timeout'));
  assert.ok((await results).every(result => result.status === 'rejected'));
  assert.equal(queue.pending, 1);
});
