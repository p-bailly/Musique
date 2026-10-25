/**
 * Réglages de l'application (vitesse, mode attente, noms des notes, thème…),
 * partagés via un contexte React et sauvegardés sur le téléphone.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { clair, Palette, sombre } from '@/theme/couleurs';
import { ecrire, lire } from './stockage';

export type ChoixTheme = 'systeme' | 'clair' | 'sombre';
/** Où l'élève joue : sur son vrai piano (écouté au micro) ou sur le clavier de l'écran. */
export type Entree = 'piano' | 'ecran';

export interface Reglages {
  /** Mode de jeu principal : vrai piano (micro) par défaut. */
  entree: Entree;
  /** Multiplicateur de tempo (0.5 = deux fois plus lent). */
  vitesse: number;
  /** Le morceau attend que la bonne touche soit jouée. */
  modeAttente: boolean;
  /** Afficher le nom des notes (clavier, blocs, portée). */
  nomsNotes: boolean;
  /** Jouer le son du piano quand on touche le clavier à l'écran. */
  son: boolean;
  theme: ChoixTheme;
  /** Accès libre à toutes les leçons, sans devoir débloquer. */
  toutDebloquer: boolean;
  /** Clics du métronome pendant le morceau. */
  metronome: boolean;
  /** Clics pendant la mesure de décompte, avant la première note. */
  decompteAudible: boolean;
  /** Sensibilité du micro : 0.6 (pièce bruyante) à 2 (piano lointain ou doux). */
  sensibiliteMicro: number;
  /** Bruit de fond mesuré à la calibration (RMS), 0 tant qu'il n'a pas été mesuré. */
  bruitMicro: number;
}

export const REGLAGES_DEFAUT: Reglages = {
  entree: 'piano',
  vitesse: 1,
  modeAttente: true,
  nomsNotes: true,
  son: true,
  theme: 'systeme',
  toutDebloquer: false,
  metronome: false,
  decompteAudible: true,
  sensibiliteMicro: 1,
  bruitMicro: 0,
};

const CLE = 'reglages-v1';

interface ValeurContexte {
  reglages: Reglages;
  modifier: (partiel: Partial<Reglages>) => void;
  couleurs: Palette;
  sombre: boolean;
}

const Contexte = createContext<ValeurContexte | null>(null);

export function ReglagesProvider({ children }: { children: React.ReactNode }) {
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_DEFAUT);
  const schemaSysteme = useColorScheme();

  // Chargement initial depuis le stockage
  useEffect(() => {
    lire(CLE, REGLAGES_DEFAUT).then(setReglages);
  }, []);

  const modifier = useCallback((partiel: Partial<Reglages>) => {
    setReglages((avant) => {
      const apres = { ...avant, ...partiel };
      ecrire(CLE, apres);
      return apres;
    });
  }, []);

  const estSombre = reglages.theme === 'sombre' || (reglages.theme === 'systeme' && schemaSysteme === 'dark');

  const valeur = useMemo(
    () => ({ reglages, modifier, couleurs: estSombre ? sombre : clair, sombre: estSombre }),
    [reglages, modifier, estSombre],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useReglages(): ValeurContexte {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error('useReglages doit être utilisé dans <ReglagesProvider>');
  return ctx;
}

/** Raccourci pour obtenir uniquement la palette de couleurs. */
export function useCouleurs(): Palette {
  return useReglages().couleurs;
}
