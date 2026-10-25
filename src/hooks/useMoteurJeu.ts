/**
 * Moteur du mode « notes qui tombent ».
 *
 * Le temps du morceau est mesuré en temps musicaux (noire = 1 temps).
 * Une boucle d'animation (requestAnimationFrame) fait avancer ce temps
 * selon le tempo et la vitesse choisie.
 *
 * - Mode attente : le morceau s'arrête quand une note atteint la ligne,
 *   et ne repart que lorsque la bonne touche est jouée.
 * - Mode libre : le morceau défile ; une note non jouée à temps est manquée.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Lecon } from '@/data/lecons';
import { nomNote } from '@/music/notes';
import { useRefActuelle } from './useRefActuelle';

export type EtatNote = 'attente' | 'reussie' | 'manquee';
export type Phase = 'pret' | 'enCours' | 'pause' | 'termine';
export type SourceNote = 'ecran' | 'micro';

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
  precision: number;
  secondes: number;
}

/** Temps d'avance (en temps musicaux) avant la première note. */
export const TEMPS_AVANT_DEBUT = 3;
/** Tolérance pour jouer « à temps » en mode libre, en secondes. */
const TOLERANCE_S = 0.3;
/** En mode attente, on peut jouer la note un peu avant qu'elle n'arrive (en temps). */
const AVANCE_ACCEPTEE = 1.5;

interface Options {
  lecon: Lecon;
  vitesse: number;
  modeAttente: boolean;
  onFin: (bilan: Bilan) => void;
}

export function useMoteurJeu({ lecon, vitesse, modeAttente, onFin }: Options) {
  const [phase, setPhase] = useState<Phase>('pret');
  const [temps, setTemps] = useState(-TEMPS_AVANT_DEBUT);
  const [prochaine, setProchaine] = useState(0);
  const [etats, setEtats] = useState<EtatNote[]>(() => lecon.notes.map(() => 'attente'));
  const [retour, setRetour] = useState<Retour | null>(null);
  const [enAttente, setEnAttente] = useState(false);

  // Références lues par la boucle d'animation (évite les fermetures périmées)
  const r = useRef({
    temps: -TEMPS_AVANT_DEBUT,
    prochaine: 0,
    etats: [] as EtatNote[],
    reussies: 0,
    erreurs: 0,
    manquees: 0,
    debutPartie: 0,
    phase: 'pret' as Phase,
    idRetour: 0,
  });
  const onFinRef = useRefActuelle(onFin);
  const reglages = useRefActuelle({ vitesse, modeAttente });

  /** Temps musicaux par seconde. */
  const tempsParSeconde = () => (lecon.tempo * reglages.current.vitesse) / 60;

  const changerPhase = (p: Phase) => {
    r.current.phase = p;
    setPhase(p);
  };

  const signaler = (type: Retour['type'], midi: number, message: string) => {
    r.current.idRetour += 1;
    setRetour({ type, midi, message, id: r.current.idRetour });
  };

  const terminer = useCallback(() => {
    const s = r.current;
    const total = s.reussies + s.erreurs + s.manquees;
    changerPhase('termine');
    onFinRef.current({
      reussies: s.reussies,
      erreurs: s.erreurs,
      manquees: s.manquees,
      precision: total === 0 ? 0 : s.reussies / total,
      secondes: (Date.now() - s.debutPartie) / 1000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** (Ré)initialise la partie. */
  const reinitialiser = useCallback(() => {
    const etatsInit: EtatNote[] = lecon.notes.map(() => 'attente');
    r.current = {
      ...r.current,
      temps: -TEMPS_AVANT_DEBUT,
      prochaine: 0,
      etats: etatsInit,
      reussies: 0,
      erreurs: 0,
      manquees: 0,
      debutPartie: Date.now(),
    };
    setTemps(-TEMPS_AVANT_DEBUT);
    setProchaine(0);
    setEtats(etatsInit);
    setRetour(null);
    setEnAttente(false);
  }, [lecon]);

  const demarrer = useCallback(() => {
    reinitialiser();
    changerPhase('enCours');
  }, [reinitialiser]);

  const basculerPause = useCallback(() => {
    if (r.current.phase === 'enCours') changerPhase('pause');
    else if (r.current.phase === 'pause') changerPhase('enCours');
  }, []);

  // Boucle d'animation
  useEffect(() => {
    if (phase !== 'enCours') return;
    let id = 0;
    let precedent = Date.now();
    const boucle = () => {
      const maintenant = Date.now();
      const dt = Math.min(0.1, (maintenant - precedent) / 1000); // borne si l'appli a été en arrière-plan
      precedent = maintenant;
      const s = r.current;
      const notes = lecon.notes;
      let t = s.temps + dt * tempsParSeconde();
      let attente = false;

      if (reglages.current.modeAttente) {
        // Le morceau se fige quand la prochaine note atteint la ligne
        const n = notes[s.prochaine];
        if (n && t >= n.debut) {
          t = n.debut;
          attente = true;
        }
      } else {
        // Les notes dépassées sans être jouées sont manquées
        const tolerance = TOLERANCE_S * tempsParSeconde();
        let modif = false;
        while (s.prochaine < notes.length && t > notes[s.prochaine].debut + tolerance) {
          s.etats[s.prochaine] = 'manquee';
          s.manquees++;
          s.prochaine++;
          modif = true;
        }
        if (modif) {
          setEtats([...s.etats]);
          setProchaine(s.prochaine);
        }
      }

      s.temps = t;
      setTemps(t);
      setEnAttente(attente);

      // Fin du morceau : toutes les notes traitées et dernière note terminée
      if (s.prochaine >= notes.length && t >= lecon.dureeTotale) {
        terminer();
        return;
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lecon, terminer]);

  /** Une note vient d'être jouée (clavier à l'écran ou micro). */
  const jouer = useCallback(
    (midi: number, source: SourceNote) => {
      const s = r.current;
      if (s.phase !== 'enCours') return;
      const attendue = lecon.notes[s.prochaine];
      if (!attendue) return;

      // Au micro, on tolère les erreurs d'octave fréquentes de la détection
      const correcte = source === 'micro' ? midi % 12 === attendue.midi % 12 : midi === attendue.midi;
      const ecart = attendue.debut - s.temps; // > 0 : la note n'est pas encore arrivée
      const avanceMax = reglages.current.modeAttente ? AVANCE_ACCEPTEE : TOLERANCE_S * tempsParSeconde();

      if (correcte) {
        if (ecart > avanceMax) return; // trop tôt : on ignore sans pénaliser
        s.etats[s.prochaine] = 'reussie';
        s.reussies++;
        s.prochaine++;
        setEtats([...s.etats]);
        setProchaine(s.prochaine);
        signaler('ok', midi, 'Bravo !');
      } else {
        s.erreurs++;
        signaler('erreur', midi, `Oups ! C'était ${nomNote(attendue.midi)}, pas ${nomNote(midi)}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lecon],
  );

  return {
    phase,
    temps,
    prochaine,
    etats,
    retour,
    enAttente,
    demarrer,
    basculerPause,
    jouer,
    noteAttendue: lecon.notes[prochaine] as Lecon['notes'][number] | undefined,
  };
}
