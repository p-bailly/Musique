/**
 * Mise en page racine : fournisseurs de contexte (réglages, progression)
 * et navigation en pile. Les écrans de piano sont en mode paysage.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProgressionProvider } from '@/store/Progression';
import { ReglagesProvider, useReglages } from '@/store/Reglages';

function Navigation() {
  const { couleurs, sombre } = useReglages();
  return (
    <>
      <StatusBar style={sombre ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: couleurs.surface },
          headerTintColor: couleurs.texte,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: couleurs.fond },
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Solfège Piano', headerShown: false }} />
        <Stack.Screen name="stats" options={{ title: 'Ma progression' }} />
        <Stack.Screen name="reglages" options={{ title: 'Réglages' }} />
        {/* Écrans de jeu : plein écran, en paysage */}
        <Stack.Screen name="lecon/[id]" options={{ headerShown: false, orientation: 'landscape' }} />
        <Stack.Screen name="piano" options={{ headerShown: false, orientation: 'landscape' }} />
      </Stack>
    </>
  );
}

export default function Racine() {
  return (
    <SafeAreaProvider>
      <ReglagesProvider>
        <ProgressionProvider>
          <Navigation />
        </ProgressionProvider>
      </ReglagesProvider>
    </SafeAreaProvider>
  );
}
