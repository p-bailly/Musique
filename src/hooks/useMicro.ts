/**
 * Écoute du micro et détection des notes jouées sur un vrai piano.
 *
 * Utilise le flux PCM temps réel d'expo-audio (`useAudioStream`, inclus
 * dans Expo Go) et l'algorithme YIN de `music/pitch.ts`.
 */
import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { configurerAudio } from '@/audio/piano';
import { SuiviNotes } from '@/music/pitch';
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

  const onNoteRef = useRefActuelle(onNote);
  /** Pendant ce délai, on ignore le micro (le haut-parleur vient de jouer un son). */
  const ignorerJusquA = useRef(0);
  const dernierRafraichissement = useRef(0);

  const suivi = useRef<SuiviNotes | null>(null);
  useEffect(() => {
    suivi.current = new SuiviNotes((midi) => {
      if (Date.now() < ignorerJusquA.current) return;
      setDerniereNote(midi);
      onNoteRef.current(midi);
    });
  }, [onNoteRef]);

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

  return { etat, niveau, derniereNote, demarrer, arreter, ignorerUnInstant };
}
