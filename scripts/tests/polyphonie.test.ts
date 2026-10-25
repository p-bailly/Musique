/**
 * Banc d'essai de la détection polyphonique, sur de vrais sons de piano
 * (les échantillons Salamander de assets/sounds, décodés avec ffmpeg).
 * Lancer : npx tsx scripts/tests/polyphonie.test.ts
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { analyserFenetre, SuiviPolyphonique } from '../../src/music/polyphonie';

const SR = 44100;
const cache = new Map<number, Float32Array>();

function son(midi: number): Float32Array {
  if (!cache.has(midi)) {
    const fichier = path.join(__dirname, '..', '..', 'assets', 'sounds', `piano_${midi}.mp3`);
    const brut = execFileSync('ffmpeg', ['-v', 'error', '-i', fichier, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']);
    cache.set(midi, new Float32Array(brut.buffer, brut.byteOffset, brut.byteLength / 4));
  }
  return cache.get(midi)!;
}

/** Mélange de notes (accord), avec un léger bruit de pièce. */
function accord(midis: number[], decalage = 0, bruit = 0.002): Float32Array {
  const n = SR * 2;
  const out = new Float32Array(n);
  for (const m of midis) {
    const s = son(m);
    for (let i = 0; i + decalage < n && i < s.length; i++) out[i + decalage] += s[i] * 0.7;
  }
  for (let i = 0; i < n; i++) out[i] += (Math.random() * 2 - 1) * bruit;
  return out;
}

/** Fenêtre de 4096 échantillons à 22 050 Hz, prise `ms` après l'attaque. */
function fenetre(signal: Float32Array, ms: number): Float32Array {
  const debut = Math.floor((ms / 1000) * SR);
  const w = new Float32Array(4096);
  for (let i = 0; i < 4096; i++) w[i] = (signal[debut + 2 * i] + signal[debut + 2 * i + 1]) / 2;
  return w;
}

const pc = (m: number) => m % 12;
let ok = 0;
let total = 0;
const echecs: string[] = [];
function verifier(nom: string, attendues: number[], trouvees: number[], parClasse = true) {
  total++;
  const a = [...new Set(attendues.map((m) => (parClasse ? pc(m) : m)))].sort((x, y) => x - y);
  const t = [...new Set(trouvees.map((m) => (parClasse ? pc(m) : m)))].sort((x, y) => x - y);
  if (a.join() === t.join()) ok++;
  else echecs.push(`${nom} : attendu ${attendues.join('+')}, trouvé ${trouvees.join('+') || 'rien'}`);
}

// 1) Notes seules, de Do2 à Do7 (hauteur exacte)
for (let m = 36; m <= 96; m++) {
  const r = analyserFenetre(fenetre(accord([m]), 120), SR / 2).map((n) => n.midi);
  verifier(`seule ${m}`, [m], r, false);
}
const scoreSeules = `${ok}/${total}`;

// 2) Accords et deux mains (par nom de note, comme le jeu au micro)
const ACCORDS = [
  [60, 64, 67], [48, 52, 55], [53, 57, 60], [55, 59, 62], [47, 50, 55], [48, 53, 57],
  [48, 64], [43, 64], [48, 67], [43, 62], [48, 52, 55, 64], [47, 50, 55, 62], [48, 53, 57, 65],
  [60, 62], [64, 65], [57, 60, 64], [62, 66, 69], [65, 69, 72], [36, 60], [41, 65, 69],
];
let okAccords = 0;
for (const a of ACCORDS) {
  const avant = ok;
  verifier(`accord ${a.join('+')}`, a, analyserFenetre(fenetre(accord(a), 150), SR / 2).map((n) => n.midi));
  if (ok > avant) okAccords++;
}

// 3) Suivi en continu : Do, Mi, accord Do-Mi-Sol, Do rejoué
const sequence = new Float32Array(SR * 4);
const ajouterA = (midis: number[], t: number) => {
  const s = accord(midis, 0, 0);
  const d = Math.floor(t * SR);
  for (let i = 0; i < s.length && d + i < sequence.length; i++) sequence[d + i] += s[i];
};
ajouterA([60], 0.2);
ajouterA([64], 0.9);
ajouterA([48, 52, 55], 1.6);
ajouterA([60], 2.6);
ajouterA([60], 3.2);
const emis: string[] = [];
const suivi = new SuiviPolyphonique((midis) => emis.push(midis.join('+')));
for (let i = 0; i < sequence.length; i += 2048) suivi.ajouter(sequence.subarray(i, i + 2048), SR);

console.log(`notes seules : ${scoreSeules}`);
console.log(`accords : ${okAccords}/${ACCORDS.length}`);
console.log(`suivi : ${emis.join(' | ')}`);
if (echecs.length) console.log(echecs.slice(0, 25).join('\n'));

// Seuils de non-régression (le bruit ajouté est aléatoire : petite marge)
const seules = Number(scoreSeules.split('/')[0]);
if (seules < 57 || okAccords < 13 || emis.join(' | ') !== '60 | 64 | 48+52+55 | 60 | 60') {
  console.error('polyphonie : RÉGRESSION');
  process.exit(1);
}
console.log('polyphonie : OK');
