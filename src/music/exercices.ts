/**
 * Exercices hors leçons : tirage des cartes flash (lecture), de la dictée musicale,
 * de « plus aigu ou plus grave » et de « majeur ou mineur » (oreille).
 * Fonctions pures, testées dans scripts/tests.
 */
import { Cle, NoteEcrite, lireNote } from './notes';

export type NiveauLecture = 'debutant' | 'portee' | 'etendu';
export type CleExercice = Cle | 'les-deux';
export type NiveauDictee = 'do-mi' | 'do-sol' | 'gamme';

/** Notes de chaque niveau de lecture (notes naturelles, de la plus grave à la plus aiguë). */
const PLAGES_LECTURE: Record<Cle, Record<NiveauLecture, [string, string]>> = {
  sol: {
    debutant: ['Do4', 'Sol4'], // autour du Do central
    portee: ['Mi4', 'Fa5'], // les lignes et interlignes de la portée
    etendu: ['La3', 'Do6'], // avec les lignes supplémentaires
  },
  fa: {
    debutant: ['Do3', 'Sol3'],
    portee: ['Sol2', 'La3'],
    etendu: ['Do2', 'Mi4'],
  },
};

export const LIBELLES_LECTURE: Record<NiveauLecture, string> = {
  debutant: 'Débutant',
  portee: 'Toute la portée',
  etendu: 'Lignes en plus',
};

export const LIBELLES_DICTEE: Record<NiveauDictee, string> = {
  'do-mi': 'Do, Ré, Mi',
  'do-sol': 'Do à Sol',
  gamme: 'Toute la gamme',
};

/** Les notes naturelles entre deux notes incluses. */
function naturelles(de: string, a: string): NoteEcrite[] {
  const debut = lireNote(de);
  const fin = lireNote(a);
  const DEMITONS = [0, 2, 4, 5, 7, 9, 11];
  const notes: NoteEcrite[] = [];
  for (let d = debut.degre; d <= fin.degre; d++) {
    const octave = Math.floor(d / 7);
    notes.push({ midi: (octave + 1) * 12 + DEMITONS[d % 7], degre: d, alteration: 0 });
  }
  return notes;
}

export function notesLecture(cle: Cle, niveau: NiveauLecture): NoteEcrite[] {
  const [de, a] = PLAGES_LECTURE[cle][niveau];
  return naturelles(de, a);
}

export function notesDictee(niveau: NiveauDictee): NoteEcrite[] {
  if (niveau === 'do-mi') return naturelles('Do4', 'Mi4');
  if (niveau === 'do-sol') return naturelles('Do4', 'Sol4');
  return naturelles('Do4', 'Do5');
}

/** Tire une note au hasard, différente de la précédente quand c'est possible. */
export function tirer<T extends { midi: number }>(notes: T[], precedente?: { midi: number } | null, hasard = Math.random): T {
  const choix = notes.length > 1 && precedente ? notes.filter((n) => n.midi !== precedente.midi) : notes;
  return choix[Math.floor(hasard() * choix.length) % choix.length];
}

/** Tire la clé d'une carte : celle choisie, ou l'une des deux au hasard. */
export function tirerCle(cle: CleExercice, hasard = Math.random): Cle {
  if (cle !== 'les-deux') return cle;
  return hasard() < 0.5 ? 'sol' : 'fa';
}

/** Identifiant d'un exercice pour les records (« lecture-sol-debutant », « dictee-gamme »). */
export function idExercice(type: 'lecture' | 'dictee' | 'hauteur' | 'accord', ...options: string[]): string {
  return [type, ...options].join('-');
}

/* ---------- Oreille : plus aigu ou plus grave, majeur ou mineur ---------- */

export type NiveauHauteur = 'facile' | 'difficile';
export type TypeAccord = 'majeur' | 'mineur';

export const LIBELLES_HAUTEUR: Record<NiveauHauteur, string> = {
  facile: 'Notes éloignées',
  difficile: 'Notes proches',
};

/**
 * Deux notes différentes autour du Do central : la seconde est plus aiguë ou plus grave,
 * de 5 à 12 demi-tons (facile) ou de 1 à 3 (difficile).
 */
export function tirerHauteur(niveau: NiveauHauteur, hasard = Math.random): { premiere: number; seconde: number } {
  const [min, max] = niveau === 'facile' ? [5, 12] : [1, 3];
  const ecart = min + Math.floor(hasard() * (max - min + 1));
  const monte = hasard() < 0.5;
  const premiere = 55 + Math.floor(hasard() * 13); // de Sol3 à Sol4
  return { premiere, seconde: monte ? premiere + ecart : premiere - ecart };
}

/** Un accord parfait majeur (tierce de 4 demi-tons) ou mineur (3), fondamentale de Sol3 à Sol4. */
export function tirerAccord(hasard = Math.random): { type: TypeAccord; notes: number[] } {
  const type: TypeAccord = hasard() < 0.5 ? 'majeur' : 'mineur';
  const fondamentale = 55 + Math.floor(hasard() * 13);
  return { type, notes: [fondamentale, fondamentale + (type === 'majeur' ? 4 : 3), fondamentale + 7] };
}
