/**
 * Piano libre : on joue ce qu'on veut sur son piano (micro ou clavier MIDI) et l'appli
 * montre le nom de la note et sa place sur la portée. Idéal pour explorer.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoutonMicro } from '@/components/BoutonMicro';
import { Clavier } from '@/components/Clavier';
import { Icone } from '@/components/Icones';
import { elementsSimples, Portee } from '@/components/Portee';
import { useMicro } from '@/hooks/useMicro';
import { Cle, DO_CENTRAL, ecrireMidi, nomEcrit } from '@/music/notes';
import { useMidi, useNotesMidi } from '@/store/Midi';
import { useReglages } from '@/store/Reglages';
import { couleurNote } from '@/theme/couleurs';
import { revenir } from '@/utils/navigation';

/** Octaves proposées : du Do2 au Do4, deux octaves affichées. */
const DEBUTS = [36, 48, 60];

export default function PianoLibre() {
  const { reglages, couleurs: c } = useReglages();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [debut, setDebut] = useState(48);
  const [historique, setHistorique] = useState<number[]>([]);

  const ajouter = useCallback((midi: number) => {
    setHistorique((h) => [...h.slice(-7), midi]);
    // Le clavier affiché suit la note jouée sur le vrai piano
    setDebut((d) => (midi >= d && midi <= d + 24 ? d : DEBUTS.reduce((a, b) => (Math.abs(midi - 12 - b) < Math.abs(midi - 12 - a) ? b : a))));
  }, []);

  const midi = useMidi();
  const auMicro = !midi.connecte;
  // Au micro, seule la note la plus forte de chaque frappe s'affiche
  const micro = useMicro({ onNotes: (midis) => ajouter(midis[0]) });

  // Sur un vrai piano, le micro s'allume tout seul
  const demarrerMicro = micro.demarrer;
  useEffect(() => {
    if (auMicro) demarrerMicro();
  }, [auMicro, demarrerMicro]);
  useNotesMidi(ajouter);

  const derniere = historique[historique.length - 1];
  // Clé choisie selon la dernière note : grave → clé de fa
  const cle: Cle = derniere !== undefined && derniere < DO_CENTRAL ? 'fa' : 'sol';
  const elements = elementsSimples(historique.map((m) => ecrireMidi(m)), cle);
  const derniereIndex = historique.length - 1;

  const L = width - insets.left - insets.right;
  const H = height - insets.top - insets.bottom;
  const hClavier = Math.round(H * 0.42);
  const hHaut = H - hClavier;

  return (
    <View
      style={[
        styles.ecran,
        { backgroundColor: c.fond, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom },
      ]}
    >
      <View style={[styles.haut, { height: hHaut }]}>
        <View style={styles.colonne}>
          <Pressable
            onPress={() => revenir()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={[styles.rond, { backgroundColor: c.surfaceAlt, borderColor: c.bordure }]}
          >
            <Icone nom="retour" couleur={c.texte} />
          </Pressable>
          <BoutonMicro etat={micro.etat} niveau={micro.niveau} derniereNote={micro.derniereNote} onPress={() => (micro.etat === 'actif' ? micro.arreter() : micro.demarrer())} midi={midi.connecte} />
          <View style={styles.octaves}>
            {DEBUTS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDebut(d)}
                style={[styles.octave, { backgroundColor: d === debut ? c.primaire : c.surfaceAlt }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: d === debut }}
              >
                <Text style={{ color: d === debut ? c.surPrimaire : c.texte, fontWeight: '800' }}>
                  {d === 36 ? 'Grave' : d === 48 ? 'Milieu' : 'Aigu'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* La carte prend la couleur de la note jouée */}
        <View
          style={[
            styles.grandeNote,
            derniere !== undefined
              ? { backgroundColor: couleurNote(derniere).fond, borderColor: couleurNote(derniere).fond }
              : { backgroundColor: c.surface, borderColor: c.bordure },
          ]}
        >
          <Text style={[styles.nom, { color: derniere !== undefined ? couleurNote(derniere).texte : c.texteDiscret }]}>
            {derniere !== undefined ? nomEcrit(ecrireMidi(derniere)) : '?'}
          </Text>
          <Text style={{ color: derniere !== undefined ? couleurNote(derniere).texte : c.texteDiscret, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 }}>{derniere !== undefined ? (cle === 'sol' ? 'clé de sol' : 'clé de fa') : 'Joue une note sur ton piano'}</Text>
        </View>

        <View style={[styles.portee, { backgroundColor: c.surface, borderColor: c.bordure }]}>
          <Portee
            cle={cle}
            armure={0}
            mesure={null}
            elements={elements}
            tempsActuel={derniereIndex >= 0 ? derniereIndex : null}
            statut={(i) => (i === derniereIndex ? 'actuelle' : 'futur')}
            largeur={Math.max(120, L - 336)}
            hauteur={hHaut - 16}
            afficherNoms={reglages.nomsNotes}
          />
        </View>
      </View>

      <Clavier
        min={debut}
        max={debut + 24}
        largeur={L}
        hauteur={hClavier}
        afficherNoms={reglages.nomsNotes}
        surbrillance={derniere !== undefined ? [{ midi: derniere }] : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1 },
  haut: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  colonne: { width: 130, gap: 8, alignItems: 'flex-start' },
  rond: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  octaves: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  octave: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  grandeNote: { width: 170, alignSelf: 'stretch', marginVertical: 8, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nom: { fontSize: 56, fontWeight: '900' },
  portee: { flex: 1, alignSelf: 'stretch', marginVertical: 8, borderRadius: 20, borderWidth: 2, overflow: 'hidden', justifyContent: 'center' },
});
