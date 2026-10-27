/**
 * Statistiques simples : série de jours, étoiles, précision, temps de
 * pratique et graphique des 7 derniers jours.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { Carte, Etoiles } from '@/components/ui';
import { NIVEAUX, TOUTES_LES_LECONS } from '@/data/lecons';
import { jourLocal, leconReussie, useProgression } from '@/store/Progression';
import { useReglages } from '@/store/Reglages';
import { ARC_EN_CIEL } from '@/theme/couleurs';

const JOURS_SEMAINE = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

export default function Statistiques() {
  const { couleurs: c, sombre } = useReglages();
  // Tuiles teintées (orange, bleu, vert), plus sombres en thème sombre
  const teintes = sombre ? ['#3A2A14', '#16263C', '#16301F'] : ['#FFF1D6', '#E6F0FC', '#E3F3E8'];
  const { progression: p, serieActuelle } = useProgression();

  const totalEtoiles = TOUTES_LES_LECONS.reduce((s, l) => s + (p.lecons[l.id]?.meilleuresEtoiles ?? 0), 0);
  const totalBleues = TOUTES_LES_LECONS.reduce((s, l) => s + (p.lecons[l.id]?.meilleuresEtoilesLibre ?? 0), 0);
  const leconsReussies = TOUTES_LES_LECONS.filter((l) => leconReussie(p.lecons[l.id])).length;
  const essais = p.totaux.notesReussies + p.totaux.erreurs;
  const precision = essais ? Math.round((p.totaux.notesReussies / essais) * 100) : 0;
  const minutes = Math.round(p.totaux.secondesPratique / 60);

  // 7 derniers jours, du plus ancien à aujourd'hui
  const semaine = Array.from({ length: 7 }, (_, i) => {
    const decalage = i - 6;
    const d = new Date();
    d.setDate(d.getDate() + decalage);
    return { libelle: JOURS_SEMAINE[d.getDay()], minutes: p.jours[jourLocal(decalage)] ?? 0 };
  });
  const maxMinutes = Math.max(5, ...semaine.map((j) => j.minutes));

  const tuiles = [
    { valeur: `${serieActuelle}`, legende: `jour${serieActuelle > 1 ? 's' : ''} d'affilée` },
    { valeur: `${p.serie.record}`, legende: 'record de série' },
    { valeur: `${totalEtoiles}/${TOUTES_LES_LECONS.length * 3}`, legende: 'étoiles jaunes (attente)' },
    { valeur: `${totalBleues}/${TOUTES_LES_LECONS.length * 3}`, legende: 'étoiles bleues (rythme)' },
    { valeur: `${leconsReussies}/${TOUTES_LES_LECONS.length}`, legende: 'leçons réussies' },
    { valeur: `${precision} %`, legende: 'précision' },
    { valeur: `${minutes} min`, legende: 'de pratique' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <View style={styles.tuiles}>
        {tuiles.map((t, i) => (
          <View key={t.legende} style={[styles.tuile, { backgroundColor: teintes[i % 3] }]}>
            <Text style={[styles.valeur, { color: c.texte }]}>{t.valeur}</Text>
            <Text style={{ color: c.texteDiscret, fontSize: 14, fontWeight: '700' }}>{t.legende}</Text>
          </View>
        ))}
      </View>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Minutes de pratique (7 jours)</Text>
        <View style={styles.graphe}>
          {semaine.map((j, i) => (
            <View key={i} style={styles.colonne}>
              <Text style={{ color: c.texteDiscret, fontSize: 12 }}>{j.minutes >= 1 ? Math.round(j.minutes) : ''}</Text>
              <View
                style={[
                  styles.barre,
                  { height: Math.max(3, (j.minutes / maxMinutes) * 110), backgroundColor: ARC_EN_CIEL[i], opacity: i === 6 ? 1 : 0.75 },
                ]}
              />
              <Text style={{ color: c.texte, fontSize: 13, fontWeight: '700' }}>{j.libelle}</Text>
            </View>
          ))}
        </View>
      </Carte>

      {NIVEAUX.map((n) => (
        <Carte key={n.numero} style={styles.bloc}>
          <Text style={[styles.titre, { color: c.texte }]}>
            Niveau {n.numero} · {n.titre}
          </Text>
          {n.lecons.map((l) => {
            const r = p.lecons[l.id];
            return (
              <View key={l.id} style={[styles.ligneLecon, { borderColor: c.bordure }]}>
                <Text style={{ color: c.texte, fontSize: 16, flex: 1 }}>{l.titre}</Text>
                <Text style={{ color: c.texteDiscret, fontSize: 13, marginRight: 10 }}>
                  {r
                    ? `${Math.round(r.meilleurePrecision * 100)} %${
                        r.meilleurRythme ? ` · rythme ${Math.round(r.meilleurRythme * 100)} %` : ''
                      } · ${r.parties} partie${r.parties > 1 ? 's' : ''}`
                    : '—'}
                </Text>
                <View style={{ gap: 3, alignItems: 'flex-end' }}>
                  <Etoiles nombre={r?.meilleuresEtoiles ?? 0} taille={16} />
                  {(r?.meilleuresEtoilesLibre ?? 0) > 0 && <Etoiles nombre={r!.meilleuresEtoilesLibre!} taille={16} bleues />}
                </View>
              </View>
            );
          })}
        </Carte>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 14, paddingBottom: 40 },
  tuiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tuile: { flexGrow: 1, flexBasis: 140, padding: 14, borderRadius: 20 },
  valeur: { fontSize: 28, fontWeight: '900' },
  bloc: { gap: 8 },
  titre: { fontSize: 18, fontWeight: '800' },
  graphe: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingTop: 8 },
  colonne: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barre: { width: 22, borderRadius: 8 },
  ligneLecon: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
