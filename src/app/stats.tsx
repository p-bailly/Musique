/**
 * Statistiques simples : série de jours, étoiles, précision, temps de
 * pratique et graphique des 7 derniers jours.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Carte, Etoiles } from '@/components/ui';
import { NIVEAUX, TOUTES_LES_LECONS } from '@/data/lecons';
import { jourLocal, useProgression } from '@/store/Progression';
import { useCouleurs } from '@/store/Reglages';

const JOURS_SEMAINE = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

export default function Statistiques() {
  const c = useCouleurs();
  const { progression: p, serieActuelle } = useProgression();

  const totalEtoiles = TOUTES_LES_LECONS.reduce((s, l) => s + (p.lecons[l.id]?.meilleuresEtoiles ?? 0), 0);
  const leconsReussies = TOUTES_LES_LECONS.filter((l) => (p.lecons[l.id]?.meilleuresEtoiles ?? 0) > 0).length;
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
    { valeur: `🔥 ${serieActuelle}`, legende: `jour${serieActuelle > 1 ? 's' : ''} d'affilée` },
    { valeur: `🏆 ${p.serie.record}`, legende: 'record de série' },
    { valeur: `⭐ ${totalEtoiles}/${TOUTES_LES_LECONS.length * 3}`, legende: 'étoiles' },
    { valeur: `📚 ${leconsReussies}/${TOUTES_LES_LECONS.length}`, legende: 'leçons réussies' },
    { valeur: `🎯 ${precision} %`, legende: 'précision' },
    { valeur: `⏱ ${minutes} min`, legende: 'de pratique' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <View style={styles.tuiles}>
        {tuiles.map((t) => (
          <Carte key={t.legende} style={styles.tuile}>
            <Text style={[styles.valeur, { color: c.texte }]}>{t.valeur}</Text>
            <Text style={{ color: c.texteDiscret, fontSize: 14 }}>{t.legende}</Text>
          </Carte>
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
                  { height: Math.max(3, (j.minutes / maxMinutes) * 110), backgroundColor: i === 6 ? c.primaire : c.blocDroite },
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
                  {r ? `${Math.round(r.meilleurePrecision * 100)} % · ${r.parties} partie${r.parties > 1 ? 's' : ''}` : '—'}
                </Text>
                <Etoiles nombre={r?.meilleuresEtoiles ?? 0} taille={16} />
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
  tuile: { flexGrow: 1, flexBasis: 140, alignItems: 'center', paddingVertical: 14 },
  valeur: { fontSize: 24, fontWeight: '900' },
  bloc: { gap: 8 },
  titre: { fontSize: 18, fontWeight: '800' },
  graphe: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingTop: 8 },
  colonne: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barre: { width: 22, borderRadius: 6 },
  ligneLecon: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
