/**
 * Écran de jeu d'une leçon (en paysage) :
 *  - en haut : la portée avec la note à lire, les commandes et le retour visuel ;
 *  - au milieu : les notes qui tombent ;
 *  - en bas : le clavier virtuel.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Texte';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { jouerNote, prechargerSons } from '@/audio/piano';
import { BoutonMicro } from '@/components/BoutonMicro';
import { Clavier } from '@/components/Clavier';
import { Icone, NomIcone } from '@/components/Icones';
import { NotesQuiTombent } from '@/components/NotesQuiTombent';
import { Portee, StatutTete } from '@/components/Portee';
import { Bouton, Carte, Choix, Etoiles } from '@/components/ui';
import { leconSuivante, trouverLecon } from '@/data/lecons';
import { useMicro } from '@/hooks/useMicro';
import { Bilan, useMoteurJeu } from '@/hooks/useMoteurJeu';
import { nomDuree, nomEcrit } from '@/music/notes';
import { calculerEtoiles, useProgression } from '@/store/Progression';
import { Entree, useReglages } from '@/store/Reglages';
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
  const { reglages, modifier, couleurs: c } = useReglages();
  /** L'élève joue sur son vrai piano (écouté au micro) plutôt que sur l'écran. */
  const surPiano = reglages.entree === 'piano';
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

  const moteur = useMoteurJeu({ lecon, vitesse: reglages.vitesse, modeAttente, onFin });

  // Le micro transmet les notes détectées au moteur de jeu
  const jouer = moteur.jouer;
  const micro = useMicro({ onNote: (midi) => jouer(midi, 'micro') });

  useEffect(() => {
    prechargerSons(lecon.clavierMin, lecon.clavierMax);
  }, [lecon]);

  // Sur un vrai piano, le micro s'allume tout seul à l'ouverture de la leçon
  const demarrerMicro = micro.demarrer;
  useEffect(() => {
    if (surPiano) demarrerMicro();
  }, [surPiano, demarrerMicro]);

  // Appui sur le clavier à l'écran
  const son = reglages.son;
  const ignorerMicro = micro.ignorerUnInstant;
  const onAppui = useCallback(
    (midi: number) => {
      if (son) {
        jouerNote(midi);
        ignorerMicro(); // ne pas « entendre » notre propre son au micro
      }
      jouer(midi, 'ecran');
    },
    [son, ignorerMicro, jouer],
  );

  const basculerMicro = () => {
    if (micro.etat === 'actif') micro.arreter();
    else micro.demarrer();
  };
  useEffect(() => {
    if (micro.etat === 'refuse') {
      Alert.alert('Micro refusé', "Autorise l'accès au micro dans les réglages du téléphone pour jouer sur un vrai piano.");
    }
  }, [micro.etat]);

  /* ----- Mise en page (paysage) ----- */
  const L = width - insets.left - insets.right;
  const H = height - insets.top - insets.bottom;
  const hClavier = Math.round(H * (lecon.cle === 'double' ? 0.28 : 0.33));
  // La grande portée (deux mains) a besoin de plus de hauteur
  const hBandeau = Math.round(Math.max(96, H * (lecon.cle === 'double' ? 0.46 : 0.3)));
  const hChute = Math.max(60, H - hClavier - hBandeau);
  const tempsVisibles = Math.min(4, Math.max(2, hChute / 55));
  const largeurCote = Math.min(220, L * 0.24);
  const largeurPortee = L - largeurCote * 2 - 16;

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
    const ou = surPiano ? ' sur ton piano' : '';
    const noms = attendues.map((n) => nomEcrit(n)).join(' + ');
    message = reglages.nomsNotes
      ? `Joue ${noms}${ou} !`
      : `À toi${ou} ! ${attendues.length > 1 ? 'Quelles sont ces notes ?' : 'Quelle est cette note ?'}`;
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
        <View style={[styles.cote, { width: largeurCote }]}>
          <View style={styles.ligne}>
            <BoutonRond icone="retour" onPress={() => revenir()} accessibilityLabel="Retour au menu" />
            <Text style={[styles.titre, { color: c.texte }]} numberOfLines={2}>
              {lecon.titre}
            </Text>
          </View>
          <Text style={[styles.message, { color: couleurMessage }]} numberOfLines={2}>
            {message}
          </Text>
        </View>

        <View style={[styles.portee, { backgroundColor: c.surface, borderColor: c.bordure }]}>
          <Portee
            cle={lecon.cle}
            armure={lecon.armure}
            mesure={lecon.mesure}
            elements={lecon.partition}
            tempsActuel={tempsActuel}
            statut={statut}
            dureeTotale={lecon.dureeTotale}
            largeur={largeurPortee}
            hauteur={hBandeau - 14}
            afficherNoms={reglages.nomsNotes}
          />
        </View>

        <View style={[styles.cote, styles.coteDroit, { width: largeurCote }]}>
          <View style={styles.ligne}>
            <BoutonMicro etat={micro.etat} niveau={micro.niveau} derniereNote={micro.derniereNote} onPress={basculerMicro} />
            <BoutonRond
              icone={moteur.phase === 'pause' ? 'lecture' : 'pause'}
              onPress={moteur.basculerPause}
              accessibilityLabel="Pause"
              desactive={moteur.phase !== 'enCours' && moteur.phase !== 'pause'}
            />
          </View>
          <Pressable
            onPress={() => setModeAttente((m) => !m)}
            accessibilityRole="switch"
            accessibilityState={{ checked: modeAttente }}
            style={[styles.pastille, { backgroundColor: modeAttente ? c.primaire : c.surfaceAlt }]}
          >
            <Text style={{ color: modeAttente ? c.surPrimaire : c.texte, fontWeight: '700' }}>
              Attente : {modeAttente ? 'oui' : 'non'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ---------- Notes qui tombent ---------- */}
      <View style={styles.centreH}>
        <NotesQuiTombent
          notes={lecon.notes}
          etats={moteur.etats}
          groupe={moteur.groupe}
          temps={moteur.temps}
          min={lecon.clavierMin}
          max={lecon.clavierMax}
          largeur={L}
          hauteur={hChute}
          tempsVisibles={tempsVisibles}
          afficherNoms={reglages.nomsNotes}
        />
        {/* Décompte : une mesure avant la première note */}
        {enJeu && moteur.temps < 0 && (
          <View style={styles.decompte} pointerEvents="none">
            <Text style={[styles.chiffreDecompte, { color: c.texte }]}>{Math.ceil(-moteur.temps)}</Text>
          </View>
        )}
      </View>

      {/* ---------- Clavier ---------- */}
      <Clavier
        min={lecon.clavierMin}
        max={lecon.clavierMax}
        largeur={L}
        hauteur={hClavier}
        onAppui={onAppui}
        surbrillance={enJeu ? attendues : []}
        retour={moteur.retour}
        afficherNoms={reglages.nomsNotes}
        interactif={!surPiano}
      />

      {/* ---------- Écrans superposés : départ, pause, résultat ---------- */}
      {moteur.phase === 'pret' && (
        <Superpose>
          <Text style={[styles.grandTitre, { color: c.texte }]}>{lecon.titre}</Text>
          <Text style={[styles.texte, { color: c.texte }]}>{lecon.description}</Text>
          <Text style={[styles.petit, { color: c.texteDiscret }]}>
            {lecon.cle === 'double' ? 'Grande portée · deux mains' : `${lecon.cle === 'sol' ? 'Clé de sol' : 'Clé de fa'} · main ${lecon.main}`} ·{' '}
            {lecon.mesure.temps}/{lecon.mesure.unite} · {lecon.notes.length} notes ·
            tempo {Math.round(lecon.tempo * reglages.vitesse)}
            {modeAttente ? ' · le morceau t’attend' : ' · joue en rythme !'}
          </Text>
          <Legende />
          <Text style={[styles.petit, { color: c.texte, fontWeight: '700' }]}>Je joue :</Text>
          <Choix<Entree>
            options={[
              { valeur: 'piano', libelle: 'sur mon piano' },
              { valeur: 'ecran', libelle: 'sur l’écran' },
            ]}
            valeur={reglages.entree}
            onChange={(v) => modifier({ entree: v })}
          />
          {surPiano && (
            <Text style={[styles.petit, { color: micro.etat === 'actif' ? c.succes : c.texteDiscret }]}>
              {micro.etat === 'actif'
                ? 'Micro prêt ! Pose le téléphone sur le pupitre et joue sur ton piano. Le clavier de l’écran te montre seulement où poser les doigts.'
                : micro.etat === 'refuse' || micro.etat === 'erreur'
                  ? 'Le micro n’est pas disponible : autorise-le dans les réglages du téléphone, puis touche « Micro ».'
                  : 'Activation du micro…'}
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

/** Rappel des durées de notes pour les débutants. */
function Legende() {
  const c = useReglages().couleurs;
  return (
    <Text style={[styles.petit, { color: c.texteDiscret }]}>
      Rappel : {[4, 2, 1, 0.5].map((d) => `${nomDuree(d)} = ${d === 0.5 ? '½' : d} temps`).join(' · ')}
    </Text>
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
