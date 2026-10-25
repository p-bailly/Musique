/**
 * Génère les sons utilisés par l'application :
 *
 * 1. Les notes de piano, à partir des échantillons du « Salamander Grand Piano V3 »
 *    (Alexander Holm, licence CC BY 3.0 — https://archive.org/details/SalamanderGrandPianoV3),
 *    dans la version MP3 publiée par le projet Tone.js. Un échantillon existe toutes les
 *    tierces mineures (Do, Ré#, Fa#, La) ; les notes intermédiaires sont obtenues en
 *    transposant l'échantillon le plus proche d'un demi-ton au plus, comme le fait un
 *    échantillonneur. Chaque note devient un fichier MP3 mono de 2,6 s (avec fondu).
 * 2. Les deux clics du métronome (temps fort et temps faible), synthétisés.
 *
 * Le script crée aussi `src/audio/samples.ts`, qui associe chaque note MIDI à son
 * fichier (Metro exige des `require` statiques).
 *
 * Prérequis : ffmpeg. Utilisation : node scripts/generate-sounds.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SOURCE = 'https://tonejs.github.io/audio/salamander/';
const MIDI_MIN = 36; // Do2
const MIDI_MAX = 96; // Do7
const DUREE = 2.6; // secondes
const FONDU = 0.7; // fondu de fin, en secondes

const racine = path.join(__dirname, '..');
const sortie = path.join(racine, 'assets', 'sounds');
const cache = path.join(os.tmpdir(), 'salamander');
fs.mkdirSync(sortie, { recursive: true });
fs.mkdirSync(cache, { recursive: true });

/** Échantillons disponibles : Do, Ré#, Fa#, La de chaque octave. */
const NOMS = { 0: 'C', 3: 'Ds', 6: 'Fs', 9: 'A' };
const nomFichier = (midi) => `${NOMS[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`;

/** Échantillon le plus proche (à un demi-ton au plus). */
function echantillonPour(midi) {
  for (const ecart of [0, -1, 1]) {
    if (NOMS[(midi + ecart) % 12] !== undefined) return midi + ecart;
  }
  throw new Error(`pas d'échantillon pour ${midi}`);
}

async function telecharger(nom) {
  const fichier = path.join(cache, nom);
  if (fs.existsSync(fichier)) return fichier;
  const reponse = await fetch(SOURCE + nom);
  if (!reponse.ok) throw new Error(`${nom} : ${reponse.status}`);
  fs.writeFileSync(fichier, Buffer.from(await reponse.arrayBuffer()));
  return fichier;
}

function frequenceEchantillonnage(fichier) {
  const sortieProbe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', fichier]);
  return Number(String(sortieProbe).trim());
}

/** Écrit un fichier WAV mono 16 bits. */
function ecrireWav(fichier, donnees, sampleRate) {
  const n = donnees.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, donnees[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(fichier, buffer);
}

/** Clic de métronome : un « toc » boisé (sinus amorti + bruit très court). */
function clic(frequence, volume) {
  const sampleRate = 44100;
  const n = Math.floor(sampleRate * 0.06);
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 90);
    d[i] = volume * env * (0.8 * Math.sin(2 * Math.PI * frequence * t) + 0.2 * (Math.random() * 2 - 1) * Math.exp(-t * 400));
  }
  return { d, sampleRate };
}

async function main() {
  // Anciens fichiers (sons synthétisés)
  for (const f of fs.readdirSync(sortie)) {
    if (/^(note|piano)_\d+\.(wav|mp3)$/.test(f)) fs.unlinkSync(path.join(sortie, f));
  }

  const lignes = [];
  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const base = echantillonPour(midi);
    const source = await telecharger(nomFichier(base));
    const sr = frequenceEchantillonnage(source);
    const rapport = Math.pow(2, (midi - base) / 12);
    const fichier = `piano_${midi}.mp3`;
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', source,
      '-af', `asetrate=${Math.round(sr * rapport)},aresample=44100,atrim=0:${DUREE},afade=t=out:st=${DUREE - FONDU}:d=${FONDU}`,
      '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', path.join(sortie, fichier),
    ]);
    lignes.push(`  ${midi}: require('../../assets/sounds/${fichier}'),`);
    process.stdout.write('.');
  }

  const fort = clic(1800, 0.9);
  const faible = clic(1200, 0.6);
  ecrireWav(path.join(sortie, 'clic_fort.wav'), fort.d, fort.sampleRate);
  ecrireWav(path.join(sortie, 'clic_faible.wav'), faible.d, faible.sampleRate);

  const ts = `// Fichier généré par scripts/generate-sounds.js — ne pas modifier à la main.
// Échantillons du Salamander Grand Piano V3 (Alexander Holm, licence CC BY 3.0).

export const MIDI_SON_MIN = ${MIDI_MIN};
export const MIDI_SON_MAX = ${MIDI_MAX};

export const SAMPLES: Record<number, number> = {
${lignes.join('\n')}
};

/** Clics du métronome : temps fort (début de mesure) et temps faible. */
export const CLIC_FORT = require('../../assets/sounds/clic_fort.wav');
export const CLIC_FAIBLE = require('../../assets/sounds/clic_faible.wav');
`;
  fs.writeFileSync(path.join(racine, 'src', 'audio', 'samples.ts'), ts);
  console.log(`\n${MIDI_MAX - MIDI_MIN + 1} notes + 2 clics générés dans assets/sounds/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
