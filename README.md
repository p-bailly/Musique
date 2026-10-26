# Solfège Piano

Application mobile (iOS et Android) pour **apprendre le solfège et le piano** quand on est grand débutant :
lire les notes sur la portée et les jouer sur son vrai piano. Le téléphone, posé sur le pupitre, écoute au
micro et vérifie chaque note (on peut aussi jouer sur un clavier MIDI ou sur le clavier de l'écran).
30 leçons en 6 niveaux, cartes flash, dictée musicale, piano libre.

React Native + Expo (SDK 58) · TypeScript · 100 % hors-ligne, sans compte ni serveur.

## Lancer avec Expo Go

Pré-requis : Node.js 20 ou plus récent, et l'application **Expo Go** à jour (SDK 58) sur le téléphone.

```bash
git clone https://github.com/p-bailly/Musique.git
cd Musique
npm install
npx expo start      # puis scanner le QR code avec Expo Go (Android) ou l'appareil photo (iPhone)
```

Téléphone et ordinateur sur le même Wi-Fi, sinon `npx expo start --tunnel`. Le clavier MIDI n'est pas
disponible dans Expo Go.

## Installer l'APK Android

Compilé par GitHub Actions à chaque envoi sur la branche par défaut, à ouvrir depuis le téléphone :
<https://github.com/p-bailly/Musique/releases/latest/download/SolfegePiano.apk>

Chaque version s'installe par-dessus la précédente sans perdre la progression. Autres méthodes (EAS, iPhone) :
voir [CLAUDE.md](CLAUDE.md).

## Développement

`npm run typecheck` · `npm run lint` · `npm test` · `npm run sons` (régénère les sons, ffmpeg requis) ·
`npm run icones` (régénère les icônes). Architecture, micro, MIDI, release : voir [CLAUDE.md](CLAUDE.md).

Les leçons sont des fichiers JSON dans `src/data/niveaux/` (format complet dans [CLAUDE.md](CLAUDE.md)) :

```json
{ "id": "n4-l6", "titre": "Ma mélodie", "description": "Texte avant de commencer.",
  "cle": "sol", "tempo": 90, "main": "droite",
  "notes": [ { "note": "Fa4", "duree": 1, "doigt": 1 }, { "note": "Do5", "duree": 2 } ] }
```

## Crédits

Sons de piano : *Salamander Grand Piano V3* d'Alexander Holm, licence
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Mélodies du domaine public.
