/**
 * Petits composants d'interface réutilisables : grands boutons, étoiles,
 * cartes, interrupteurs… Tous respectent le thème clair/sombre.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icone } from '@/components/Icones';
import { useCouleurs } from '@/store/Reglages';

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
  const fond = variante === 'primaire' ? c.primaire : variante === 'danger' ? c.erreur : c.surfaceAlt;
  const texte = variante === 'secondaire' ? c.texte : c.surPrimaire;
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
              { backgroundColor: actif ? c.primaire : c.surfaceAlt, borderColor: actif ? c.primaire : c.bordure },
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPetit: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12 },
  texteBouton: { fontSize: 19, fontWeight: '800' },
  texteBoutonPetit: { fontSize: 16 },
  etoiles: { flexDirection: 'row' },
  carte: { borderRadius: 18, borderWidth: 1, padding: 16 },
  choix: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastille: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, minWidth: 56, alignItems: 'center' },
});
