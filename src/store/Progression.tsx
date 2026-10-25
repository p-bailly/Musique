/**
 * Suivi de progression : étoiles par leçon, série de jours consécutifs,
 * statistiques simples. Tout est stocké localement sur le téléphone.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ecrire, lire } from './stockage';

export interface ResultatLecon {
  meilleuresEtoiles: number;
  meilleurePrecision: number;
  parties: number;
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
}

const PROGRESSION_VIDE: Progression = {
  lecons: {},
  serie: { actuelle: 0, record: 0, dernierJour: null },
  totaux: { notesReussies: 0, erreurs: 0, secondesPratique: 0, leconsTerminees: 0 },
  jours: {},
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
      const ancien = p.lecons[b.leconId] ?? { meilleuresEtoiles: 0, meilleurePrecision: 0, parties: 0 };
      const aujourdhui = jourLocal();

      // Série de jours consécutifs : seulement si la leçon est réussie (≥ 1 étoile)
      let serie = p.serie;
      if (b.etoiles > 0 && serie.dernierJour !== aujourdhui) {
        const actuelle = serie.dernierJour === jourLocal(-1) ? serie.actuelle + 1 : 1;
        serie = { actuelle, record: Math.max(serie.record, actuelle), dernierJour: aujourdhui };
      }

      const nouvelle: Progression = {
        lecons: {
          ...p.lecons,
          [b.leconId]: {
            meilleuresEtoiles: Math.max(ancien.meilleuresEtoiles, b.etoiles),
            meilleurePrecision: Math.max(ancien.meilleurePrecision, b.precision),
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
        jours: { ...p.jours, [aujourdhui]: (p.jours[aujourdhui] ?? 0) + b.secondes / 60 },
      };
      ecrire(CLE, nouvelle);
      return nouvelle;
    });
  }, []);

  const reinitialiser = useCallback(() => {
    setProgression(PROGRESSION_VIDE);
    ecrire(CLE, PROGRESSION_VIDE);
  }, []);

  const { dernierJour, actuelle } = progression.serie;
  const serieActuelle = dernierJour === jourLocal() || dernierJour === jourLocal(-1) ? actuelle : 0;

  const valeur = useMemo(
    () => ({ progression, serieActuelle, enregistrerPartie, reinitialiser }),
    [progression, serieActuelle, enregistrerPartie, reinitialiser],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useProgression(): ValeurContexte {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error('useProgression doit être utilisé dans <ProgressionProvider>');
  return ctx;
}

/** Calcule les étoiles d'une partie selon la précision (0 à 1). */
export function calculerEtoiles(precision: number): number {
  if (precision >= 0.95) return 3;
  if (precision >= 0.8) return 2;
  if (precision >= 0.5) return 1;
  return 0;
}
