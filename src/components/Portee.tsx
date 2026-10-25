/**
 * Portée musicale (clé de sol ou clé de fa) dessinée en SVG.
 * Affiche la note à jouer (encadrée) et les suivantes, chacune à la couleur
 * de sa note, avec la bonne figure selon la durée (ronde, blanche, noire, croche).
 */
import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Cle, estAlteree, nomNote, positionPortee } from '@/music/notes';
import { useCouleurs } from '@/store/Reglages';
import { couleurNote } from '@/theme/couleurs';

export interface NotePortee {
  midi: number;
  duree: number;
  /** 'actuelle' = note à jouer, 'passee' = déjà jouée, 'futur' = à venir */
  statut: 'actuelle' | 'passee' | 'futur' | 'erreur';
}

interface Props {
  cle: Cle;
  notes: NotePortee[];
  largeur: number;
  hauteur: number;
  afficherNoms: boolean;
}

/** Position (en demi-interlignes) la plus basse et la plus haute affichable. */
const POS_MIN = -6;
const POS_MAX = 12;

export function Portee({ cle, notes, largeur, hauteur, afficherNoms }: Props) {
  const c = useCouleurs();
  const hauteurNoms = afficherNoms ? 16 : 0;
  // Interligne : la portée et ses lignes supplémentaires doivent tenir en hauteur
  const g = Math.min((hauteur - hauteurNoms) / ((POS_MAX - POS_MIN) / 2 + 1), largeur / 14);
  const yBas = g * (POS_MAX / 2 + 0.5); // ordonnée de la ligne du bas (place pour les notes aiguës)
  const y = (p: number) => yBas - (p * g) / 2; // p = 0 → ligne du bas
  const xDebut = 4 * g; // après la clé
  const espacement = 3.4 * g;
  const nbVisibles = Math.max(1, Math.floor((largeur - xDebut - g) / espacement));


  return (
    <Svg width={largeur} height={hauteur}>
      {/* Les 5 lignes de la portée */}
      {[0, 2, 4, 6, 8].map((p) => (
        <Line key={p} x1={0} x2={largeur} y1={y(p)} y2={y(p)} stroke={c.encre} strokeWidth={1.2} />
      ))}

      {/* La clé */}
      <G transform={`translate(${g * 0.6}, ${y(8)}) scale(${g / 10})`}>
        {cle === 'sol' ? <CleDeSol couleur={c.encre} /> : <CleDeFa couleur={c.encre} />}
      </G>

      {notes.slice(0, nbVisibles).map((n, i) => {
        const p = positionPortee(n.midi, cle);
        const x = xDebut + g + i * espacement;
        const couleur = couleurNote(n.midi).fond;
        return (
          <G key={i} opacity={n.statut === 'passee' ? 0.35 : 1}>
            {(n.statut === 'actuelle' || n.statut === 'erreur') && (
              <Rect
                x={x - g * 1.5}
                y={y(POS_MAX) - g * 0.2}
                width={g * 3}
                height={y(POS_MIN) - y(POS_MAX) + g * 0.4}
                rx={g * 0.6}
                fill={n.statut === 'erreur' ? c.erreur : c.encre}
                opacity={n.statut === 'erreur' ? 0.18 : 0.08}
              />
            )}
            <FigureNote
              x={x}
              p={p}
              y={y}
              g={g}
              duree={n.duree}
              couleur={couleur}
              encre={c.encre}
              alteree={estAlteree(n.midi)}
            />
            {afficherNoms && (
              <SvgText
                x={x}
                y={hauteur - 3}
                fontSize={12}
                fontFamily="Nunito_900Black"
                fill={c.encre}
                textAnchor="middle"
              >
                {nomNote(n.midi)}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

interface FigureProps {
  x: number;
  p: number;
  y: (p: number) => number;
  g: number;
  duree: number;
  /** Couleur de la note (tête) */
  couleur: string;
  /** Couleur du trait (hampe, contour, lignes supplémentaires) */
  encre: string;
  alteree: boolean;
}

/** Tête de note + hampe + crochet + lignes supplémentaires. */
function FigureNote({ x, p, y, g, duree, couleur, encre, alteree }: FigureProps) {
  const yn = y(p);
  const rx = g * 0.62;
  const ry = g * 0.44;
  const pleine = duree < 2; // noire, croche : tête pleine
  const hampe = duree < 4; // tout sauf la ronde
  const versLeHaut = p < 4; // sous la ligne du milieu : hampe vers le haut
  const pointee = duree === 3 || duree === 1.5 || duree === 0.75;

  // Lignes supplémentaires (sous ou au-dessus de la portée)
  const supp: number[] = [];
  for (let q = -2; q >= p; q -= 2) supp.push(q);
  for (let q = 10; q <= p; q += 2) supp.push(q);

  const xh = versLeHaut ? x + rx - 0.8 : x - rx + 0.8;
  const yFinHampe = versLeHaut ? yn - g * 3.3 : yn + g * 3.3;

  return (
    <G>
      {supp.map((q) => (
        <Line key={q} x1={x - rx * 1.6} x2={x + rx * 1.6} y1={y(q)} y2={y(q)} stroke={encre} strokeWidth={1.2} />
      ))}
      {alteree && (
        <SvgText x={x - rx * 2.4} y={yn + g * 0.45} fontSize={g * 1.6} fill={encre} textAnchor="middle">
          ♯
        </SvgText>
      )}
      {/* Tête creuse (ronde, blanche) : anneau coloré bordé d'encre, pour rester lisible même en jaune */}
      {!pleine && (
        <Ellipse
          cx={x}
          cy={yn}
          rx={rx}
          ry={ry}
          transform={`rotate(-20 ${x} ${yn})`}
          fill="none"
          stroke={encre}
          strokeWidth={g * 0.36}
        />
      )}
      <Ellipse
        cx={x}
        cy={yn}
        rx={rx}
        ry={ry}
        transform={`rotate(-20 ${x} ${yn})`}
        fill={pleine ? couleur : 'none'}
        stroke={pleine ? encre : couleur}
        strokeWidth={pleine ? 1.2 : g * 0.2}
      />
      {hampe && <Line x1={xh} x2={xh} y1={yn} y2={yFinHampe} stroke={encre} strokeWidth={1.4} />}
      {/* Crochet(s) pour croche et double croche */}
      {duree <= 0.5 &&
        [0, ...(duree <= 0.25 ? [1] : [])].map((k) => {
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
      {pointee && <Circle cx={x + rx + g * 0.45} cy={p % 2 === 0 ? yn - g * 0.5 : yn} r={g * 0.16} fill={encre} />}
    </G>
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
      <Path
        d="M 1 9 C 1 1 16 -1 18.5 8 C 21 19 11 31 0 37"
        stroke={couleur}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={24} cy={5} r={1.7} fill={couleur} />
      <Circle cx={24} cy={15} r={1.7} fill={couleur} />
    </G>
  );
}
