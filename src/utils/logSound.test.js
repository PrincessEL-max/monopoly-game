import assert from 'node:assert/strict';
import { test } from 'node:test';
import { soundForLogText } from './logSound.js';

test('teks log sungguhan dipetakan ke suara yang benar', () => {
  assert.equal(soundForLogText('Budi membeli Indonesia A seharga Rp 6.000.'), 'buy');
  assert.equal(soundForLogText('Ani memenangkan lelang Bandara Changi seharga Rp 25.000.'), 'buy');
  assert.equal(soundForLogText('Budi lempar 3+4=7, lewat MULAI (+Rp 20.000), ke petak 2.'), 'money');
  assert.equal(soundForLogText('Budi menerima Rp 10.000 dari bank.'), 'money');
  assert.equal(soundForLogText('Budi dapat Parkir Gratis: Rp 15.000!'), 'money');
  assert.equal(soundForLogText('Budi masuk Penjara!'), 'jail');
  assert.equal(soundForLogText('Budi bangkrut dan keluar dari permainan.'), 'lose');
});

test('teks netral atau input bukan string tidak memicu suara', () => {
  assert.equal(soundForLogText('Budi menawar Rp 7.000.'), null);
  assert.equal(soundForLogText(''), null);
  assert.equal(soundForLogText(undefined), null);
  // Regresi: dulu yang diuji adalah objek log → "[object Object]" → tidak pernah cocok.
  assert.equal(soundForLogText({ text: 'Budi membeli X', ts: 1 }), null);
});
