/**
 * Configuration dynamique : reprend app.json et fixe le numéro de version
 * Android. Sur GitHub Actions, c'est le numéro du build : il augmente à chaque
 * publication, ce qui permet d'installer l'APK par-dessus le précédent.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.GITHUB_RUN_NUMBER) || 1,
  },
  plugins: [...(config.plugins ?? []), './plugins/signature-perso.js'],
});
