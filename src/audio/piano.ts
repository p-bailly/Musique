/**
 * Lecture des sons de piano (échantillons WAV générés localement).
 * Un lecteur est créé par note, à la demande, puis réutilisé.
 */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { MIDI_SON_MAX, MIDI_SON_MIN, SAMPLES } from './samples';

const lecteurs = new Map<number, AudioPlayer>();
let modeConfigure = false;

/** Configure la session audio (son même en mode silencieux sur iPhone). */
export async function configurerAudio(avecMicro = false) {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: avecMicro,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'mixWithOthers',
    });
    modeConfigure = true;
  } catch {
    // Pas bloquant : le son fonctionnera avec la configuration par défaut.
  }
}

function lecteur(midi: number): AudioPlayer | null {
  if (midi < MIDI_SON_MIN || midi > MIDI_SON_MAX) return null;
  let p = lecteurs.get(midi);
  if (!p) {
    p = createAudioPlayer(SAMPLES[midi]);
    lecteurs.set(midi, p);
  }
  return p;
}

/** Précharge les sons d'une plage de notes pour éviter la latence au premier appui. */
export function prechargerSons(min: number, max: number) {
  if (!modeConfigure) configurerAudio();
  for (let m = min; m <= max; m++) lecteur(m);
}

/** Joue une note de piano. */
export function jouerNote(midi: number) {
  const p = lecteur(midi);
  if (!p) return;
  try {
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Ignoré : un son manqué ne doit jamais bloquer le jeu.
  }
}
