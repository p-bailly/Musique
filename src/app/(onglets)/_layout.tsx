/**
 * Barre d'onglets en bas : Leçons (accueil), Exercices, Piano, Progression, Réglages.
 * L'onglet « Piano » n'a pas d'écran à lui : le toucher ouvre le piano libre, plein
 * écran et en paysage, par-dessus les onglets (pile racine) ; le retour ramène à
 * l'onglet d'où l'on vient.
 * Depuis un écran de jeu, la pastille MIDI ouvre « Réglages » par-dessus le jeu :
 * un bouton retour y ramène alors au jeu.
 */
import { router, Tabs, useNavigation } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { Icone, NomIcone } from '@/components/Icones';
import { useReglages } from '@/store/Reglages';

export default function Onglets() {
  const { couleurs: c } = useReglages();
  /** Icône d'un onglet, couleur principale quand il est actif. */
  const icone = (nom: NomIcone) =>
    function IconeOnglet({ focused }: { focused: boolean }) {
      return <Icone nom={nom} taille={22} couleur={focused ? c.primaire : c.texteDiscret} />;
    };
  // Onglets ouverts par-dessus un écran de jeu (pile racine) : on peut y revenir
  // (navigation de la pile racine : router.back() changerait seulement d'onglet)
  const pile = useNavigation();
  const parDessusUnJeu = pile.canGoBack();
  const boutonRetour = () => (
    <Pressable
      onPress={() => pile.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={8}
      style={({ pressed }) => ({ paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}
    >
      <Icone nom="retour" couleur={c.texte} />
    </Pressable>
  );
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.texte,
        headerTitleStyle: { fontFamily: 'Nunito_900Black' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.fond },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.bordure },
        tabBarActiveTintColor: c.primaire,
        tabBarInactiveTintColor: c.texteDiscret,
        // Nunito est plus haute que la police système : icône moins haute pour laisser
        // toute sa place au libellé (sinon coupé en bas)
        tabBarIconStyle: { height: 23 },
        tabBarLabelStyle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, lineHeight: 15 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Leçons', headerShown: false, tabBarIcon: icone('lecons') }} />
      <Tabs.Screen name="exercices" options={{ title: 'Exercices', tabBarIcon: icone('exercices') }} />
      <Tabs.Screen
        name="piano-libre"
        options={{ title: 'Piano', tabBarIcon: icone('piano') }}
        listeners={{
          tabPress: (e) => {
            // On reste sur l'onglet courant et on pousse l'écran de jeu
            e.preventDefault();
            router.push('/piano');
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Progression', headerTitle: 'Ma progression', tabBarIcon: icone('progression') }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: 'Réglages',
          tabBarIcon: icone('reglages'),
          headerLeft: parDessusUnJeu ? boutonRetour : undefined,
        }}
      />
    </Tabs>
  );
}
