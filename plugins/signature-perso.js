/**
 * Plugin de configuration Expo : signe l'APK de release avec la clé personnelle
 * versionnée dans `keystore/solfege-piano.jks`, et ne compile que pour les
 * processeurs des téléphones (APK plus léger).
 *
 * Toujours la même clé : Android n'accepte une mise à jour que si elle est signée
 * avec la même clé que la version installée (indispensable pour « Mes applis »).
 * Clé d'usage personnel uniquement.
 */
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const BLOC_SIGNATURE = `
        perso {
            // Clé personnelle versionnée (voir plugins/signature-perso.js)
            storeFile file('../../keystore/solfege-piano.jks')
            storePassword 'solfege-perso'
            keyAlias 'solfege'
            keyPassword 'solfege-perso'
        }`;

function avecSignature(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes("keystore/solfege-piano.jks")) {
      // Ajoute la configuration « perso » à côté de « debug »
      g = g.replace(/signingConfigs\s*\{/, (m) => `${m}${BLOC_SIGNATURE}`);
      // La release utilise la clé perso au lieu de la clé de debug
      g = g.replace(/(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.perso');
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
