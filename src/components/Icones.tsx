/**
 * Icônes dessinées en SVG (pas d'emojis) : elles prennent la couleur du thème
 * et ont le même rendu sur tous les téléphones.
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type NomIcone = 'retour' | 'lecture' | 'pause' | 'cadenas' | 'etoile' | 'reglages';

export function Icone({ nom, taille = 22, couleur }: { nom: NomIcone; taille?: number; couleur: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      {nom === 'retour' && (
        <Path d="M15 5l-7 7 7 7" stroke={couleur} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
      {nom === 'etoile' && (
        <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={couleur} />
      )}
    </Svg>
  );
}
