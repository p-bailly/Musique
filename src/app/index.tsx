/**
 * Écran d'accueil : parcours de leçons par niveau (un menu déroulant par niveau,
 * celui de la prochaine leçon ouvert au départ), série de jours,
 * accès au piano libre, à la progression et aux réglages.
 */
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icone } from '@/components/Icones';
import { MiseAJour } from '@/components/MiseAJour';
import { Text } from '@/components/Texte';
import { Bouton, Etoiles, PastilleNote } from '@/components/ui';
import { NIVEAUX, Lecon, TOUTES_LES_LECONS } from '@/data/lecons';
import { NoteEcrite, nomEcrit } from '@/music/notes';
import { useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';
import { ARC_EN_CIEL } from '@/theme/couleurs';

/** Notes distinctes d'une leçon (une par nom, de la plus grave à la plus aiguë). */
function notesDeLaLecon(lecon: Lecon): NoteEcrite[] {
  const parNom = new Map<string, NoteEcrite>();
  for (const n of [...lecon.notes].sort((a, b) => a.midi - b.midi)) {
    if (!parNom.has(nomEcrit(n))) parNom.set(nomEcrit(n), n);
  }
  return [...parNom.values()];
}

export default function Accueil() {
  const { couleurs: c, reglages, sombre } = useReglages();
  const { progression, serieActuelle } = useProgression();

  const etoiles = (id: string) => progression.lecons[id]?.meilleuresEtoiles ?? 0;

  /** Une leçon est débloquée si la précédente a au moins une étoile. */
  const estDebloquee = (lecon: Lecon) => {
    if (reglages.toutDebloquer) return true;
    const i = TOUTES_LES_LECONS.findIndex((l) => l.id === lecon.id);
    return i === 0 || etoiles(TOUTES_LES_LECONS[i - 1].id) > 0;
  };

  const totalEtoiles = TOUTES_LES_LECONS.reduce((s, l) => s + etoiles(l.id), 0);
  const leconsReussies = TOUTES_LES_LECONS.filter((l) => etoiles(l.id) > 0).length;
  // La prochaine leçon à jouer : la première ouverte sans étoile
  const aJouer = TOUTES_LES_LECONS.find((l) => estDebloquee(l) && etoiles(l.id) === 0)?.id;
  const niveauAJouer = NIVEAUX.find((n) => n.lecons.some((l) => l.id === aJouer))?.numero;
  // Niveaux ouverts : au départ, celui de la prochaine leçon
  const [ouverts, setOuverts] = useState<Set<number> | null>(null);
  const estOuvert = (n: number) => (ouverts ? ouverts.has(n) : n === niveauAJouer);
  const basculer = (n: number) =>
    setOuverts((o) => {
      const s = new Set(o ?? (niveauAJouer !== undefined ? [niveauAJouer] : []));
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });

  // Tuiles teintées (orange, bleu, vert), plus sombres en thème sombre
  const teintes = sombre ? ['#3A2A14', '#16263C', '#16301F'] : ['#FFF1D6', '#E6F0FC', '#E3F3E8'];
  const tuiles = [
    {
      valeur: serieActuelle,
      legende: `jour${serieActuelle > 1 ? 's' : ''} d’affilée`,
    },
    { valeur: totalEtoiles, legende: 'étoiles' },
    {
      valeur: leconsReussies,
      legende: `leçon${leconsReussies > 1 ? 's' : ''}`,
    },
  ];

  return (
    <SafeAreaView style={[styles.ecran, { backgroundColor: c.fond }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.arcEnCiel}>
          {ARC_EN_CIEL.map((couleur) => (
            <View key={couleur} style={[styles.bande, { backgroundColor: couleur }]} />
          ))}
        </View>
        <Text style={[styles.titre, { color: c.texte }]}>Solfège Piano</Text>

        <View style={styles.tuiles}>
          {tuiles.map((t, i) => (
            <View key={t.legende} style={[styles.tuile, { backgroundColor: teintes[i] }]}>
              <Text style={[styles.tuileValeur, { color: c.texte }]}>{t.valeur}</Text>
              <Text style={[styles.tuileLegende, { color: c.texteDiscret }]}>{t.legende}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Bouton titre="Piano libre" onPress={() => router.push('/piano')} style={styles.actionPrincipale} />
          <Bouton
            titre="Progression"
            variante="secondaire"
            onPress={() => router.push('/stats')}
            style={styles.action}
          />
          <Pressable
            onPress={() => router.push('/reglages')}
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            style={({ pressed }) => [
              styles.boutonIcone,
              {
                backgroundColor: c.surface,
                borderColor: c.bordure,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Icone nom="reglages" couleur={c.texte} />
          </Pressable>
        </View>

        <MiseAJour compacte style={styles.miseAJour} />

        <Bouton
          titre="Exercices : lire et écouter"
          variante="secondaire"
          onPress={() => router.push('/exercices')}
          style={styles.exercices}
        />

        {NIVEAUX.map((niveau) => {
          const ouvert = estOuvert(niveau.numero);
          const etoilesNiveau = niveau.lecons.reduce((s, l) => s + etoiles(l.id), 0);
          return (
            <View key={niveau.numero} style={styles.niveau}>
              <Pressable
                onPress={() => basculer(niveau.numero)}
                accessibilityRole="button"
                accessibilityState={{ expanded: ouvert }}
                style={({ pressed }) => [
                  styles.enteteNiveau,
                  {
                    backgroundColor: c.surface,
                    borderColor: ouvert ? c.texte : c.bordure,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.corpsLecon}>
                  <Text style={[styles.titreNiveau, { color: c.texte }]}>
                    Niveau {niveau.numero} · {niveau.titre}
                  </Text>
                  <Text style={[styles.descNiveau, { color: c.texteDiscret }]}>
                    {niveau.lecons.length} leçons · {etoilesNiveau}/{niveau.lecons.length * 3} étoiles
                  </Text>
                </View>
                <View
                  style={{
                    transform: [{ rotate: ouvert ? '180deg' : '0deg' }],
                  }}
                >
                  <Icone nom="chevron" couleur={c.texte} />
                </View>
              </Pressable>
              {ouvert && (
                <>
                  <Text style={[styles.descOuvert, { color: c.texteDiscret }]}>{niveau.description}</Text>
                  <View style={styles.liste}>
                    {niveau.lecons.map((lecon, i) => {
                      const ouverte = estDebloquee(lecon);
                      const suivante = lecon.id === aJouer;
                      return (
                        <Pressable
                          key={lecon.id}
                          disabled={!ouverte}
                          onPress={() => router.push(`/lecon/${lecon.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`${lecon.titre}${ouverte ? '' : ', verrouillée'}`}
                          style={({ pressed }) => [
                            styles.carteLecon,
                            {
                              backgroundColor: ouverte ? c.surface : 'transparent',
                              borderColor: suivante ? c.texte : c.bordure,
                              borderStyle: ouverte ? 'solid' : 'dashed',
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <View style={styles.corpsLecon}>
                            <Text style={[styles.titreLecon, { color: ouverte ? c.texte : c.texteDiscret }]}>
                              {niveau.numero}.{i + 1} · {lecon.titre}
                            </Text>
                            <View style={styles.pastilles}>
                              {notesDeLaLecon(lecon).map((n) => (
                                <PastilleNote key={nomEcrit(n)} note={n} eteinte={!ouverte} />
                              ))}
                            </View>
                          </View>
                          {!ouverte ? (
                            <Icone nom="cadenas" couleur={c.texteDiscret} />
                          ) : suivante ? (
                            <View style={[styles.rondLecture, { backgroundColor: c.primaire }]}>
                              <Icone nom="lecture" taille={18} couleur={c.surPrimaire} />
                            </View>
                          ) : (
                            <Etoiles nombre={etoiles(lecon.id)} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1 },
  contenu: { padding: 20, paddingBottom: 48 },
  arcEnCiel: { flexDirection: 'row', gap: 5, marginBottom: 14 },
  bande: { flex: 1, height: 8, borderRadius: 4 },
  titre: { fontSize: 34, fontWeight: '900' },
  tuiles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  tuile: { flex: 1, padding: 12, borderRadius: 20 },
  tuileValeur: { fontSize: 28, fontWeight: '900' },
  tuileLegende: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionPrincipale: { flex: 1, paddingHorizontal: 10 },
  action: { flex: 1, paddingHorizontal: 10 },
  boutonIcone: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercices: { marginTop: 10 },
  miseAJour: { marginTop: 10 },
  niveau: { marginTop: 12 },
  enteteNiveau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
  },
  titreNiveau: { fontSize: 19, fontWeight: '900' },
  descNiveau: { fontSize: 14, fontWeight: '700' },
  descOuvert: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  liste: { gap: 10 },
  carteLecon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  corpsLecon: { flex: 1, gap: 8 },
  titreLecon: { fontSize: 17, fontWeight: '800' },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rondLecture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pied: { fontSize: 14, fontWeight: '600', marginTop: 28, textAlign: 'center' },
});
