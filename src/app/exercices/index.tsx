/**
 * Exercices sans clavier : cartes flash (lire une note) et dictée musicale
 * (reconnaître une note à l'oreille), avec le choix du niveau.
 */
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/Texte';
import { Bouton, Carte, Choix } from '@/components/ui';
import {
  CleExercice,
  idExercice,
  LIBELLES_DICTEE,
  LIBELLES_LECTURE,
  NiveauDictee,
  NiveauLecture,
} from '@/music/exercices';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';

export default function Exercices() {
  const { couleurs: c } = useReglages();
  const { progression } = useProgression();
  const [cle, setCle] = useState<CleExercice>('sol');
  const [niveau, setNiveau] = useState<NiveauLecture>('debutant');
  const [niveauDictee, setNiveauDictee] = useState<NiveauDictee>('do-mi');

  const record = (id: string) => progression.exercices?.[id]?.record ?? 0;
  const idLecture = idExercice('lecture', cle, niveau);
  const idDictee = idExercice('dictee', niveauDictee);

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Cartes flash</Text>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Une note s’affiche sur la portée : trouve son nom le plus vite possible. Tu as une minute. Tu peux aussi la
          jouer sur ton piano (micro ou clavier MIDI).
        </Text>
        <Choix<CleExercice>
          options={[
            { valeur: 'sol', libelle: 'Clé de sol' },
            { valeur: 'fa', libelle: 'Clé de fa' },
            { valeur: 'les-deux', libelle: 'Les deux' },
          ]}
          valeur={cle}
          onChange={setCle}
        />
        <Choix<NiveauLecture>
          options={(Object.keys(LIBELLES_LECTURE) as NiveauLecture[]).map((n) => ({ valeur: n, libelle: LIBELLES_LECTURE[n] }))}
          valeur={niveau}
          onChange={setNiveau}
        />
        <Text style={[styles.texte, { color: c.texteDiscret }]}>Record : {record(idLecture)} bonnes réponses</Text>
        <Bouton titre="C’est parti !" onPress={() => router.push({ pathname: '/exercices/lecture', params: { cle, niveau } })} />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Dictée musicale</Text>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Écoute le Do de référence, puis une note mystère : laquelle est-ce ? 10 questions, à l’oreille seulement.
        </Text>
        <Choix<NiveauDictee>
          options={(Object.keys(LIBELLES_DICTEE) as NiveauDictee[]).map((n) => ({ valeur: n, libelle: LIBELLES_DICTEE[n] }))}
          valeur={niveauDictee}
          onChange={setNiveauDictee}
        />
        <Text style={[styles.texte, { color: c.texteDiscret }]}>Record : {record(idDictee)}/10</Text>
        <Bouton titre="Écouter" onPress={() => router.push({ pathname: '/exercices/dictee', params: { niveau: niveauDictee } })} />
      </Carte>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 14, paddingBottom: 40 },
  bloc: { gap: 12 },
  titre: { fontSize: 20, fontWeight: '900' },
  texte: { fontSize: 15, lineHeight: 21 },
});
