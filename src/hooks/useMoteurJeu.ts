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
 * - Mode libre : le morceau défile ; une note non jouée à temps est manquée.
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
  precision: number;
  secondes: number;
}

/** Tolérance pour jouer « à temps » en mode libre, en secondes. */
const TOLERANCE_S = 0.3;
/** En mode attente, on peut jouer la note un peu avant qu'elle n'arrive (en temps). */
const AVANCE_ACCEPTEE = 1.5;

interface Options {
  lecon: Lecon;
  vitesse: number;
  modeAttente: boolean;
  onFin: (bilan: Bilan) => void;
  /**
   * Appelée à chaque temps (pour le métronome) : `numero` < 0 pendant le
   * décompte, `fort` sur le premier temps de chaque mesure.
   */
  onBattement?: (numero: number, fort: boolean) => void;
}

export function useMoteurJeu({ lecon, vitesse, modeAttente, onFin, onBattement }: Options) {
  /** Une mesure de décompte avant la première note. */
  const avantDebut = lecon.tempsParMesure;
  const [phase, setPhase] = useState<Phase>('pret');
  const [temps, setTemps] = useState(-avantDebut);
  const [groupe, setGroupe] = useState(0);
  const [etats, setEtats] = useState<EtatNote[]>(() => lecon.notes.map(() => 'attente'));
  const [retour, setRetour] = useState<Retour | null>(null);
  const [enAttente, setEnAttente] = useState(false);

  // Références lues par la boucle d'animation (évite les fermetures périmées)
  const r = useRef({
    temps: -avantDebut,
    groupe: 0,
    etats: [] as EtatNote[],
    reussies: 0,
    erreurs: 0,
    manquees: 0,
    debutPartie: 0,
    phase: 'pret' as Phase,
    idRetour: 0,
  });
  const onFinRef = useRefActuelle(onFin);
  const onBattementRef = useRefActuelle(onBattement);
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

  /** Le groupe n'a plus de note à jouer. */
  const groupeFini = (g: number) => lecon.groupes[g].indices.every((i) => r.current.etats[i] !== 'attente');

  /** Passe les groupes terminés. */
  const avancer = () => {
    const s = r.current;
    while (s.groupe < lecon.groupes.length && groupeFini(s.groupe)) s.groupe++;
    setGroupe(s.groupe);
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
      temps: -avantDebut,
      groupe: 0,
      etats: etatsInit,
      reussies: 0,
      erreurs: 0,
      manquees: 0,
      debutPartie: Date.now(),
    };
    setTemps(-avantDebut);
    setGroupe(0);
    setEtats(etatsInit);
    setRetour(null);
    setEnAttente(false);
  }, [lecon, avantDebut]);

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
      const groupes = lecon.groupes;
      const avant = s.temps;
      let t = s.temps + dt * tempsParSeconde();
      let attente = false;

      if (reglages.current.modeAttente) {
        // Le morceau se fige quand le prochain groupe atteint la ligne
        const g = groupes[s.groupe];
        if (g && t >= g.debut) {
          t = g.debut;
          attente = true;
        }
      } else {
        // Les notes dépassées sans être jouées sont manquées
        const tolerance = TOLERANCE_S * tempsParSeconde();
        let modif = false;
        while (s.groupe < groupes.length && t > groupes[s.groupe].debut + tolerance) {
          for (const i of groupes[s.groupe].indices) {
            if (s.etats[i] === 'attente') {
              s.etats[i] = 'manquee';
              s.manquees++;
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

      // Métronome : un battement à chaque temps entier franchi
      for (let b = Math.floor(avant) + 1; b <= Math.floor(t); b++) {
        if (b < lecon.dureeTotale) {
          const dansMesure = (((b % lecon.tempsParMesure) + lecon.tempsParMesure) % lecon.tempsParMesure);
          onBattementRef.current?.(b, dansMesure === 0);
        }
      }
      // Le tout premier temps du décompte (t = -avantDebut) n'est jamais « franchi »
      if (avant === -avantDebut && t > avant) onBattementRef.current?.(-avantDebut, true);

      s.temps = t;
      setTemps(t);
      setEnAttente(attente);

      // Fin du morceau : tous les groupes traités et dernière note terminée
      if (s.groupe >= groupes.length && t >= lecon.dureeTotale) {
        terminer();
        return;
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lecon, terminer]);

  /** Compte une fausse note et l'explique. */
  const compterErreur = (midi: number, attendues: NoteMorceau[]) => {
    const s = r.current;
    s.erreurs++;
    const actuelles = lecon.groupes[s.groupe].indices.filter((i) => s.etats[i] === 'attente').map((i) => lecon.notes[i]);
    const jouee = nomEcrit(ecrireMidi(midi, lecon.armure));
    const attendu = (actuelles.length ? actuelles : attendues).map((n) => nomEcrit(n)).join(' + ');
    signaler('erreur', midi, `Oups ! C'était ${attendu}, pas ${jouee}`);
  };

  /** Une note vient d'être jouée sur un clavier MIDI (hauteur exacte). */
  const jouer = useCallback(
    (midi: number) => {
      const s = r.current;
      if (s.phase !== 'enCours') return;
      const groupes = lecon.groupes;
      if (s.groupe >= groupes.length) return;
      const avanceMax = reglages.current.modeAttente ? AVANCE_ACCEPTEE : TOLERANCE_S * tempsParSeconde();

      // Notes encore attendues dans les groupes « jouables » maintenant
      const candidates: NoteMorceau[] = [];
      for (let g = s.groupe; g < groupes.length && groupes[g].debut - s.temps <= avanceMax; g++) {
        for (const i of groupes[g].indices) if (s.etats[i] === 'attente') candidates.push(lecon.notes[i]);
      }
      const trouvee = candidates.find((n) => n.midi === midi);
      if (trouvee) {
        s.etats[trouvee.index] = 'reussie';
        s.reussies++;
        setEtats([...s.etats]);
        avancer();
        signaler('ok', trouvee.midi, 'Bravo !');
        return;
      }
      // Trop tôt : rien n'est encore jouable, on ignore sans pénaliser
      if (candidates.length === 0) return;
      compterErreur(midi, candidates);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lecon],
  );

  const g = lecon.groupes[groupe];
  return {
    phase,
    temps,
    /** Index du groupe à jouer. */
    groupe,
    etats,
    retour,
    enAttente,
    /** Durée du décompte, en temps. */
    avantDebut,
    demarrer,
    basculerPause,
    jouer,
    /** Notes du groupe actuel qui restent à jouer. */
    attendues: g ? g.indices.filter((i) => etats[i] === 'attente').map((i) => lecon.notes[i]) : [],
  };
}
