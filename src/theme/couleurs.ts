/**
 * Palettes de couleurs des thèmes clair et sombre.
 */
export interface Palette {
  fond: string;
  surface: string;
  surfaceAlt: string;
  texte: string;
  texteDiscret: string;
  bordure: string;
  primaire: string;
  surPrimaire: string;
  succes: string;
  erreur: string;
  etoile: string;
  /** Étoiles des morceaux joués sans attente, en rythme. */
  etoileBleue: string;
  /** Clavier */
  toucheBlanche: string;
  toucheNoire: string;
  texteToucheBlanche: string;
  texteToucheNoire: string;
  surbrillance: string;
  /** Blocs qui tombent */
  ligneImpact: string;
  /** Portée */
  encre: string;
  zoneJeu: string;
}

export const clair: Palette = {
  fond: '#FFFDF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE2',
  texte: '#1D1B16',
  texteDiscret: '#5E584C',
  bordure: '#E8E2D4',
  primaire: '#1D1B16',
  surPrimaire: '#FFFFFF',
  succes: '#2E8A4A',
  erreur: '#C8323A',
  etoile: '#F2B21B',
  etoileBleue: '#2F7DE1',
  toucheBlanche: '#FFFFFF',
  toucheNoire: '#1D1B16',
  texteToucheBlanche: '#3B372E',
  texteToucheNoire: '#EDE8DC',
  surbrillance: '#1D1B16',
  ligneImpact: '#1D1B16',
  encre: '#1D1B16',
  zoneJeu: '#F6F1E6',
};

export const sombre: Palette = {
  fond: '#15130F',
  surface: '#201D17',
  surfaceAlt: '#2B2720',
  texte: '#F6F1E6',
  texteDiscret: '#B3AB9A',
  bordure: '#3A352C',
  primaire: '#F6F1E6',
  surPrimaire: '#15130F',
  succes: '#4CB36C',
  erreur: '#E5585E',
  etoile: '#F5BE33',
  etoileBleue: '#5AA2F5',
  toucheBlanche: '#F6F1E6',
  toucheNoire: '#0E0C09',
  texteToucheBlanche: '#3B372E',
  texteToucheNoire: '#D9D2C2',
  surbrillance: '#F6F1E6',
  ligneImpact: '#F6F1E6',
  encre: '#F6F1E6',
  zoneJeu: '#1B1814',
};

/**
 * Chaque note a sa couleur (Do rouge, Ré orange, Mi jaune, Fa vert, Sol bleu,
 * La violet, Si rose), la même partout : portée, blocs qui tombent, clavier,
 * pastilles des leçons. Les dièses prennent la couleur de la note de base.
 */
const COULEURS_NOTES: { fond: string; texte: string }[] = [
  { fond: '#C8323A', texte: '#FFFFFF' }, // Do
  { fond: '#F08C2E', texte: '#1D1B16' }, // Ré
  { fond: '#F2C230', texte: '#1D1B16' }, // Mi
  { fond: '#2E8A4A', texte: '#FFFFFF' }, // Fa
  { fond: '#2468C8', texte: '#FFFFFF' }, // Sol
  { fond: '#5B44B8', texte: '#FFFFFF' }, // La
  { fond: '#B8337F', texte: '#FFFFFF' }, // Si
];

const DEGRE_PAR_DEMITON = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

/** Couleur d'une note MIDI (fond) et couleur lisible du texte posé dessus (La# = couleur du La). */
export function couleurNote(midi: number): { fond: string; texte: string } {
  return COULEURS_NOTES[DEGRE_PAR_DEMITON[((midi % 12) + 12) % 12]];
}

/** Couleur d'une note écrite, d'après son degré (Sib = couleur du Si). */
export function couleurDegre(degre: number): { fond: string; texte: string } {
  return COULEURS_NOTES[((degre % 7) + 7) % 7];
}

/** Les 7 couleurs dans l'ordre Do → Si (bandeau décoratif). */
export const ARC_EN_CIEL = COULEURS_NOTES.map((n) => n.fond);
