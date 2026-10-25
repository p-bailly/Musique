/**
 * Les 7 boutons de réponse des exercices (Do, Ré, Mi, Fa, Sol, La, Si), chacun à
 * la couleur de sa note. Après une réponse, la bonne note s'entoure et une
 * mauvaise réponse s'efface.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { NOMS_DEGRES } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';
import { couleurDegre } from '@/theme/couleurs';

interface Props {
  /** Appelée avec le degré choisi (0 = Do … 6 = Si). */
  onReponse: (degre: number) => void;
  /** Après une réponse : la bonne réponse et celle donnée (sinon null). */
  correction: { bonne: number; donnee: number } | null;
  desactive?: boolean;
}

export function ReponsesNotes({ onReponse, correction, desactive }: Props) {
  const c = useCouleurs();
  return (
    <View style={styles.rangee}>
      {NOMS_DEGRES.map((nom, d) => {
        const couleur = couleurDegre(d);
        const fausse = correction && correction.donnee === d && correction.bonne !== d;
        const bonne = correction && correction.bonne === d;
        return (
          <Pressable
            key={nom}
            onPress={() => onReponse(d)}
            disabled={desactive || !!correction}
            accessibilityRole="button"
            accessibilityLabel={nom}
            style={({ pressed }) => [
              styles.bouton,
              {
                backgroundColor: couleur.fond,
                borderColor: bonne ? c.texte : 'transparent',
                opacity: fausse ? 0.3 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.nom, { color: couleur.texte }]} numberOfLines={1} adjustsFontSizeToFit>
              {nom}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  bouton: { flex: 1, height: 60, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  nom: { fontSize: 17, fontWeight: '900' },
});
