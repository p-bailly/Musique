/**
 * Place de l'onglet « Piano » : la barre d'onglets intercepte le toucher et ouvre
 * `/piano` (pile racine, paysage). Cet écran ne sert qu'en cas de lien direct
 * vers `/piano-libre`, qui renvoie au piano.
 */
import { Redirect } from 'expo-router';
import React from 'react';

export default function OngletPiano() {
  return <Redirect href="/piano" />;
}
