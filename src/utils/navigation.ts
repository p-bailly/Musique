import { router } from 'expo-router';

/** Revient à l'écran précédent, ou à l'accueil s'il n'y en a pas (lien direct). */
export function revenir() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
