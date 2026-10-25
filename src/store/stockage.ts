/**
 * Petit utilitaire de sauvegarde locale (AsyncStorage), en JSON.
 * Les erreurs sont ignorées : l'application reste utilisable même si
 * le stockage échoue.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function lire<T>(cle: string, defaut: T): Promise<T> {
  try {
    const brut = await AsyncStorage.getItem(cle);
    return brut ? { ...defaut, ...JSON.parse(brut) } : defaut;
  } catch {
    return defaut;
  }
}

export async function ecrire<T>(cle: string, valeur: T): Promise<void> {
  try {
    await AsyncStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Sans conséquence : la valeur reste en mémoire pour cette session.
  }
}
