/**
 * Réglages : vue des leçons, vitesse des notes, mode attente, noms des notes,
 * thème clair/sombre, déblocage des leçons, remise à zéro.
 */
import { router } from 'expo-router';
import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { MiseAJour } from '@/components/MiseAJour';
import { Text } from '@/components/Texte';
import { Bouton, Carte, Choix } from '@/components/ui';
import { useMidi } from '@/store/Midi';
import { useProgression } from '@/store/Progression';
import { Affichage, ChoixTheme, useCouleurs, useReglages } from '@/store/Reglages';

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
  const midi = useMidi();

  const confirmerRemiseAZero = () =>
    Alert.alert('Effacer la progression ?', 'Toutes les étoiles et statistiques seront perdues.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: reinitialiser },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Pendant les leçons, afficher…</Text>
        <Choix<Affichage>
          options={[
            { valeur: 'les-deux', libelle: 'Partition + notes' },
            { valeur: 'partition', libelle: 'La partition' },
            { valeur: 'chute', libelle: 'Les notes qui tombent' },
          ]}
          valeur={reglages.affichage}
          onChange={(v) => modifier({ affichage: v })}
        />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Clavier MIDI</Text>
        {!midi.disponible ? (
          <Text style={{ color: c.texteDiscret, fontSize: 14 }}>
            Pas de MIDI ici : il faut l’appli installée sur un téléphone Android (APK), pas Expo Go.
          </Text>
        ) : (
          <>
            <Text style={{ color: midi.connecte ? c.succes : c.texteDiscret, fontSize: 15, fontWeight: '700' }}>
              {midi.connecte ? `Connecté : ${midi.connecte}` : 'Aucun clavier connecté'}
            </Text>
            <Text style={{ color: c.texteDiscret, fontSize: 14 }}>
              Un clavier MIDI reconnaît chaque note sans erreur, accords compris. En USB (avec un adaptateur OTG), il se
              connecte tout seul. En Bluetooth, cherche-le une fois ici : l’appli s’y reconnectera ensuite.
            </Text>
            {midi.appareils
              .filter((a) => !a.connecte)
              .map((a) => (
                <Bouton key={a.id} titre={`Connecter ${a.nom}`} variante="secondaire" petit onPress={() => midi.connecter(a.id)} />
              ))}
            {Platform.OS === 'android' && (
              <Bouton
                titre={midi.rechercheEnCours ? 'Recherche…' : 'Chercher un clavier Bluetooth'}
                variante="secondaire"
                desactive={midi.rechercheEnCours}
                onPress={midi.chercherBluetooth}
              />
            )}
            {midi.bluetoothTrouves.map((a) => (
              <Bouton key={a.adresse} titre={a.nom} petit onPress={() => midi.connecterBluetooth(a)} />
            ))}
            {midi.connecte && Platform.OS === 'android' && (
              <Bouton titre="Déconnecter" variante="secondaire" petit onPress={midi.deconnecter} />
            )}
            {midi.erreur && <Text style={{ color: c.erreur, fontSize: 14 }}>{midi.erreur}</Text>}
          </>
        )}
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Vitesse des notes</Text>
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
          titre="Mode attente"
          detail="Le morceau s'arrête jusqu'à ce que tu joues la bonne note (certaines leçons de rythme le désactivent par défaut)."
          valeur={reglages.modeAttente}
          onChange={(v) => modifier({ modeAttente: v })}
        />
        <Interrupteur
          titre="Noms des notes"
          detail="Afficher Do, Ré, Mi… sur le clavier, les blocs et la portée. Masque-les pour t'entraîner à lire !"
          valeur={reglages.nomsNotes}
          onChange={(v) => modifier({ nomsNotes: v })}
        />
        <Interrupteur
          titre="Métronome"
          detail="Un clic à chaque temps pendant le morceau (plus aigu sur le premier temps de la mesure)."
          valeur={reglages.metronome}
          onChange={(v) => modifier({ metronome: v })}
        />
        <Interrupteur
          titre="Décompte audible"
          detail="Une mesure de clics avant la première note, pour prendre le tempo."
          valeur={reglages.decompteAudible}
          onChange={(v) => modifier({ decompteAudible: v })}
        />
        <Interrupteur
          titre="Toutes les leçons"
          detail="Accéder à toutes les leçons sans devoir les débloquer dans l'ordre."
          valeur={reglages.toutDebloquer}
          onChange={(v) => modifier({ toutDebloquer: v })}
        />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Thème</Text>
        <Choix<ChoixTheme>
          options={[
            { valeur: 'systeme', libelle: 'Automatique' },
            { valeur: 'clair', libelle: 'Clair' },
            { valeur: 'sombre', libelle: 'Sombre' },
          ]}
          valeur={reglages.theme}
          onChange={(v) => modifier({ theme: v })}
        />
      </Carte>

      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Jouer sur un vrai piano</Text>
        <Text style={{ color: c.texteDiscret, fontSize: 15, lineHeight: 21 }}>
          Pose le téléphone sur le pupitre de ton piano : le micro s’allume tout seul (le bouton « Micro » permet de le
          couper). Il reconnaît les accords et les deux mains ensemble. L’octave n’est pas vérifiée au micro (seul le nom
          de la note compte), et une note qui sonne comme l’harmonique d’une autre note de l’accord (son octave, par
          exemple) est validée avec elle.
        </Text>
        <Bouton titre="Calibrer le micro" variante="secondaire" onPress={() => router.push('/calibration')} />
      </Carte>

      <MiseAJour />

      <Bouton titre="Effacer ma progression" variante="danger" onPress={confirmerRemiseAZero} />

      <Text style={{ color: c.texteDiscret, fontSize: 13, textAlign: 'center' }}>
        Sons de piano : Salamander Grand Piano V3, par Alexander Holm (licence CC BY 3.0).
      </Text>
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
