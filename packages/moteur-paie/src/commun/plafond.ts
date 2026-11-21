import { arrondir } from './arrondi';

export interface OptionsPlafond {
  /** Plafond mensuel de la Sécurité sociale de l'année. */
  pmss: number;
  /** Durée contractuelle hebdomadaire (temps partiel). */
  dureeHebdoContrat?: number;
  /** Durée hebdomadaire légale ou conventionnelle de référence (35 h par défaut). */
  dureeHebdoReference?: number;
  /** Entrée ou sortie en cours de mois : jours calendaires de présence. */
  joursCalendairesPresence?: number;
  /** Nombre de jours calendaires du mois. */
  joursCalendairesMois?: number;
}

/**
 * Plafond mensuel proratisé.
 * - Temps partiel : PMSS × durée contractuelle / durée de référence (CSS art. L242-8, R242-7).
 * - Entrée / sortie en cours de mois : PMSS × jours calendaires de présence / 30 (CSS art. R242-2 ; BOSS, rubrique Assiette).
 * Les deux proratisations se cumulent.
 */
export function plafondMensuel(o: OptionsPlafond): number {
  let plafond = o.pmss;
  const ref = o.dureeHebdoReference ?? 35;
  if (o.dureeHebdoContrat !== undefined && o.dureeHebdoContrat < ref) {
    plafond = (plafond * o.dureeHebdoContrat) / ref;
  }
  if (
    o.joursCalendairesPresence !== undefined &&
    o.joursCalendairesMois !== undefined &&
    o.joursCalendairesPresence < o.joursCalendairesMois
  ) {
    plafond = (plafond * o.joursCalendairesPresence) / 30;
  }
  return arrondir(plafond);
}

export interface Tranches {
  /** Tranche A : jusqu'à 1 plafond. */
  A: number;
  /** Tranche B : de 1 à 4 plafonds. */
  B: number;
  /** Tranche C : de 4 à 8 plafonds. */
  C: number;
  /** Tranche 1 AGIRC-ARRCO : jusqu'à 1 plafond. */
  T1: number;
  /** Tranche 2 AGIRC-ARRCO : de 1 à 8 plafonds. */
  T2: number;
  /** Assiette dans la limite de 4 plafonds (chômage, AGS, APEC). */
  jusqua4: number;
}

export function decouperTranches(brut: number, plafond: number): Tranches {
  const borne = (bas: number, haut: number) => arrondir(Math.min(Math.max(brut - bas, 0), haut - bas));
  return {
    A: borne(0, plafond),
    B: borne(plafond, 4 * plafond),
    C: borne(4 * plafond, 8 * plafond),
    T1: borne(0, plafond),
    T2: borne(plafond, 8 * plafond),
    jusqua4: borne(0, 4 * plafond),
  };
}
