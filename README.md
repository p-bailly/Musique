# Solfège Piano

Application mobile (iOS et Android) pour **apprendre le solfège et le piano** quand on est grand débutant :
lire les notes (Do, Ré, Mi, Fa, Sol, La, Si) sur la portée et **les jouer soi-même sur son vrai piano** :
le téléphone, posé sur le pupitre, écoute au micro et vérifie chaque note. (On peut aussi jouer sur le clavier
de l'écran, au choix dans les réglages.)

React Native + Expo (SDK 58) · TypeScript · 100 % hors-ligne · sans compte ni serveur.

## Fonctionnalités

- **Trois façons de jouer** : sur ton **vrai piano** écouté au micro (par défaut), sur un **clavier MIDI** USB ou
  Bluetooth (détection parfaite, accords compris), ou sur le **clavier de l'écran**.
- **Une couleur par note** (Do rouge, Ré orange, Mi jaune, Fa vert, Sol bleu, La violet, Si rose), la même partout :
  portée, blocs qui tombent, touches, pastilles des leçons.
- **Notes qui tombent** vers leur touche ; la touche à jouer s'allume à la couleur de sa note (toutes les touches
  d'un accord). **Mode attente** : le morceau s'arrête tant que les bonnes notes ne sont pas jouées.
- **Partition complète** : clé de sol, clé de fa ou **grande portée** (deux mains), armure, chiffrage, barres de
  mesure, dièses, bémols et bécarres, silences dessinés, liaisons, nuances, doigtés au-dessus (main droite) ou
  au-dessous (main gauche) des notes, accords.
- **Micro polyphonique** : reconnaît plusieurs notes à la fois (accords, deux mains), avec un écran de
  **calibration** (bruit de fond, sensibilité, essai en direct).
- **Sons de piano** tirés du *Salamander Grand Piano* (licence libre), **métronome** et **décompte** d'une mesure.
- **Parcours de 30 leçons** sur 6 niveaux :
  1. Do-Ré-Mi-Fa-Sol à la main droite (avec les doigtés)
  2. Toute l'octave, puis la clé de fa (main gauche)
  3. Le rythme : ronde, blanche, noire, croche
  4. Mélodies du domaine public : *Au clair de la lune*, *Frère Jacques*, *Ah ! vous dirai-je, maman*,
     *Ode à la joie*, *Hänschen klein*
  5. Dièses, bémols et armures : Fa#, Sib, gammes de Sol et de Fa majeur, une valse avec silences, liaisons et nuances
  6. Les deux mains : grande portée, accords à la main gauche, *Au clair de la lune* et *Ode à la joie* à deux mains
- **Exercices sans clavier** : **cartes flash** chronométrées (« quelle est cette note ? », clé de sol, de fa ou les
  deux) et **dictée musicale** (reconnaître une note à l'oreille), avec records.
- **Progression** : 1 à 3 étoiles par leçon, leçons débloquées au fur et à mesure, série de jours consécutifs,
  statistiques et graphique des 7 derniers jours.
- **Piano libre** : on joue ce qu'on veut, l'appli affiche le nom de la note et sa place sur la portée.
- Écrans de jeu en **paysage**, thème clair et sombre.

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

## Installer l'APK sur Android (et le suivre dans « Mes applis »)

À chaque envoi sur la branche par défaut, GitHub Actions (`.github/workflows/apk.yml`) compile l'APK et le publie
dans la dernière release du dépôt. Lien direct, à ouvrir depuis le téléphone :
<https://github.com/p-bailly/Musique/releases/latest/download/SolfegePiano.apk>

- L'APK est toujours signé avec la même clé personnelle, `keystore/solfege-piano.keystore`, versionnée exprès
  comme pour NBA, Scan, Météo et Mes applis (aucun secret à configurer). Usage perso uniquement.
- Le numéro de version augmente à chaque build : chaque nouvelle version s'installe par-dessus la précédente,
  sans perdre la progression.
- L'appli est suivie par « Mes applis » (dépôt Managing-Apps, `TrackedApps.kt`).

## Autres méthodes d'installation (EAS, iPhone)

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
| `npm test` | Tests : compilateur de leçons, détection polyphonique (sur les sons de piano), exercices |
| `npm run sons` | Régénère les sons de piano et du métronome (`assets/sounds/`, nécessite ffmpeg) |
| `npm run icones` | Régénère les icônes (Python + Pillow) |

## Structure du projet

```
src/
  app/                    Écrans (Expo Router : un fichier = un écran)
    _layout.tsx           Navigation, police, fournisseurs (réglages, progression, MIDI)
    index.tsx             Accueil : niveaux et leçons
    lecon/[id].tsx        Écran de jeu (notes qui tombent, portée, clavier)
    piano.tsx             Piano libre
    exercices/            Cartes flash et dictée musicale
    calibration.tsx       Calibration du micro
    stats.tsx             Progression et statistiques
    reglages.tsx          Réglages (dont le clavier MIDI)
  components/             Clavier, NotesQuiTombent, Portee (partition SVG), BoutonMicro, ui…
  hooks/
    useMoteurJeu.ts       Moteur du jeu (temps, accords, mode attente, métronome)
    useMicro.ts           Micro → détection des notes
  music/
    notes.ts              Noms français, notes écrites (dièses, bémols), armures, portée
    polyphonie.ts         Détection polyphonique (FFT + saillance harmonique)
    exercices.ts          Tirage des cartes flash et de la dictée
  audio/                  Sons de piano et du métronome
  data/
    lecons.ts             Compilation des leçons (accords, liaisons, deux mains)
    niveaux/niveauN.json  Les leçons
  store/                  Réglages, progression, clavier MIDI
  theme/couleurs.ts       Thèmes clair et sombre, couleurs des notes
modules/clavier-midi/     Module natif Android (Kotlin) : claviers MIDI USB et Bluetooth
assets/sounds/            Sons de piano (Salamander) et clics du métronome
scripts/                  Générateurs des sons et des icônes, tests (scripts/tests)
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
  "armure": -1,
  "mesure": "3/4",
  "notes": [
    { "note": "Fa4", "duree": 1, "doigt": 1, "nuance": "p" },
    { "note": "Sib4", "duree": 0.5, "doigt": 4 },
    { "note": "silence", "duree": 0.5 },
    { "note": "Do5", "duree": 2, "lie": true },
    { "note": "Do5", "duree": 1 },
    { "note": "Fa4+La4+Do5", "duree": 3, "doigt": [1, 3, 5], "nuance": "f" }
  ]
}
```

- `note` : nom français + octave (`Do4` = **do central**, `Fa#4`, `Sib3`…), un accord (`Do4+Mi4+Sol4`) ou
  `"silence"`. Attention : on suit la notation internationale ; en France on appelle souvent le do central « Do3 ».
- `duree` en temps : `4` ronde, `3` blanche pointée, `2` blanche, `1.5` noire pointée, `1` noire, `0.5` croche.
- `cle` : `"sol"`, `"fa"` ou `"double"` (grande portée) · `main` : `"droite"` ou `"gauche"` (modifiable note par note).
- `armure` (facultatif) : nombre de dièses (positif) ou de bémols (négatif). Écrivez quand même `Fa#5` ou `Sib4` :
  la partition n'affiche l'altération que si elle diffère de l'armure.
- `mesure` (facultatif) : `"4/4"` par défaut, ou `"3/4"`, `"2/4"`…
- `doigt` (1 = pouce … 5 = auriculaire, une liste pour un accord), `nuance` (`pp`, `p`, `mp`, `mf`, `f`, `ff`),
  `lie` (la note suivante de même hauteur prolonge celle-ci, sans être rejouée) : facultatifs.
- **Deux mains** : remplacez `notes` par `voix`, une liste de voix jouées en même temps, chacune avec sa `main`
  et ses `notes` ; avec `"cle": "double"`, la main droite s'écrit en clé de sol, la gauche en clé de fa.
- `attente` (facultatif) : `false` pour désactiver le mode attente par défaut (utile pour le rythme).
- Le clavier affiché est calculé automatiquement à partir des notes.
- Les `id` doivent être uniques ; l'ordre dans le fichier est l'ordre du parcours.

Pour un nouveau niveau : créez `niveau7.json` sur le même modèle et ajoutez-le à `SOURCES` dans
`src/data/lecons.ts`. `npm test` vérifie que toutes les leçons se compilent.

## Bon à savoir

- **Micro** : il reconnaît les accords et les deux mains, dans une pièce calme, téléphone posé sur le pupitre
  (calibrez-le une fois dans les réglages). L'octave n'est pas vérifiée au micro (seul le nom de la note compte),
  et une note qui tombe sur une harmonique d'une autre note de l'accord (son octave, sa douzième) est validée avec
  elle : un micro ne peut pas les distinguer. Le micro ignore les sons joués par l'appli (clavier, métronome).
- **Clavier MIDI** : uniquement dans l'APK Android (module natif `modules/clavier-midi`), pas dans Expo Go ni sur
  iPhone. Un clavier USB (adaptateur OTG) se connecte tout seul ; un clavier Bluetooth se cherche une fois dans
  les réglages. Sur le web (Chrome), Web MIDI est utilisé.
- **Sons** : échantillons du *Salamander Grand Piano V3* d'Alexander Holm (licence
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), dans la version publiée par Tone.js ;
  `npm run sons` les régénère.
- Toutes les mélodies sont des airs traditionnels ou classiques du **domaine public**.
- `npx expo start --web` ouvre une version navigateur, pratique pour développer (le micro et le rendu peuvent y
  différer du téléphone).

## Améliorations possibles

1. **Paroles** sous les notes pour les chansons, et écoute du morceau avant de le jouer (« démo »).
2. **Plus de contenu** : import de fichiers MIDI/MusicXML du domaine public, éditeur de leçons dans l'appli.
3. **Motivation** : objectif quotidien, rappels par notification locale, badges, courbe de progression par note
   (repérer les notes les plus souvent ratées et les faire réviser).
4. **Confort** : animations sur le fil natif (Reanimated), retour haptique, mode portrait pour tablette,
    couleurs adaptées au daltonisme, taille de texte réglable.
5. **Plusieurs profils** (famille) et export/sauvegarde de la progression.
6. **Tests du moteur de jeu** (accords, mode attente, mode libre) avec un faux temps.
