/**
 * Renvoie une référence qui contient toujours la dernière valeur reçue.
 * Pratique pour lire une valeur à jour dans une boucle d'animation ou un
 * rappel (callback) sans le recréer à chaque rendu.
 */
import { useLayoutEffect, useRef } from 'react';

export function useRefActuelle<T>(valeur: T) {
  const ref = useRef(valeur);
  useLayoutEffect(() => {
    ref.current = valeur;
  });
  return ref;
}
