/**
 * Écran de jeu d'une leçon (en paysage), jouée sur un clavier MIDI.
 * Selon le réglage « Vue » :
 *  - les deux : la portée en haut, les notes qui tombent au milieu, le clavier guide en bas ;
 *  - partition : la portée seule, sur toute la hauteur ;
 *  - notes : les notes qui tombent et le clavier guide, sans portée.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { jouerClic } from '@/audio/piano';
import { Clavier } from '@/components/Clavier';
import { EtatMidi } from '@/components/EtatMidi';
import { Icone, NomIcone } from '@/components/Icones';
import { NotesQuiTombent } from '@/components/NotesQuiTombent';
import { Portee, StatutTete } from '@/components/Portee';
import { Bouton, Carte, Choix, Etoiles } from '@/components/ui';
import { fenetreClavier, leconSuivante, trouverLecon } from '@/data/lecons';
import { Bilan, useMoteurJeu } from '@/hooks/useMoteurJeu';
import { nomEcrit } from '@/music/notes';
import { calculerEtoiles, useProgression } from '@/store/Progression';
import { useMidi, useNotesMidi } from '@/store/Midi';
import { Affichage, TaillePartition, useReglages } from '@/store/Reglages';
import { revenir } from '@/utils/navigation';

export default function EcranLecon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lecon = trouverLecon(String(id));
  if (!lecon) {
    return (
      <View style={styles.centre}>
        <Text>Leçon introuvable.</Text>
        <Bouton titre="Retour" onPress={() => revenir()} />
      </View>
    );
  }
  // `key` : repart d'un état neuf quand on passe à la leçon suivante
  return <Jeu key={lecon.id} leconId={lecon.id} />;
}

function Jeu({ leconId }: { leconId: string }) {
  const lecon = trouverLecon(leconId)!;
  const { reglages, couleurs: c } = useReglages();
  const midi = useMidi();
  const vue = reglages.affichage;
  const { enregistrerPartie, progression } = useProgression();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [modeAttente, setModeAttente] = useState(lecon.attente ?? reglages.modeAttente);
  const [resultat, setResultat] = useState<(Bilan & { etoiles: number }) | null>(null);

  // Fin de partie : calcul des étoiles et sauvegarde
  const onFin = useCallback(
    (b: Bilan) => {
      // En mode attente, on termine forcément : au moins 1 étoile
      const etoiles = modeAttente ? Math.max(1, calculerEtoiles(b.precision)) : calculerEtoiles(b.precision);
      setResultat({ ...b, etoiles });
      enregistrerPartie({
        leconId: lecon.id,
        etoiles,
        precision: b.precision,
        reussies: b.reussies,
        erreurs: b.erreurs,
        secondes: b.secondes,
      });
    },
    [lecon.id, modeAttente, enregistrerPartie],
  );

  // Métronome : clics pendant le décompte et, si on veut, pendant le morceau
  const [metronome, setMetronome] = useState(reglages.metronome);
  const onBattement = useCallback(
    (numero: number, fort: boolean) => {
      if (numero < 0 ? reglages.decompteAudible : metronome) jouerClic(fort);
    },
    [metronome, reglages.decompteAudible],
  );

  const moteur = useMoteurJeu({ lecon, vitesse: reglages.vitesse, modeAttente, onFin, onBattement });

  // Le clavier MIDI transmet les touches enfoncées au moteur de jeu
  const jouer = moteur.jouer;
  useNotesMidi(jouer);

  /* ----- Mise en page (paysage) ----- */
  const L = width - insets.left - insets.right;
  const H = height - insets.top - insets.bottom;
  const avecPortee = vue !== 'chute';
  const avecChute = vue !== 'partition';
  const hClavier = avecChute ? Math.round(H * (lecon.cle === 'double' && avecPortee ? 0.28 : 0.33)) : 0;
  // La grande portée (deux mains) a besoin de plus de hauteur ; sans portée, une simple barre
  const taille = reglages.taillePartition;
  const partHauteur = lecon.cle === 'double' ? PART_DOUBLE[taille] : PART_SIMPLE[taille];
  const hBandeau = !avecChute ? H : avecPortee ? Math.round(Math.max(96, H * partHauteur)) : 60;
  const hChute = avecChute ? Math.max(60, H - hClavier - hBandeau) : 0;
  const tempsVisibles = Math.min(4, Math.max(2, hChute / 55));
  // Vue « partition » : colonnes étroites et plusieurs lignes de portée
  const largeurCote = avecChute ? Math.min(220, L * 0.24) : Math.min(150, L * 0.17);
  const largeurPortee = avecPortee ? L - largeurCote * 2 - 16 : 0;
  const nbLignes = avecChute
    ? 1
    : Math.max(1, Math.floor((hBandeau - 14) / (lecon.cle === 'double' ? LIGNE_DOUBLE[taille] : LIGNE_SIMPLE[taille])));

  // Clavier et notes qui tombent : 4 octaves au plus, la fenêtre suit la musique
  const [fenetre, setFenetre] = useState(() => fenetreClavier(lecon, 0));
  const voulue = fenetreClavier(lecon, moteur.groupe, fenetre);
  if (voulue[0] !== fenetre[0] || voulue[1] !== fenetre[1]) setFenetre(voulue);
  const [clavierMin, clavierMax] = voulue;

  // État de chaque note sur la portée
  const { etats, groupe } = moteur;
  const statut = useCallback(
    (index: number): StatutTete =>
      etats[index] === 'reussie'
        ? 'passee'
        : etats[index] === 'manquee'
          ? 'erreur'
          : lecon.notes[index]?.groupe === groupe
            ? 'actuelle'
            : 'futur',
    [etats, groupe, lecon],
  );
  const tempsActuel = groupe < lecon.groupes.length ? lecon.groupes[groupe].debut : null;

  const attendues = moteur.attendues;
  const enJeu = moteur.phase === 'enCours';
  let message = '';
  let couleurMessage = c.texte;
  if (moteur.retour && enJeu) {
    message = moteur.retour.message;
    couleurMessage = moteur.retour.type === 'ok' ? c.succes : c.erreur;
  }
  if (enJeu && moteur.enAttente && attendues.length && moteur.retour?.type !== 'erreur') {
    const noms = attendues.map((n) => nomEcrit(n)).join(' + ');
    message = reglages.nomsNotes
      ? `Joue ${noms} !`
      : `À toi ! ${attendues.length > 1 ? 'Quelles sont ces notes ?' : 'Quelle est cette note ?'}`;
    couleurMessage = c.primaire;
  }

  const suivante = leconSuivante(lecon.id);
  const suivanteOuverte =
    !!suivante && (reglages.toutDebloquer || (progression.lecons[lecon.id]?.meilleuresEtoiles ?? 0) > 0);

  return (
    <View
      style={[
        styles.ecran,
        {
          backgroundColor: c.fond,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* ---------- Bandeau du haut ---------- */}
      <View style={[styles.bandeau, { height: hBandeau }]}>
        <View style={[styles.cote, avecPortee ? { width: largeurCote } : styles.coteSouple]}>
          <View style={styles.ligne}>
            <BoutonRond icone="retour" onPress={() => revenir()} accessibilityLabel="Retour au menu" />
            <Text style={[styles.titre, { color: c.texte }]} numberOfLines={2}>
              {lecon.titre}
            </Text>
          </View>
          {avecPortee && (
            <Text style={[styles.message, { color: couleurMessage }]} numberOfLines={2}>
              {message}
            </Text>
          )}
        </View>

        {avecPortee ? (
          <View style={[styles.portee, { backgroundColor: c.surface, borderColor: c.bordure }]}>
            {Array.from({ length: nbLignes }, (_, k) => (
              <Portee
                key={k}
                cle={lecon.cle}
                armure={lecon.armure}
                mesure={lecon.mesure}
                elements={lecon.partition}
                tempsActuel={tempsActuel}
                statut={statut}
                dureeTotale={lecon.dureeTotale}
                largeur={largeurPortee}
                hauteur={Math.floor((hBandeau - 14) / nbLignes)}
                afficherNoms={reglages.nomsNotes}
                ligne={avecChute ? undefined : k}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.message, styles.messageBarre, { color: couleurMessage }]} numberOfLines={1}>
            {message}
          </Text>
        )}

        <View style={[styles.cote, styles.coteDroit, avecPortee && { width: largeurCote }]}>
          <View style={styles.ligne}>
            <EtatMidi />
            <BoutonRond
              icone={moteur.phase === 'pause' ? 'lecture' : 'pause'}
              onPress={moteur.basculerPause}
              accessibilityLabel="Pause et options"
              desactive={moteur.phase !== 'enCours' && moteur.phase !== 'pause'}
            />
          </View>
        </View>
      </View>

      {avecChute && (
        <>
          {/* ---------- Notes qui tombent ---------- */}
          <View style={styles.centreH}>
            <NotesQuiTombent
              notes={lecon.notes}
              etats={moteur.etats}
              groupe={moteur.groupe}
              temps={moteur.temps}
              min={clavierMin}
              max={clavierMax}
              largeur={L}
              hauteur={hChute}
              tempsVisibles={tempsVisibles}
              afficherNoms={reglages.nomsNotes}
            />
          </View>

          {/* ---------- Clavier guide : où poser les doigts ---------- */}
          <Clavier
            min={clavierMin}
            max={clavierMax}
            largeur={L}
            hauteur={hClavier}
            surbrillance={enJeu ? attendues : []}
            retour={moteur.retour}
            afficherNoms={reglages.nomsNotes}
          />
        </>
      )}

      {/* Décompte : une mesure avant la première note */}
      {enJeu && moteur.temps < 0 && (
        <View style={styles.decompte} pointerEvents="none">
          <Text style={[styles.chiffreDecompte, { color: c.texte }]}>{Math.ceil(-moteur.temps)}</Text>
        </View>
      )}

      {/* ---------- Écrans superposés : départ, pause, résultat ---------- */}
      {moteur.phase === 'pret' && (
        <Superpose>
          <Text style={[styles.grandTitre, { color: c.texte }]}>{lecon.titre}</Text>
          <Text style={[styles.texte, { color: c.texte }]}>{lecon.description}</Text>
          <Text style={[styles.petit, { color: c.texteDiscret }]}>
            {lecon.cle === 'double' ? 'Deux mains' : lecon.cle === 'sol' ? 'Clé de sol' : 'Clé de fa'} · {lecon.mesure.temps}/
            {lecon.mesure.unite} · tempo {Math.round(lecon.tempo * reglages.vitesse)}
          </Text>
          <Options
            attente={modeAttente}
            onAttente={() => setModeAttente((m) => !m)}
            metronome={metronome}
            onMetronome={() => setMetronome((m) => !m)}
          />
          {!midi.connecte && (
            <Text style={[styles.petit, { color: c.erreur }]}>
              Aucun clavier MIDI : branche-le en USB ou connecte-le en Bluetooth dans les réglages.
            </Text>
          )}
          <View style={styles.boutons}>
            <Bouton titre="Commencer" onPress={moteur.demarrer} />
            <Bouton titre="Retour" variante="secondaire" onPress={() => revenir()} />
          </View>
        </Superpose>
      )}

      {moteur.phase === 'pause' && (
        <Superpose>
          <Text style={[styles.grandTitre, { color: c.texte }]}>Pause</Text>
          <Options
            attente={modeAttente}
            onAttente={() => setModeAttente((m) => !m)}
            metronome={metronome}
            onMetronome={() => setMetronome((m) => !m)}
          />
          <View style={styles.boutons}>
            <Bouton titre="Reprendre" onPress={moteur.basculerPause} />
            <Bouton titre="Recommencer" variante="secondaire" onPress={moteur.demarrer} />
            <Bouton titre="Quitter" variante="secondaire" onPress={() => revenir()} />
          </View>
        </Superpose>
      )}
      {moteur.phase === 'termine' && resultat && (
        <Superpose>
          <Text style={[styles.grandTitre, { color: c.texte }]}>
            {resultat.etoiles === 3
              ? 'Parfait !'
              : resultat.etoiles === 2
                ? 'Très bien !'
                : resultat.etoiles === 1
                  ? 'Bien joué !'
                  : 'Continue, tu vas y arriver !'}
          </Text>
          <Etoiles nombre={resultat.etoiles} taille={44} />
          <Text style={[styles.texte, { color: c.texte }]}>
            Précision : {Math.round(resultat.precision * 100)} % · {pluriel(resultat.reussies, 'réussie')} ·{' '}
            {pluriel(resultat.erreurs, 'erreur')}
            {resultat.manquees ? ` · ${pluriel(resultat.manquees, 'manquée')}` : ''}
          </Text>
          <View style={styles.boutons}>
            <Bouton titre="Rejouer" variante="secondaire" onPress={moteur.demarrer} />
            {suivante && (
              <Bouton
                titre="Leçon suivante"
                desactive={!suivanteOuverte}
                onPress={() => router.replace(`/lecon/${suivante.id}`)}
              />
            )}
            <Bouton titre="Menu" variante="secondaire" onPress={() => revenir()} />
          </View>
        </Superpose>
      )}
    </View>
  );
}

/** Part de la hauteur donnée à la portée (vue « les deux »), selon la taille choisie. */
const PART_SIMPLE: Record<TaillePartition, number> = { petite: 0.26, moyenne: 0.3, grande: 0.4 };
const PART_DOUBLE: Record<TaillePartition, number> = { petite: 0.4, moyenne: 0.46, grande: 0.58 };
/** Hauteur visée d'une ligne de portée (vue « partition ») : plus elle est haute, plus les notes sont grosses. */
const LIGNE_SIMPLE: Record<TaillePartition, number> = { petite: 95, moyenne: 130, grande: 190 };
const LIGNE_DOUBLE: Record<TaillePartition, number> = { petite: 150, moyenne: 210, grande: 300 };

/** « 1 erreur », « 2 erreurs »… */
function pluriel(n: number, mot: string) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

/** Fond semi-transparent avec une carte centrée. */
function Superpose({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.superpose}>
      <ScrollView contentContainerStyle={styles.superposeContenu}>
        <Carte style={styles.carte}>{children}</Carte>
      </ScrollView>
    </View>
  );
}

/** Choix de la vue, mode attente et métronome (avant de jouer et en pause). */
function Options({
  attente,
  onAttente,
  metronome,
  onMetronome,
}: {
  attente: boolean;
  onAttente: () => void;
  metronome: boolean;
  onMetronome: () => void;
}) {
  const { reglages, modifier } = useReglages();
  return (
    <View style={styles.options}>
      <Choix<Affichage>
        options={[
          { valeur: 'les-deux', libelle: 'Partition + notes' },
          { valeur: 'partition', libelle: 'Partition' },
          { valeur: 'chute', libelle: 'Notes' },
        ]}
        valeur={reglages.affichage}
        onChange={(v) => modifier({ affichage: v })}
      />
      {reglages.affichage !== 'chute' && (
        <Choix<TaillePartition>
          options={[
            { valeur: 'petite', libelle: 'Petites notes' },
            { valeur: 'moyenne', libelle: 'Moyennes' },
            { valeur: 'grande', libelle: 'Grandes' },
          ]}
          valeur={reglages.taillePartition}
          onChange={(v) => modifier({ taillePartition: v })}
        />
      )}
      <View style={styles.ligne}>
        <Interrupteur libelle="Attente" actif={attente} onPress={onAttente} />
        <Interrupteur libelle="Métronome" actif={metronome} onPress={onMetronome} />
      </View>
    </View>
  );
}

function Interrupteur({ libelle, actif, onPress }: { libelle: string; actif: boolean; onPress: () => void }) {
  const c = useReglages().couleurs;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: actif }}
      style={[styles.pastille, { backgroundColor: actif ? c.primaire : c.surfaceAlt }]}
    >
      <Text style={{ color: actif ? c.surPrimaire : c.texte, fontWeight: '700' }}>
        {libelle} : {actif ? 'oui' : 'non'}
      </Text>
    </Pressable>
  );
}

function BoutonRond({
  icone,
  onPress,
  accessibilityLabel,
  desactive,
}: {
  icone: NomIcone;
  onPress: () => void;
  accessibilityLabel: string;
  desactive?: boolean;
}) {
  const c = useReglages().couleurs;
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.rond,
        { backgroundColor: c.surfaceAlt, borderColor: c.bordure, opacity: desactive ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Icone nom={icone} couleur={c.texte} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  decompte: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  chiffreDecompte: { fontSize: 64, fontWeight: '900', opacity: 0.8 },
  ecran: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centreH: { alignItems: 'center' },
  bandeau: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 8 },
  cote: { justifyContent: 'center', gap: 6 },
  coteSouple: { flexShrink: 1 },
  messageBarre: { flex: 1, textAlign: 'center' },
  options: { alignItems: 'center', gap: 10 },
  coteDroit: { alignItems: 'flex-end' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titre: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  message: { fontSize: 17, fontWeight: '800' },
  portee: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingVertical: 4 },
  pastille: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  rond: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  superpose: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    // Au-dessus des touches noires du clavier (qui ont elles-mêmes une élévation sur Android)
    zIndex: 10,
    elevation: 10,
  },
  superposeContenu: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  carte: { maxWidth: 620, width: '100%', alignItems: 'center', gap: 10 },
  grandTitre: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  texte: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  petit: { fontSize: 14, textAlign: 'center' },
  boutons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 },
});
