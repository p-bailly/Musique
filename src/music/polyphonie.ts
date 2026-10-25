/**
 * Détection polyphonique au micro : reconnaît plusieurs notes jouées en même
 * temps (accords, deux mains), en pur TypeScript.
 *
 * Principe (inspiré de Klapuri, « Multiple fundamental frequency estimation by
 * summing harmonic amplitudes », 2006) :
 *  1. spectre de la fenêtre (FFT, fenêtre de Hann, zéros ajoutés) ;
 *  2. pics du spectre au-dessus du bruit de fond ;
 *  3. pour chaque note candidate (Do2 → Do7), « saillance » = somme pondérée des
 *     pics trouvés à ses harmoniques (un piano a des harmoniques un peu étirées :
 *     inharmonicité) ;
 *  4. on retient la note la plus saillante, on retire sa part des pics qu'elle
 *     explique, et on recommence tant qu'une note se détache nettement.
 *
 * Une note est signalée à son attaque : quand elle apparaît, ou quand l'énergie
 * remonte brusquement (même note rejouée).
 */

/** Notes recherchées. */
const MIDI_MIN = 36; // Do2
const MIDI_MAX = 96; // Do7
const NB_HARMONIQUES = 10;
/** Inharmonicité moyenne d'une corde de piano (étirement des harmoniques). */
const INHARMONICITE = 0.0004;
/** Tolérance de position d'une harmonique, en demi-tons. */
const TOLERANCE_DEMITONS = 0.4;
/** Nombre maximal de notes simultanées reconnues. */
const NOTES_MAX = 6;

export interface OptionsPolyphonie {
  /** 0.5 (peu sensible) à 2 (très sensible) ; 1 par défaut. */
  sensibilite: number;
  /** Bruit de fond mesuré à la calibration (niveau RMS), ou 0 si inconnu. */
  bruit: number;
}

/* ---------- FFT (radix 2, en place) ---------- */

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let longueur = 2; longueur <= n; longueur <<= 1) {
    const angle = (-2 * Math.PI) / longueur;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += longueur) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < longueur / 2; k++) {
        const a = i + k;
        const b = a + longueur / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const frequenceMidi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Pic {
  frequence: number;
  /** Amplitude relative au bruit de fond, en échelle logarithmique. */
  amplitude: number;
  /** Amplitude brute (pour suivre l'énergie d'une note d'une analyse à l'autre). */
  brute: number;
}

/**
 * Analyse d'une fenêtre : renvoie les notes présentes (MIDI) avec leur saillance.
 * Fonction pure, utilisée par le suivi en continu et par les tests.
 */
export function analyserFenetre(
  signal: Float32Array,
  sampleRate: number,
  options: OptionsPolyphonie = { sensibilite: 1, bruit: 0 },
): { midi: number; saillance: number; energie: number }[] {
  const n = signal.length;
  let taille = 1;
  while (taille < n * 2) taille <<= 1; // zéros ajoutés : spectre deux fois plus fin
  const re = new Float64Array(taille);
  const im = new Float64Array(taille);
  for (let i = 0; i < n; i++) re[i] = signal[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  fft(re, im);

  const nb = taille / 2;
  const mag = new Float64Array(nb);
  for (let k = 0; k < nb; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / n;
  const hzParCase = sampleRate / taille;

  // Bruit de fond : médiane du spectre utile, ou le bruit mesuré à la calibration
  const kMin = Math.floor(55 / hzParCase);
  const kMax = Math.min(nb - 2, Math.floor(5000 / hzParCase));
  const tri = Array.from(mag.subarray(kMin, kMax)).sort((a, b) => a - b);
  const mediane = tri[Math.floor(tri.length / 2)] || 1e-9;
  const fond = Math.max(mediane * 4, options.bruit * 0.02);
  const seuilPic = fond / Math.max(0.25, options.sensibilite);

  // Pics (maxima locaux), fréquence affinée par interpolation parabolique
  const pics: Pic[] = [];
  for (let k = kMin; k < kMax; k++) {
    const v = mag[k];
    if (v > seuilPic && v >= mag[k - 1] && v > mag[k + 1]) {
      const a = Math.log(mag[k - 1] + 1e-12);
      const b = Math.log(v + 1e-12);
      const c = Math.log(mag[k + 1] + 1e-12);
      const den = a - 2 * b + c;
      const decalage = den !== 0 ? (0.5 * (a - c)) / den : 0;
      pics.push({ frequence: (k + decalage) * hzParCase, amplitude: Math.log(1 + v / fond), brute: v });
    }
  }
  if (pics.length === 0) return [];

  /** Pic le plus fort autour d'une fréquence (à la tolérance près) ; les pics sont triés par fréquence. */
  const marge = Math.pow(2, TOLERANCE_DEMITONS / 12);
  const trouverPic = (f: number): number => {
    const bas = f / marge;
    const haut = f * marge;
    // Recherche dichotomique du premier pic au-dessus de `bas`
    let g = 0;
    let d = pics.length;
    while (g < d) {
      const m = (g + d) >> 1;
      if (pics[m].frequence <= bas) g = m + 1;
      else d = m;
    }
    let meilleur = -1;
    for (let i = g; i < pics.length && pics[i].frequence < haut; i++) {
      if (meilleur < 0 || pics[i].amplitude > pics[meilleur].amplitude) meilleur = i;
    }
    return meilleur;
  };

  const harmoniques = (m: number) => {
    const f0 = frequenceMidi(m);
    const res: number[] = [];
    for (let h = 1; h <= NB_HARMONIQUES; h++) {
      const f = h * f0 * Math.sqrt(1 + INHARMONICITE * h * h);
      if (f > kMax * hzParCase) break;
      res.push(trouverPic(f));
    }
    return res;
  };

  /**
   * Saillance : somme pondérée des harmoniques présentes. Il faut la fondamentale, ou, sous le
   * Do central (où elle est faible sur un piano), les 2e et 3e harmoniques — ce qui écarte la
   * note une octave sous une vraie note, dont la 3e harmonique manquerait.
   */
  const saillance = (m: number): { s: number; trouvees: number; base: number } => {
    const idx = harmoniques(m);
    const present = (h: number) => idx[h - 1] !== undefined && idx[h - 1] >= 0;
    if (!present(1) && !(m < 60 && present(2) && present(3))) return { s: 0, trouvees: 0, base: 0 };
    // Force de la fondamentale (ou de la 2e harmonique, souvent plus forte dans le grave)
    const base = Math.max(present(1) ? pics[idx[0]].amplitude : 0, present(2) ? pics[idx[1]].amplitude : 0);
    let s = 0;
    let trouvees = 0;
    idx.forEach((i, h) => {
      if (i >= 0) {
        s += pics[i].amplitude / Math.sqrt(h + 1);
        trouvees++;
      }
    });
    return { s, trouvees, base };
  };

  /** La fondamentale de `m` tombe sur une harmonique (2e ou plus) d'une note déjà trouvée. */
  const estHarmoniqueDe = (m: number, notesTrouvees: { midi: number }[]) =>
    notesTrouvees.some((n) => {
      const ecart = m - n.midi;
      // 12 = octave (h2), 19 = quinte + octave (h3), 24 = h4, 28 = h5, 31 = h6, 36 = h8
      return [12, 19, 24, 28, 31, 34, 36].some((e) => Math.abs(ecart - e) === 0);
    });

  const notes: { midi: number; saillance: number; energie: number }[] = [];
  /** Candidats écartés : on continue à chercher derrière eux (une vraie note peut suivre). */
  const ecartees = new Set<number>();
  const seuilAbsolu = 2.2 / options.sensibilite;
  let premiere = 0;
  for (let tour = 0; tour < 14 && notes.length < NOTES_MAX; tour++) {
    let meilleure = -1;
    let sMax = 0;
    let harmoniquesTrouvees = 0;
    let forceBase = 0;
    for (let m = MIDI_MIN; m <= MIDI_MAX; m++) {
      if (ecartees.has(m) || notes.some((n) => n.midi === m)) continue;
      const { s, trouvees, base } = saillance(m);
      if (s > sMax) {
        sMax = s;
        meilleure = m;
        harmoniquesTrouvees = trouvees;
        forceBase = base;
      }
    }
    if (meilleure < 0 || sMax < seuilAbsolu) break;
    if (premiere) {
      const relatif = sMax / premiere;
      if (relatif < 0.4 || sMax < 6 / options.sensibilite) break; // plus rien ne se détache
      // Une note de plus doit avoir plusieurs harmoniques (sauf dans l'aigu), une fondamentale
      // (ou 2e harmonique) franche, et ne pas être une simple harmonique d'une note déjà trouvée
      if (
        harmoniquesTrouvees < (meilleure >= 72 ? 2 : 3) ||
        forceBase < 1.4 ||
        (estHarmoniqueDe(meilleure, notes) && relatif < 0.45)
      ) {
        ecartees.add(meilleure);
        continue;
      }
    }
    if (!premiere) premiere = sMax;
    const energie = harmoniques(meilleure).reduce((e, i) => e + (i >= 0 ? pics[i].brute : 0), 0);
    notes.push({ midi: meilleure, saillance: sMax, energie });
    // Retire la part des pics expliquée par cette note. Son spectre est supposé « lisse » :
    // une harmonique bien plus forte que ses voisines appartient aussi à une autre note
    // (ex. Sol4 joué avec Do3, dont c'est la 3e harmonique), on n'en retire que la part attendue.
    const idx = harmoniques(meilleure);
    const amplitudes = idx.map((i) => (i >= 0 ? pics[i].amplitude : 0));
    idx.forEach((i, h) => {
      if (i < 0) return;
      const voisins = [amplitudes[h - 1], amplitudes[h + 1]].filter((a) => a !== undefined && a > 0);
      const attendue = voisins.length ? Math.min(amplitudes[h], voisins.reduce((x, y) => x + y, 0) / voisins.length) : amplitudes[h];
      pics[i].amplitude = Math.max(0, amplitudes[h] - attendue * 1.1);
    });
  }
  return notes;
}

/** Niveau sonore (RMS) d'un bloc. */
function rms(signal: Float32Array): number {
  let s = 0;
  for (let i = 0; i < signal.length; i++) s += signal[i] * signal[i];
  return Math.sqrt(s / signal.length);
}

/**
 * Suivi en continu : accumule les échantillons du micro, analyse une fenêtre
 * glissante et signale chaque note à son attaque.
 */
export class SuiviPolyphonique {
  private tampon: Float32Array;
  private rempli = 0;
  private facteur = 1;
  private sampleRateEffectif = 0;
  /** Notes présentes : nombre d'analyses consécutives et saillance précédente. */
  private presentes = new Map<number, { fois: number; energie: number; reference: number }>();
  /** Analyses restantes pendant lesquelles une note tenue peut être « rejouée » après une attaque. */
  private apresAttaque = 0;
  /** Notes déjà rejouées depuis la dernière attaque. */
  private relancees = new Set<number>();
  /** Notes déjà signalées, et nombre d'analyses depuis leur disparition. */
  private signalees = new Map<number, number>();
  /** Dernière analyse où chaque note a été signalée (une note qui « clignote » n'est pas rejouée). */
  private derniereEmission = new Map<number, number>();
  private numeroAnalyse = 0;
  private rmsPrecedent = 0;
  private rmsAvantPrecedent = 0;
  private pause = 0;
  /** Mesure du bruit de fond en cours (calibration). */
  private mesureBruit: number[] | null = null;

  /** Dernier niveau sonore mesuré (0..1), pour un vumètre. */
  niveau = 0;
  /** Notes entendues à la dernière analyse, pour l'affichage. */
  notesEntendues: number[] = [];

  constructor(
    private readonly onNotes: (midis: number[]) => void,
    public options: OptionsPolyphonie = { sensibilite: 1, bruit: 0 },
    /** Taille de la fenêtre d'analyse (après sous-échantillonnage à ~22 kHz). */
    private readonly taille = 4096,
    /** Analyse toutes les `pas` nouvelles valeurs (~46 ms). */
    private readonly pas = 1024,
  ) {
    this.tampon = new Float32Array(taille);
  }

  /** Ajoute un bloc d'échantillons bruts du micro. */
  ajouter(bloc: Float32Array, sampleRate: number) {
    if (this.sampleRateEffectif === 0) {
      this.facteur = sampleRate > 30000 ? 2 : 1;
      this.sampleRateEffectif = sampleRate / this.facteur;
    }
    const f = this.facteur;
    for (let i = 0; i + f <= bloc.length; i += f) {
      let v = bloc[i];
      if (f === 2) v = (v + bloc[i + 1]) / 2;
      this.tampon[this.rempli++] = v;
      if (this.rempli === this.taille) {
        this.analyser();
        this.tampon.copyWithin(0, this.pas);
        this.rempli = this.taille - this.pas;
      }
    }
  }

  /** Oublie les notes tenues (ex. après avoir joué un son par le haut-parleur). */
  reinitialiser() {
    this.presentes.clear();
    this.signalees.clear();
    this.derniereEmission.clear();
    this.notesEntendues = [];
  }

  /** Commence à mesurer le bruit de fond (silence) ; `terminerMesureBruit` renvoie le résultat. */
  commencerMesureBruit() {
    this.mesureBruit = [];
  }

  /** Bruit de fond mesuré depuis `commencerMesureBruit` (RMS médian), ou 0. */
  terminerMesureBruit(): number {
    const m = this.mesureBruit ?? [];
    this.mesureBruit = null;
    if (!m.length) return 0;
    const tri = [...m].sort((a, b) => a - b);
    return tri[Math.floor(tri.length / 2)];
  }

  private analyser() {
    this.numeroAnalyse++;
    const niveauRms = rms(this.tampon);
    this.niveau = Math.min(1, niveauRms * 8);
    if (this.mesureBruit) {
      this.mesureBruit.push(niveauRms);
      return;
    }

    // Silence (sous le bruit de fond mesuré) : plus aucune note tenue
    const silence = Math.max(0.004, this.options.bruit * 1.8) / this.options.sensibilite;
    if (niveauRms < silence) {
      this.reinitialiser();
      this.rmsPrecedent = this.rmsAvantPrecedent = 0;
      return;
    }

    // Attaque : l'énergie récente augmente brusquement (nouvelle frappe)
    const recent = rms(this.tampon.subarray(this.taille - this.pas));
    const reference = Math.min(this.rmsPrecedent, this.rmsAvantPrecedent);
    let attaque = false;
    if (this.pause > 0) this.pause--;
    else if (recent > reference * 1.6 && recent > silence * 2) {
      attaque = true;
      this.pause = 2;
    }
    if (attaque) {
      // L'attaque entre peu à peu dans la fenêtre : on surveille les 4 analyses suivantes
      this.apresAttaque = 4;
      this.relancees.clear();
    } else if (this.apresAttaque > 0) this.apresAttaque--;
    this.rmsAvantPrecedent = this.rmsPrecedent;
    this.rmsPrecedent = recent;

    const trouvees = analyserFenetre(this.tampon, this.sampleRateEffectif, this.options);
    const presentes = new Map<number, { fois: number; energie: number; reference: number }>();
    const nouvelles: number[] = [];
    const plusForte = Math.max(0, ...trouvees.map((n) => n.saillance));
    for (const { midi, saillance, energie } of trouvees) {
      const avant = this.presentes.get(midi);
      const fois = (avant?.fois ?? 0) + 1;
      // Énergie de référence : la plus faible des analyses récentes (avant la nouvelle frappe)
      const reference = attaque || !avant ? (avant?.energie ?? energie) : Math.min(avant.reference, avant.energie);
      presentes.set(midi, { fois, energie, reference });
      const dejaSignalee = this.signalees.has(midi);
      // Nouvelle note : présente deux analyses de suite (quatre si elle est faible : souvent
      // un reste de l'attaque d'une autre note), et qui vient d'être frappée : attaque récente
      // ou énergie qui monte (une note qui s'éteint ne fait pas apparaître de nouvelle note).
      const confirmee =
        fois >= (saillance >= plusForte * 0.5 ? 2 : 4) &&
        (this.apresAttaque > 0 || (!!avant && energie > avant.energie * 1.2));
      // Même nom qu'une note plus forte (octave) : le jeu au micro compare le nom des notes,
      // inutile de la signaler (c'est souvent un artefact des harmoniques)
      // De même, une note de même nom signalée il y a moins de 5 analyses (~230 ms) : c'est la même frappe.
      const doublon =
        trouvees.some((n) => n.midi !== midi && n.midi % 12 === midi % 12 && n.saillance > saillance) ||
        [...this.derniereEmission].some(([m, quand]) => m !== midi && m % 12 === midi % 12 && this.numeroAnalyse - quand < 5);
      // Note rejouée : juste après une attaque, son énergie remonte nettement.
      const rejouee =
        dejaSignalee && this.apresAttaque > 0 && !this.relancees.has(midi) && !!avant && energie > reference * 1.6;
      // Une note signalée il y a moins d'une seconde qui réapparaît sans attaque sonnait encore
      const emiseRecemment = this.numeroAnalyse - (this.derniereEmission.get(midi) ?? -1000) < 22;
      const nouvelle = !dejaSignalee && confirmee && !doublon && (!emiseRecemment || this.apresAttaque > 0);
      if (nouvelle || rejouee) {
        this.derniereEmission.set(midi, this.numeroAnalyse);
        nouvelles.push(midi);
        this.relancees.add(midi); // une seule fois par frappe
      }
    }
    // Une note signalée qui a disparu depuis 3 analyses pourra l'être de nouveau
    for (const [m, absences] of [...this.signalees]) {
      if (presentes.has(m)) this.signalees.set(m, 0);
      else if (absences >= 2) this.signalees.delete(m);
      else this.signalees.set(m, absences + 1);
    }
    for (const m of nouvelles) this.signalees.set(m, 0);
    this.presentes = presentes;
    this.notesEntendues = [...presentes.keys()].sort((a, b) => a - b);
    if (nouvelles.length) this.onNotes(nouvelles.sort((a, b) => a - b));
  }
}
