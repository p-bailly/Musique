/**
 * Exercices hors leçons, en deux familles : lire les notes (cartes flash) et
 * entraîner l'oreille (quelle note, aigu ou grave, majeur ou mineur). Une tuile par
 * exercice ; la toucher l'ouvre avec ses options et le bouton pour commencer.
 */
import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { Bouton, Choix } from '@/components/ui';
import {
  CleExercice,
  idExercice,
  LIBELLES_DICTEE,
  LIBELLES_HAUTEUR,
  LIBELLES_LECTURE,
  NiveauDictee,
  NiveauHauteur,
  NiveauLecture,
} from '@/music/exercices';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';

type Tuile = 'flash' | 'dictee' | 'hauteur' | 'accord';

export default function Exercices() {
  const { couleurs: c } = useReglages();
  const { progression } = useProgression();
  const [ouverte, setOuverte] = useState<Tuile | null>(null);
  const [cle, setCle] = useState<CleExercice>('sol');
  const [niveau, setNiveau] = useState<NiveauLecture>('debutant');
  const [niveauDictee, setNiveauDictee] = useState<NiveauDictee>('do-mi');
  const [niveauHauteur, setNiveauHauteur] = useState<NiveauHauteur>('facile');

  const record = (id: string) => progression.exercices?.[id]?.record ?? 0;

  const tuile = (
    id: Tuile,
    titre: string,
    resume: string,
    score: string,
    lien: Href,
    options?: React.ReactNode,
  ) => {
    const active = ouverte === id;
    return (
      <View key={id} style={[styles.tuile, { backgroundColor: c.surface, borderColor: active ? c.primaire : c.bordure }]}>
        <Pressable
          onPress={() => setOuverte(active ? null : id)}
          accessibilityRole="button"
          accessibilityState={{ expanded: active }}
          style={styles.enteteTuile}
        >
          <View style={styles.corps}>
            <Text style={[styles.titreTuile, { color: c.texte }]}>{titre}</Text>
            <Text style={[styles.resume, { color: c.texteDiscret }]}>{resume}</Text>
          </View>
          <Text style={[styles.record, { color: c.texteDiscret }]}>{score}</Text>
        </Pressable>
        {active && (
          <View style={styles.options}>
            {options}
            <Bouton titre="Commencer" onPress={() => router.push(lien)} />
          </View>
        )}
      </View>
    );
  };

  const options = <T extends string>(libelles: Record<T, string>, valeur: T, onChange: (v: T) => void) => (
    <Choix<T>
      options={(Object.keys(libelles) as T[]).map((v) => ({ valeur: v, libelle: libelles[v] }))}
      valeur={valeur}
      onChange={onChange}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Text style={[styles.section, { color: c.texte }]}>Lire les notes</Text>
      {tuile(
        'flash',
        'Cartes flash',
        'Une note sur la portée : son nom, vite ! Une minute.',
        `record ${record(idExercice('lecture', cle, niveau))}`,
        { pathname: '/exercices/lecture', params: { cle, niveau } },
        <>
          {options({ sol: 'Clé de sol', fa: 'Clé de fa', 'les-deux': 'Les deux' } as Record<CleExercice, string>, cle, setCle)}
          {options(LIBELLES_LECTURE, niveau, setNiveau)}
        </>,
      )}

      <Text style={[styles.section, { color: c.texte }]}>Entraîner l’oreille</Text>
      {tuile(
        'dictee',
        'Quelle note ?',
        'Le Do, puis une note mystère : laquelle ?',
        `record ${record(idExercice('dictee', niveauDictee))}/10`,
        { pathname: '/exercices/dictee', params: { niveau: niveauDictee } },
        options(LIBELLES_DICTEE, niveauDictee, setNiveauDictee),
      )}
      {tuile(
        'hauteur',
        'Aigu ou grave ?',
        'Deux notes : la seconde monte-t-elle ou descend-elle ?',
        `record ${record(idExercice('hauteur', niveauHauteur))}/10`,
        { pathname: '/exercices/oreille', params: { type: 'hauteur', niveau: niveauHauteur } },
        options(LIBELLES_HAUTEUR, niveauHauteur, setNiveauHauteur),
      )}
      {tuile(
        'accord',
        'Majeur ou mineur ?',
        'Un accord : joyeux (majeur) ou triste (mineur) ?',
        `record ${record(idExercice('accord'))}/10`,
        { pathname: '/exercices/oreille', params: { type: 'accord' } },
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 10, paddingBottom: 40 },
  section: { fontSize: 20, fontWeight: '900', marginTop: 8 },
  tuile: { borderRadius: 20, borderWidth: 2 },
  enteteTuile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  corps: { flex: 1, gap: 2 },
  titreTuile: { fontSize: 18, fontWeight: '900' },
  resume: { fontSize: 14, fontWeight: '600' },
  record: { fontSize: 13, fontWeight: '800' },
  options: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
});
