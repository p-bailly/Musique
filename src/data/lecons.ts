/**
 * Chargement des leçons depuis les fichiers JSON locaux.
 *
 * Pour ajouter une leçon : l'ajouter dans le fichier JSON du niveau voulu.
 * Pour ajouter un niveau : créer `niveaux/niveauN.json` et l'importer ci-dessous.
 * Le format est décrit dans le README.
 */
import { Cle, DO_CENTRAL, lireNote, NoteEcrite } from '@/music/notes';
import niveau1 from './niveaux/niveau1.json';
import niveau2 from './niveaux/niveau2.json';
import niveau3 from './niveaux/niveau3.json';
import niveau4 from './niveaux/niveau4.json';
import niveau5 from './niveaux/niveau5.json';
import niveau6 from './niveaux/niveau6.json';

/* ---------- Format des fichiers JSON ---------- */

export type Main = 'droite' | 'gauche';

interface NoteJSON {
  /** « Do4 », « Sib3 », un accord « Do4+Mi4+Sol4 », ou « silence ». */
  note: string;
  /** Durée en temps : 4 = ronde, 2 = blanche, 1 = noire, 0.5 = croche. */
  duree: number;
  /** Main qui joue la note (par défaut : celle de la voix ou de la leçon). */
  main?: string;
  /** Doigté (1 = pouce … 5 = auriculaire) ; une liste pour un accord. */
  doigt?: number | number[];
  /** Nuance qui commence sur cette note : « pp », « p », « mp », « mf », « f », « ff ». */
  nuance?: string;
  /** Liée à la note suivante de même hauteur : celle-ci prolonge le son, on ne la rejoue pas. */
  lie?: boolean;
}

interface VoixJSON {
  main: string;
  notes: NoteJSON[];
}

interface LeconJSON {
  id: string;
  titre: string;
  description: string;
  /** « sol », « fa » ou « double » (grande portée : clé de sol + clé de fa). */
  cle: string;
  tempo: number;
  main: string;
  /** Nombre de dièses (positif) ou de bémols (négatif) à l'armure. */
  armure?: number;
  /** Chiffrage de la mesure, « 4/4 » par défaut. */
  mesure?: string;
  /** Mode attente conseillé pour cette leçon (sinon : réglage général). */
  attente?: boolean;
  /** Une seule voix… */
  notes?: NoteJSON[];
  /** …ou plusieurs voix jouées en même temps (main droite + main gauche). */
  voix?: VoixJSON[];
}

interface NiveauJSON {
  niveau: number;
  titre: string;
  description: string;
  lecons: LeconJSON[];
}

/* ---------- Modèle utilisé par l'application ---------- */

/** Une note à jouer (les notes liées sont fusionnées en une seule). */
export interface NoteMorceau extends NoteEcrite {
  /** Position dans la liste des notes jouables (triée par temps puis hauteur). */
  index: number;
  /** Début, en temps depuis le début du morceau. */
  debut: number;
  /** Durée du son, liaisons comprises. */
  duree: number;
  main: Main;
  doigt?: number;
  /** Numéro du groupe (notes qui se jouent ensemble : accord, deux mains). */
  groupe: number;
}

/** Tête de note dessinée sur la portée. */
export interface TetePartition extends NoteEcrite {
  doigt?: number;
  /** Liée à la tête suivante de même hauteur. */
  liee: boolean;
  /** Note jouable correspondante (celle du début de la liaison pour une suite de liaison). */
  index: number;
}

/** Élément dessiné sur la portée : note, accord ou silence. */
export interface ElementPartition {
  portee: Cle;
  debut: number;
  /** Durée écrite (une note liée est dessinée en plusieurs figures). */
  duree: number;
  /** Vide pour un silence. */
  tetes: TetePartition[];
  nuance?: string;
  main: Main;
}

export interface Groupe {
  debut: number;
  /** Index des notes à jouer ensemble. */
  indices: number[];
}

export type ClePartition = Cle | 'double';

export interface Lecon {
  id: string;
  niveau: number;
  titre: string;
  description: string;
  cle: ClePartition;
  tempo: number;
  main: Main;
  armure: number;
  mesure: { temps: number; unite: number };
  /** Durée d'une mesure, en temps de noire. */
  tempsParMesure: number;
  attente?: boolean;
  notes: NoteMorceau[];
  groupes: Groupe[];
  partition: ElementPartition[];
  /** Les deux mains jouent (au moins une fois) en même temps. */
  deuxMains: boolean;
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
  while (haut < max) haut += 12; // une leçon à deux mains peut dépasser 2 octaves
  return [bas, haut];
}

const EPSILON = 1e-6;

/** Transforme une leçon JSON en leçon prête à jouer (temps de départ, accords, liaisons). */
export function compilerLecon(json: LeconJSON, niveau: number): Lecon {
  const mainLecon: Main = json.main === 'gauche' ? 'gauche' : 'droite';
  const cle: ClePartition = json.cle === 'fa' ? 'fa' : json.cle === 'double' ? 'double' : 'sol';
  const [temps, unite] = (json.mesure ?? '4/4').split('/').map(Number);
  const voix: VoixJSON[] = json.voix ?? [{ main: mainLecon, notes: json.notes ?? [] }];

  // 1) Éléments de partition, voix par voix
  const elements: ElementPartition[] = [];
  let dureeTotale = 0;
  for (const v of voix) {
    const mainVoix: Main = v.main === 'gauche' ? 'gauche' : v.main === 'droite' ? 'droite' : mainLecon;
    let t = 0;
    for (const n of v.notes) {
      const main: Main = n.main === 'gauche' ? 'gauche' : n.main === 'droite' ? 'droite' : mainVoix;
      const portee: Cle = cle === 'double' ? (main === 'gauche' ? 'fa' : 'sol') : cle;
      const silence = n.note.toLowerCase() === 'silence';
      const ecrites = silence ? [] : n.note.split('+').map(lireNote);
      const doigts = Array.isArray(n.doigt) ? n.doigt : n.doigt !== undefined ? [n.doigt] : [];
      elements.push({
        portee,
        debut: t,
        duree: n.duree,
        nuance: n.nuance,
        main,
        tetes: ecrites
          .map((e, i) => ({ ...e, doigt: doigts[i], liee: !!n.lie, index: -1 }))
          .sort((a, b) => a.midi - b.midi),
      });
      t += n.duree;
    }
    dureeTotale = Math.max(dureeTotale, t);
  }
  elements.sort((a, b) => a.debut - b.debut || (a.portee === b.portee ? 0 : a.portee === 'sol' ? -1 : 1));

  // 2) Notes jouables : une tête liée à la précédente prolonge son son au lieu d'être rejouée
  type Brute = Omit<NoteMorceau, 'index' | 'groupe'> & { tete: TetePartition };
  const brutes: Brute[] = [];
  const suiteDe = new Map<TetePartition, Brute>(); // tête de suite de liaison → note jouée
  const ouvertes = new Map<string, Brute>(); // liaisons ouvertes, par main + hauteur
  for (const el of elements) {
    for (const tete of el.tetes) {
      const cleLiaison = `${el.main}:${tete.midi}`;
      let note = ouvertes.get(cleLiaison);
      if (note && Math.abs(note.debut + note.duree - el.debut) < EPSILON) {
        note.duree += el.duree;
        suiteDe.set(tete, note);
      } else {
        const { midi, degre, alteration } = tete;
        note = { midi, degre, alteration, debut: el.debut, duree: el.duree, main: el.main, doigt: tete.doigt, tete };
        brutes.push(note);
      }
      if (tete.liee) ouvertes.set(cleLiaison, note);
      else ouvertes.delete(cleLiaison);
    }
  }
  brutes.sort((a, b) => a.debut - b.debut || a.midi - b.midi);

  // 3) Groupes : notes qui commencent en même temps
  const notes: NoteMorceau[] = [];
  const groupes: Groupe[] = [];
  for (const b of brutes) {
    let g = groupes[groupes.length - 1];
    if (!g || Math.abs(g.debut - b.debut) > EPSILON) {
      g = { debut: b.debut, indices: [] };
      groupes.push(g);
    }
    const index = notes.length;
    g.indices.push(index);
    b.tete.index = index;
    notes.push({
      index,
      midi: b.midi,
      degre: b.degre,
      alteration: b.alteration,
      debut: b.debut,
      duree: b.duree,
      main: b.main,
      doigt: b.doigt,
      groupe: groupes.length - 1,
    });
  }
  // Les suites de liaison renvoient à la note jouée au début de la liaison
  for (const [tete, note] of suiteDe) tete.index = note.tete.index;

  const deuxMains = groupes.some((g) => new Set(g.indices.map((i) => notes[i].main)).size > 1);
  const [clavierMin, clavierMax] = plageClavier(notes.map((n) => n.midi));
  return {
    id: json.id,
    niveau,
    titre: json.titre,
    description: json.description,
    cle,
    tempo: json.tempo,
    main: mainLecon,
    armure: json.armure ?? 0,
    mesure: { temps, unite },
    tempsParMesure: (temps * 4) / unite,
    attente: json.attente,
    notes,
    groupes,
    partition: elements,
    deuxMains,
    dureeTotale,
    clavierMin,
    clavierMax,
  };
}

const SOURCES = [niveau1, niveau2, niveau3, niveau4, niveau5, niveau6] as NiveauJSON[];

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
