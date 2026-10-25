/**
 * Mise en page racine : fournisseurs de contexte (réglages, progression)
 * et navigation en pile. Les écrans de piano sont en mode paysage.
 */
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MidiProvider } from '@/store/Midi';
import { ProgressionProvider } from '@/store/Progression';
import { ReglagesProvider, useReglages } from '@/store/Reglages';

// L'écran de démarrage reste affiché le temps de charger la police
SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigation() {
  const { couleurs, sombre } = useReglages();
  return (
    <>
      <StatusBar style={sombre ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: couleurs.surface },
          headerTintColor: couleurs.texte,
          headerTitleStyle: { fontFamily: 'Nunito_900Black' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: couleurs.fond },
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Solfège Piano', headerShown: false }} />
        <Stack.Screen name="stats" options={{ title: 'Ma progression' }} />
        <Stack.Screen name="reglages" options={{ title: 'Réglages' }} />
        <Stack.Screen name="calibration" options={{ title: 'Calibrer le micro' }} />
        <Stack.Screen name="exercices/index" options={{ title: 'Exercices' }} />
        <Stack.Screen name="exercices/lecture" options={{ title: 'Cartes flash' }} />
        <Stack.Screen name="exercices/dictee" options={{ title: 'Dictée musicale' }} />
        {/* Écrans de jeu : plein écran, en paysage */}
        <Stack.Screen name="lecon/[id]" options={{ headerShown: false, orientation: 'landscape' }} />
        <Stack.Screen name="piano" options={{ headerShown: false, orientation: 'landscape' }} />
      </Stack>
    </>
  );
}

export default function Racine() {
  const [policesPretes, erreurPolices] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const pret = policesPretes || !!erreurPolices;
  React.useEffect(() => {
    if (pret) SplashScreen.hideAsync().catch(() => {});
  }, [pret]);
  if (!pret) return null;

  return (
    <SafeAreaProvider>
      <ReglagesProvider>
        <ProgressionProvider>
          <MidiProvider>
            <Navigation />
          </MidiProvider>
        </ProgressionProvider>
      </ReglagesProvider>
    </SafeAreaProvider>
  );
}
