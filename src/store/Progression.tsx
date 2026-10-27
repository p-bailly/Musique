/**
 * Suivi de progression : étoiles par leçon (jaunes en mode attente, bleues sans
 * attente, en rythme), série de jours consécutifs, statistiques simples.
 * Tout est stocké localement sur le téléphone.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ecrire, lire } from './stockage';

export interface ResultatLecon {
  /** Étoiles jaunes : morceau joué en mode attente. */
  meilleuresEtoiles: number;
  meilleurePrecision: number;
  parties: number;
  /** Étoiles bleues : morceau joué sans attente (justesse et rythme). */
  meilleuresEtoilesLibre?: number;
  /** Meilleur score de rythme sans attente (0 à 1). */
  meilleurRythme?: number;
}

export interface Progression {
  lecons: Record<string, ResultatLecon>;
  serie: { actuelle: number; record: number; dernierJour: string | null };
  totaux: {
    notesReussies: number;
    erreurs: number;
    secondesPratique: number;
    leconsTerminees: number;
  };
  /** Minutes de pratique par jour (« AAAA-MM-JJ » → minutes). */
  jours: Record<string, number>;
  /** Exercices (cartes flash, dictée) : meilleur score et nombre de parties. */
  exercices: Record<string, { record: number; parties: number }>;
}

const PROGRESSION_VIDE: Progression = {
  lecons: {},
  serie: { actuelle: 0, record: 0, dernierJour: null },
  totaux: { notesReussies: 0, erreurs: 0, secondesPratique: 0, leconsTerminees: 0 },
  jours: {},
  exercices: {},
};

const CLE = 'progression-v1';

/** Date locale au format AAAA-MM-JJ (décalage de `decalageJours` jours). */
export function jourLocal(decalageJours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
}

/** Résultat d'une partie, envoyé à la fin d'une leçon. */
export interface BilanPartie {
  leconId: string;
  /** Joué avec le mode attente (étoiles jaunes) ou sans (étoiles bleues). */
  attente: boolean;
  /** Tout le morceau : un simple passage ne donne pas d'étoiles, seulement du temps de pratique. */
  complet: boolean;
  rythme: number | null;
  etoiles: number;
  precision: number;
  reussies: number;
  erreurs: number;
  secondes: number;
}

interface ValeurContexte {
  progression: Progression;
  /** Série en cours, remise à 0 si un jour a été manqué. */
  serieActuelle: number;
  enregistrerPartie: (bilan: BilanPartie) => void;
  /** Fin d'un exercice : renvoie vrai si c'est un nouveau record. */
  enregistrerExercice: (id: string, score: number, secondes: number) => boolean;
  reinitialiser: () => void;
}

const Contexte = createContext<ValeurContexte | null>(null);

export function ProgressionProvider({ children }: { children: React.ReactNode }) {
  const [progression, setProgression] = useState<Progression>(PROGRESSION_VIDE);

  useEffect(() => {
    lire(CLE, PROGRESSION_VIDE).then(setProgression);
  }, []);

  const enregistrerPartie = useCallback((b: BilanPartie) => {
    setProgression((p) => {
      const ancien: ResultatLecon = p.lecons[b.leconId] ?? { meilleuresEtoiles: 0, meilleurePrecision: 0, parties: 0 };
      const aujourdhui = jourLocal();
      const jours = { ...p.jours, [aujourdhui]: (p.jours[aujourdhui] ?? 0) + b.secondes / 60 };

      // Passage travaillé : seulement le temps de pratique
      if (!b.complet) {
        const partielle: Progression = {
          ...p,
          totaux: { ...p.totaux, secondesPratique: p.totaux.secondesPratique + b.secondes },
          jours,
        };
        ecrire(CLE, partielle);
        return partielle;
      }

      // Série de jours consécutifs : seulement si la leçon est réussie (≥ 1 étoile)
      let serie = p.serie;
      if (b.etoiles > 0 && serie.dernierJour !== aujourdhui) {
        const actuelle = serie.dernierJour === jourLocal(-1) ? serie.actuelle + 1 : 1;
        serie = { actuelle, record: Math.max(serie.record, actuelle), dernierJour: aujourdhui };
      }

      const nouvelle: Progression = {
        lecons: {
          ...p.lecons,
          [b.leconId]: b.attente
            ? {
                ...ancien,
                meilleuresEtoiles: Math.max(ancien.meilleuresEtoiles, b.etoiles),
                meilleurePrecision: Math.max(ancien.meilleurePrecision, b.precision),
                parties: ancien.parties + 1,
              }
            : {
                ...ancien,
                meilleuresEtoilesLibre: Math.max(ancien.meilleuresEtoilesLibre ?? 0, b.etoiles),
                meilleurRythme: Math.max(ancien.meilleurRythme ?? 0, b.rythme ?? 0),
                parties: ancien.parties + 1,
              },
        },
        serie,
        totaux: {
          notesReussies: p.totaux.notesReussies + b.reussies,
          erreurs: p.totaux.erreurs + b.erreurs,
          secondesPratique: p.totaux.secondesPratique + b.secondes,
          leconsTerminees: p.totaux.leconsTerminees + (b.etoiles > 0 ? 1 : 0),
        },
        jours,
        exercices: p.exercices ?? {},
      };
      ecrire(CLE, nouvelle);
      return nouvelle;
    });
  }, []);

  const enregistrerExercice = useCallback(
    (id: string, score: number, secondes: number) => {
      const ancien = progression.exercices?.[id] ?? { record: 0, parties: 0 };
      setProgression((p) => {
        const aujourdhui = jourLocal();
        // L'entraînement compte aussi pour la série de jours
        let serie = p.serie;
        if (score > 0 && serie.dernierJour !== aujourdhui) {
          const actuelle = serie.dernierJour === jourLocal(-1) ? serie.actuelle + 1 : 1;
          serie = { actuelle, record: Math.max(serie.record, actuelle), dernierJour: aujourdhui };
        }
        const precedent = p.exercices?.[id] ?? { record: 0, parties: 0 };
        const nouvelle: Progression = {
          ...p,
          serie,
          totaux: { ...p.totaux, secondesPratique: p.totaux.secondesPratique + secondes },
          jours: { ...p.jours, [aujourdhui]: (p.jours[aujourdhui] ?? 0) + secondes / 60 },
          exercices: { ...p.exercices, [id]: { record: Math.max(precedent.record, score), parties: precedent.parties + 1 } },
        };
        ecrire(CLE, nouvelle);
        return nouvelle;
      });
      return score > ancien.record;
    },
    [progression.exercices],
  );

  const reinitialiser = useCallback(() => {
    setProgression(PROGRESSION_VIDE);
    ecrire(CLE, PROGRESSION_VIDE);
  }, []);

  const { dernierJour, actuelle } = progression.serie;
  const serieActuelle = dernierJour === jourLocal() || dernierJour === jourLocal(-1) ? actuelle : 0;

  const valeur = useMemo(
    () => ({ progression, serieActuelle, enregistrerPartie, enregistrerExercice, reinitialiser }),
    [progression, serieActuelle, enregistrerPartie, enregistrerExercice, reinitialiser],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useProgression(): ValeurContexte {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error('useProgression doit être utilisé dans <ProgressionProvider>');
  return ctx;
}

/** Une leçon est réussie (et débloque la suivante) avec au moins une étoile, jaune ou bleue. */
export function leconReussie(r: ResultatLecon | undefined): boolean {
  return (r?.meilleuresEtoiles ?? 0) > 0 || (r?.meilleuresEtoilesLibre ?? 0) > 0;
}

/**
 * Score d'une partie sans attente : moyenne de la justesse (bonnes notes) et du rythme
 * (notes jouées à temps), de 0 à 1.
 */
export function scoreLibre(precision: number, rythme: number): number {
  return (precision + rythme) / 2;
}

/** Calcule les étoiles d'une partie selon la précision (0 à 1). */
export function calculerEtoiles(precision: number): number {
  if (precision >= 0.95) return 3;
  if (precision >= 0.8) return 2;
  if (precision >= 0.5) return 1;
  return 0;
}
