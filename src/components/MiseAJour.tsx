/**
 * Carte de mise à jour : version installée, nouvelle version disponible,
 * téléchargement (avec sa progression) puis installation par Android.
 * `compacte` : seulement quand une nouvelle version existe (accueil).
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/Texte';
import { Bouton, Carte } from '@/components/ui';
import { MISE_A_JOUR_POSSIBLE, useMiseAJour, VERSION_INSTALLEE } from '@/hooks/useMiseAJour';
import { useCouleurs } from '@/store/Reglages';

export function MiseAJour({ compacte, style }: { compacte?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useCouleurs();
  const { etat, verifier, installer } = useMiseAJour();
  if (compacte && etat.etape !== 'disponible' && etat.etape !== 'telechargement') return null;
  if (!MISE_A_JOUR_POSSIBLE) {
    if (compacte) return null;
    return (
      <Carte style={styles.bloc}>
        <Text style={[styles.titre, { color: c.texte }]}>Mise à jour</Text>
        <Text style={[styles.detail, { color: c.texteDiscret }]}>
          Disponible dans l’appli Android installée depuis GitHub (APK).
        </Text>
      </Carte>
    );
  }

  let texte = `Version installée : ${VERSION_INSTALLEE}`;
  if (etat.etape === 'verification') texte += ' · vérification…';
  if (etat.etape === 'aJour') texte += ' · c’est la dernière.';
  if (etat.etape === 'disponible') texte = `Nouvelle version ${etat.version} disponible (tu as la ${VERSION_INSTALLEE}).`;
  if (etat.etape === 'telechargement') texte = `Téléchargement… ${Math.round(etat.progres * 100)} %`;
  if (etat.etape === 'erreur') texte = etat.message;

  return (
    <Carte style={[styles.bloc, compacte && { borderColor: c.primaire }, style]}>
      {!compacte && <Text style={[styles.titre, { color: c.texte }]}>Mise à jour</Text>}
      <Text style={[styles.detail, { color: etat.etape === 'erreur' ? c.erreur : c.texte }]}>{texte}</Text>
      {etat.etape === 'telechargement' && (
        <View style={[styles.barre, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.progres, { width: `${etat.progres * 100}%`, backgroundColor: c.primaire }]} />
        </View>
      )}
      {etat.etape === 'disponible' && <Bouton titre="Mettre à jour" onPress={installer} />}
      {(etat.etape === 'aJour' || etat.etape === 'erreur') && !compacte && (
        <Bouton titre="Vérifier" variante="secondaire" petit onPress={verifier} />
      )}
    </Carte>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 10 },
  titre: { fontSize: 18, fontWeight: '800' },
  detail: { fontSize: 15, fontWeight: '600' },
  barre: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progres: { height: 10, borderRadius: 5 },
});
