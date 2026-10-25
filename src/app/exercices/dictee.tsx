/**
 * Dictée musicale : l'appli joue le Do de référence puis une note mystère ;
 * il faut la reconnaître à l'oreille (boutons, ou clavier MIDI). 10 questions.
 * Le micro reste coupé : il entendrait le haut-parleur.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { jouerNote, prechargerSons } from '@/audio/piano';
import { ReponsesNotes } from '@/components/ReponsesNotes';
import { Text } from '@/components/Texte';
import { Bouton, Carte } from '@/components/ui';
import { idExercice, LIBELLES_DICTEE, NiveauDictee, notesDictee, tirer } from '@/music/exercices';
import { degreDansGamme, DO_CENTRAL, ecrireMidi, NoteEcrite, nomEcrit } from '@/music/notes';
import { useNotesMidi } from '@/store/Midi';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';
import { revenir } from '@/utils/navigation';

const NB_QUESTIONS = 10;

export default function Dictee() {
  const params = useLocalSearchParams<{ niveau?: string }>();
  const niveau: NiveauDictee = params.niveau === 'do-sol' || params.niveau === 'gamme' ? params.niveau : 'do-mi';
  const { couleurs: c } = useReglages();
  const { enregistrerExercice } = useProgression();

  const [question, setQuestion] = useState(1);
  const [note, setNote] = useState<NoteEcrite>(() => tirer(notesDictee(niveau)));
  const [score, setScore] = useState(0);
  const [correction, setCorrection] = useState<{ bonne: number; donnee: number } | null>(null);
  const [fini, setFini] = useState(false);
  const [record, setRecord] = useState(false);
  const debut = useRef(0);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    debut.current = Date.now();
    prechargerSons(DO_CENTRAL, DO_CENTRAL + 12);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  /** Joue le Do de référence, puis la note mystère. */
  const ecouter = useCallback((n: NoteEcrite) => {
    jouerNote(DO_CENTRAL);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => jouerNote(n.midi), 1000);
  }, []);

  // Chaque nouvelle question se joue d'elle-même
  useEffect(() => {
    if (!fini) ecouter(note);
  }, [note, fini, ecouter]);

  const repondre = useCallback(
    (degre: number) => {
      if (correction || fini) return;
      const bonne = degreDansGamme(note.degre);
      const juste = degre === bonne;
      const nouveauScore = score + (juste ? 1 : 0);
      setCorrection({ bonne, donnee: degre });
      setScore(nouveauScore);
      if (!juste) jouerNote(note.midi); // réentendre la bonne note
      minuteur.current = setTimeout(
        () => {
          setCorrection(null);
          if (question >= NB_QUESTIONS) {
            setFini(true);
            setRecord(enregistrerExercice(idExercice('dictee', niveau), nouveauScore, (Date.now() - debut.current) / 1000));
          } else {
            setQuestion((q) => q + 1);
            setNote((p) => tirer(notesDictee(niveau), p));
          }
        },
        juste ? 700 : 1600,
      );
    },
    [correction, fini, note, score, question, niveau, enregistrerExercice],
  );

  // Réponse au clavier MIDI : même hauteur à l'octave près
  useNotesMidi(
    useCallback(
      (m: number) => repondre(m % 12 === note.midi % 12 ? degreDansGamme(note.degre) : degreDansGamme(ecrireMidi(m).degre)),
      [note, repondre],
    ),
  );

  const recommencer = () => {
    debut.current = Date.now();
    setQuestion(1);
    setScore(0);
    setRecord(false);
    setFini(false);
    setNote((p) => tirer(notesDictee(niveau), p));
  };

  if (fini) {
    return (
      <ScrollView contentContainerStyle={styles.contenu}>
        <Carte style={styles.bilan}>
          <Text style={[styles.grand, { color: c.texte }]}>
            {score}/{NB_QUESTIONS}
          </Text>
          <Text style={[styles.texte, { color: c.texte }]}>Dictée « {LIBELLES_DICTEE[niveau]} »</Text>
          {record && score > 0 && <Text style={[styles.record, { color: c.succes }]}>Nouveau record !</Text>}
          <Bouton titre="Rejouer" onPress={recommencer} />
          <Bouton titre="Retour" variante="secondaire" onPress={() => revenir()} />
        </Carte>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <View style={styles.entete}>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Question {question}/{NB_QUESTIONS}
        </Text>
        <Text style={[styles.score, { color: c.texte }]}>{score}</Text>
      </View>
      <Carte style={styles.bilan}>
        <Text style={[styles.consigne, { color: c.texte }]}>Écoute le Do, puis la note mystère.</Text>
        <Bouton titre="Réécouter" variante="secondaire" onPress={() => ecouter(note)} />
      </Carte>
      <Text style={[styles.consigne, { color: correction && correction.bonne !== correction.donnee ? c.erreur : c.texteDiscret }]}>
        {correction ? (correction.bonne === correction.donnee ? 'Bravo !' : `C’était ${nomEcrit(note)}`) : 'Quelle note as-tu entendue ?'}
      </Text>
      <ReponsesNotes onReponse={repondre} correction={correction} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 16, paddingBottom: 40 },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { fontSize: 32, fontWeight: '900' },
  consigne: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  bilan: { alignItems: 'center', gap: 12 },
  grand: { fontSize: 64, fontWeight: '900' },
  texte: { fontSize: 16, textAlign: 'center' },
  record: { fontSize: 18, fontWeight: '900' },
});
