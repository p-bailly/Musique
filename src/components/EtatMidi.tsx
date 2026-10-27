/**
 * Pastille d'état du clavier MIDI : son nom quand il est connecté, sinon un
 * bouton qui mène aux réglages pour le connecter. En version `compacte` (écran
 * de leçon), un simple rond « MIDI » : plein si connecté, cerclé de rouge sinon.
 */
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { useMidi } from '@/store/Midi';
import { useCouleurs } from '@/store/Reglages';

export function EtatMidi({ compacte }: { compacte?: boolean }) {
  const c = useCouleurs();
  const { connecte } = useMidi();
  if (compacte) {
    return (
      <Pressable
        onPress={() => router.push('/reglages')}
        accessibilityRole="button"
        accessibilityLabel={connecte ? `Clavier MIDI : ${connecte}` : 'Aucun clavier MIDI : le connecter'}
        style={({ pressed }) => [
          styles.rond,
          connecte
            ? { backgroundColor: c.primaire, borderColor: c.primaire }
            : { backgroundColor: c.surfaceAlt, borderColor: c.erreur },
          { opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <Text style={[styles.texteRond, { color: connecte ? c.surPrimaire : c.erreur }]}>MIDI</Text>
        {!connecte && <View style={[styles.barre, { backgroundColor: c.erreur }]} />}
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push('/reglages')}
      accessibilityRole="button"
      accessibilityLabel={connecte ? `Clavier MIDI : ${connecte}` : 'Connecter un clavier MIDI'}
      style={({ pressed }) => [
        styles.bouton,
        connecte
          ? { backgroundColor: c.primaire, borderColor: c.primaire }
          : { backgroundColor: c.surfaceAlt, borderColor: c.erreur },
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.texte, { color: connecte ? c.surPrimaire : c.erreur }]} numberOfLines={1}>
        {connecte ? 'MIDI' : 'Pas de clavier'}
      </Text>
      {connecte && (
        <Text style={{ color: c.surPrimaire, fontSize: 11, maxWidth: 120 }} numberOfLines={1}>
          {connecte}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: 44,
    minWidth: 110,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  texte: { fontSize: 16, fontWeight: '800' },
  rond: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  texteRond: { fontSize: 11, fontWeight: '900' },
  // Trait en travers : pas de clavier
  barre: { position: 'absolute', width: 34, height: 2, transform: [{ rotate: '-35deg' }] },
});
