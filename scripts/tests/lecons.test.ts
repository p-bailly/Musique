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
// Niveaux 9 (technique) et 10 (répertoire) : mesures complètes, débuts sur une grille régulière
const technique = NIVEAUX.find((n) => n.numero === 9)!;
const repertoire = NIVEAUX.find((n) => n.numero === 10)!;
assert.equal(technique.titre, 'Technique');
assert.equal(repertoire.titre, 'Répertoire');
assert.ok(technique.lecons.length >= 8, `${technique.lecons.length} leçons techniques`);
for (const l of [...technique.lecons, ...repertoire.lecons]) {
  assert.equal(l.cle, 'double', l.id);
  // Durée totale : un nombre entier de mesures (les anacrouses commencent par un silence)
  const mesures = l.dureeTotale / l.tempsParMesure;
  assert.ok(Math.abs(mesures - Math.round(mesures)) < 1e-6, `${l.id} : ${mesures} mesures`);
  // Débuts sur la grille de la triple croche (1/8 de temps), ou du triolet (1/24) pour Des pays lointains
  const grille = l.id === 'n10-l2' ? 24 : 8;
  for (const g of l.groupes) assert.ok(Math.abs(g.debut * grille - Math.round(g.debut * grille)) < 1e-6, `${l.id} ${g.debut}`);
  // Chaque voix se termine au plus tard à la fin
  for (const n of l.notes) assert.ok(n.debut + n.duree <= l.dureeTotale + 1e-6, `${l.id} note après la fin`);
  assert.ok(l.deuxMains, l.id);
}
// Technique : toutes les notes ont un doigté, et une seule main joue au début
for (const l of technique.lecons) {
  for (const n of l.notes) assert.ok(n.doigt !== undefined && n.doigt >= 1 && n.doigt <= 5, `${l.id} doigt ${n.midi}`);
  assert.ok(l.groupes[0].indices.every((i) => l.notes[i].main === 'droite'), l.id);
}
/** Hauteurs (classes de 0 à 11) jouées dans une leçon. */
const classes = (id: string) => new Set(trouverLecon(id)!.notes.map((n) => n.midi % 12));
assert.deepEqual([...classes('n9-l1')].sort((a, b) => a - b), [0, 2, 4, 5, 7, 9, 11]); // do majeur : touches blanches
const gammeSol = trouverLecon('n9-l2')!;
assert.equal(gammeSol.armure, 1);
assert.ok(gammeSol.notes.some((n) => n.midi === lireNote('Fa#5').midi) && !classes('n9-l2').has(5)); // Fa#, jamais Fa
assert.deepEqual([...classes('n9-l3')].sort((a, b) => a - b), [1, 2, 4, 6, 7, 9, 11]); // ré majeur : Fa# et Do#
const fa = trouverLecon('n9-l4')!;
assert.equal(fa.armure, -1);
assert.ok(classes('n9-l4').has(10) && !classes('n9-l4').has(11)); // Sib, jamais Si
const sib = fa.notes.find((n) => n.midi === lireNote('Sib4').midi && n.main === 'droite')!;
assert.equal(sib.doigt, 4); // le 4e doigt sur le si bémol, le pouce passe ensuite
assert.equal(sib.alteration, -1);
// Gamme de do, main droite : 1-2-3-1-2-3-4-5 en montant
assert.deepEqual(trouverLecon('n9-l1')!.notes.slice(0, 8).map((n) => n.doigt), [1, 2, 3, 1, 2, 3, 4, 5]);
// La mineur : harmonique (Sol# sans Fa#) puis mélodique (Fa# et Sol# en montant)
const mineur = trouverLecon('n9-l5')!;
assert.deepEqual(mineur.notes.slice(0, 8).map((n) => n.midi), [69, 71, 72, 74, 76, 77, 80, 81]);
assert.ok(mineur.notes.some((n) => n.midi === lireNote('Fa#5').midi) && mineur.notes.some((n) => n.midi === lireNote('Sol5').midi));
// Arpège de do, main droite sur deux octaves : 1-2-3-1-2-3-5
const arpege = trouverLecon('n9-l6')!;
assert.deepEqual(arpege.notes.slice(0, 7).map((n) => [n.midi, n.doigt]), [[60, 1], [64, 2], [67, 3], [72, 1], [76, 2], [79, 3], [84, 5]]);
// Renversements : trois notes par accord, doigtés 1-3-5, 1-2-5, 1-3-5
const renv = trouverLecon('n9-l8')!;
assert.deepEqual(renv.groupes.slice(0, 3).map((g) => g.indices.map((i) => renv.notes[i].doigt)), [[1, 3, 5], [1, 2, 5], [1, 3, 5]]);
// Cadence : basses Do, Fa, Sol, Do sous les accords
const cadence = trouverLecon('n9-l9')!;
const groupesEnsemble = cadence.groupes.filter((g) => g.indices.length === 4);
assert.deepEqual(groupesEnsemble.slice(0, 4).map((g) => cadence.notes[g.indices[0]].midi), [48, 41, 43, 48]);

// Répertoire : armures, anacrouses, reprises dépliées
const clementi = trouverLecon('n10-l1')!;
assert.equal(clementi.tempsParMesure, 4);
assert.equal(clementi.dureeTotale, 2 * 60 + 2 * 92); // 15 + 23 mesures, chaque partie deux fois
assert.deepEqual(clementi.notes.slice(0, 2).map((n) => n.midi), [48, 72]); // Do3 à gauche, Do5 à droite
const pays = trouverLecon('n10-l2')!;
assert.equal(pays.armure, 1);
assert.equal(pays.dureeTotale, 2 * 16 + 2 * 28);
const invention = trouverLecon('n10-l3')!;
assert.equal(invention.armure, -1);
assert.equal(invention.dureeTotale, 34 * 3);
assert.ok(invention.partition.some((e) => e.main === 'gauche' && e.portee === 'sol'));
const reverie = trouverLecon('n10-l4')!;
assert.equal(reverie.groupes[0].debut, 3); // anacrouse : le Do4 sur le 4e temps
assert.equal(reverie.notes[0].midi, 60);
assert.equal(reverie.dureeTotale, 33 * 4);
const turque = trouverLecon('n10-l5')!;
assert.equal(turque.tempsParMesure, 2);
assert.equal(turque.groupes[0].debut, 1); // anacrouse d'un temps
assert.deepEqual(turque.notes.slice(0, 4).map((n) => n.midi), [71, 69, 68, 69]); // Si La Sol# La
assert.equal(turque.dureeTotale, 448);
assert.ok(turque.partition.some((e) => e.tetes.some((t) => t.midi === 72 && t.degre === lireNote('Si#4').degre))); // Si# en fa dièse mineur

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
