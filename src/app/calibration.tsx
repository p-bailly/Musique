/**
 * Calibration du micro : mesure du bruit de fond de la pièce, choix de la
 * sensibilité, puis essai en direct (les notes entendues s'affichent, accords compris).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { Bouton, Carte, Choix, PastilleNote } from '@/components/ui';
import { useMicro } from '@/hooks/useMicro';
import { useReglages } from '@/store/Reglages';

const SENSIBILITES = [
  { valeur: 0.6, libelle: 'Faible' },
  { valeur: 1, libelle: 'Normale' },
  { valeur: 1.4, libelle: 'Forte' },
  { valeur: 2, libelle: 'Très forte' },
];

export default function Calibration() {
  const { reglages, modifier, couleurs: c } = useReglages();
  const [etape, setEtape] = useState<'attente' | 'silence' | 'fini'>('attente');
  const micro = useMicro({ onNote: () => {} });

  // Le micro écoute pendant tout l'écran
  const demarrer = micro.demarrer;
  useEffect(() => {
    demarrer();
  }, [demarrer]);

  const mesurer = async () => {
    setEtape('silence');
    const bruit = await micro.mesurerBruit(2500);
    modifier({ bruitMicro: bruit });
    setEtape('fini');
  };

  const pret = micro.etat === 'actif';
  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>1. Le silence de la pièce</Text>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Pose le téléphone sur le pupitre, comme pour jouer. Touche « Mesurer », puis ne joue rien pendant 3 secondes :
          l’appli apprend le bruit de fond (ventilation, rue…) pour ne pas le prendre pour des notes.
        </Text>
        <Bouton
          titre={etape === 'silence' ? 'Silence…' : 'Mesurer le silence'}
          desactive={!pret || etape === 'silence'}
          onPress={mesurer}
        />
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          {reglages.bruitMicro > 0
            ? `Bruit de fond mesuré : ${Math.round(reglages.bruitMicro * 1000)} (plus c’est bas, plus la pièce est calme).`
            : 'Pas encore mesuré.'}
        </Text>
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>2. La sensibilité</Text>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Plus forte si des notes douces ne sont pas reconnues ; plus faible si l’appli entend des notes que tu n’as pas
          jouées.
        </Text>
        <Choix options={SENSIBILITES} valeur={reglages.sensibiliteMicro} onChange={(v) => modifier({ sensibiliteMicro: v })} />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>3. Essaie</Text>
        <Text style={[styles.texte, { color: c.texteDiscret }]}>
          Joue une note, puis un accord (Do-Mi-Sol avec la main gauche, par exemple) : les notes entendues s’affichent
          ci-dessous.
        </Text>
        <View style={[styles.vumetre, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.niveau, { width: `${Math.round(micro.niveau * 100)}%`, backgroundColor: c.succes }]} />
        </View>
        <View style={styles.notes}>
          {micro.entendues.length ? (
            micro.entendues.map((m) => <PastilleNote key={m} note={m} />)
          ) : (
            <Text style={[styles.texte, { color: c.texteDiscret }]}>
              {micro.etat === 'refuse' ? 'Micro refusé : autorise-le dans les réglages du téléphone.' : pret ? 'J’écoute…' : 'Activation du micro…'}
            </Text>
          )}
        </View>
      </Carte>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, gap: 14, paddingBottom: 40 },
  bloc: { gap: 12 },
  titre: { fontSize: 18, fontWeight: '800' },
  texte: { fontSize: 15, lineHeight: 21 },
  vumetre: { height: 10, borderRadius: 5, overflow: 'hidden' },
  niveau: { height: 10, borderRadius: 5 },
  notes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 32, alignItems: 'center' },
});
