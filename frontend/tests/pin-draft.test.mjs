import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePinDraft, validatePinLocation } from '../photos/pinDraft.ts';

const location = () => ({ latitude: 35.68, longitude: 139.76, accuracy: 20, timestamp: Date.now() });
test('pin creation freezes the location, text and id for safe retries', () => {
  const source = location();
  const draft = makePinDraft(source, '  川沿いのベンチ  ', '夕日', 'same-request-id');
  const firstAttempt = JSON.stringify(draft);
  source.latitude = 36;
  assert.equal(draft.title, '川沿いのベンチ');
  assert.equal(draft.latitude, 35.68);
  assert.throws(() => { draft.title = '変更'; }, TypeError);
  assert.equal(JSON.stringify(draft), firstAttempt);
});

test('invalid or stale locations are rejected before a pin can be saved', () => {
  for (const change of [{ latitude: 91 }, { longitude: NaN }, { accuracy: Infinity }, { accuracy: 101 }, { accuracy: -1 }, { timestamp: Date.now() - 180000 }]) {
    assert.throws(() => validatePinLocation({ ...location(), ...change }));
  }
  assert.doesNotThrow(() => validatePinLocation({ ...location(), accuracy: 100 }));
});

test('missing and oversized names or memos cannot be submitted', () => {
  for (const title of ['', '   ', 'あ'.repeat(101)]) {
    assert.throws(() => makePinDraft(location(), title, '', 'id'));
  }
  assert.throws(() => makePinDraft(location(), '公園', 'あ'.repeat(1001), 'id'));
  assert.equal(makePinDraft(location(), '公園', '', 'id').memo, '');
});
