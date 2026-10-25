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

/* ---------- Notes écrites : dièses, bémols et armures ---------- */

/** Noms des 7 degrés, de Do à Si. */
export const NOMS_DEGRES = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
/** Demi-tons depuis Do de chaque degré naturel. */
const DEMITONS_DEGRE = [0, 2, 4, 5, 7, 9, 11];

/** Altération : -1 = bémol, 0 = naturel (bécarre), 1 = dièse. */
export type Alteration = -1 | 0 | 1;

/**
 * Note telle qu'elle est écrite : sa hauteur (MIDI) et son orthographe.
 * Si♭3 et La♯3 ont le même MIDI mais pas la même place sur la portée.
 */
export interface NoteEcrite {
  midi: number;
  /** Index diatonique (nombre de degrés depuis Do0) : place sur la portée. */
  degre: number;
  alteration: Alteration;
}

/** Lit « Do4 », « Fa#3 », « Sib4 »… en gardant l'orthographe (dièse ou bémol). */
export function lireNote(nom: string): NoteEcrite {
  const m = /^(do|ré|re|mi|fa|sol|la|si)(#|b)?(-?\d)$/i.exec(nom.trim());
  if (!m) throw new Error(`Note invalide : « ${nom} » (exemple attendu : Do4, Ré#4, Sib3)`);
  const base = BASES[m[1].toLowerCase()];
  const alteration: Alteration = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const octave = parseInt(m[3], 10);
  return {
    midi: (octave + 1) * 12 + base + alteration,
    degre: octave * 7 + DEMITONS_DEGRE.indexOf(base),
    alteration,
  };
}

/** Nom d'une note écrite, sans octave : « Sib », « Fa# », « Do ». */
export function nomEcrit(n: Pick<NoteEcrite, 'degre' | 'alteration'>): string {
  const d = ((n.degre % 7) + 7) % 7;
  return NOMS_DEGRES[d] + (n.alteration === 1 ? '#' : n.alteration === -1 ? 'b' : '');
}

/** Ordre des dièses (Fa Do Sol Ré La Mi Si) et des bémols (Si Mi La Ré Sol Do Fa), en degrés. */
export const ORDRE_DIESES = [3, 0, 4, 1, 5, 2, 6];
export const ORDRE_BEMOLS = [6, 2, 5, 1, 4, 0, 3];

/**
 * Altération imposée par l'armure à un degré (0 = Do … 6 = Si).
 * `armure` : nombre de dièses (positif) ou de bémols (négatif).
 */
export function alterationArmure(degre: number, armure: number): Alteration {
  const d = ((degre % 7) + 7) % 7;
  if (armure > 0 && ORDRE_DIESES.slice(0, armure).includes(d)) return 1;
  if (armure < 0 && ORDRE_BEMOLS.slice(0, -armure).includes(d)) return -1;
  return 0;
}

/**
 * Écrit une hauteur MIDI : en dièses (armure ≥ 0) ou en bémols (armure < 0),
 * en préférant la note naturelle ou celle de l'armure.
 */
export function ecrireMidi(midi: number, armure = 0): NoteEcrite {
  const octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  const candidats: NoteEcrite[] = [];
  for (let d = 0; d < 7; d++) {
    for (const alt of [0, 1, -1] as Alteration[]) {
      let diff = pc - DEMITONS_DEGRE[d] - alt;
      let oct = octave;
      if (diff === 12 || diff === -12) {
        oct += diff > 0 ? 1 : -1;
        diff = 0;
      }
      if (diff === 0) candidats.push({ midi, degre: oct * 7 + d, alteration: alt });
    }
  }
  const score = (n: NoteEcrite) =>
    (n.alteration === alterationArmure(n.degre, armure) ? 0 : 2) +
    (n.alteration === 0 ? 0 : (armure < 0 ? n.alteration === -1 : n.alteration === 1) ? 1 : 3);
  return candidats.sort((a, b) => score(a) - score(b))[0];
}

/** Degré (0 = Do … 6 = Si) d'une note écrite, pour sa couleur. */
export function degreDansGamme(degre: number): number {
  return ((degre % 7) + 7) % 7;
}

/** Position sur la portée d'une note écrite (0 = ligne du bas). */
export function positionEcrite(degre: number, cle: Cle): number {
  return degre - LIGNE_DU_BAS[cle];
}
