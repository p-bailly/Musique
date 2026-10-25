/**
 * Réglages : vitesse des notes, mode attente, noms des notes, son,
 * thème clair/sombre, déblocage des leçons, remise à zéro.
 */
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Bouton, Carte, Choix } from '@/components/ui';
import { useProgression } from '@/store/Progression';
import { ChoixTheme, Entree, useCouleurs, useReglages } from '@/store/Reglages';

/** Ligne avec un titre, une explication et un interrupteur. */
function Interrupteur({
  titre,
  detail,
  valeur,
  onChange,
}: {
  titre: string;
  detail: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useCouleurs();
  return (
    <View style={styles.ligne}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.libelle, { color: c.texte }]}>{titre}</Text>
        <Text style={{ color: c.texteDiscret, fontSize: 14 }}>{detail}</Text>
      </View>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: c.primaire }} accessibilityLabel={titre} />
    </View>
  );
}

export default function EcranReglages() {
  const { reglages, modifier, couleurs: c } = useReglages();
  const { reinitialiser } = useProgression();

  const confirmerRemiseAZero = () =>
    Alert.alert('Effacer la progression ?', 'Toutes les étoiles et statistiques seront perdues.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: reinitialiser },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>🎹 Je joue…</Text>
        <Choix<Entree>
          options={[
            { valeur: 'piano', libelle: '🎹 Sur mon piano (micro)' },
            { valeur: 'ecran', libelle: '📱 Sur l’écran' },
          ]}
          valeur={reglages.entree}
          onChange={(v) => modifier({ entree: v })}
        />
        <Text style={{ color: c.texteDiscret, fontSize: 14 }}>
          Sur ton piano, le micro s’allume tout seul dans les leçons et le clavier de l’écran sert seulement de guide
          pour savoir où poser les doigts.
        </Text>
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>🐢 Vitesse des notes 🐇</Text>
        <Choix
          options={[
            { valeur: 0.5, libelle: '×0,5' },
            { valeur: 0.75, libelle: '×0,75' },
            { valeur: 1, libelle: '×1' },
            { valeur: 1.25, libelle: '×1,25' },
            { valeur: 1.5, libelle: '×1,5' },
          ]}
          valeur={reglages.vitesse}
          onChange={(v) => modifier({ vitesse: v })}
        />
      </Carte>

      <Carte style={styles.bloc}>
        <Interrupteur
          titre="⏳ Mode attente"
          detail="Le morceau s'arrête jusqu'à ce que tu joues la bonne note (certaines leçons de rythme le désactivent par défaut)."
          valeur={reglages.modeAttente}
          onChange={(v) => modifier({ modeAttente: v })}
        />
        <Interrupteur
          titre="🔤 Noms des notes"
          detail="Afficher Do, Ré, Mi… sur le clavier, les blocs et la portée. Masque-les pour t'entraîner à lire !"
          valeur={reglages.nomsNotes}
          onChange={(v) => modifier({ nomsNotes: v })}
        />
        <Interrupteur
          titre="🔊 Son du clavier"
          detail="Jouer le son du piano quand tu touches le clavier à l'écran (mode « sur l’écran »)."
          valeur={reglages.son}
          onChange={(v) => modifier({ son: v })}
        />
        <Interrupteur
          titre="🔓 Toutes les leçons"
          detail="Accéder à toutes les leçons sans devoir les débloquer dans l'ordre."
          valeur={reglages.toutDebloquer}
          onChange={(v) => modifier({ toutDebloquer: v })}
        />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>🎨 Thème</Text>
        <Choix<ChoixTheme>
          options={[
            { valeur: 'systeme', libelle: 'Automatique' },
            { valeur: 'clair', libelle: '☀️ Clair' },
            { valeur: 'sombre', libelle: '🌙 Sombre' },
          ]}
          valeur={reglages.theme}
          onChange={(v) => modifier({ theme: v })}
        />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>🎤 Jouer sur un vrai piano</Text>
        <Text style={{ color: c.texteDiscret, fontSize: 15, lineHeight: 21 }}>
          Pose le téléphone sur le pupitre de ton piano : le micro s’allume tout seul (le bouton « Micro » permet de le couper). Joue une note à la fois, dans
          une pièce calme. L’octave n’est pas vérifiée au micro (seul le nom de la note compte).
        </Text>
      </Carte>

      <Bouton titre="Effacer ma progression" variante="danger" onPress={confirmerRemiseAZero} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 14, paddingBottom: 40 },
  bloc: { gap: 12 },
  titre: { fontSize: 18, fontWeight: '800' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  libelle: { fontSize: 17, fontWeight: '700' },
});
