/**
 * Moteur du mode « notes qui tombent ».
 *
 * Le temps du morceau est mesuré en temps musicaux (noire = 1 temps).
 * Une boucle d'animation (requestAnimationFrame) fait avancer ce temps
 * selon le tempo et la vitesse choisie. Avant la première note, une mesure
 * de décompte laisse le temps de se préparer.
 *
 * Les notes sont regroupées : un groupe = les notes qui commencent en même
 * temps (accord, deux mains). Un groupe est réussi quand toutes ses notes
 * ont été jouées, dans n'importe quel ordre.
 *
 * - Mode attente : le morceau s'arrête quand un groupe atteint la ligne,
 *   et ne repart que lorsque toutes ses notes sont jouées.
 * - Mode libre : le morceau défile ; une note non jouée à temps est manquée,
 *   et l'écart de chaque note jouée (en avance, à temps, en retard) donne un score de rythme.
 * - Démo : le morceau défile et l'appli joue elle-même les notes.
 * - Passage : on peut ne jouer que quelques mesures, une fois ou en boucle,
 *   en accélérant à chaque tour réussi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Lecon, NoteMorceau } from '@/data/lecons';
import { ecrireMidi, nomEcrit } from '@/music/notes';
import { useRefActuelle } from './useRefActuelle';

export type EtatNote = 'attente' | 'reussie' | 'manquee';
export type Phase = 'pret' | 'enCours' | 'pause' | 'termine';

export interface Retour {
  type: 'ok' | 'erreur';
  midi: number;
  message: string;
  /** Identifiant unique pour relancer l'animation. */
  id: number;
}

export interface Bilan {
  reussies: number;
  erreurs: number;
  manquees: number;
  /** Justesse : notes réussies sur toutes les notes jouées ou manquées. */
  precision: number;
  /** Mode libre seulement : score de rythme de 0 à 1 (1 = toutes les notes pile à temps). */
  rythme: number | null;
  /** Mode libre : écart moyen en secondes (négatif = en avance, positif = en retard). */
  ecartMoyen: number | null;
  secondes: number;
  /** Tout le morceau a été joué (pas seulement un passage). */
  complet: boolean;
  /** Passage en boucle : nombre de tours joués. */
  tours: number;
}

/** Passage à travailler, en temps (début inclus, fin exclue). */
export interface Passage {
  debut: number;
  fin: number;
}

/** Tolérance pour jouer « à temps » en mode libre, en secondes. */
export const TOLERANCE_S = 0.3;
/** En dessous de cet écart (en secondes), la note est « à temps ». */
export const A_TEMPS_S = 0.08;
/** En mode attente, on peut jouer la note un peu avant qu'elle n'arrive (en temps). */
const AVANCE_ACCEPTEE = 1.5;
/** Passage accéléré : vitesse de départ, pas d'accélération par tour réussi, justesse demandée. */
const ACCELERATION = { depart: 0.6, pas: 0.1, justesse: 0.9 };

/** Score de rythme d'une note jouée avec cet écart (1 pile à temps, 0 à la limite de tolérance). */
export function scoreRythme(ecartS: number): number {
  return Math.max(0, 1 - Math.max(0, Math.abs(ecartS) - A_TEMPS_S / 2) / (TOLERANCE_S - A_TEMPS_S / 2));
}

/** « En avance », « À temps » ou « En retard » selon l'écart en secondes. */
export function libelleRythme(ecartS: number): string {
  if (Math.abs(ecartS) <= A_TEMPS_S) return 'À temps';
  return ecartS < 0 ? 'En avance' : 'En retard';
}

interface Options {
  lecon: Lecon;
  vitesse: number;
  modeAttente: boolean;
  /** Passage à jouer (null : tout le morceau). */
  passage: Passage | null;
  /** Rejouer le passage en boucle jusqu'à ce qu'on arrête. */
  boucle: boolean;
  /** Passage en boucle : partir lentement et accélérer à chaque tour réussi. */
  accelerer: boolean;
  onFin: (bilan: Bilan) => void;
  /** Battement du métronome : `decompte` pendant la mesure d'avant, `fort` au premier temps de la mesure. */
  onBattement?: (decompte: boolean, fort: boolean) => void;
  /** Démo : notes à faire sonner maintenant. */
  onNotesDemo?: (midis: number[]) => void;
}

export function useMoteurJeu({ lecon, vitesse, modeAttente, passage, boucle, accelerer, onFin, onBattement, onNotesDemo }: Options) {
  /** Une mesure de décompte avant la première note. */
  const avantDebut = lecon.tempsParMesure;
  const debutPassage = passage?.debut ?? 0;
  const [phase, setPhase] = useState<Phase>('pret');
  const [temps, setTemps] = useState(debutPassage - avantDebut);
  const [groupe, setGroupe] = useState(0);
  const [etats, setEtats] = useState<EtatNote[]>(() => lecon.notes.map(() => 'attente'));
  const [retour, setRetour] = useState<Retour | null>(null);
  const [enAttente, setEnAttente] = useState(false);
  const [demo, setDemo] = useState(false);
  const [tour, setTour] = useState(1);
  const [facteur, setFacteur] = useState(1);

  // Références lues par la boucle d'animation (évite les fermetures périmées)
  const r = useRef({
    temps: 0,
    /** Heure (ms) à laquelle `temps` a été calculé, pour dater précisément une note jouée entre deux images. */
    horodatage: 0,
    groupe: 0,
    etats: [] as EtatNote[],
    reussies: 0,
    erreurs: 0,
    manquees: 0,
    /** Écarts (s) des notes réussies en mode libre. */
    ecarts: [] as number[],
    debutPartie: 0,
    phase: 'pret' as Phase,
    idRetour: 0,
    demo: false,
    /** Groupes du passage : [premier, dernier exclu]. */
    g0: 0,
    g1: 0,
    debut: 0,
    fin: 0,
    tour: 1,
    /** Multiplicateur de vitesse (passage accéléré). */
    facteur: 1,
    /** Statistiques du tour en cours. */
    tourReussies: 0,
    tourFautes: 0,
  });
  const onFinRef = useRefActuelle(onFin);
  const onBattementRef = useRefActuelle(onBattement);
  const onNotesDemoRef = useRefActuelle(onNotesDemo);
  const reglages = useRefActuelle({ vitesse, modeAttente, passage, boucle, accelerer });

  /** Temps musicaux par seconde. */
  const tempsParSeconde = () => (lecon.tempo * reglages.current.vitesse * r.current.facteur) / 60;

  const changerPhase = (p: Phase) => {
    r.current.phase = p;
    setPhase(p);
  };

  const signaler = (type: Retour['type'], midi: number, message: string) => {
    r.current.idRetour += 1;
    setRetour({ type, midi, message, id: r.current.idRetour });
  };

  /** Le groupe n'a plus de note à jouer. */
  const groupeFini = (g: number) => lecon.groupes[g].indices.every((i) => r.current.etats[i] !== 'attente');

  /** Passe les groupes terminés. */
  const avancer = () => {
    const s = r.current;
    while (s.groupe < s.g1 && groupeFini(s.groupe)) s.groupe++;
    setGroupe(s.groupe);
  };

  const terminer = useCallback(() => {
    const s = r.current;
    if (s.demo) {
      // Fin de la démo : retour à l'écran de départ
      s.demo = false;
      setDemo(false);
      changerPhase('pret');
      return;
    }
    const total = s.reussies + s.erreurs + s.manquees;
    const libre = !reglages.current.modeAttente;
    changerPhase('termine');
    onFinRef.current({
      reussies: s.reussies,
      erreurs: s.erreurs,
      manquees: s.manquees,
      precision: total === 0 ? 0 : s.reussies / total,
      rythme: libre ? (s.ecarts.length ? s.ecarts.reduce((a, e) => a + scoreRythme(e), 0) / (s.ecarts.length + s.manquees) : 0) : null,
      ecartMoyen: libre && s.ecarts.length ? s.ecarts.reduce((a, e) => a + e, 0) / s.ecarts.length : null,
      secondes: (Date.now() - s.debutPartie) / 1000,
      complet: !reglages.current.passage,
      tours: s.tour,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Remet le passage au début (nouvelle partie ou nouveau tour de boucle). */
  const rembobiner = () => {
    const s = r.current;
    for (let g = s.g0; g < s.g1; g++) for (const i of lecon.groupes[g].indices) s.etats[i] = 'attente';
    s.groupe = s.g0;
    s.temps = s.debut - avantDebut;
    s.tourReussies = 0;
    s.tourFautes = 0;
    setTemps(s.temps);
    setGroupe(s.groupe);
    setEtats([...s.etats]);
    setRetour(null);
    setEnAttente(false);
  };

  /** (Ré)initialise la partie. */
  const reinitialiser = useCallback(
    (enDemo: boolean) => {
      const { passage: p, boucle: b, accelerer: acc } = reglages.current;
      const debut = p?.debut ?? 0;
      const fin = p ? Math.min(p.fin, lecon.dureeTotale) : lecon.dureeTotale;
      let g0 = lecon.groupes.findIndex((g) => g.debut >= debut - 1e-6);
      if (g0 < 0) g0 = lecon.groupes.length;
      let g1 = lecon.groupes.findIndex((g) => g.debut >= fin - 1e-6);
      if (g1 < 0) g1 = lecon.groupes.length;
      const s = r.current;
      Object.assign(s, {
        etats: lecon.notes.map(() => 'attente' as EtatNote),
        reussies: 0,
        erreurs: 0,
        manquees: 0,
        ecarts: [],
        debutPartie: Date.now(),
        demo: enDemo,
        g0,
        g1,
        debut,
        fin,
        tour: 1,
        facteur: !enDemo && p && b && acc ? ACCELERATION.depart : 1,
      });
      setDemo(enDemo);
      setTour(1);
      setFacteur(s.facteur);
      rembobiner();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lecon, avantDebut],
  );

  const demarrer = useCallback(() => {
    reinitialiser(false);
    changerPhase('enCours');
  }, [reinitialiser]);

  /** Démo : l'appli joue le morceau (ou le passage) en le faisant défiler. */
  const ecouter = useCallback(() => {
    reinitialiser(true);
    changerPhase('enCours');
  }, [reinitialiser]);

  const basculerPause = useCallback(() => {
    if (r.current.phase === 'enCours') changerPhase('pause');
    else if (r.current.phase === 'pause') changerPhase('enCours');
  }, []);

  /** Arrête la boucle (ou la démo) et affiche le bilan. */
  const arreter = useCallback(() => terminer(), [terminer]);

  // Boucle d'animation
  useEffect(() => {
    if (phase !== 'enCours') return;
    let id = 0;
    let precedent = Date.now();
    const boucleAnimation = () => {
      const maintenant = Date.now();
      const dt = Math.min(0.1, (maintenant - precedent) / 1000); // borne si l'appli a été en arrière-plan
      precedent = maintenant;
      const s = r.current;
      const groupes = lecon.groupes;
      const avant = s.temps;
      let t = s.temps + dt * tempsParSeconde();
      let attente = false;

      if (s.demo) {
        // L'appli joue chaque groupe quand il atteint la ligne
        let modif = false;
        while (s.groupe < s.g1 && t >= groupes[s.groupe].debut) {
          const indices = groupes[s.groupe].indices;
          for (const i of indices) s.etats[i] = 'reussie';
          onNotesDemoRef.current?.(indices.map((i) => lecon.notes[i].midi));
          s.groupe++;
          modif = true;
        }
        if (modif) {
          setEtats([...s.etats]);
          setGroupe(s.groupe);
        }
      } else if (reglages.current.modeAttente) {
        // Le morceau se fige quand le prochain groupe atteint la ligne
        const g = s.groupe < s.g1 ? groupes[s.groupe] : undefined;
        if (g && t >= g.debut) {
          t = g.debut;
          attente = true;
        }
      } else {
        // Les notes dépassées sans être jouées sont manquées
        const tolerance = TOLERANCE_S * tempsParSeconde();
        let modif = false;
        while (s.groupe < s.g1 && t > groupes[s.groupe].debut + tolerance) {
          for (const i of groupes[s.groupe].indices) {
            if (s.etats[i] === 'attente') {
              s.etats[i] = 'manquee';
              s.manquees++;
              s.tourFautes++;
            }
          }
          s.groupe++;
          modif = true;
        }
        if (modif) {
          setEtats([...s.etats]);
          setGroupe(s.groupe);
        }
      }

      // Métronome : un battement à chaque temps entier franchi (ou au départ, s'il tombe sur un temps)
      const premier = avant === s.debut - avantDebut ? Math.ceil(avant) : Math.floor(avant) + 1;
      for (let b = premier; b <= Math.floor(t); b++) {
        if (b < s.fin) {
          const dansMesure = ((b % lecon.tempsParMesure) + lecon.tempsParMesure) % lecon.tempsParMesure;
          onBattementRef.current?.(b < s.debut, Math.abs(dansMesure) < 1e-6);
        }
      }

      s.temps = t;
      s.horodatage = maintenant;
      setTemps(t);
      setEnAttente(attente);

      // Fin du passage (ou du morceau) : tous les groupes traités et dernière note terminée
      if (s.groupe >= s.g1 && t >= s.fin) {
        const { passage: p, boucle: b, accelerer: acc } = reglages.current;
        if (!s.demo && p && b) {
          // Tour suivant ; accélère si le tour est réussi
          const total = s.tourReussies + s.tourFautes;
          if (acc && total > 0 && s.tourReussies / total >= ACCELERATION.justesse && s.facteur < 1) {
            s.facteur = Math.min(1, Math.round((s.facteur + ACCELERATION.pas) * 100) / 100);
            setFacteur(s.facteur);
          }
          s.tour++;
          setTour(s.tour);
          rembobiner();
        } else {
          terminer();
          return;
        }
      }
      id = requestAnimationFrame(boucleAnimation);
    };
    id = requestAnimationFrame(boucleAnimation);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lecon, terminer]);

  /** Compte une fausse note et l'explique. */
  const compterErreur = (midi: number, attendues: NoteMorceau[]) => {
    const s = r.current;
    s.erreurs++;
    s.tourFautes++;
    const actuelles =
      s.groupe < s.g1 ? lecon.groupes[s.groupe].indices.filter((i) => s.etats[i] === 'attente').map((i) => lecon.notes[i]) : [];
    const jouee = nomEcrit(ecrireMidi(midi, lecon.armure));
    const attendu = (actuelles.length ? actuelles : attendues).map((n) => nomEcrit(n)).join(' + ');
    signaler('erreur', midi, `Oups ! C'était ${attendu}, pas ${jouee}`);
  };

  /** Une note vient d'être jouée sur un clavier MIDI (hauteur exacte). */
  const jouer = useCallback(
    (midi: number) => {
      const s = r.current;
      if (s.phase !== 'enCours' || s.demo) return;
      const groupes = lecon.groupes;
      if (s.groupe >= s.g1) return;
      const libre = !reglages.current.modeAttente;
      const avanceMax = libre ? TOLERANCE_S * tempsParSeconde() : AVANCE_ACCEPTEE;

      // Notes encore attendues dans les groupes « jouables » maintenant
      const candidates: NoteMorceau[] = [];
      for (let g = s.groupe; g < s.g1 && groupes[g].debut - s.temps <= avanceMax; g++) {
        for (const i of groupes[g].indices) if (s.etats[i] === 'attente') candidates.push(lecon.notes[i]);
      }
      const trouvee = candidates.find((n) => n.midi === midi);
      if (trouvee) {
        s.etats[trouvee.index] = 'reussie';
        s.reussies++;
        s.tourReussies++;
        setEtats([...s.etats]);
        avancer();
        if (libre) {
          // Écart avec le moment exact de la note, en secondes (temps actuel, entre deux images)
          const ecart = (s.temps - trouvee.debut) / tempsParSeconde() + (Date.now() - s.horodatage) / 1000;
          s.ecarts.push(ecart);
          const ms = Math.round(Math.abs(ecart) * 1000);
          signaler('ok', trouvee.midi, Math.abs(ecart) <= A_TEMPS_S ? 'À temps !' : `${libelleRythme(ecart)} (${ms} ms)`);
        } else {
          signaler('ok', trouvee.midi, 'Bravo !');
        }
        return;
      }
      // Trop tôt : rien n'est encore jouable, on ignore sans pénaliser
      if (candidates.length === 0) return;
      compterErreur(midi, candidates);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lecon],
  );

  const g = groupe < lecon.groupes.length ? lecon.groupes[groupe] : undefined;
  return {
    phase,
    temps,
    /** Index du groupe à jouer. */
    groupe,
    etats,
    retour,
    enAttente,
    /** Début du passage (0 pour tout le morceau) : le décompte se fait avant. */
    debutPassage,
    /** La démo est en cours. */
    demo,
    /** Passage en boucle : numéro du tour et vitesse relative (1 = vitesse choisie). */
    tour,
    facteur,
    demarrer,
    ecouter,
    basculerPause,
    arreter,
    jouer,
    /** Notes du groupe actuel qui restent à jouer. */
    attendues: g && !demo ? g.indices.filter((i) => etats[i] === 'attente').map((i) => lecon.notes[i]) : [],
  };
}
