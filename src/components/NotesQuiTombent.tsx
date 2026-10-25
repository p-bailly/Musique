/**
 * Zone où les blocs de notes descendent vers le clavier.
 * Chaque bloc est aligné sur sa touche, à la couleur de sa note ; sa hauteur
 * représente la durée.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { NoteMorceau } from '@/data/lecons';
import { EtatNote } from '@/hooks/useMoteurJeu';
import { estToucheNoire, nomNote } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';
import { couleurNote } from '@/theme/couleurs';
import { geometrieClavier } from './geometrieClavier';

interface Props {
  notes: NoteMorceau[];
  etats: EtatNote[];
  prochaine: number;
  /** Temps actuel du morceau (en temps musicaux). */
  temps: number;
  min: number;
  max: number;
  largeur: number;
  hauteur: number;
  /** Nombre de temps visibles au-dessus de la ligne. */
  tempsVisibles: number;
  afficherNoms: boolean;
}

export function NotesQuiTombent({
  notes,
  etats,
  prochaine,
  temps,
  min,
  max,
  largeur,
  hauteur,
  tempsVisibles,
  afficherNoms,
}: Props) {
  const c = useCouleurs();
  const touches = useMemo(() => geometrieClavier(min, max, largeur), [min, max, largeur]);
  const pxParTemps = hauteur / tempsVisibles;

  // Lignes verticales légères à chaque Do, pour se repérer
  const reperes = useMemo(() => {
    const r: number[] = [];
    for (let m = min; m <= max; m++) if (m % 12 === 0) r.push(touches.get(m)!.x);
    return r;
  }, [min, max, touches]);

  return (
    <View style={[styles.zone, { width: largeur, height: hauteur, backgroundColor: c.zoneJeu }]}>
      {reperes.map((x) => (
        <View key={x} style={[styles.repere, { left: x, height: hauteur, backgroundColor: c.bordure }]} />
      ))}

      {notes.map((n, i) => {
        // Bas du bloc = moment où la note doit être jouée
        const bas = hauteur - (n.debut - temps) * pxParTemps;
        const haut = bas - n.duree * pxParTemps;
        if (bas < 0 || haut > hauteur + 40) return null; // hors écran
        const t = touches.get(n.midi);
        if (!t) return null;

        const etat = etats[i];
        const estProchaine = i === prochaine;
        // Une note manquée devient grise (le rouge est déjà la couleur du Do)
        const couleur = couleurNote(n.midi);
        const fond = etat === 'manquee' ? c.texteDiscret : couleur.fond;
        const texte = etat === 'manquee' ? c.fond : couleur.texte;
        const marge = t.noire ? 1 : 3;
        return (
          <View
            key={n.index}
            style={[
              styles.bloc,
              {
                left: t.x + marge,
                width: t.largeur - marge * 2,
                top: haut + 2,
                height: Math.max(8, bas - haut - 4),
                backgroundColor: fond,
                opacity: etat === 'attente' ? 1 : 0.45,
                borderColor: estProchaine ? c.surbrillance : 'transparent',
              },
            ]}
          >
            {afficherNoms && (
              <Text style={[styles.nom, { color: texte, fontSize: estToucheNoire(n.midi) ? 9 : 12 }]} numberOfLines={1}>
                {nomNote(n.midi)}
              </Text>
            )}
          </View>
        );
      })}

      {/* Ligne d'impact, juste au-dessus du clavier */}
      <View style={[styles.ligne, { backgroundColor: c.ligneImpact }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { overflow: 'hidden' },
  repere: { position: 'absolute', top: 0, width: 1, opacity: 0.6 },
  bloc: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  nom: { fontWeight: '800' },
  ligne: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
});
