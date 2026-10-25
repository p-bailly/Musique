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
/** D'où vient la note : clavier de l'écran, micro (vrai piano) ou clavier MIDI. */
export type SourceNote = 'ecran' | 'micro' | 'midi';

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
/** Écarts (en demi-tons) des harmoniques 2 à 6 d'une note : octave, douzième, double octave… */
const HARMONIQUES = [12, 19, 24, 28, 31];
/** Au micro, après un accord réussi, la fin de la frappe est ignorée pendant ce délai. */
const MICRO_APRES_ACCORD_MS = 250;
/** Au micro, une même fausse note n'est comptée qu'une fois pendant ce délai (résonance). */
const ANTI_REBOND_MICRO_MS = 700;

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
    derniereErreur: { pc: -1, quand: 0 },
    microIgnoreJusqua: 0,
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
      derniereErreur: { pc: -1, quand: 0 },
      microIgnoreJusqua: 0,
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

  /** Une note vient d'être jouée sur le clavier de l'écran ou un clavier MIDI (hauteur exacte). */
  const jouer = useCallback(
    (midi: number, _source: SourceNote) => {
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

  /**
   * Notes entendues au micro lors d'une même frappe, de la plus forte à la plus faible.
   *
   * Le micro entend aussi les harmoniques et la résonance du piano : on ne regarde que
   * l'accord à jouer maintenant (jamais le suivant), on ignore le micro un court instant
   * après chaque accord réussi, et seule la note la plus forte peut compter comme fausse.
   */
  const jouerMicro = useCallback(
    (midis: number[]) => {
      const s = r.current;
      if (s.phase !== 'enCours' || !midis.length) return;
      const maintenant = Date.now();
      if (maintenant < s.microIgnoreJusqua) return;
      const groupes = lecon.groupes;
      const g = groupes[s.groupe];
      if (!g) return;
      const avanceMax = reglages.current.modeAttente ? AVANCE_ACCEPTEE : TOLERANCE_S * tempsParSeconde();
      if (g.debut - s.temps > avanceMax) return; // trop tôt

      const groupe = g.indices.map((i) => lecon.notes[i]);
      const restantes = () => groupe.filter((n) => s.etats[n.index] === 'attente');
      // L'octave n'est pas vérifiée au micro : un même nom couvre toutes ses octaves
      const classes = new Set(midis.map((m) => m % 12));
      const valides = restantes().filter((n) => classes.has(n.midi % 12));
      if (valides.length) {
        // Une note qui tombe sur une harmonique d'une note jouée du même accord (octave,
        // douzième…) ne peut pas être distinguée au micro : elle est validée avec elle
        const jouees = groupe.filter((n) => s.etats[n.index] === 'reussie' || valides.includes(n));
        valides.push(
          ...restantes().filter((n) => !valides.includes(n) && jouees.some((j) => HARMONIQUES.includes(n.midi - j.midi))),
        );
        for (const n of valides) {
          s.etats[n.index] = 'reussie';
          s.reussies++;
        }
        setEtats([...s.etats]);
        const groupeAvant = s.groupe;
        avancer();
        // Accord terminé : la fin de cette frappe ne doit pas compter pour le suivant
        if (s.groupe !== groupeAvant) s.microIgnoreJusqua = maintenant + MICRO_APRES_ACCORD_MS;
        signaler('ok', valides[0].midi, 'Bravo !');
        return;
      }

      // Rien de juste : seule la note la plus forte peut être une vraie fausse note
      const forte = midis[0];
      const pc = forte % 12;
      // La résonance d'une note juste, ou une même fausse note, ne compte qu'une fois
      if (s.derniereErreur.pc === pc && maintenant - s.derniereErreur.quand < ANTI_REBOND_MICRO_MS) return;
      if (lecon.notes.some((n) => s.etats[n.index] === 'reussie' && n.midi % 12 === pc && Math.abs(n.debut - s.temps) < 2)) {
        return;
      }
      // Une harmonique d'une note attendue (sa quinte au-dessus de l'octave…) n'est pas une erreur
      if (restantes().some((n) => HARMONIQUES.some((h) => (n.midi + h) % 12 === pc))) return;
      s.derniereErreur = { pc, quand: maintenant };
      compterErreur(forte, restantes());
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
    jouerMicro,
    /** Notes du groupe actuel qui restent à jouer. */
    attendues: g ? g.indices.filter((i) => etats[i] === 'attente').map((i) => lecon.notes[i]) : [],
  };
}
