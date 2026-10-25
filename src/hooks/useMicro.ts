/**
 * Écoute du micro et détection des notes jouées sur un vrai piano, y compris
 * plusieurs à la fois (accords, deux mains).
 *
 * Utilise le flux PCM temps réel d'expo-audio (`useAudioStream`, inclus
 * dans Expo Go) et la détection polyphonique de `music/polyphonie.ts`, réglée
 * par la sensibilité et le bruit de fond mesurés à la calibration.
 */
import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { configurerAudio } from '@/audio/piano';
import { SuiviPolyphonique } from '@/music/polyphonie';
import { useReglages } from '@/store/Reglages';
import { useRefActuelle } from './useRefActuelle';

export type EtatMicro = 'eteint' | 'demarrage' | 'actif' | 'refuse' | 'erreur';

interface Options {
  /** Appelée à chaque note détectée (numéro MIDI). */
  onNote: (midi: number) => void;
}

export function useMicro({ onNote }: Options) {
  const [etat, setEtat] = useState<EtatMicro>('eteint');
  const [niveau, setNiveau] = useState(0);
  const [derniereNote, setDerniereNote] = useState<number | null>(null);
  /** Notes entendues en ce moment (pour l'écran de calibration). */
  const [entendues, setEntendues] = useState<number[]>([]);
  const { reglages } = useReglages();

  const onNoteRef = useRefActuelle(onNote);
  /** Pendant ce délai, on ignore le micro (le haut-parleur vient de jouer un son). */
  const ignorerJusquA = useRef(0);
  const dernierRafraichissement = useRef(0);

  const suivi = useRef<SuiviPolyphonique | null>(null);
  useEffect(() => {
    suivi.current = new SuiviPolyphonique((midis) => {
      if (Date.now() < ignorerJusquA.current) return;
      setDerniereNote(midis[midis.length - 1]);
      for (const m of midis) onNoteRef.current(m);
    });
  }, [onNoteRef]);

  // Réglages de la calibration
  const { sensibiliteMicro, bruitMicro } = reglages;
  useEffect(() => {
    if (suivi.current) suivi.current.options = { sensibilite: sensibiliteMicro, bruit: bruitMicro };
  }, [sensibiliteMicro, bruitMicro]);

  const { stream } = useAudioStream({
    sampleRate: 44100,
    channels: 1,
    encoding: 'float32',
    onBuffer: (buffer) => {
      const s = suivi.current;
      if (!s) return;
      s.ajouter(new Float32Array(buffer.data), buffer.sampleRate);
      // Vumètre rafraîchi ~10 fois par seconde seulement (économise le rendu)
      const maintenant = Date.now();
      if (maintenant - dernierRafraichissement.current > 100) {
        dernierRafraichissement.current = maintenant;
        setNiveau(s.niveau);
        setEntendues((e) => (e.join() === s.notesEntendues.join() ? e : s.notesEntendues));
      }
    },
  });

  const demarrer = useCallback(async () => {
    setEtat('demarrage');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setEtat('refuse');
        return;
      }
      await configurerAudio(true);
      suivi.current?.reinitialiser();
      await stream.start();
      setEtat('actif');
    } catch {
      setEtat('erreur');
    }
  }, [stream]);

  const arreter = useCallback(() => {
    try {
      stream.stop();
    } catch {
      // déjà arrêté
    }
    setEtat('eteint');
    setNiveau(0);
    setDerniereNote(null);
    configurerAudio(false);
  }, [stream]);

  /** À appeler quand l'appli joue un son, pour ne pas le détecter comme une note. */
  const ignorerUnInstant = useCallback((ms = 500) => {
    ignorerJusquA.current = Date.now() + ms;
  }, []);

  // Arrêt automatique en quittant l'écran
  useEffect(() => {
    return () => {
      try {
        stream.stop();
      } catch {
        // rien
      }
    };
  }, [stream]);

  /** Mesure le bruit de fond pendant `ms` millisecondes (il faut le silence) et le renvoie. */
  const mesurerBruit = useCallback(async (ms = 2000) => {
    const s = suivi.current;
    if (!s) return 0;
    s.commencerMesureBruit();
    await new Promise((r) => setTimeout(r, ms));
    return s.terminerMesureBruit();
  }, []);

  return { etat, niveau, derniereNote, entendues, demarrer, arreter, ignorerUnInstant, mesurerBruit };
}
