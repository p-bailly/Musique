/**
 * Partition dessinée en SVG : clé de sol, clé de fa ou grande portée (les deux,
 * reliées par une accolade), armure, chiffrage de la mesure, barres de mesure,
 * notes et accords (chaque tête à la couleur de sa note), altérations, silences,
 * liaisons, nuances et doigtés.
 *
 * La partition défile mesure par mesure : la fenêtre commence à la mesure de
 * la note à jouer.
 */
import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ClePartition, ElementPartition, TetePartition } from '@/data/lecons';
import { Alteration, alterationArmure, Cle, nomEcrit, positionEcrite } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';
import { couleurDegre } from '@/theme/couleurs';

export type StatutTete = 'actuelle' | 'passee' | 'futur' | 'erreur';

interface Props {
  cle: ClePartition;
  armure: number;
  /** Chiffrage affiché (null : pas de mesure, ni barres — piano libre, cartes flash). */
  mesure: { temps: number; unite: number } | null;
  elements: ElementPartition[];
  /** Temps de la note à jouer (la fenêtre s'y cale) ; null : depuis le début. */
  tempsActuel: number | null;
  /** État d'une note jouable (index de `NoteMorceau`), pour l'atténuer ou la signaler. */
  statut?: (index: number) => StatutTete;
  /** Fin du morceau (double barre finale). */
  dureeTotale?: number;
  largeur: number;
  hauteur: number;
  afficherNoms: boolean;
  afficherDoigtes?: boolean;
  /**
   * Partition sur plusieurs lignes (vue « partition ») : numéro de cette ligne. Chaque ligne
   * montre des mesures entières ; la ligne 0 contient la note à jouer, les suivantes la suite.
   */
  ligne?: number;
}

/** Positions (en demi-interlignes) gardées autour de chaque portée. */
const BANDE_SIMPLE = { min: -6, max: 12 };
const BANDE_DOUBLE = { min: -4, max: 11 };

/** Place des dièses et des bémols de l'armure, en clé de sol (la clé de fa est 2 positions plus bas). */
const POS_DIESES = [8, 5, 9, 6, 3, 7, 4];
const POS_BEMOLS = [4, 7, 3, 6, 2, 5, 1];

export function Portee({
  cle,
  armure,
  mesure,
  elements,
  tempsActuel,
  statut,
  dureeTotale,
  largeur,
  hauteur,
  afficherNoms,
  afficherDoigtes = true,
  ligne,
}: Props) {
  const c = useCouleurs();
  const double = cle === 'double';
  const portees: Cle[] = double ? ['sol', 'fa'] : [cle];
  const bande = double ? BANDE_DOUBLE : BANDE_SIMPLE;
  const hauteurNoms = afficherNoms && !double ? 16 : 0;
  const demiBandes = (bande.max - bande.min) / 2; // en interlignes
  // Sous la grande portée : place pour les doigtés de la main gauche (accords)
  const margeBas = double ? 2.5 : 0;
  // Interligne : toutes les portées et leurs marges doivent tenir en hauteur
  const g = Math.max(
    3,
    Math.min((hauteur - hauteurNoms) / (portees.length * demiBandes + (double ? 0.5 : 0) + margeBas + 1), largeur / 16),
  );
  /** Ordonnée d'une position sur la portée n° `k` (0 = la ligne du bas). */
  const yDe = (k: number) => {
    const yBas = g * 0.5 + g * (bande.max / 2) + k * g * (demiBandes + 0.5);
    return (p: number) => yBas - (p * g) / 2;
  };
  const y = portees.map((_, k) => yDe(k));

  // En-tête : accolade, clé, armure, chiffrage
  const xAccolade = double ? g * 1.2 : 0;
  const xCle = xAccolade + g * 0.5;
  const nbAlterations = Math.abs(armure);
  const xArmure = xCle + g * 3.2;
  const xChiffrage = xArmure + nbAlterations * g * 1.1 + (nbAlterations ? g * 0.4 : 0);
  const xContenu = xChiffrage + (mesure ? g * 2.6 : g * 0.6);

  // Échelle du temps : au moins la place d'une tête par croche
  const tempsParMesure = mesure ? (mesure.temps * 4) / mesure.unite : 4;
  const dureeMin = Math.min(1, ...elements.map((e) => e.duree));
  const disponible = largeur - xContenu - g;
  const pxLisible = (g * 3) / Math.max(0.5, dureeMin);
  // Sur plusieurs lignes : autant de mesures entières que la largeur en permet (au moins
  // 2,2 interlignes par plus petite valeur), réparties sur toute la ligne
  const utile = disponible - g * 1.6;
  const pxSerre = (g * 2.2) / Math.max(0.25, dureeMin);
  const mesuresParLigne = Math.max(1, Math.floor(utile / (tempsParMesure * pxSerre)));
  const pxParTemps =
    ligne !== undefined && mesure
      ? utile / (tempsParMesure * mesuresParLigne)
      : Math.max(pxLisible, Math.min(disponible / (tempsParMesure * 2), g * 7));

  // Fenêtre : commence à la mesure de la note à jouer, sans la laisser sortir à droite
  let debutFenetre = 0;
  let finFenetre = 0;
  const parLignes = ligne !== undefined && mesure !== null;
  if (parLignes) {
    // Mesures entières : la ligne change quand la note à jouer passe à la ligne suivante
    const mesureActuelle = tempsActuel !== null && tempsActuel > 0 ? Math.floor(tempsActuel / tempsParMesure + 1e-6) : 0;
    debutFenetre = (Math.floor(mesureActuelle / mesuresParLigne) + ligne) * mesuresParLigne * tempsParMesure;
    finFenetre = debutFenetre + mesuresParLigne * tempsParMesure;
  } else if (tempsActuel !== null && tempsActuel > 0) {
    if (mesure) {
      debutFenetre = Math.floor(tempsActuel / tempsParMesure + 1e-6) * tempsParMesure;
      if ((tempsActuel - debutFenetre) * pxParTemps > disponible * 0.7) debutFenetre = tempsActuel - (disponible * 0.3) / pxParTemps;
    } else {
      // Sans mesure (piano libre) : les notes précédentes restent visibles à gauche
      debutFenetre = Math.max(0, tempsActuel - (disponible * 0.75) / pxParTemps);
    }
  }
  if (!parLignes) finFenetre = debutFenetre + disponible / pxParTemps;
  const xDe = (t: number) => xContenu + g * 1.4 + (t - debutFenetre) * pxParTemps;

  const visibles = elements.filter(
    (e) => e.debut >= debutFenetre - 1e-6 && e.debut < finFenetre - (parLignes ? 1e-6 : 0.25),
  );

  // Altérations à dessiner : celles qui diffèrent de l'armure ou d'une altération déjà vue dans la mesure
  const alterationsAffichees = new Map<TetePartition, Alteration>();
  const suitesDeLiaison = new Set<TetePartition>();
  for (const pc of portees) {
    let mesureEnCours = -1;
    let vues = new Map<number, Alteration>();
    const liees = new Map<number, boolean>();
    for (const el of elements.filter((e) => e.portee === pc)) {
      const m = Math.floor(el.debut / tempsParMesure + 1e-6);
      if (!mesure || m !== mesureEnCours) {
        mesureEnCours = m;
        vues = new Map();
      }
      for (const t of el.tetes) {
        if (liees.get(t.midi)) suitesDeLiaison.add(t);
        else {
          const courante = vues.get(t.degre) ?? alterationArmure(t.degre, armure);
          if (courante !== t.alteration) alterationsAffichees.set(t, t.alteration);
        }
        vues.set(t.degre, t.alteration);
      }
      liees.clear();
      for (const t of el.tetes) if (t.liee) liees.set(t.midi, true);
    }
  }

  // Barres de mesure visibles
  const barres: number[] = [];
  if (mesure) {
    const premiere = Math.ceil((debutFenetre + 1e-6) / tempsParMesure) * tempsParMesure;
    for (let t = premiere; t < finFenetre + (parLignes ? 1e-6 : 0); t += tempsParMesure) {
      if (dureeTotale === undefined || t < dureeTotale - 1e-6) barres.push(t);
    }
  }
  const finVisible = dureeTotale !== undefined && dureeTotale <= finFenetre;
  // Barre de mesure à mi-chemin entre la dernière note de la mesure et la première de la suivante
  const xBarre = (t: number) => xDe(t) - Math.max(g * 1.2, pxParTemps * 0.45);
  const yHautPortees = y[0](8);
  const yBasPortees = y[portees.length - 1](0);

  // Groupe actuel : fond léger derrière les notes à jouer
  const xActuel =
    tempsActuel !== null && tempsActuel >= debutFenetre && tempsActuel < finFenetre ? xDe(tempsActuel) : null;

  // Ligne au-delà de la fin du morceau : rien à dessiner
  if (parLignes && dureeTotale !== undefined && debutFenetre >= dureeTotale - 1e-6) {
    return <Svg width={largeur} height={hauteur} />;
  }

  return (
    <Svg width={largeur} height={hauteur}>
      {xActuel !== null && (
        <Rect
          x={xActuel - g * 1.4}
          y={yHautPortees - g * 2.5}
          width={g * 2.8}
          height={yBasPortees - yHautPortees + g * 5}
          rx={g * 0.6}
          fill={c.encre}
          opacity={0.07}
        />
      )}

      {portees.map((pc, k) => (
        <G key={pc}>
          {/* Les 5 lignes */}
          {[0, 2, 4, 6, 8].map((p) => (
            <Line key={p} x1={xAccolade} x2={largeur} y1={y[k](p)} y2={y[k](p)} stroke={c.encre} strokeWidth={1.1} />
          ))}
          {/* Clé */}
          <G transform={`translate(${xCle}, ${y[k](8)}) scale(${g / 10})`}>
            {pc === 'sol' ? <CleDeSol couleur={c.encre} /> : <CleDeFa couleur={c.encre} />}
          </G>
          {/* Armure */}
          {Array.from({ length: nbAlterations }, (_, i) => {
            const p = (armure > 0 ? POS_DIESES : POS_BEMOLS)[i] - (pc === 'fa' ? 2 : 0);
            return (
              <SigneAlteration
                key={i}
                alteration={armure > 0 ? 1 : -1}
                x={xArmure + i * g * 1.1}
                y={y[k](p)}
                g={g}
                couleur={c.encre}
              />
            );
          })}
          {/* Chiffrage */}
          {mesure && (
            <G>
              <SvgText x={xChiffrage + g} y={y[k](4) - g * 0.15} fontSize={g * 2.3} fontFamily="Nunito_900Black" fill={c.encre} textAnchor="middle">
                {mesure.temps}
              </SvgText>
              <SvgText x={xChiffrage + g} y={y[k](0) - g * 0.15} fontSize={g * 2.3} fontFamily="Nunito_900Black" fill={c.encre} textAnchor="middle">
                {mesure.unite}
              </SvgText>
            </G>
          )}
        </G>
      ))}

      {/* Accolade et trait vertical de la grande portée */}
      {double && (
        <G>
          <Line x1={xAccolade} x2={xAccolade} y1={yHautPortees} y2={yBasPortees} stroke={c.encre} strokeWidth={1.4} />
          <Accolade x={xAccolade - g * 0.3} y1={yHautPortees} y2={yBasPortees} g={g} couleur={c.encre} />
        </G>
      )}

      {/* Barres de mesure (traversent les deux portées) */}
      {barres.map((t) => (
        <Line key={t} x1={xBarre(t)} x2={xBarre(t)} y1={yHautPortees} y2={yBasPortees} stroke={c.encre} strokeWidth={1.2} />
      ))}
      {finVisible && dureeTotale !== undefined && (
        <G>
          <Line x1={xBarre(dureeTotale)} x2={xBarre(dureeTotale)} y1={yHautPortees} y2={yBasPortees} stroke={c.encre} strokeWidth={1.2} />
          <Rect x={xBarre(dureeTotale) + g * 0.35} y={yHautPortees} width={g * 0.45} height={yBasPortees - yHautPortees} fill={c.encre} />
        </G>
      )}

      {/* Notes, accords et silences */}
      {visibles.map((el, i) => {
        const k = portees.indexOf(el.portee);
        if (k < 0) return null;
        const x = xDe(el.debut);
        if (el.tetes.length === 0) {
          return <Silence key={i} x={x} y={y[k]} g={g} duree={el.duree} couleur={c.encre} />;
        }
        return (
          <Accord
            key={i}
            el={el}
            x={x}
            y={y[k]}
            g={g}
            encre={c.encre}
            discret={c.texteDiscret}
            statut={statut}
            alterations={alterationsAffichees}
            doigtsEnBas={double && el.portee === 'fa'}
            afficherDoigtes={afficherDoigtes}
          />
        );
      })}

      {/* Liaisons : arc entre deux têtes de même hauteur */}
      {visibles.flatMap((el, i) => {
        const k = portees.indexOf(el.portee);
        return el.tetes
          .filter((t) => t.liee)
          .map((t) => {
            const suivant = elements.find((e) => e.portee === el.portee && e.debut > el.debut && e.tetes.some((u) => u.midi === t.midi && suitesDeLiaison.has(u)));
            if (!suivant) return null;
            const x1 = xDe(el.debut) + g * 0.8;
            const x2 = Math.min(xDe(suivant.debut) - g * 0.8, largeur);
            const p = positionEcrite(t.degre, el.portee);
            const sens = p >= 4 ? -1 : 1; // au-dessus des notes hautes, en dessous des notes basses
            const yl = y[k](p) + sens * g * 0.9;
            return (
              <Path
                key={`${i}-${t.midi}`}
                d={`M ${x1} ${yl} Q ${(x1 + x2) / 2} ${yl + sens * g * 1.4} ${x2} ${yl}`}
                stroke={c.encre}
                strokeWidth={1.6}
                fill="none"
              />
            );
          });
      })}

      {/* Nuances, sous la portée concernée */}
      {visibles
        .filter((el) => el.nuance)
        .map((el, i) => {
          const k = portees.indexOf(el.portee);
          return (
            <SvgText
              key={`n${i}`}
              x={xDe(el.debut)}
              y={y[k](double ? (el.portee === 'sol' ? -4.4 : -3.6) : bande.min + 0.6)}
              fontSize={g * 1.8}
              fontFamily="Nunito_900Black"
              fontStyle="italic"
              fill={c.encre}
              textAnchor="middle"
            >
              {el.nuance}
            </SvgText>
          );
        })}

      {/* Noms des notes, sous la portée (portée simple) */}
      {afficherNoms &&
        !double &&
        visibles
          .filter((el) => el.tetes.length)
          .map((el, i) => (
            <SvgText
              key={`m${i}`}
              x={xDe(el.debut)}
              y={hauteur - 3}
              fontSize={Math.min(12, (pxParTemps * el.duree) / Math.max(1.6, el.tetes.length * 1.7))}
              fontFamily="Nunito_900Black"
              fill={c.encre}
              textAnchor="middle"
            >
              {el.tetes
                .filter((t) => !suitesDeLiaison.has(t))
                .map((t) => nomEcrit(t))
                .join('·')}
            </SvgText>
          ))}
    </Svg>
  );
}

/* ---------- Note ou accord ---------- */

function Accord({
  el,
  x,
  y,
  g,
  encre,
  discret,
  statut,
  alterations,
  doigtsEnBas,
  afficherDoigtes,
}: {
  el: ElementPartition;
  x: number;
  y: (p: number) => number;
  g: number;
  encre: string;
  discret: string;
  statut?: (index: number) => StatutTete;
  alterations: Map<TetePartition, Alteration>;
  doigtsEnBas: boolean;
  afficherDoigtes: boolean;
}) {
  const positions = el.tetes.map((t) => positionEcrite(t.degre, el.portee));
  const pMin = Math.min(...positions);
  const pMax = Math.max(...positions);
  const rx = g * 0.62;
  const ry = g * 0.44;
  const duree = el.duree;
  const pleine = duree < 2;
  const hampe = duree < 4;
  const versLeHaut = (pMin + pMax) / 2 < 4; // sous la ligne du milieu : hampe vers le haut
  const pointee = [3, 1.5, 0.75, 0.375].includes(duree);
  const xh = versLeHaut ? x + rx - 0.8 : x - rx + 0.8;
  const yFinHampe = versLeHaut ? y(pMax) - g * 3.3 : y(pMin) + g * 3.3;

  // Lignes supplémentaires
  const supp: number[] = [];
  for (let q = -2; q >= pMin; q -= 2) supp.push(q);
  for (let q = 10; q <= pMax; q += 2) supp.push(q);

  // Une seconde (deux degrés voisins) : la tête du haut se décale à côté de la hampe
  const decalages = positions.map((p, i) => (i > 0 && p - positions[i - 1] === 1 ? (versLeHaut ? 2 * rx - 1 : -(2 * rx - 1)) : 0));

  const etatDe = (t: TetePartition) => (statut ? statut(t.index) : 'futur');
  const opacite = el.tetes.every((t) => etatDe(t) === 'passee') ? 0.35 : 1;

  return (
    <G opacity={opacite}>
      {supp.map((q) => (
        <Line key={q} x1={x - rx * 1.7} x2={x + rx * 1.7} y1={y(q)} y2={y(q)} stroke={encre} strokeWidth={1.1} />
      ))}
      {el.tetes.map((t, i) => {
        const p = positions[i];
        const yn = y(p);
        const xn = x + decalages[i];
        const alt = alterations.get(t);
        const manquee = etatDe(t) === 'erreur';
        const couleur = manquee ? discret : couleurDegre(t.degre).fond;
        return (
          <G key={i}>
            {alt !== undefined && (
              <SigneAlteration alteration={alt} x={x - rx * 2.5 - (i % 2) * g * 1.1} y={yn} g={g} couleur={encre} />
            )}
            {/* Tête creuse (ronde, blanche) : anneau coloré bordé d'encre, lisible même en jaune */}
            {!pleine && (
              <Ellipse cx={xn} cy={yn} rx={rx} ry={ry} transform={`rotate(-20 ${xn} ${yn})`} fill="none" stroke={encre} strokeWidth={g * 0.36} />
            )}
            <Ellipse
              cx={xn}
              cy={yn}
              rx={rx}
              ry={ry}
              transform={`rotate(-20 ${xn} ${yn})`}
              fill={pleine ? couleur : 'none'}
              stroke={pleine ? encre : couleur}
              strokeWidth={pleine ? 1.2 : g * 0.2}
            />
            {pointee && <Circle cx={xn + rx + g * 0.45} cy={p % 2 === 0 ? yn - g * 0.5 : yn} r={g * 0.16} fill={encre} />}
          </G>
        );
      })}
      {hampe && <Line x1={xh} x2={xh} y1={versLeHaut ? y(pMin) : y(pMax)} y2={yFinHampe} stroke={encre} strokeWidth={1.4} />}
      {/* Crochet(s) : croche, double croche (et triolet de doubles), triple croche */}
      {duree <= 0.5 &&
        Array.from({ length: duree <= 0.125 + 1e-6 ? 3 : duree <= 0.25 + 1e-6 ? 2 : 1 }, (_, k) => k).map((k) => {
          const y0 = yFinHampe + (versLeHaut ? k * g * 0.9 : -k * g * 0.9);
          const s = versLeHaut ? 1 : -1;
          return (
            <Path
              key={k}
              d={`M ${xh} ${y0} q ${g * 0.2} ${s * g * 1.1} ${g * 1.1} ${s * g * 1.6} q ${g * 0.3} ${s * g * 0.5} ${g * 0.1} ${s * g * 1.2}`}
              stroke={encre}
              strokeWidth={1.5}
              fill="none"
            />
          );
        })}
      {/* Doigtés : au-dessus pour la main droite, en dessous pour la main gauche */}
      {afficherDoigtes &&
        el.tetes.some((t) => t.doigt !== undefined) &&
        (() => {
          // Empilés comme les notes : le doigt de la note la plus haute en haut
          const liste = el.tetes.filter((t) => t.doigt !== undefined).map((t) => t.doigt!).reverse();
          // Main droite : au-dessus (et au-dessus de la hampe montante) ; main gauche : sous la portée,
          // à gauche d'une hampe descendante pour ne pas la croiser
          const base = doigtsEnBas
            ? y(Math.min(pMin, 0) - 3.2)
            : Math.min(y(Math.max(pMax, 8) + 2.2), versLeHaut ? yFinHampe - g * 0.4 : Infinity);
          const xd = doigtsEnBas && !versLeHaut && hampe ? x - rx - g * 0.6 : x;
          return liste.map((d, i) => (
            <SvgText
              key={`d${i}`}
              x={xd}
              y={doigtsEnBas ? base + i * g * 1.15 : base - (liste.length - 1 - i) * g * 1.15}
              fontSize={g * 1.25}
              fontFamily="Nunito_900Black"
              fill={encre}
              textAnchor="middle"
            >
              {d}
            </SvgText>
          ));
        })()}
    </G>
  );
}

/* ---------- Silences ---------- */

/** Pause (4 temps), demi-pause (2), soupir (1), demi-soupir (½), quart de soupir (¼), pointés éventuellement. */
function Silence({ x, y, g, duree, couleur }: { x: number; y: (p: number) => number; g: number; duree: number; couleur: string }) {
  const pointee = [3, 1.5, 0.75, 0.375].includes(duree);
  const base = pointee ? (duree * 2) / 3 : duree;
  let forme: React.ReactNode;
  if (base >= 4) {
    // Pause : rectangle accroché sous la 4e ligne
    forme = <Rect x={x - g * 0.65} y={y(6)} width={g * 1.3} height={g * 0.55} fill={couleur} />;
  } else if (base >= 2) {
    // Demi-pause : rectangle posé sur la 3e ligne
    forme = <Rect x={x - g * 0.65} y={y(4) - g * 0.55} width={g * 1.3} height={g * 0.55} fill={couleur} />;
  } else if (base >= 1) {
    // Soupir : zigzag
    const y0 = y(7);
    forme = (
      <Path
        d={`M ${x - g * 0.35} ${y0} l ${g * 0.7} ${g * 0.95} l ${-g * 0.6} ${g * 0.75} l ${g * 0.6} ${g * 0.85} q ${-g * 0.9} ${-g * 0.35} ${-g * 0.3} ${g * 1.25}`}
        stroke={couleur}
        strokeWidth={g * 0.28}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    );
  } else {
    // Demi-soupir (un crochet) ou quart de soupir (deux crochets)
    const crochets = base >= 0.5 ? 1 : 2;
    forme = (
      <G>
        <Line x1={x + g * 0.45} y1={y(5.5)} x2={x - g * 0.15} y2={y(1.5)} stroke={couleur} strokeWidth={1.5} />
        {Array.from({ length: crochets }, (_, k) => (
          <G key={k}>
            <Circle cx={x - g * 0.35} cy={y(5.2 - k * 1.6)} r={g * 0.3} fill={couleur} />
            <Path d={`M ${x - g * 0.35} ${y(5.2 - k * 1.6)} q ${g * 0.4} ${g * 0.35} ${g * 0.75} ${-g * 0.15}`} stroke={couleur} strokeWidth={1.4} fill="none" />
          </G>
        ))}
      </G>
    );
  }
  return (
    <G>
      {forme}
      {pointee && <Circle cx={x + g * 0.95} cy={y(5)} r={g * 0.16} fill={couleur} />}
    </G>
  );
}

/* ---------- Signes ---------- */

/** Dièse, bémol ou bécarre, centré sur (x, y). */
function SigneAlteration({ alteration, x, y, g, couleur }: { alteration: Alteration; x: number; y: number; g: number; couleur: string }) {
  if (alteration === 1) {
    return (
      <G>
        <Line x1={x - g * 0.25} x2={x - g * 0.25} y1={y - g * 1.3} y2={y + g * 1.4} stroke={couleur} strokeWidth={1.2} />
        <Line x1={x + g * 0.25} x2={x + g * 0.25} y1={y - g * 1.4} y2={y + g * 1.3} stroke={couleur} strokeWidth={1.2} />
        <Line x1={x - g * 0.55} x2={x + g * 0.55} y1={y - g * 0.3} y2={y - g * 0.55} stroke={couleur} strokeWidth={g * 0.28} />
        <Line x1={x - g * 0.55} x2={x + g * 0.55} y1={y + g * 0.55} y2={y + g * 0.3} stroke={couleur} strokeWidth={g * 0.28} />
      </G>
    );
  }
  if (alteration === -1) {
    return (
      <G>
        <Line x1={x - g * 0.35} x2={x - g * 0.35} y1={y - g * 1.9} y2={y + g * 0.55} stroke={couleur} strokeWidth={1.3} />
        <Path
          d={`M ${x - g * 0.35} ${y - g * 0.05} q ${g * 0.9} ${-g * 0.65} ${g * 0.75} ${g * 0.05} q ${-g * 0.15} ${g * 0.35} ${-g * 0.75} ${g * 0.55}`}
          stroke={couleur}
          strokeWidth={g * 0.22}
          fill="none"
        />
      </G>
    );
  }
  return (
    <G>
      <Line x1={x - g * 0.3} x2={x - g * 0.3} y1={y - g * 1.3} y2={y + g * 0.5} stroke={couleur} strokeWidth={1.2} />
      <Line x1={x + g * 0.3} x2={x + g * 0.3} y1={y - g * 0.5} y2={y + g * 1.3} stroke={couleur} strokeWidth={1.2} />
      <Line x1={x - g * 0.3} x2={x + g * 0.3} y1={y - g * 0.25} y2={y - g * 0.45} stroke={couleur} strokeWidth={g * 0.26} />
      <Line x1={x - g * 0.3} x2={x + g * 0.3} y1={y + g * 0.45} y2={y + g * 0.25} stroke={couleur} strokeWidth={g * 0.26} />
    </G>
  );
}

/** Accolade de la grande portée. */
function Accolade({ x, y1, y2, g, couleur }: { x: number; y1: number; y2: number; g: number; couleur: string }) {
  const m = (y1 + y2) / 2;
  const l = g * 0.9;
  return (
    <Path
      d={`M ${x} ${y1} C ${x - l} ${y1 + (m - y1) * 0.2} ${x + l * 0.2} ${m - (m - y1) * 0.2} ${x - l} ${m} C ${x + l * 0.2} ${m + (y2 - m) * 0.2} ${x - l} ${y2 - (y2 - m) * 0.2} ${x} ${y2}`}
      stroke={couleur}
      strokeWidth={g * 0.3}
      fill="none"
    />
  );
}

/**
 * Clé de sol stylisée, dessinée pour un interligne de 10 (ligne du haut en y = 0).
 * La spirale s'enroule autour de la 2e ligne (Sol), en y = 30.
 */
function CleDeSol({ couleur }: { couleur: string }) {
  return (
    <G>
      <Path
        d="M 13 31 C 9 31 9 25 13 25 C 18 25 19.5 32 14.5 35 C 7 39 2 31 5.5 23.5 C 8.5 17 16 12.5 17 4 C 18 -4 15 -12 12.5 -10.5 C 9.5 -8 10.5 4 12 20 L 14.8 46 C 15.6 53 9 55.5 7.5 50.5"
        stroke={couleur}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={8.6} cy={49.5} r={2.6} fill={couleur} />
    </G>
  );
}

/**
 * Clé de fa, dessinée pour un interligne de 10 (ligne du haut en y = 0).
 * Ses deux points entourent la 4e ligne (Fa), en y = 10.
 */
function CleDeFa({ couleur }: { couleur: string }) {
  return (
    <G transform="translate(2 0)">
      <Circle cx={3.2} cy={10} r={3.2} fill={couleur} />
      <Path d="M 1 9 C 1 1 16 -1 18.5 8 C 21 19 11 31 0 37" stroke={couleur} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Circle cx={24} cy={5} r={1.7} fill={couleur} />
      <Circle cx={24} cy={15} r={1.7} fill={couleur} />
    </G>
  );
}

/* ---------- Partition simple (piano libre, cartes flash) ---------- */

/** Une suite de notes isolées (une noire chacune), sans mesure. */
export function elementsSimples(notes: { midi: number; degre: number; alteration: Alteration }[], cle: Cle): ElementPartition[] {
  return notes.map((n, i) => ({
    portee: cle,
    debut: i,
    duree: 1,
    main: 'droite',
    tetes: [{ ...n, liee: false, index: i }],
  }));
}
