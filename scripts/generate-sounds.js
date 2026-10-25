/**
 * Génère les sons de piano (fichiers WAV) utilisés par l'application.
 *
 * Les sons sont synthétisés (somme d'harmoniques avec enveloppe décroissante),
 * ce qui évite tout problème de droits d'auteur et permet un fonctionnement
 * 100 % hors-ligne. Le script crée aussi `src/audio/samples.ts`, qui associe
 * chaque note MIDI à son fichier (Metro exige des `require` statiques).
 *
 * Utilisation : node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050; // suffisant pour un son de piano simple, fichiers légers
const DURATION = 1.4; // secondes
const MIDI_MIN = 36; // Do2
const MIDI_MAX = 84; // Do6

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

/** Fréquence (Hz) d'une note MIDI (La4 = 69 = 440 Hz). */
const freqOf = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Synthèse d'une note « façon piano ». */
function synth(midi) {
  const f0 = freqOf(midi);
  const n = Math.floor(SAMPLE_RATE * DURATION);
  const data = new Float32Array(n);
  // Harmoniques : [rang, amplitude, vitesse de décroissance]
  const partials = [
    [1, 1.0, 2.2],
    [2, 0.55, 3.0],
    [3, 0.28, 4.0],
    [4, 0.16, 5.0],
    [5, 0.08, 6.5],
    [6, 0.05, 8.0],
  ];
  // Les notes graves résonnent plus longtemps
  const decayScale = 0.6 + (MIDI_MAX - midi) / (MIDI_MAX - MIDI_MIN) * 0.8;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const [k, a, d] of partials) {
      const f = f0 * k * (1 + 0.0004 * k * k); // légère inharmonicité
      if (f > SAMPLE_RATE / 2) continue;
      s += a * Math.exp(-t * d / decayScale) * Math.sin(2 * Math.PI * f * t);
    }
    const attack = Math.min(1, t / 0.004); // attaque très courte
    const release = Math.min(1, (DURATION - t) / 0.08); // fin douce, sans clic
    data[i] = s * attack * release;
  }
  // Normalisation
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < n; i++) data[i] = (data[i] / peak) * 0.8;
  return data;
}

/** Encode un signal en WAV PCM 16 bits mono. */
function toWav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return buf;
}

const lines = [];
for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
  fs.writeFileSync(path.join(outDir, `note_${midi}.wav`), toWav(synth(midi)));
  lines.push(`  ${midi}: require('../../assets/sounds/note_${midi}.wav'),`);
}

const ts = `// Fichier généré par scripts/generate-sounds.js — ne pas modifier à la main.
// Associe chaque note MIDI à son échantillon sonore.

export const MIDI_SON_MIN = ${MIDI_MIN};
export const MIDI_SON_MAX = ${MIDI_MAX};

export const SAMPLES: Record<number, number> = {
${lines.join('\n')}
};
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'audio', 'samples.ts'), ts);
console.log(`${MIDI_MAX - MIDI_MIN + 1} sons générés dans assets/sounds/`);
