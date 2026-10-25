/**
 * Calcul de la position de chaque touche du clavier.
 * Partagé entre le clavier et les blocs qui tombent, pour qu'un bloc
 * tombe exactement au-dessus de sa touche.
 */
import { estToucheNoire } from '@/music/notes';

export interface Touche {
  midi: number;
  x: number;
  largeur: number;
  noire: boolean;
}

export function geometrieClavier(min: number, max: number, largeurTotale: number): Map<number, Touche> {
  const touches = new Map<number, Touche>();
  let nbBlanches = 0;
  for (let m = min; m <= max; m++) if (!estToucheNoire(m)) nbBlanches++;
  const lb = largeurTotale / Math.max(1, nbBlanches);
  const ln = lb * 0.62;

  let i = 0; // index de la touche blanche courante
  for (let m = min; m <= max; m++) {
    if (estToucheNoire(m)) {
      // Une touche noire est centrée sur la séparation entre deux blanches
      touches.set(m, { midi: m, x: i * lb - ln / 2, largeur: ln, noire: true });
    } else {
      touches.set(m, { midi: m, x: i * lb, largeur: lb, noire: false });
      i++;
    }
  }
  return touches;
}
