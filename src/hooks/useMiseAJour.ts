/**
 * Mise à jour depuis l'application (APK Android) : la CI publie chaque version dans une
 * release GitHub « apk-<n° de build> », et ce numéro est aussi le versionCode de l'APK
 * (voir app.config.js). Si la dernière release porte un numéro plus grand que la version
 * installée, on télécharge SolfegePiano.apk puis on ouvre l'installateur d'Android
 * (permission REQUEST_INSTALL_PACKAGES ; Android demande une fois d'autoriser l'appli).
 * La progression est gardée : l'APK s'installe par-dessus, signé avec la même clé.
 */
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { startActivityAsync } from 'expo-intent-launcher';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

const DEPOT = 'p-bailly/Musique';
const LIEN_APK = `https://github.com/${DEPOT}/releases/latest/download/SolfegePiano.apk`;
/** Autorise l'installateur à lire le fichier partagé (Intent.FLAG_GRANT_READ_URI_PERMISSION). */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export type EtatMiseAJour =
  | { etape: 'inconnu' }
  | { etape: 'verification' }
  | { etape: 'aJour' }
  | { etape: 'disponible'; version: number }
  | { etape: 'telechargement'; progres: number }
  | { etape: 'erreur'; message: string };

/** Numéro de build de l'APK installé (1 en local, 0 hors Android). */
export const VERSION_INSTALLEE: number =
  Platform.OS === 'android' ? Number(Constants.expoConfig?.android?.versionCode) || 0 : 0;

/** La mise à jour intégrée n'a de sens que dans l'APK compilé par la CI. */
export const MISE_A_JOUR_POSSIBLE = Platform.OS === 'android' && VERSION_INSTALLEE > 1 && !__DEV__;

/** Numéro de la dernière release publiée (une seule vérification par lancement). */
let verification: Promise<number> | null = null;
function derniereVersion(): Promise<number> {
  verification ??= fetch(`https://api.github.com/repos/${DEPOT}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`GitHub : ${r.status}`);
      return r.json();
    })
    .then((json: { tag_name?: string }) => {
      const n = Number(/^apk-(\d+)$/.exec(json.tag_name ?? '')?.[1]);
      if (!n) throw new Error('Release inattendue');
      return n;
    })
    .catch((e) => {
      verification = null; // on pourra réessayer
      throw e;
    });
  return verification;
}

export function useMiseAJour() {
  const [etat, setEtat] = useState<EtatMiseAJour>({ etape: MISE_A_JOUR_POSSIBLE ? 'verification' : 'inconnu' });

  const comparer = useCallback(
    () =>
      derniereVersion().then(
        (version) => setEtat(version > VERSION_INSTALLEE ? { etape: 'disponible', version } : { etape: 'aJour' }),
        () => setEtat({ etape: 'erreur', message: 'Pas de connexion à GitHub.' }),
      ),
    [],
  );

  const verifier = useCallback(() => {
    if (!MISE_A_JOUR_POSSIBLE) return;
    setEtat({ etape: 'verification' });
    verification = null; // nouvelle demande à GitHub
    comparer();
  }, [comparer]);

  // Vérification au premier affichage
  useEffect(() => {
    if (MISE_A_JOUR_POSSIBLE) comparer();
  }, [comparer]);

  const installer = useCallback(async () => {
    setEtat({ etape: 'telechargement', progres: 0 });
    try {
      const apk = new File(Paths.cache, 'SolfegePiano.apk');
      await File.downloadFileAsync(LIEN_APK, apk, {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) =>
          setEtat({ etape: 'telechargement', progres: totalBytes > 0 ? bytesWritten / totalBytes : 0 }),
      });
      await startActivityAsync('android.intent.action.VIEW', {
        data: apk.contentUri,
        type: 'application/vnd.android.package-archive',
        flags: FLAG_GRANT_READ_URI_PERMISSION,
      });
      // Retour dans l'appli sans avoir installé : on propose à nouveau
      verifier();
    } catch {
      // En dernier recours, le navigateur télécharge l'APK
      setEtat({ etape: 'erreur', message: 'Installation impossible ici : ouverture du navigateur.' });
      Linking.openURL(LIEN_APK).catch(() => {});
    }
  }, [verifier]);

  return { etat, verifier, installer };
}
