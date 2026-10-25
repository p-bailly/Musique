/**
 * Exercices sans clavier : tirage des notes des cartes flash (lecture) et de la
 * dictée musicale (oreille). Fonctions pures, testées dans scripts/tests.
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
export function idExercice(type: 'lecture' | 'dictee', ...options: string[]): string {
  return [type, ...options].join('-');
}
