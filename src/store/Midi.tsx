/**
 * Clavier MIDI (USB ou Bluetooth), partagé par toute l'application.
 *
 * - Android : module natif `modules/clavier-midi` (android.media.midi). Un clavier
 *   USB branché est connecté tout seul ; un clavier Bluetooth se cherche dans les
 *   réglages, puis l'appli s'y reconnecte d'elle-même quand il est là.
 * - Web : Web MIDI (Chrome), tous les claviers branchés sont écoutés.
 * - iPhone et Expo Go : pas de MIDI (il faut une version compilée de l'appli).
 *
 * Les écrans reçoivent les touches enfoncées avec `useNotesMidi`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { AppareilMidi, ClavierMidi } from '../../modules/clavier-midi';
import { ecrire, lire } from './stockage';

export interface AppareilBluetooth {
  adresse: string;
  nom: string;
}

interface ValeurMidi {
  /** Le MIDI est utilisable sur cet appareil. */
  disponible: boolean;
  /** Nom du clavier connecté, ou null. */
  connecte: string | null;
  appareils: AppareilMidi[];
  bluetoothTrouves: AppareilBluetooth[];
  rechercheEnCours: boolean;
  /** Dernière erreur (permission refusée, connexion impossible…). */
  erreur: string | null;
  connecter: (id: number) => Promise<void>;
  deconnecter: () => void;
  chercherBluetooth: () => Promise<void>;
  connecterBluetooth: (a: AppareilBluetooth) => Promise<void>;
  /** S'abonne aux touches enfoncées ; renvoie la fonction de désabonnement. */
  ecouter: (ecouteur: (midi: number) => void) => () => void;
}

const Contexte = createContext<ValeurMidi | null>(null);
const CLE_BLUETOOTH = 'midi-bluetooth-v1';

/** Web MIDI (navigateur), typé au minimum. */
interface EntreeWeb {
  name?: string | null;
  onmidimessage: ((e: { data: Uint8Array }) => void) | null;
}
interface AccesWeb {
  inputs: Map<string, EntreeWeb>;
  onstatechange: (() => void) | null;
}

export function MidiProvider({ children }: { children: React.ReactNode }) {
  const disponible = Platform.OS === 'web' ? typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator : !!ClavierMidi?.estDisponible();
  const [connecte, setConnecte] = useState<string | null>(null);
  const [appareils, setAppareils] = useState<AppareilMidi[]>(() => (disponible && ClavierMidi ? ClavierMidi.listerAppareils() : []));
  const [bluetoothTrouves, setBluetoothTrouves] = useState<AppareilBluetooth[]>([]);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ecouteurs = useRef(new Set<(midi: number) => void>());

  const diffuser = useCallback((midi: number) => {
    for (const e of ecouteurs.current) e(midi);
  }, []);

  const connecter = useCallback(async (id: number) => {
    if (!ClavierMidi) return;
    try {
      setErreur(null);
      await ClavierMidi.connecter(id);
    } catch {
      setErreur('Impossible de se connecter à ce clavier.');
    }
  }, []);

  /* ----- Android : module natif ----- */
  useEffect(() => {
    const m = ClavierMidi;
    if (!m || !disponible) return;
    const abonnements = [
      m.addListener('onNote', ({ note, appuye }) => {
        if (appuye) diffuser(note);
      }),
      m.addListener('onAppareils', ({ appareils: a }) => setAppareils(a)),
      m.addListener('onConnexion', ({ connecte: c, nom }) => {
        setConnecte(c ? nom : null);
        setAppareils(m.listerAppareils());
      }),
      m.addListener('onAppareilBluetooth', (a) => {
        setBluetoothTrouves((liste) => (liste.some((x) => x.adresse === a.adresse) ? liste : [...liste, a]));
      }),
    ];
    return () => abonnements.forEach((a) => a.remove());
  }, [disponible, diffuser]);

  // Connexion automatique : le premier clavier USB (ou déjà appairé) disponible
  useEffect(() => {
    if (!connecte && appareils.length) {
      const prefere = appareils.find((a) => a.type === 'usb') ?? appareils.find((a) => a.type === 'bluetooth');
      // Appel natif direct : le résultat arrive par l'événement onConnexion
      if (prefere) ClavierMidi?.connecter(prefere.id).catch(() => {});
    }
  }, [appareils, connecte]);

  // Reconnexion au dernier clavier Bluetooth utilisé, au démarrage
  useEffect(() => {
    if (!ClavierMidi || !disponible || Platform.OS !== 'android') return;
    lire<AppareilBluetooth | null>(CLE_BLUETOOTH, null).then(async (dernier) => {
      if (!dernier?.adresse || !(await permissionsBluetooth(false))) return;
      ClavierMidi?.connecterBluetooth(dernier.adresse).catch(() => {});
    });
  }, [disponible]);

  /* ----- Web : Web MIDI ----- */
  useEffect(() => {
    if (Platform.OS !== 'web' || !disponible) return;
    let acces: AccesWeb | null = null;
    const brancher = () => {
      if (!acces) return;
      const noms: string[] = [];
      acces.inputs.forEach((entree) => {
        noms.push(entree.name || 'Clavier MIDI');
        entree.onmidimessage = ({ data }) => {
          const type = data[0] & 0xf0;
          if (type === 0x90 && data[2] > 0) diffuser(data[1]);
        };
      });
      setConnecte(noms.length ? noms.join(', ') : null);
    };
    (navigator as unknown as { requestMIDIAccess: () => Promise<AccesWeb> })
      .requestMIDIAccess()
      .then((a) => {
        acces = a;
        a.onstatechange = brancher;
        brancher();
      })
      .catch(() => setErreur('Accès MIDI refusé par le navigateur.'));
    return () => {
      if (acces) acces.onstatechange = null;
    };
  }, [disponible, diffuser]);

  const deconnecter = useCallback(() => {
    ClavierMidi?.deconnecter();
    setConnecte(null);
    ecrire(CLE_BLUETOOTH, null);
  }, []);

  const chercherBluetooth = useCallback(async () => {
    if (!ClavierMidi) return;
    setErreur(null);
    if (!(await permissionsBluetooth(true))) {
      setErreur('Autorise « Appareils à proximité » pour trouver un clavier Bluetooth.');
      return;
    }
    setBluetoothTrouves([]);
    setRechercheEnCours(true);
    ClavierMidi.scannerBluetooth(10000);
    setTimeout(() => setRechercheEnCours(false), 10000);
  }, []);

  const connecterBluetooth = useCallback(async (a: AppareilBluetooth) => {
    if (!ClavierMidi) return;
    try {
      setErreur(null);
      setRechercheEnCours(false);
      await ClavierMidi.connecterBluetooth(a.adresse);
      ecrire(CLE_BLUETOOTH, a);
    } catch {
      setErreur(`Impossible de se connecter à « ${a.nom} ». Allume-le et réessaie.`);
    }
  }, []);

  const ecouter = useCallback((e: (midi: number) => void) => {
    ecouteurs.current.add(e);
    return () => {
      ecouteurs.current.delete(e);
    };
  }, []);

  const valeur = useMemo(
    () => ({
      disponible,
      connecte,
      appareils,
      bluetoothTrouves,
      rechercheEnCours,
      erreur,
      connecter,
      deconnecter,
      chercherBluetooth,
      connecterBluetooth,
      ecouter,
    }),
    [disponible, connecte, appareils, bluetoothTrouves, rechercheEnCours, erreur, connecter, deconnecter, chercherBluetooth, connecterBluetooth, ecouter],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/** Permissions Bluetooth (Android 12+ : « appareils à proximité » ; avant : localisation). */
async function permissionsBluetooth(demander: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const version = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const P = PermissionsAndroid.PERMISSIONS;
  const liste = version >= 31 ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT] : [P.ACCESS_FINE_LOCATION];
  if (!demander) {
    const accordees = await Promise.all(liste.map((p) => PermissionsAndroid.check(p)));
    return accordees.every(Boolean);
  }
  const resultat = await PermissionsAndroid.requestMultiple(liste);
  return liste.every((p) => resultat[p] === PermissionsAndroid.RESULTS.GRANTED);
}

export function useMidi(): ValeurMidi {
  const v = useContext(Contexte);
  if (!v) throw new Error('useMidi doit être utilisé dans <MidiProvider>');
  return v;
}

/** Appelle `onNote` à chaque touche enfoncée sur le clavier MIDI connecté. */
export function useNotesMidi(onNote: (midi: number) => void) {
  const { ecouter } = useMidi();
  const ref = useRef(onNote);
  useEffect(() => {
    ref.current = onNote;
  }, [onNote]);
  useEffect(() => ecouter((m) => ref.current(m)), [ecouter]);
}
