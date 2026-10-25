/**
 * Lecture des sons de piano (échantillons du Salamander Grand Piano, voir
 * scripts/generate-sounds.js) et des clics du métronome.
 * Un lecteur est créé par note, à la demande, puis réutilisé : plusieurs notes
 * peuvent sonner ensemble (accords).
 */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CLIC_FAIBLE, CLIC_FORT, MIDI_SON_MAX, MIDI_SON_MIN, SAMPLES } from './samples';

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

const clics: { fort?: AudioPlayer; faible?: AudioPlayer } = {};

/** Joue un clic de métronome (plus aigu sur le premier temps de la mesure). */
export function jouerClic(fort: boolean) {
  try {
    if (!modeConfigure) configurerAudio();
    const cle = fort ? 'fort' : 'faible';
    let p = clics[cle];
    if (!p) {
      p = createAudioPlayer(fort ? CLIC_FORT : CLIC_FAIBLE);
      clics[cle] = p;
    }
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Un clic manqué ne doit jamais bloquer le jeu.
  }
}

/** Joue plusieurs notes ensemble (accord). */
export function jouerAccord(midis: number[]) {
  for (const m of midis) jouerNote(m);
}
