/**
 * Bouton pour activer / couper le micro, avec un petit vumètre
 * et la dernière note entendue.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { EtatMicro } from '@/hooks/useMicro';
import { nomNote } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';

interface Props {
  etat: EtatMicro;
  niveau: number;
  derniereNote: number | null;
  onPress: () => void;
}

export function BoutonMicro({ etat, niveau, derniereNote, onPress }: Props) {
  const c = useCouleurs();
  const actif = etat === 'actif';
  const libelle =
    etat === 'actif'
      ? derniereNote !== null
        ? `Micro · ${nomNote(derniereNote)}`
        : 'J’écoute…'
      : etat === 'demarrage'
        ? 'Micro…'
        : etat === 'refuse'
          ? 'Micro refusé'
          : etat === 'erreur'
            ? 'Erreur micro'
            : 'Micro';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: actif }}
      accessibilityLabel="Micro : jouer sur un vrai piano"
      style={({ pressed }) => [
        styles.bouton,
        { backgroundColor: actif ? c.succes : c.surfaceAlt, borderColor: c.bordure, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.texte, { color: actif ? '#fff' : c.texte }]} numberOfLines={1}>
        {libelle}
      </Text>
      {actif && (
        <View style={styles.vumetre}>
          <View style={[styles.niveau, { width: `${Math.round(niveau * 100)}%` }]} />
        </View>
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
  vumetre: { height: 4, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, marginTop: 4 },
  niveau: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
});
