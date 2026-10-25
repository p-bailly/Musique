/**
 * Clavier de piano virtuel, avec le nom français de chaque touche et sa
 * couleur (bande en bas des touches blanches). La touche à jouer s'allume
 * entièrement à la couleur de sa note ; un appui juste ou faux
 * colore brièvement la touche en vert ou en rouge.
 */
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Texte';
import { DO_CENTRAL, estToucheNoire, nomNote } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';
import { couleurDegre, couleurNote } from '@/theme/couleurs';
import { geometrieClavier } from './geometrieClavier';

interface Props {
  min: number;
  max: number;
  largeur: number;
  hauteur: number;
  onAppui: (midi: number) => void;
  /** Touches à allumer (notes à jouer : une seule, ou un accord), avec leur degré écrit pour la couleur. */
  surbrillance?: { midi: number; degre?: number }[];
  /** Dernier retour (juste / faux) à afficher sur une touche. */
  retour?: { midi: number; type: 'ok' | 'erreur'; id: number } | null;
  afficherNoms: boolean;
  /**
   * Faux quand l'élève joue sur son vrai piano : le clavier sert alors de
   * guide visuel (où poser les doigts) et ne réagit pas au toucher.
   */
  interactif?: boolean;
}

function ClavierBase({ min, max, largeur, hauteur, onAppui, surbrillance, retour, afficherNoms, interactif = true }: Props) {
  const c = useCouleurs();
  const touches = useMemo(() => geometrieClavier(min, max, largeur), [min, max, largeur]);
  const [enfoncees, setEnfoncees] = useState<Set<number>>(new Set());
  const [idExpire, setIdExpire] = useState<number | null>(null);

  // Le flash vert/rouge disparaît après un court instant
  useEffect(() => {
    if (!retour) return;
    const t = setTimeout(() => setIdExpire(retour.id), 350);
    return () => clearTimeout(t);
  }, [retour]);
  const flash = retour && retour.id !== idExpire ? retour : null;

  const appuyer = (midi: number) => {
    setEnfoncees((s) => new Set(s).add(midi));
    onAppui(midi);
  };
  const relacher = (midi: number) => {
    setEnfoncees((s) => {
      const n = new Set(s);
      n.delete(midi);
      return n;
    });
  };

  /** Couleur de la note allumée sur cette touche (Sib prend la couleur du Si), ou null. */
  const allumee = (midi: number) => {
    const s = surbrillance?.find((n) => n.midi === midi);
    if (!s) return null;
    return s.degre !== undefined ? couleurDegre(s.degre) : couleurNote(midi);
  };

  /** Texte posé sur la touche : lisible sur la couleur de la note quand elle est allumée. */
  const couleurNom = (midi: number, noire: boolean) => {
    if (flash && flash.midi === midi) return '#FFFFFF';
    const a = allumee(midi);
    if (a) return a.texte;
    return noire ? c.texteToucheNoire : c.texteToucheBlanche;
  };

  const couleurTouche = (midi: number, noire: boolean) => {
    if (flash && flash.midi === midi) return flash.type === 'ok' ? c.succes : c.erreur;
    const a = allumee(midi);
    if (a) return a.fond;
    if (enfoncees.has(midi)) return noire ? '#4A463D' : c.surfaceAlt;
    return noire ? c.toucheNoire : c.toucheBlanche;
  };

  const midis = [...touches.keys()];
  const blanches = midis.filter((m) => !estToucheNoire(m));
  const noires = midis.filter((m) => estToucheNoire(m));
  const tailleTexte = Math.max(10, Math.min(16, (largeur / blanches.length) * 0.32));

  return (
    <View style={{ width: largeur, height: hauteur }} pointerEvents={interactif ? 'auto' : 'none'}>
      {blanches.map((m) => {
        const t = touches.get(m)!;
        return (
          <Pressable
            key={m}
            onPressIn={() => appuyer(m)}
            onPressOut={() => relacher(m)}
            accessibilityRole="button"
            accessibilityLabel={`Touche ${nomNote(m)}`}
            style={[
              styles.blanche,
              {
                left: t.x,
                width: t.largeur,
                height: hauteur,
                backgroundColor: couleurTouche(m, false),
                borderColor: c.bordure,
              },
            ]}
          >
            {afficherNoms && (
              <Text style={[styles.nom, { color: couleurNom(m, false), fontSize: tailleTexte }]}>{nomNote(m)}</Text>
            )}
            {/* Bande à la couleur de la note */}
            <View style={[styles.bandeNote, { backgroundColor: couleurNote(m).fond }]} />
            {/* Repère du do central */}
            {m === DO_CENTRAL && <View style={[styles.repere, { backgroundColor: c.toucheNoire }]} />}
          </Pressable>
        );
      })}
      {noires.map((m) => {
        const t = touches.get(m)!;
        return (
          <Pressable
            key={m}
            onPressIn={() => appuyer(m)}
            onPressOut={() => relacher(m)}
            accessibilityRole="button"
            accessibilityLabel={`Touche ${nomNote(m)}`}
            style={[
              styles.noire,
              { left: t.x, width: t.largeur, height: hauteur * 0.6, backgroundColor: couleurTouche(m, true) },
            ]}
          >
            {afficherNoms && (
              <Text
                style={[styles.nomNoire, { color: couleurNom(m, true), fontSize: tailleTexte * 0.62 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {nomNote(m)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export const Clavier = memo(ClavierBase);

const styles = StyleSheet.create({
  blanche: {
    position: 'absolute',
    top: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 14,
    overflow: 'hidden',
  },
  noire: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    elevation: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    paddingHorizontal: 1,
  },
  nom: { fontWeight: '700' },
  nomNoire: { fontWeight: '600' },
  bandeNote: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6 },
  repere: { position: 'absolute', bottom: 9, width: 6, height: 6, borderRadius: 3 },
});
