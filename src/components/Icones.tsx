/**
 * Icônes dessinées en SVG (pas d'emojis) : elles prennent la couleur du thème
 * et ont le même rendu sur tous les téléphones.
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type NomIcone =
  | 'retour'
  | 'lecture'
  | 'pause'
  | 'cadenas'
  | 'etoile'
  | 'reglages'
  | 'chevron'
  | 'lecons'
  | 'exercices'
  | 'piano'
  | 'progression';

export function Icone({ nom, taille = 22, couleur }: { nom: NomIcone; taille?: number; couleur: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      {nom === 'retour' && (
        <Path d="M15 5l-7 7 7 7" stroke={couleur} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {nom === 'chevron' && (
        <Path d="M6 9l6 6 6-6" stroke={couleur} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {nom === 'lecture' && <Path d="M7 4.5v15l12.5-7.5z" fill={couleur} strokeLinejoin="round" />}
      {nom === 'pause' && (
        <>
          <Rect x={6} y={5} width={4} height={14} rx={1} fill={couleur} />
          <Rect x={14} y={5} width={4} height={14} rx={1} fill={couleur} />
        </>
      )}
      {nom === 'cadenas' && (
        <>
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={couleur} strokeWidth={2.4} fill="none" />
          <Rect x={5} y={10.5} width={14} height={10} rx={2} fill={couleur} />
        </>
      )}
      {nom === 'reglages' && (
        <>
          <Path d="M4 7h16M4 17h16" stroke={couleur} strokeWidth={2.2} strokeLinecap="round" />
          <Circle cx={9} cy={7} r={2.6} fill={couleur} />
          <Circle cx={15} cy={17} r={2.6} fill={couleur} />
        </>
      )}
      {nom === 'lecons' && (
        // Livre ouvert
        <Path
          d="M12 6.5C9.8 5 6.9 4.5 3.5 5v13.5c3.4-.5 6.3 0 8.5 1.5 2.2-1.5 5.1-2 8.5-1.5V5c-3.4-.5-6.3 0-8.5 1.5zM12 6.5V20"
          stroke={couleur}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {nom === 'exercices' && (
        // Deux croches liées
        <>
          <Path d="M9 18V6l10-2.5V16" stroke={couleur} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx={6.5} cy={18} r={2.8} fill={couleur} />
          <Circle cx={16.5} cy={16} r={2.8} fill={couleur} />
        </>
      )}
      {nom === 'piano' && (
        // Clavier : quatre touches blanches, deux noires
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2.5} stroke={couleur} strokeWidth={2.2} fill="none" />
          <Path d="M12 13v6M16.5 5v14" stroke={couleur} strokeWidth={1.8} strokeLinecap="round" />
          <Rect x={6.2} y={5} width={2.6} height={8} rx={0.8} fill={couleur} />
          <Rect x={10.7} y={5} width={2.6} height={8} rx={0.8} fill={couleur} />
          <Path d="M7.5 13v6" stroke={couleur} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {nom === 'progression' && (
        // Histogramme
        <Path d="M4 20h16M7 16.5v-4M12 16.5V6M17 16.5V10" stroke={couleur} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      )}
      {nom === 'etoile' && (
        <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={couleur} />
      )}
    </Svg>
  );
}
