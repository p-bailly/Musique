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
  /** Clavier */
  toucheBlanche: string;
  toucheNoire: string;
  texteToucheBlanche: string;
  texteToucheNoire: string;
  surbrillance: string;
  /** Blocs qui tombent */
  blocDroite: string;
  blocGauche: string;
  ligneImpact: string;
  /** Portée */
  encre: string;
  zoneJeu: string;
}

export const clair: Palette = {
  fond: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#E9EDF7',
  texte: '#1B2133',
  texteDiscret: '#5D6680',
  bordure: '#D5DBEA',
  primaire: '#4C5FD5',
  surPrimaire: '#FFFFFF',
  succes: '#2EAD5B',
  erreur: '#E0464E',
  etoile: '#F5B400',
  toucheBlanche: '#FFFFFF',
  toucheNoire: '#23262F',
  texteToucheBlanche: '#3A4158',
  texteToucheNoire: '#E6E8F0',
  surbrillance: '#FFD54A',
  blocDroite: '#5B8DEF',
  blocGauche: '#B36BDB',
  ligneImpact: '#4C5FD5',
  encre: '#1B2133',
  zoneJeu: '#E9EDF7',
};

export const sombre: Palette = {
  fond: '#10131C',
  surface: '#1A1F2D',
  surfaceAlt: '#242A3B',
  texte: '#ECEFF7',
  texteDiscret: '#9AA3BC',
  bordure: '#323a50',
  primaire: '#7B8CFF',
  surPrimaire: '#10131C',
  succes: '#47C977',
  erreur: '#FF6B72',
  etoile: '#FFC93C',
  toucheBlanche: '#F2F3F7',
  toucheNoire: '#0B0D12',
  texteToucheBlanche: '#3A4158',
  texteToucheNoire: '#C9CDDA',
  surbrillance: '#FFC93C',
  blocDroite: '#5B8DEF',
  blocGauche: '#C080E8',
  ligneImpact: '#7B8CFF',
  encre: '#ECEFF7',
  zoneJeu: '#151927',
};
