/**
 * Remplace le Text de React Native pour écrire partout en Nunito : la graisse
 * demandée (fontWeight) choisit le fichier de police correspondant, chargé
 * au démarrage dans _layout.tsx.
 */
import React from 'react';
import { Text as TextRN, StyleSheet, TextProps } from 'react-native';

const POLICES: Record<string, string> = {
  '400': 'Nunito_600SemiBold',
  '500': 'Nunito_600SemiBold',
  '600': 'Nunito_700Bold',
  '700': 'Nunito_800ExtraBold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_900Black',
};

/** Nom de la police Nunito pour une graisse (« normal », « bold », « 700 »…). */
export function policePour(graisse?: string | number): string {
  const g = graisse === 'bold' ? '700' : graisse === undefined || graisse === 'normal' ? '400' : String(graisse);
  return POLICES[g] ?? POLICES['400'];
}

export function Text({ style, ...props }: TextProps) {
  const plat = StyleSheet.flatten(style) ?? {};
  // La graisse est portée par le fichier de police : on la retire pour éviter un faux gras
  return <TextRN {...props} style={[plat, { fontFamily: policePour(plat.fontWeight), fontWeight: 'normal' }]} />;
}
