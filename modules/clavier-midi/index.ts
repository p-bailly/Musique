/**
 * Accès au module natif ClavierMidi (Android). Absent dans Expo Go, sur iPhone et
 * sur le web : `ClavierMidi` vaut alors null (le web passe par Web MIDI, voir
 * src/store/Midi.tsx).
 */
import { requireOptionalNativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';

export interface AppareilMidi {
  id: number;
  nom: string;
  type: 'usb' | 'bluetooth' | 'virtuel';
  connecte: boolean;
}

export interface EvenementsClavierMidi {
  onNote: (e: { note: number; velocite: number; appuye: boolean }) => void;
  onAppareils: (e: { appareils: AppareilMidi[] }) => void;
  onAppareilBluetooth: (e: { adresse: string; nom: string }) => void;
  onConnexion: (e: { connecte: boolean; nom: string }) => void;
}

export interface ModuleClavierMidi {
  estDisponible(): boolean;
  listerAppareils(): AppareilMidi[];
  connecter(id: number): Promise<string>;
  deconnecter(): void;
  scannerBluetooth(dureeMs: number): void;
  arreterScan(): void;
  connecterBluetooth(adresse: string): Promise<string>;
  addListener<K extends keyof EvenementsClavierMidi>(nom: K, ecouteur: EvenementsClavierMidi[K]): EventSubscription;
}

export const ClavierMidi = requireOptionalNativeModule<ModuleClavierMidi>('ClavierMidi');
