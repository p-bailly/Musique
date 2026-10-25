# 🎹 Solfège Piano

Application mobile (iOS et Android) pour **apprendre le solfège et le piano** quand on est grand débutant :
lire les notes (Do, Ré, Mi, Fa, Sol, La, Si) sur la portée et **les jouer soi-même sur son vrai piano** :
le téléphone, posé sur le pupitre, écoute au micro et vérifie chaque note. (On peut aussi jouer sur le clavier
de l'écran, au choix dans les réglages.)

React Native + Expo (SDK 58) · TypeScript · 100 % hors-ligne · sans compte ni serveur.

## Fonctionnalités (MVP)

- **Jeu sur votre vrai piano (mode par défaut)** : le micro s'allume tout seul au début de chaque leçon ; le clavier
  affiché sert de guide (où poser les doigts) et ne réagit pas au toucher.
- **Clavier virtuel** de 2 octaves (+ le Do final), avec le nom français de chaque touche et un repère sur le do
  central ; il devient jouable au toucher en mode « sur l'écran ».
- **Notes qui tombent** : les blocs descendent vers leur touche ; la touche à jouer est en surbrillance jaune.
- **Mode attente** : le morceau s'arrête tant que la bonne touche n'est pas jouée. La touche s'allume en vert si c'est
  juste, en rouge si c'est faux, avec un message (« Oups ! C'était Ré, pas Mi »).
- **Détection des notes** : au toucher sur le clavier à l'écran, ou **au micro** (détection de hauteur YIN) pour
  jouer sur un vrai piano.
- **Portée** en clé de sol ou en clé de fa, avec la note à jouer en couleur et les suivantes. Figures de notes
  selon la durée (ronde, blanche, noire, croche, notes pointées).
- **Parcours de 21 leçons** sur 4 niveaux :
  1. Do-Ré-Mi-Fa-Sol à la main droite
  2. Toute l'octave, puis la clé de fa (main gauche)
  3. Le rythme : ronde, blanche, noire, croche (mode attente désactivé par défaut)
  4. Mélodies du domaine public : *Au clair de la lune*, *Frère Jacques*, *Ah ! vous dirai-je, maman*,
     *Ode à la joie*, *Hänschen klein*
- **Progression** : 1 à 3 étoiles par leçon (selon la précision), leçons débloquées au fur et à mesure,
  série de jours consécutifs 🔥, statistiques et graphique des 7 derniers jours.
- **Réglages** : je joue sur mon piano / sur l'écran, vitesse (×0,5 à ×1,5), mode attente, noms des notes, son du clavier, thème clair/sombre/automatique,
  accès à toutes les leçons, remise à zéro.
- **Piano libre** : on joue ce qu'on veut, l'appli affiche le nom de la note et sa place sur la portée.
- Écrans de jeu en **paysage**, grands boutons, thème clair et sombre.

## Lancer l'application sur votre téléphone avec Expo Go

Pré-requis : [Node.js](https://nodejs.org) 20 ou plus récent sur votre ordinateur, et l'application **Expo Go**
sur le téléphone ([App Store](https://apps.apple.com/app/expo-go/id982107779) /
[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)), à jour (SDK 58).

```bash
git clone https://github.com/p-bailly/Musique.git
cd Musique
npm install
npx expo start
```

Un QR code s'affiche dans le terminal :

- **Android** : ouvrez Expo Go → « Scan QR code ».
- **iPhone** : scannez le QR code avec l'appareil photo, puis touchez la notification « Ouvrir dans Expo Go ».

Le téléphone et l'ordinateur doivent être sur le **même réseau Wi-Fi**. Si ça ne se connecte pas (Wi-Fi
d'entreprise, partage de connexion…) : `npx expo start --tunnel`.

À la première utilisation du micro, acceptez l'autorisation demandée.

## Installer l'application pour qu'elle apparaisse dans vos applications

Expo Go sert à **tester** : l'appli tourne à l'intérieur d'Expo Go et n'a pas sa propre icône. Pour obtenir une
vraie application « Solfège Piano » sur l'écran d'accueil, il faut la compiler avec **EAS Build** (service
d'Expo, gratuit pour un usage personnel) :

```bash
npx eas-cli@latest login          # créer un compte gratuit sur expo.dev si besoin
npx eas-cli@latest build:configure   # à faire une seule fois (lie le projet à votre compte)
```

**Android (gratuit)**

```bash
npx eas-cli@latest build -p android --profile preview
```

À la fin (environ 10 à 15 minutes), EAS affiche un lien et un QR code : ouvrez-le sur le téléphone, téléchargez
l'APK et installez-le (Android vous demandera d'autoriser l'installation depuis le navigateur).
L'icône « Solfège Piano » apparaît alors dans vos applications.

**iPhone** — Apple n'autorise l'installation d'applications hors App Store qu'avec un **compte Apple Developer**
(99 €/an) :

```bash
npx eas-cli@latest device:create                     # enregistre votre iPhone
npx eas-cli@latest build -p ios --profile preview    # installation directe via un lien
# ou, pour passer par TestFlight :
npx eas-cli@latest build -p ios --profile production && npx eas-cli@latest submit -p ios
```

Sans compte payant, avec un Mac et Xcode, `npx expo run:ios --device` installe l'appli sur votre iPhone avec un
identifiant Apple gratuit (elle doit alors être réinstallée tous les 7 jours).

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npx expo start` | Lance le serveur de développement (QR code pour Expo Go) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | Analyse du code (ESLint) |
| `npm run sons` | Régénère les sons de piano (`assets/sounds/`) |
| `npm run icones` | Régénère les icônes (Python + Pillow) |

## Structure du projet

```
src/
  app/                    Écrans (Expo Router : un fichier = un écran)
    _layout.tsx           Navigation + fournisseurs (réglages, progression)
    index.tsx             Accueil : niveaux et leçons
    lecon/[id].tsx        Écran de jeu (notes qui tombent, portée, clavier)
    piano.tsx             Piano libre
    stats.tsx             Progression et statistiques
    reglages.tsx          Réglages
  components/             Clavier, NotesQuiTombent, Portee (SVG), BoutonMicro, ui…
  hooks/
    useMoteurJeu.ts       Moteur du jeu (temps, mode attente, réussites/erreurs)
    useMicro.ts           Micro → détection des notes
  music/
    notes.ts              Noms français, MIDI, position sur la portée
    pitch.ts              Détection de hauteur (algorithme YIN)
  audio/                  Lecture des sons de piano
  data/
    lecons.ts             Chargement et préparation des leçons
    niveaux/niveauN.json  Les leçons (une par objet JSON)
  store/                  Réglages et progression (sauvegarde locale AsyncStorage)
  theme/couleurs.ts       Thèmes clair et sombre
assets/sounds/            Sons de piano synthétisés (WAV, générés par scripts/generate-sounds.js)
scripts/                  Générateurs des sons et des icônes
```

## Ajouter une leçon

Ouvrez `src/data/niveaux/niveauN.json` et ajoutez un objet dans `lecons` :

```json
{
  "id": "n4-l6",
  "titre": "Ma nouvelle mélodie",
  "description": "Texte affiché avant de commencer.",
  "cle": "sol",
  "tempo": 90,
  "main": "droite",
  "notes": [
    { "note": "Do4", "duree": 1 },
    { "note": "Ré4", "duree": 0.5 },
    { "note": "silence", "duree": 0.5 },
    { "note": "Mi4", "duree": 2, "main": "gauche" }
  ]
}
```

- `note` : nom français + octave (`Do4` = **do central**, `Ré#4`, `Sib3`…) ou `"silence"`.
  Attention : on suit la notation internationale ; en France on appelle souvent le do central « Do3 ».
- `duree` en temps : `4` ronde, `3` blanche pointée, `2` blanche, `1.5` noire pointée, `1` noire, `0.5` croche.
- `cle` : `"sol"` ou `"fa"` · `main` : `"droite"` ou `"gauche"` (modifiable note par note).
- `attente` (facultatif) : `false` pour désactiver le mode attente par défaut (utile pour le rythme).
- Le clavier affiché (2 octaves) est calculé automatiquement à partir des notes.
- Les `id` doivent être uniques ; l'ordre dans le fichier est l'ordre du parcours.

Pour un nouveau niveau : créez `niveau5.json` sur le même modèle et ajoutez-le à `SOURCES` dans
`src/data/lecons.ts`.

## Bon à savoir

- **Micro** : une note à la fois (pas d'accords), dans une pièce calme, téléphone posé près du piano. L'octave
  n'est pas vérifiée au micro (seul le nom de la note compte), car la détection peut confondre deux octaves.
  Quand vous touchez le clavier à l'écran, le micro est ignoré une demi-seconde pour ne pas « entendre » le
  son de l'appli.
- Les sons de piano sont **synthétisés** par `scripts/generate-sounds.js` : aucun fichier sous droits.
- Toutes les mélodies sont des airs traditionnels ou classiques du **domaine public**.
- `npx expo start --web` ouvre une version navigateur, pratique pour développer (le micro et le rendu peuvent y
  différer du téléphone).

## Améliorations possibles

1. **Clavier MIDI** (USB/Bluetooth) pour une détection parfaite et les accords (nécessite un build EAS, pas Expo Go).
2. **Détection polyphonique** au micro (accords, deux mains en même temps) et calibration de la sensibilité.
3. **Vrais échantillons de piano** (ex. Salamander Grand Piano, licence libre) et **métronome** audible avec décompte.
4. **Exercices de lecture** sans clavier : cartes flash « quelle est cette note ? », chronométrées, et dictée
   musicale (reconnaître une note à l'oreille).
5. **Solfège plus complet** : dièses et bémols, armures, mesures et barres de mesure, silences dessinés,
   liaisons, nuances, doigtés affichés au-dessus des notes.
6. **Deux mains** : grande portée (clé de sol + clé de fa) et leçons main gauche + main droite simultanées.
7. **Paroles** sous les notes pour les chansons, et écoute du morceau avant de le jouer (« démo »).
8. **Plus de contenu** : import de fichiers MIDI/MusicXML du domaine public, éditeur de leçons dans l'appli.
9. **Motivation** : objectif quotidien, rappels par notification locale, badges, courbe de progression par note
   (repérer les notes les plus souvent ratées et les faire réviser).
10. **Confort** : animations sur le fil natif (Reanimated), retour haptique, mode portrait pour tablette,
    couleurs adaptées au daltonisme, taille de texte réglable.
11. **Plusieurs profils** (famille) et export/sauvegarde de la progression.
12. **Tests automatisés** (Jest) du moteur de jeu et de la détection de hauteur.
