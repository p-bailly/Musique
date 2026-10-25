/**
 * Outils de théorie musicale : noms français des notes, conversions MIDI,
 * position sur la portée.
 *
 * Convention d'octave : notation scientifique, Do4 = do central (MIDI 60).
 * (Attention : en France on dit souvent « Do3 » pour le do central ;
 * l'application n'affiche pas les numéros d'octave à l'élève, ils ne
 * servent qu'à écrire les leçons en JSON.)
 */

/** Noms français des 12 demi-tons, en partant de Do. */
export const NOMS_NOTES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

/** Degré (0 = Do … 6 = Si) de chaque demi-ton ; les dièses prennent le degré inférieur. */
const DEGRE_PAR_DEMITON = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

/** Demi-tons depuis Do pour chaque nom de note (avec et sans accent). */
const BASES: Record<string, number> = { do: 0, re: 2, 'ré': 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };

/** MIDI du do central (Do4). */
export const DO_CENTRAL = 60;

/**
 * Convertit un nom de note (« Do4 », « Ré#4 », « Sib3 », « re5 »…) en numéro MIDI.
 * Lève une erreur explicite si le nom est invalide, pour aider à écrire les leçons.
 */
export function parseNote(nom: string): number {
  const m = /^(do|ré|re|mi|fa|sol|la|si)(#|b)?(-?\d)$/i.exec(nom.trim());
  if (!m) throw new Error(`Note invalide : « ${nom} » (exemple attendu : Do4, Ré#4, Sib3)`);
  const base = BASES[m[1].toLowerCase()];
  const alteration = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const octave = parseInt(m[3], 10);
  return (octave + 1) * 12 + base + alteration;
}

/** Nom français d'une note MIDI, sans octave (ex. 62 → « Ré »). */
export function nomNote(midi: number): string {
  return NOMS_NOTES[((midi % 12) + 12) % 12];
}

/** Vrai si la note correspond à une touche noire du piano. */
export function estToucheNoire(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

/** Vrai si la note est altérée (dièse) — même chose qu'une touche noire. */
export const estAlteree = estToucheNoire;

/** Fréquence en Hz d'une note MIDI (La4 = 440 Hz). */
export function midiVersFrequence(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Note MIDI (entière, arrondie) la plus proche d'une fréquence. */
export function frequenceVersMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

/**
 * Index diatonique : nombre de degrés (lignes/interlignes) depuis Do0.
 * Sert à placer la note verticalement sur la portée.
 */
export function indexDiatonique(midi: number): number {
  const octave = Math.floor(midi / 12) - 1;
  return octave * 7 + DEGRE_PAR_DEMITON[((midi % 12) + 12) % 12];
}

export type Cle = 'sol' | 'fa';

/** Index diatonique de la ligne du bas de la portée : Mi4 en clé de sol, Sol2 en clé de fa. */
const LIGNE_DU_BAS: Record<Cle, number> = {
  sol: indexDiatonique(64), // Mi4
  fa: indexDiatonique(43), // Sol2
};

/**
 * Position sur la portée : 0 = ligne du bas, 1 = premier interligne,
 * 2 = deuxième ligne… 8 = ligne du haut. Négatif = sous la portée.
 */
export function positionPortee(midi: number, cle: Cle): number {
  return indexDiatonique(midi) - LIGNE_DU_BAS[cle];
}

/** Noms des durées rythmiques, en temps (noire = 1 temps). */
export function nomDuree(duree: number): string {
  if (duree >= 4) return 'ronde';
  if (duree >= 3) return 'blanche pointée';
  if (duree >= 2) return 'blanche';
  if (duree >= 1.5) return 'noire pointée';
  if (duree >= 1) return 'noire';
  if (duree >= 0.5) return 'croche';
  return 'double croche';
}
