/**
 * Écran d'accueil : parcours de leçons par niveau, série de jours,
 * accès au piano libre, à la progression et aux réglages.
 */
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icone } from '@/components/Icones';
import { Bouton, Carte, Etoiles } from '@/components/ui';
import { NIVEAUX, Lecon, TOUTES_LES_LECONS } from '@/data/lecons';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';

export default function Accueil() {
  const { couleurs: c, reglages } = useReglages();
  const { progression, serieActuelle } = useProgression();

  const etoiles = (id: string) => progression.lecons[id]?.meilleuresEtoiles ?? 0;

  /** Une leçon est débloquée si la précédente a au moins une étoile. */
  const estDebloquee = (lecon: Lecon) => {
    if (reglages.toutDebloquer) return true;
    const i = TOUTES_LES_LECONS.findIndex((l) => l.id === lecon.id);
    return i === 0 || etoiles(TOUTES_LES_LECONS[i - 1].id) > 0;
  };

  const totalEtoiles = TOUTES_LES_LECONS.reduce((s, l) => s + etoiles(l.id), 0);

  return (
    <SafeAreaView style={[styles.ecran, { backgroundColor: c.fond }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.entete}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titre, { color: c.texte }]}>Solfège Piano</Text>
            <Text style={[styles.sousTitre, { color: c.texteDiscret }]}>Apprends à lire et jouer les notes</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.surface, borderColor: c.bordure }]}>
            <Text style={[styles.badgeTexte, { color: c.texte }]}>{serieActuelle}</Text>
            <Text style={[styles.badgeLegende, { color: c.texteDiscret }]}>jour{serieActuelle > 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.surface, borderColor: c.bordure }]}>
            <Text style={[styles.badgeTexte, { color: c.texte }]}>{totalEtoiles}</Text>
            <Text style={[styles.badgeLegende, { color: c.texteDiscret }]}>étoiles</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Bouton titre="Piano libre" onPress={() => router.push('/piano')} style={styles.action} />
          <Bouton titre="Progression" variante="secondaire" onPress={() => router.push('/stats')} style={styles.action} />
          <Bouton titre="Réglages" variante="secondaire" onPress={() => router.push('/reglages')} style={styles.action} />
        </View>

        {NIVEAUX.map((niveau) => (
          <View key={niveau.numero} style={styles.niveau}>
            <Text style={[styles.titreNiveau, { color: c.texte }]}>
              Niveau {niveau.numero} · {niveau.titre}
            </Text>
            <Text style={[styles.descNiveau, { color: c.texteDiscret }]}>{niveau.description}</Text>
            <View style={styles.grille}>
              {niveau.lecons.map((lecon, i) => {
                const ouverte = estDebloquee(lecon);
                return (
                  <Pressable
                    key={lecon.id}
                    disabled={!ouverte}
                    onPress={() => router.push(`/lecon/${lecon.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${lecon.titre}${ouverte ? '' : ', verrouillée'}`}
                    style={({ pressed }) => [styles.carteLecon, { opacity: !ouverte ? 0.5 : pressed ? 0.8 : 1 }]}
                  >
                    <Carte style={styles.carteInterieur}>
                      {ouverte ? (
                        <Text style={[styles.numero, { color: c.primaire }]}>{`${niveau.numero}.${i + 1}`}</Text>
                      ) : (
                        <Icone nom="cadenas" taille={24} couleur={c.texteDiscret} />
                      )}
                      <Text style={[styles.titreLecon, { color: c.texte }]} numberOfLines={2}>
                        {lecon.titre}
                      </Text>
                      <Text style={[styles.cle, { color: c.texteDiscret }]}>
                        {lecon.cle === 'sol' ? 'Clé de sol' : 'Clé de fa'} · main {lecon.main}
                      </Text>
                      <Etoiles nombre={etoiles(lecon.id)} />
                    </Carte>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={[styles.pied, { color: c.texteDiscret }]}>
          Astuce : pose ton téléphone à l’horizontale sur le pupitre et joue sur ton piano, le micro t’écoute. Tu
          peux aussi jouer sur l’écran (Réglages).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1 },
  contenu: { padding: 20, paddingBottom: 48 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  titre: { fontSize: 30, fontWeight: '900' },
  sousTitre: { fontSize: 16, marginTop: 2 },
  badge: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  badgeTexte: { fontSize: 20, fontWeight: '800' },
  badgeLegende: { fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  action: { flexGrow: 1 },
  niveau: { marginTop: 18 },
  titreNiveau: { fontSize: 22, fontWeight: '900' },
  descNiveau: { fontSize: 15, marginTop: 2, marginBottom: 10 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  carteLecon: { flexGrow: 1, flexBasis: 150, maxWidth: 260 },
  carteInterieur: { gap: 6, minHeight: 140 },
  numero: { fontSize: 18, fontWeight: '900' },
  titreLecon: { fontSize: 18, fontWeight: '800' },
  cle: { fontSize: 13 },
  pied: { fontSize: 14, marginTop: 28, textAlign: 'center' },
});
