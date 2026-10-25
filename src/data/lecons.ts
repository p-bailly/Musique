/**
 * Chargement des leçons depuis les fichiers JSON locaux.
 *
 * Pour ajouter une leçon : l'ajouter dans le fichier JSON du niveau voulu.
 * Pour ajouter un niveau : créer `niveaux/niveauN.json` et l'importer ci-dessous.
 * Le format est décrit dans le README.
 */
import { Cle, DO_CENTRAL, parseNote } from '@/music/notes';
import niveau1 from './niveaux/niveau1.json';
import niveau2 from './niveaux/niveau2.json';
import niveau3 from './niveaux/niveau3.json';
import niveau4 from './niveaux/niveau4.json';

/* ---------- Format des fichiers JSON ---------- */

export type Main = 'droite' | 'gauche';

interface NoteJSON {
  /** « Do4 », « Ré#4 »… ou « silence » pour un silence. */
  note: string;
  /** Durée en temps : 4 = ronde, 2 = blanche, 1 = noire, 0.5 = croche. */
  duree: number;
  /** Main qui joue la note (par défaut : celle de la leçon). */
  main?: string;
}

interface LeconJSON {
  id: string;
  titre: string;
  description: string;
  cle: string;
  tempo: number;
  main: string;
  /** Mode attente conseillé pour cette leçon (sinon : réglage général). */
  attente?: boolean;
  notes: NoteJSON[];
}

interface NiveauJSON {
  niveau: number;
  titre: string;
  description: string;
  lecons: LeconJSON[];
}

/* ---------- Modèle utilisé par l'application ---------- */

export interface NoteMorceau {
  /** Position dans la liste des notes jouables. */
  index: number;
  midi: number;
  /** Début, en temps depuis le début du morceau. */
  debut: number;
  duree: number;
  main: Main;
}

export interface Lecon {
  id: string;
  niveau: number;
  titre: string;
  description: string;
  cle: Cle;
  tempo: number;
  main: Main;
  attente?: boolean;
  notes: NoteMorceau[];
  /** Durée totale en temps. */
  dureeTotale: number;
  /** Touches du clavier à afficher (2 octaves + le Do final). */
  clavierMin: number;
  clavierMax: number;
}

export interface Niveau {
  numero: number;
  titre: string;
  description: string;
  lecons: Lecon[];
}

/** Calcule la plage du clavier : deux octaves à partir du Do sous la note la plus grave. */
function plageClavier(midis: number[]): [number, number] {
  const min = midis.length ? Math.min(...midis) : DO_CENTRAL;
  const max = midis.length ? Math.max(...midis) : DO_CENTRAL;
  const bas = Math.floor(min / 12) * 12;
  let haut = bas + 24;
  while (haut < max) haut += 12; // sécurité si une leçon dépasse 2 octaves
  return [bas, haut];
}

/** Transforme une leçon JSON en leçon prête à jouer (calcul des temps de départ). */
function compilerLecon(json: LeconJSON, niveau: number): Lecon {
  const mainLecon: Main = json.main === 'gauche' ? 'gauche' : 'droite';
  const notes: NoteMorceau[] = [];
  let t = 0;
  for (const n of json.notes) {
    if (n.note.toLowerCase() !== 'silence') {
      notes.push({
        index: notes.length,
        midi: parseNote(n.note),
        debut: t,
        duree: n.duree,
        main: n.main === 'gauche' ? 'gauche' : n.main === 'droite' ? 'droite' : mainLecon,
      });
    }
    t += n.duree;
  }
  const [clavierMin, clavierMax] = plageClavier(notes.map((n) => n.midi));
  return {
    id: json.id,
    niveau,
    titre: json.titre,
    description: json.description,
    cle: json.cle === 'fa' ? 'fa' : 'sol',
    tempo: json.tempo,
    main: mainLecon,
    attente: json.attente,
    notes,
    dureeTotale: t,
    clavierMin,
    clavierMax,
  };
}

const SOURCES: NiveauJSON[] = [niveau1, niveau2, niveau3, niveau4];

/** Tous les niveaux, dans l'ordre. */
export const NIVEAUX: Niveau[] = SOURCES.map((n) => ({
  numero: n.niveau,
  titre: n.titre,
  description: n.description,
  lecons: n.lecons.map((l) => compilerLecon(l, n.niveau)),
}));

/** Toutes les leçons à la suite (ordre du parcours). */
export const TOUTES_LES_LECONS: Lecon[] = NIVEAUX.flatMap((n) => n.lecons);

export function trouverLecon(id: string): Lecon | undefined {
  return TOUTES_LES_LECONS.find((l) => l.id === id);
}

/** Leçon suivante dans le parcours (ou undefined si c'est la dernière). */
export function leconSuivante(id: string): Lecon | undefined {
  const i = TOUTES_LES_LECONS.findIndex((l) => l.id === id);
  return i >= 0 ? TOUTES_LES_LECONS[i + 1] : undefined;
}
