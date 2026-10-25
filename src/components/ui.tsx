/**
 * Petits composants d'interface réutilisables : grands boutons, étoiles,
 * cartes, pastilles de notes… Tous respectent le thème clair/sombre.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/Texte';
import { Icone } from '@/components/Icones';
import { nomNote } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';
import { couleurNote } from '@/theme/couleurs';

interface BoutonProps {
  titre: string;
  onPress: () => void;
  variante?: 'primaire' | 'secondaire' | 'danger';
  petit?: boolean;
  desactive?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Grand bouton arrondi, facile à toucher. */
export function Bouton({ titre, onPress, variante = 'primaire', petit, desactive, style, accessibilityLabel }: BoutonProps) {
  const c = useCouleurs();
  const fond = variante === 'primaire' ? c.primaire : variante === 'danger' ? c.erreur : c.surface;
  const texte = variante === 'secondaire' ? c.texte : variante === 'danger' ? '#FFFFFF' : c.surPrimaire;
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titre}
      style={({ pressed }) => [
        styles.bouton,
        petit && styles.boutonPetit,
        { backgroundColor: fond, opacity: desactive ? 0.4 : pressed ? 0.75 : 1 },
        variante === 'secondaire' && { borderWidth: 2, borderColor: c.bordure },
        style,
      ]}
    >
      <Text style={[styles.texteBouton, petit && styles.texteBoutonPetit, { color: texte }]}>{titre}</Text>
    </Pressable>
  );
}

/** Rangée de 3 étoiles (pleines ou vides). */
export function Etoiles({ nombre, taille = 18 }: { nombre: number; taille?: number }) {
  const c = useCouleurs();
  return (
    <View style={styles.etoiles} accessibilityLabel={`${nombre} étoile${nombre > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map((i) => (
        <Icone key={i} nom="etoile" taille={taille} couleur={i <= nombre ? c.etoile : c.bordure} />
      ))}
    </View>
  );
}

/** Pastille d'une note, à sa couleur (Do rouge, Ré orange…) ; grisée si `eteinte`. */
export function PastilleNote({ midi, eteinte }: { midi: number; eteinte?: boolean }) {
  const c = useCouleurs();
  const n = couleurNote(midi);
  return (
    <View style={[styles.pastilleNote, { backgroundColor: eteinte ? c.surfaceAlt : n.fond }]}>
      <Text style={[styles.texteNote, { color: eteinte ? c.texteDiscret : n.texte }]}>{nomNote(midi)}</Text>
    </View>
  );
}

/** Carte avec fond et coins arrondis. */
export function Carte({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useCouleurs();
  return <View style={[styles.carte, { backgroundColor: c.surface, borderColor: c.bordure }, style]}>{children}</View>;
}

/** Groupe de choix (« pastilles ») dont un seul est sélectionné. */
export function Choix<T extends string | number>({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  const c = useCouleurs();
  return (
    <View style={styles.choix}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={String(o.valeur)}
            onPress={() => onChange(o.valeur)}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            style={[
              styles.pastille,
              { backgroundColor: actif ? c.primaire : c.surface, borderColor: actif ? c.primaire : c.bordure },
            ]}
          >
            <Text style={{ color: actif ? c.surPrimaire : c.texte, fontWeight: '700', fontSize: 16 }}>{o.libelle}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPetit: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14 },
  texteBouton: { fontSize: 18, fontWeight: '800' },
  texteBoutonPetit: { fontSize: 16 },
  etoiles: { flexDirection: 'row', gap: 2 },
  carte: { borderRadius: 20, borderWidth: 2, padding: 16 },
  choix: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastille: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 2, minWidth: 56, alignItems: 'center' },
  pastilleNote: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  texteNote: { fontSize: 13, fontWeight: '800' },
});
