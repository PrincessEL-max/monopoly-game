import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shuffle } from './shuffle.js';

test('shuffle tidak mengubah input dan mempertahankan isi', () => {
  const input = [1, 2, 3, 4, 5, 6];
  const out = shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...out].sort(), input);
});

test('shuffle menangani array kosong dan satu elemen', () => {
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle(['a']), ['a']);
});

test('shuffle seragam: 6 permutasi dari 3 elemen muncul ~merata', () => {
  const runs = 60000;
  const counts = new Map();
  for (let i = 0; i < runs; i += 1) {
    const key = shuffle([0, 1, 2]).join('');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 6);
  const expected = runs / 6;
  for (const [key, count] of counts) {
    // toleransi ±5% dari ekspektasi (simpangan baku ≈ 1%)
    assert.ok(Math.abs(count - expected) / expected < 0.05, `permutasi ${key}: ${count}`);
  }
});

test('shuffle memakai sumber acak yang diberikan (deterministik)', () => {
  const out = shuffle([1, 2, 3, 4], () => 0);
  assert.deepEqual(out, [2, 3, 4, 1]);
});
