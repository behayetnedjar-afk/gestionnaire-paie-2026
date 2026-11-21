import { arrondir } from '../commun/arrondi';

export interface ParametresRGDU {
  Tmin: number;
  Tdelta: number;
  P: number;
  /** Seuil de sortie exprimé en nombre de SMIC (3). */
  seuilSmic: number;
}

/**
 * Coefficient de la réduction générale dégressive unique (RGDU, 2026) :
 *   C = Tmin + Tdelta × [ ½ × (3 × SMIC / R − 1) ] ^ P
 * - nul si R ≥ 3 SMIC ;
 * - plafonné à Tmin + Tdelta ;
 * - arrondi à 4 décimales.
 * PARAMÈTRES À VÉRIFIER sur boss.gouv.fr (CSS art. L241-13, D241-7).
 *
 * @param remuneration rémunération brute soumise (annuelle, ou cumulée depuis le début d'année)
 * @param smicCalcule SMIC de la même période, majoré des heures sup / complémentaires (sans leur majoration)
 */
export function coefficientRGDU(remuneration: number, smicCalcule: number, p: ParametresRGDU): number {
  if (remuneration <= 0 || smicCalcule <= 0) return 0;
  if (remuneration >= p.seuilSmic * smicCalcule) return 0;
  const interieur = 0.5 * ((p.seuilSmic * smicCalcule) / remuneration - 1);
  const c = p.Tmin + p.Tdelta * Math.pow(interieur, p.P);
  return arrondir(Math.min(c, p.Tmin + p.Tdelta), 4);
}

/** Montant de la réduction : coefficient × rémunération, arrondi au centime. */
export function montantRGDU(remuneration: number, smicCalcule: number, p: ParametresRGDU): number {
  return arrondir(coefficientRGDU(remuneration, smicCalcule, p) * remuneration);
}

/**
 * SMIC calculé de la période : SMIC mensuel × fraction de temps de travail
 * + heures supplémentaires ou complémentaires × SMIC horaire (sans majoration).
 */
export function smicCalcule(smicMensuel: number, smicHoraire: number, fractionTemps = 1, heuresSupOuComplementaires = 0): number {
  return arrondir(smicMensuel * fractionTemps + smicHoraire * heuresSupOuComplementaires);
}
