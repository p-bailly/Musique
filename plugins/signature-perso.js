/**
 * Plugin de configuration Expo : signe l'APK de release avec la clé personnelle
 * (jamais versionnée), et ne compile que pour les processeurs des téléphones
 * (APK plus léger).
 *
 * La clé est fournie par deux variables d'environnement, remplies sur GitHub
 * Actions à partir des secrets du dépôt (voir .github/workflows/apk.yml) :
 *   SOLFEGE_KEYSTORE_FILE      chemin du keystore PKCS12 (alias « solfege »)
 *   SOLFEGE_KEYSTORE_PASSWORD  son mot de passe
 * Sans ces variables, la release est signée avec la clé de debug (usage local).
 *
 * Toujours la même clé : Android n'accepte une mise à jour que si elle est signée
 * avec la même clé que la version installée (indispensable pour « Mes applis »).
 */
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const BLOC_SIGNATURE = `
        perso {
            // Clé personnelle lue dans l'environnement (voir plugins/signature-perso.js)
            if (System.getenv('SOLFEGE_KEYSTORE_FILE')) {
                storeFile file(System.getenv('SOLFEGE_KEYSTORE_FILE'))
                storePassword System.getenv('SOLFEGE_KEYSTORE_PASSWORD')
                keyAlias 'solfege'
                keyPassword System.getenv('SOLFEGE_KEYSTORE_PASSWORD')
            }
        }`;

function avecSignature(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes('SOLFEGE_KEYSTORE_FILE')) {
      // Ajoute la configuration « perso » à côté de « debug »
      g = g.replace(/signingConfigs\s*\{/, (m) => `${m}${BLOC_SIGNATURE}`);
      // La release utilise la clé perso au lieu de la clé de debug
      g = g.replace(
        /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig System.getenv('SOLFEGE_KEYSTORE_FILE') ? signingConfigs.perso : signingConfigs.debug",
      );
    }
    cfg.modResults.contents = g;
    return cfg;
  });
}

function avecArchitectures(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === 'reactNativeArchitectures'));
    props.push({ type: 'property', key: 'reactNativeArchitectures', value: 'armeabi-v7a,arm64-v8a' });
    cfg.modResults = props;
    return cfg;
  });
}

module.exports = (config) => avecArchitectures(avecSignature(config));
