/**
 * Cartes flash : une note s'affiche sur la portée, il faut trouver son nom
 * (boutons, ou en la jouant au piano : micro ou clavier MIDI). Une minute
 * pour donner le plus de bonnes réponses.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BoutonMicro } from '@/components/BoutonMicro';
import { elementsSimples, Portee } from '@/components/Portee';
import { ReponsesNotes } from '@/components/ReponsesNotes';
import { Text } from '@/components/Texte';
import { Bouton, Carte } from '@/components/ui';
import { useMicro } from '@/hooks/useMicro';
import { CleExercice, idExercice, NiveauLecture, notesLecture, tirer, tirerCle } from '@/music/exercices';
import { Cle, degreDansGamme, ecrireMidi, NoteEcrite, nomEcrit } from '@/music/notes';
import { useMidi, useNotesMidi } from '@/store/Midi';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';
import { revenir } from '@/utils/navigation';

const DUREE_S = 60;

interface CarteFlash {
  note: NoteEcrite;
  cle: Cle;
}

function nouvelleCarte(cle: CleExercice, niveau: NiveauLecture, precedente: CarteFlash | null): CarteFlash {
  const c = tirerCle(cle);
  return { cle: c, note: tirer(notesLecture(c, niveau), precedente?.note) };
}

export default function CartesFlash() {
  const params = useLocalSearchParams<{ cle?: string; niveau?: string }>();
  const cle: CleExercice = params.cle === 'fa' || params.cle === 'les-deux' ? params.cle : 'sol';
  const niveau: NiveauLecture = params.niveau === 'portee' || params.niveau === 'etendu' ? params.niveau : 'debutant';
  const { couleurs: c } = useReglages();
  const { enregistrerExercice } = useProgression();
  const midi = useMidi();
  const { width } = useWindowDimensions();

  const [phase, setPhase] = useState<'jeu' | 'fini'>('jeu');
  const [carte, setCarte] = useState<CarteFlash>(() => nouvelleCarte(cle, niveau, null));
  const [restant, setRestant] = useState(DUREE_S);
  const [score, setScore] = useState(0);
  const [erreurs, setErreurs] = useState(0);
  const [correction, setCorrection] = useState<{ bonne: number; donnee: number } | null>(null);
  const [record, setRecord] = useState(false);
  /** Heure de fin de la minute, fixée au début de chaque partie. */
  const fin = useRef(0);
  const scoreRef = useRef(0);

  // Compte à rebours
  useEffect(() => {
    if (phase !== 'jeu') return;
    fin.current = Date.now() + DUREE_S * 1000;
    const id = setInterval(() => {
      const r = Math.max(0, (fin.current - Date.now()) / 1000);
      setRestant(r);
      if (r <= 0) {
        clearInterval(id);
        setPhase('fini');
        setRecord(enregistrerExercice(idExercice('lecture', cle, niveau), scoreRef.current, DUREE_S));
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, cle, niveau, enregistrerExercice]);

  const repondre = useCallback(
    (degre: number) => {
      if (phase !== 'jeu' || correction) return;
      const bonne = degreDansGamme(carte.note.degre);
      setCorrection({ bonne, donnee: degre });
      if (degre === bonne) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      } else setErreurs((e) => e + 1);
      // Carte suivante : vite si c'est juste, le temps de voir la correction sinon
      setTimeout(
        () => {
          setCorrection(null);
          setCarte((p) => nouvelleCarte(cle, niveau, p));
        },
        degre === bonne ? 300 : 1000,
      );
    },
    [phase, correction, carte, cle, niveau],
  );

  // Réponse jouée au piano : la note jouée doit avoir la même hauteur (à l'octave près)
  const jouee = useCallback(
    (m: number) => {
      const juste = m % 12 === carte.note.midi % 12;
      repondre(juste ? degreDansGamme(carte.note.degre) : degreDansGamme(ecrireMidi(m).degre));
    },
    [carte, repondre],
  );
  useNotesMidi(jouee);
  const auMicro = !midi.connecte;
  const micro = useMicro({ onNotes: (midis) => jouee(midis[0]) });
  const demarrerMicro = micro.demarrer;
  useEffect(() => {
    if (auMicro) demarrerMicro();
  }, [auMicro, demarrerMicro]);

  const recommencer = () => {
    scoreRef.current = 0;
    setScore(0);
    setErreurs(0);
    setRestant(DUREE_S);
    setRecord(false);
    setCorrection(null);
    setCarte((p) => nouvelleCarte(cle, niveau, p));
    setPhase('jeu');
  };

  const largeur = Math.min(width - 32, 420);
  if (phase === 'fini') {
    return (
      <ScrollView contentContainerStyle={styles.contenu}>
        <Carte style={styles.bilan}>
          <Text style={[styles.grand, { color: c.texte }]}>{score}</Text>
          <Text style={[styles.texte, { color: c.texte }]}>
            bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''} en une minute
            {erreurs ? ` · ${erreurs} erreur${erreurs > 1 ? 's' : ''}` : ''}
          </Text>
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
        <Text style={[styles.score, { color: c.texte }]}>{score}</Text>
        <View style={[styles.barre, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.temps, { width: `${(restant / DUREE_S) * 100}%`, backgroundColor: restant < 10 ? c.erreur : c.primaire }]} />
        </View>
        <BoutonMicro
          etat={micro.etat}
          niveau={micro.niveau}
          derniereNote={micro.derniereNote}
          onPress={() => (micro.etat === 'actif' ? micro.arreter() : micro.demarrer())}
          midi={midi.connecte}
        />
      </View>

      <Carte style={[styles.portee, { width: largeur + 32 }]}>
        <Portee
          cle={carte.cle}
          armure={0}
          mesure={null}
          elements={elementsSimples([carte.note], carte.cle)}
          tempsActuel={null}
          largeur={largeur}
          hauteur={190}
          afficherNoms={false}
        />
      </Carte>

      <Text style={[styles.consigne, { color: correction && correction.bonne !== correction.donnee ? c.erreur : c.texteDiscret }]}>
        {correction
          ? correction.bonne === correction.donnee
            ? 'Bravo !'
            : `C’était ${nomEcrit(carte.note)}`
          : 'Quelle est cette note ?'}
      </Text>
      <ReponsesNotes onReponse={repondre} correction={correction} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 16, alignItems: 'center', paddingBottom: 40 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  score: { fontSize: 32, fontWeight: '900', minWidth: 44 },
  barre: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  temps: { height: 12, borderRadius: 6 },
  portee: { alignItems: 'center' },
  consigne: { fontSize: 18, fontWeight: '800' },
  bilan: { alignSelf: 'stretch', alignItems: 'center', gap: 12 },
  grand: { fontSize: 64, fontWeight: '900' },
  texte: { fontSize: 16, textAlign: 'center' },
  record: { fontSize: 18, fontWeight: '900' },
});
