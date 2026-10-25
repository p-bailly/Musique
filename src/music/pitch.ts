/**
 * Détection de hauteur (pitch detection) à partir du micro.
 *
 * Algorithme YIN (de Cheveigné & Kawahara, 2002), bien adapté aux
 * instruments comme le piano. Implémentation en pur TypeScript, sans
 * dépendance, qui tourne sur le fil JavaScript.
 */
import { frequenceVersMidi } from './notes';

/** Fréquences extrêmes recherchées (≈ Do2 → Do6, avec de la marge). */
const FREQ_MIN = 60;
const FREQ_MAX = 1200;
/** Seuil YIN : plus il est bas, plus la détection est stricte. */
const SEUIL_YIN = 0.15;

export interface ResultatHauteur {
  frequence: number;
  /** Confiance entre 0 et 1. */
  clarte: number;
}

/**
 * Estime la fréquence fondamentale d'un bloc d'échantillons.
 * Renvoie null si aucune hauteur fiable n'est trouvée.
 */
export function detecterHauteur(signal: Float32Array, sampleRate: number): ResultatHauteur | null {
  const tauMin = Math.max(2, Math.floor(sampleRate / FREQ_MAX));
  const tauMax = Math.min(Math.floor(sampleRate / FREQ_MIN), Math.floor(signal.length / 2));
  const fenetre = signal.length - tauMax;
  if (fenetre < tauMax) return null;

  // 1) Fonction de différence et 2) différence normalisée cumulée (CMND)
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let somme = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let d = 0;
    for (let j = 0; j < fenetre; j++) {
      const delta = signal[j] - signal[j + tau];
      d += delta * delta;
    }
    somme += d;
    cmnd[tau] = somme === 0 ? 1 : (d * tau) / somme;
  }

  // 3) Premier creux sous le seuil
  let tau = tauMin;
  let trouve = -1;
  while (tau <= tauMax) {
    if (cmnd[tau] < SEUIL_YIN) {
      while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
      trouve = tau;
      break;
    }
    tau++;
  }
  if (trouve < 0) return null;

  // 4) Interpolation parabolique pour affiner la période
  let periode = trouve;
  if (trouve > 1 && trouve < tauMax) {
    const a = cmnd[trouve - 1];
    const b = cmnd[trouve];
    const c = cmnd[trouve + 1];
    const den = a + c - 2 * b;
    if (den !== 0) periode = trouve + (a - c) / (2 * den);
  }
  return { frequence: sampleRate / periode, clarte: 1 - cmnd[trouve] };
}

/** Niveau sonore (RMS) d'un bloc. */
export function niveauRms(signal: Float32Array): number {
  let s = 0;
  for (let i = 0; i < signal.length; i++) s += signal[i] * signal[i];
  return Math.sqrt(s / signal.length);
}

/**
 * Suivi de notes en continu : accumule les échantillons du micro,
 * analyse régulièrement et émet un événement à chaque nouvelle note jouée
 * (y compris quand la même note est rejouée, grâce à la détection d'attaque).
 */
export class SuiviNotes {
  private tampon: Float32Array;
  private rempli = 0;
  private candidat: number | null = null;
  private stabilite = 0;
  private derniereEmise: number | null = null;
  private rmsPrecedent = 0;
  private rmsAvantPrecedent = 0;
  /** Nombre d'analyses pendant lesquelles on ignore les nouvelles attaques. */
  private pause = 0;
  private sampleRateEffectif = 0;
  private facteur = 1;

  /** Dernier niveau sonore mesuré (0..1), utile pour un vumètre. */
  niveau = 0;

  constructor(
    private readonly onNote: (midi: number, frequence: number) => void,
    /** Taille de la fenêtre d'analyse (après sous-échantillonnage). */
    private readonly taille = 2048,
    /** Analyse toutes les `pas` nouvelles valeurs. */
    private readonly pas = 1024,
  ) {
    this.tampon = new Float32Array(taille);
  }

  /** Ajoute un bloc d'échantillons bruts du micro. */
  ajouter(bloc: Float32Array, sampleRate: number) {
    // Sous-échantillonnage pour alléger le calcul (48 kHz → 24 kHz)
    if (this.sampleRateEffectif === 0) {
      this.facteur = sampleRate > 30000 ? 2 : 1;
      this.sampleRateEffectif = sampleRate / this.facteur;
    }
    const f = this.facteur;
    for (let i = 0; i + f <= bloc.length; i += f) {
      let v = bloc[i];
      if (f === 2) v = (v + bloc[i + 1]) / 2;
      this.tampon[this.rempli++] = v;
      // Tampon plein : on analyse, puis on décale d'un « pas » (fenêtre glissante)
      if (this.rempli === this.taille) {
        this.analyser();
        this.tampon.copyWithin(0, this.pas);
        this.rempli = this.taille - this.pas;
      }
    }
  }

  /** Remet le suivi à zéro (ex. après avoir rejoué un son par le haut-parleur). */
  reinitialiser() {
    this.candidat = null;
    this.stabilite = 0;
    this.derniereEmise = null;
  }

  private analyser() {
    const rms = niveauRms(this.tampon);
    this.niveau = Math.min(1, rms * 8);

    // Silence : on autorise la même note à être redétectée ensuite
    if (rms < 0.01) {
      this.reinitialiser();
      this.rmsPrecedent = 0;
      this.rmsAvantPrecedent = 0;
      return;
    }
    // Attaque : l'énergie du dernier « pas » augmente brusquement par rapport
    // au précédent → nouvelle frappe de touche (permet de rejouer la même note)
    // (comparaison avec le plus faible des deux pas précédents, car une attaque
    // peut tomber à cheval sur deux pas)
    const rmsRecent = niveauRms(this.tampon.subarray(this.taille - this.pas));
    const reference = Math.min(this.rmsPrecedent, this.rmsAvantPrecedent);
    if (this.pause > 0) this.pause--;
    else if (rmsRecent > reference * 1.6 && rmsRecent > 0.02) {
      this.derniereEmise = null;
      this.candidat = null;
      this.stabilite = 0;
      this.pause = 2; // évite de détecter deux fois la même attaque
    }
    this.rmsAvantPrecedent = this.rmsPrecedent;
    this.rmsPrecedent = rmsRecent;

    const res = detecterHauteur(this.tampon, this.sampleRateEffectif);
    if (!res || res.clarte < 0.8) return;
    const midi = frequenceVersMidi(res.frequence);

    // Il faut deux analyses consécutives identiques pour valider la note
    if (midi === this.candidat) this.stabilite++;
    else {
      this.candidat = midi;
      this.stabilite = 1;
    }
    if (this.stabilite >= 2 && midi !== this.derniereEmise) {
      this.derniereEmise = midi;
      this.onNote(midi, res.frequence);
    }
  }
}
