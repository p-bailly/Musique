/**
 * Vérifications du compilateur de leçons et des notes écrites.
 * Lancer : npx tsx scripts/tests/lecons.test.ts
 */
import assert from 'node:assert/strict';
import { NIVEAUX, trouverLecon } from '../../src/data/lecons';
import { alterationArmure, ecrireMidi, lireNote, nomEcrit } from '../../src/music/notes';

// Notes écrites
assert.deepEqual(lireNote('Sib3'), { midi: 58, degre: 3 * 7 + 6, alteration: -1 });
assert.deepEqual(lireNote('Fa#4'), { midi: 66, degre: 4 * 7 + 3, alteration: 1 });
assert.equal(nomEcrit(ecrireMidi(70, -1)), 'Sib');
assert.equal(nomEcrit(ecrireMidi(70, 0)), 'La#');
assert.equal(nomEcrit(ecrireMidi(66, 1)), 'Fa#');
assert.equal(nomEcrit(ecrireMidi(60)), 'Do');
assert.equal(ecrireMidi(71).degre, lireNote('Si4').degre);
assert.equal(alterationArmure(3, 1), 1); // Fa# en Sol majeur
assert.equal(alterationArmure(6, -1), -1); // Sib en Fa majeur
assert.equal(alterationArmure(0, 1), 0);

// Toutes les leçons se compilent, chaque note appartient à un groupe cohérent
for (const niveau of NIVEAUX) {
  for (const l of niveau.lecons) {
    assert.ok(l.notes.length > 0, l.id);
    l.notes.forEach((n, i) => {
      assert.equal(n.index, i);
      assert.ok(l.groupes[n.groupe].indices.includes(i), `${l.id} groupe`);
      assert.equal(l.groupes[n.groupe].debut, n.debut);
    });
    for (const el of l.partition) for (const t of el.tetes) assert.ok(t.index >= 0 && t.index < l.notes.length, `${l.id} tête`);
  }
}

// Liaison : Sol4 blanche liée à Sol4 noire = une seule note de 3 temps
const valse = trouverLecon('n5-l5')!;
const sol = valse.notes.filter((n) => n.midi === 67);
assert.equal(sol.length, 2); // le Sol de la 1re mesure et le Sol lié (une seule frappe)
assert.equal(sol[1].duree, 3);
const tetesSol = valse.partition.flatMap((e) => e.tetes).filter((t) => t.midi === 67);
assert.equal(tetesSol.length, 3);
assert.equal(tetesSol[1].index, tetesSol[2].index);
assert.equal(valse.tempsParMesure, 3);

// Accords et deux mains
const accords = trouverLecon('n6-l2')!;
assert.equal(accords.cle, 'double');
assert.ok(accords.deuxMains);
assert.equal(accords.groupes[0].indices.length, 4); // Do-Mi-Sol + Mi4
assert.deepEqual(
  accords.groupes[0].indices.map((i) => accords.notes[i].midi),
  [48, 52, 55, 64],
);
assert.deepEqual(accords.notes.slice(0, 3).map((n) => n.doigt), [5, 3, 1]);
assert.equal(accords.partition.find((e) => e.main === 'gauche')!.portee, 'fa');

// Armure
assert.equal(trouverLecon('n5-l3')!.armure, 1);
assert.equal(trouverLecon('n5-l4')!.notes[3].alteration, -1);

// Pièces du niveau 8 : mesures complètes, main gauche écrite en clé de sol, voix secondaires sans silences dessinés
const elise = trouverLecon('n8-l5')!;
assert.equal(elise.tempsParMesure, 1.5);
assert.equal(elise.dureeTotale, 188); // les triolets ne décalent pas la fin
assert.ok(elise.partition.some((e) => e.main === 'gauche' && e.portee === 'sol'));
const gymno = trouverLecon('n8-l3')!;
const silencesGauche = gymno.partition.filter((e) => e.main === 'gauche' && e.tetes.length === 0).length;
assert.ok(silencesGauche < 20, `${silencesGauche} silences`);
for (const id of ['n8-l1', 'n8-l2', 'n8-l3', 'n8-l4']) {
  const l = trouverLecon(id)!;
  // Chaque groupe commence sur une subdivision régulière (pas d'erreur d'arrondi)
  for (const g of l.groupes) assert.ok(Math.abs(g.debut * 8 - Math.round(g.debut * 8)) < 1e-6, `${id} ${g.debut}`);
}
// Clavier : 4 octaves au plus, la fenêtre contient toujours les notes à jouer
import('../../src/data/lecons').then(({ fenetreClavier, DEMITONS_MAX_CLAVIER }) => {
  let f: [number, number] | undefined;
  let changements = 0;
  elise.groupes.forEach((g, i) => {
    const n = fenetreClavier(elise, i, f);
    if (f && n !== f) changements++;
    f = n;
    assert.equal(f[1] - f[0], DEMITONS_MAX_CLAVIER);
    for (const k of g.indices) assert.ok(elise.notes[k].midi >= f[0] && elise.notes[k].midi <= f[1], `groupe ${i}`);
  });
  assert.ok(changements < 40, `${changements} changements de fenêtre`);
  const petite = trouverLecon('n1-l1')!;
  assert.deepEqual(fenetreClavier(petite, 0), [petite.clavierMin, petite.clavierMax]);
  console.log('lecons : OK');
});
