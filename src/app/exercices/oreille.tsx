/**
 * Exercices d'oreille à deux réponses, 10 questions :
 *  - « hauteur » : deux notes, la seconde est-elle plus aiguë ou plus grave ?
 *  - « accord » : un accord, est-il majeur (joyeux) ou mineur (triste) ?
 * Le micro reste coupé : il entendrait le haut-parleur.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { jouerAccord, jouerNote, prechargerSons } from '@/audio/piano';
import { Text } from '@/components/Texte';
import { Bouton, Carte } from '@/components/ui';
import { idExercice, LIBELLES_HAUTEUR, NiveauHauteur, tirerAccord, tirerHauteur } from '@/music/exercices';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';
import { revenir } from '@/utils/navigation';

const NB_QUESTIONS = 10;

type Type = 'hauteur' | 'accord';
interface Question {
  /** Notes jouées l'une après l'autre (hauteur) ou ensemble (accord). */
  notes: number[];
  /** Bonne réponse : 0 ou 1 (index du bouton). */
  bonne: number;
}

function nouvelleQuestion(type: Type, niveau: NiveauHauteur): Question {
  if (type === 'accord') {
    const a = tirerAccord();
    return { notes: a.notes, bonne: a.type === 'majeur' ? 0 : 1 };
  }
  const h = tirerHauteur(niveau);
  return { notes: [h.premiere, h.seconde], bonne: h.seconde > h.premiere ? 0 : 1 };
}

const TEXTES: Record<Type, { consigne: string; reponses: [string, string] }> = {
  hauteur: { consigne: 'La deuxième note est-elle plus aiguë ou plus grave ?', reponses: ['Plus aiguë', 'Plus grave'] },
  accord: { consigne: 'Cet accord est-il majeur (joyeux) ou mineur (triste) ?', reponses: ['Majeur', 'Mineur'] },
};

export default function Oreille() {
  const params = useLocalSearchParams<{ type?: string; niveau?: string }>();
  const type: Type = params.type === 'accord' ? 'accord' : 'hauteur';
  const niveau: NiveauHauteur = params.niveau === 'difficile' ? 'difficile' : 'facile';
  const { couleurs: c } = useReglages();
  const { enregistrerExercice } = useProgression();
  const id = type === 'accord' ? idExercice('accord') : idExercice('hauteur', niveau);

  const [numero, setNumero] = useState(1);
  const [question, setQuestion] = useState<Question>(() => nouvelleQuestion(type, niveau));
  const [score, setScore] = useState(0);
  const [donnee, setDonnee] = useState<number | null>(null);
  const [fini, setFini] = useState(false);
  const [record, setRecord] = useState(false);
  const debut = useRef(0);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    debut.current = Date.now();
    prechargerSons(48, 84);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  const ecouter = useCallback(
    (q: Question) => {
      if (minuteur.current) clearTimeout(minuteur.current);
      if (type === 'accord') {
        jouerAccord(q.notes);
        return;
      }
      jouerNote(q.notes[0]);
      minuteur.current = setTimeout(() => jouerNote(q.notes[1]), 900);
    },
    [type],
  );

  // Chaque nouvelle question se joue d'elle-même
  useEffect(() => {
    if (!fini) ecouter(question);
  }, [question, fini, ecouter]);

  const repondre = (r: number) => {
    if (donnee !== null || fini) return;
    const juste = r === question.bonne;
    const nouveauScore = score + (juste ? 1 : 0);
    setDonnee(r);
    setScore(nouveauScore);
    minuteur.current = setTimeout(
      () => {
        setDonnee(null);
        if (numero >= NB_QUESTIONS) {
          setFini(true);
          setRecord(enregistrerExercice(id, nouveauScore, (Date.now() - debut.current) / 1000));
        } else {
          setNumero((n) => n + 1);
          setQuestion(nouvelleQuestion(type, niveau));
        }
      },
      juste ? 700 : 1500,
    );
  };

  const recommencer = () => {
    debut.current = Date.now();
    setNumero(1);
    setScore(0);
    setRecord(false);
    setFini(false);
    setQuestion(nouvelleQuestion(type, niveau));
  };

  const titre = type === 'accord' ? 'Majeur ou mineur' : `Aigu ou grave · ${LIBELLES_HAUTEUR[niveau]}`;
  if (fini) {
    return (
      <ScrollView contentContainerStyle={styles.contenu}>
        <Carte style={styles.bilan}>
          <Text style={[styles.grand, { color: c.texte }]}>
            {score}/{NB_QUESTIONS}
          </Text>
          <Text style={[styles.texte, { color: c.texte }]}>{titre}</Text>
          {record && score > 0 && <Text style={[styles.record, { color: c.succes }]}>Nouveau record !</Text>}
          <Bouton titre="Rejouer" onPress={recommencer} />
          <Bouton titre="Retour" variante="secondaire" onPress={() => revenir()} />
        </Carte>
      </ScrollView>
    );
  }

  const textes = TEXTES[type];
  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Stack.Screen options={{ title: type === 'accord' ? 'Majeur ou mineur ?' : 'Aigu ou grave ?' }} />
      <View style={styles.entete}>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Question {numero}/{NB_QUESTIONS}
        </Text>
        <Text style={[styles.score, { color: c.texte }]}>{score}</Text>
      </View>
      <Carte style={styles.bilan}>
        <Text style={[styles.consigne, { color: c.texte }]}>{textes.consigne}</Text>
        <Bouton titre="Réécouter" variante="secondaire" onPress={() => ecouter(question)} />
      </Carte>
      <Text
        style={[
          styles.consigne,
          { color: donnee === null ? c.texteDiscret : donnee === question.bonne ? c.succes : c.erreur },
        ]}
      >
        {donnee === null ? ' ' : donnee === question.bonne ? 'Bravo !' : `Non : ${textes.reponses[question.bonne].toLowerCase()}`}
      </Text>
      <View style={styles.reponses}>
        {textes.reponses.map((libelle, i) => {
          const bonne = donnee !== null && i === question.bonne;
          const fausse = donnee === i && i !== question.bonne;
          return (
            <Pressable
              key={libelle}
              onPress={() => repondre(i)}
              disabled={donnee !== null}
              accessibilityRole="button"
              accessibilityLabel={libelle}
              style={({ pressed }) => [
                styles.reponse,
                {
                  backgroundColor: i === 0 ? c.primaire : c.surface,
                  borderColor: bonne ? c.succes : c.bordure,
                  opacity: fausse ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.libelle, { color: i === 0 ? c.surPrimaire : c.texte }]}>{libelle}</Text>
            </Pressable>
          );
        })}
      </View>
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
  reponses: { flexDirection: 'row', gap: 12 },
  reponse: { flex: 1, height: 88, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  libelle: { fontSize: 20, fontWeight: '900' },
});
