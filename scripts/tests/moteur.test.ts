/**
 * Vérifications des fonctions pures du moteur de jeu (rythme) et des étoiles.
 * Lancer : npx tsx scripts/tests/moteur.test.ts
 */
import assert from 'node:assert/strict';
import { libelleRythme, scoreRythme, TOLERANCE_S } from '../../src/hooks/useMoteurJeu';
import { calculerEtoiles, leconReussie, scoreLibre } from '../../src/store/Progression';

// Rythme : 1 pile à temps, 0 à la limite de tolérance, symétrique
assert.equal(scoreRythme(0), 1);
assert.equal(scoreRythme(0.03), 1);
assert.equal(scoreRythme(TOLERANCE_S), 0);
assert.equal(scoreRythme(-0.15), scoreRythme(0.15));
assert.ok(scoreRythme(0.1) > scoreRythme(0.2));
assert.equal(libelleRythme(0.05), 'À temps');
assert.equal(libelleRythme(-0.12), 'En avance');
assert.equal(libelleRythme(0.12), 'En retard');

// Étoiles bleues : moyenne de la justesse et du rythme
assert.equal(calculerEtoiles(scoreLibre(1, 1)), 3);
assert.equal(calculerEtoiles(scoreLibre(1, 0.7)), 2);
assert.equal(calculerEtoiles(scoreLibre(0.5, 0.3)), 0);

// Une leçon est réussie avec des étoiles jaunes ou bleues
assert.equal(leconReussie(undefined), false);
assert.equal(leconReussie({ meilleuresEtoiles: 0, meilleurePrecision: 0, parties: 1, meilleuresEtoilesLibre: 1 }), true);
assert.equal(leconReussie({ meilleuresEtoiles: 2, meilleurePrecision: 0.9, parties: 1 }), true);
console.log('moteur : OK');
