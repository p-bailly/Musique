/**
 * Vérifications du tirage des exercices.
 * Lancer : npx tsx scripts/tests/exercices.test.ts
 */
import assert from 'node:assert/strict';
import { notesDictee, notesLecture, tirer, tirerCle } from '../../src/music/exercices';
import { nomEcrit, positionEcrite } from '../../src/music/notes';

assert.deepEqual(notesLecture('sol', 'debutant').map(nomEcrit), ['Do', 'Ré', 'Mi', 'Fa', 'Sol']);
assert.deepEqual(notesLecture('sol', 'debutant').map((n) => n.midi), [60, 62, 64, 65, 67]);
// « Toute la portée » : de la ligne du bas (0) à la ligne du haut (8), dans les deux clés
for (const cle of ['sol', 'fa'] as const) {
  const p = notesLecture(cle, 'portee').map((n) => positionEcrite(n.degre, cle));
  assert.equal(p[0], 0);
  assert.equal(p[p.length - 1], 8);
}
assert.equal(notesLecture('fa', 'etendu')[0].midi, 36);
assert.equal(notesDictee('gamme').length, 8);
assert.equal(notesDictee('gamme')[7].midi, 72);

// Jamais deux fois la même note de suite
const notes = notesLecture('sol', 'portee');
let prec = notes[0];
for (let i = 0; i < 200; i++) {
  const n = tirer(notes, prec);
  assert.notEqual(n.midi, prec.midi);
  prec = n;
}
assert.equal(tirerCle('fa'), 'fa');
assert.equal(tirerCle('les-deux', () => 0.2), 'sol');
assert.equal(tirerCle('les-deux', () => 0.8), 'fa');
console.log('exercices : OK');
