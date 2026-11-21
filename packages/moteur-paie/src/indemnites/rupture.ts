import { arrondir } from '../commun/arrondi';

export interface SaisieLicenciement {
  /** Ancienneté en mois complets à la date de fin du préavis (exécuté ou non). */
  ancienneteMois: number;
  /** Moyenne mensuelle des 12 derniers mois. */
  salaireMoyen12Mois: number;
  /** Moyenne mensuelle des 3 derniers mois (primes annuelles proratisées). */
  salaireMoyen3Mois: number;
}

export interface ResultatLicenciement {
  eligible: boolean;
  salaireReference: number;
  partJusqua10Ans: number;
  partAuDela10Ans: number;
  indemnite: number;
}

/**
 * Indemnité légale de licenciement (C. trav. art. L1234-9, R1234-1 à R1234-4).
 * - 8 mois d'ancienneté minimum ;
 * - 1/4 de mois par année jusqu'à 10 ans, 1/3 de mois par année au-delà ;
 * - années incomplètes : proportionnelles aux mois complets ;
 * - salaire de référence : le plus favorable des moyennes 12 mois / 3 mois.
 * Non due en cas de faute grave ou lourde (à vérifier avant appel).
 */
export function indemniteLegaleLicenciement(s: SaisieLicenciement): ResultatLicenciement {
  const salaireReference = Math.max(s.salaireMoyen12Mois, s.salaireMoyen3Mois);
  if (s.ancienneteMois < 8) {
    return { eligible: false, salaireReference, partJusqua10Ans: 0, partAuDela10Ans: 0, indemnite: 0 };
  }
  const annees = s.ancienneteMois / 12;
  const partJusqua10Ans = arrondir((Math.min(annees, 10) * salaireReference) / 4);
  const partAuDela10Ans = arrondir((Math.max(annees - 10, 0) * salaireReference) / 3);
  return { eligible: true, salaireReference, partJusqua10Ans, partAuDela10Ans, indemnite: arrondir(partJusqua10Ans + partAuDela10Ans) };
}

/**
 * Durée légale du préavis de licenciement (C. trav. art. L1234-1), hors faute grave.
 * Renvoie null en dessous de 6 mois : la durée relève alors de la convention collective ou des usages.
 * La convention ou le contrat peuvent prévoir plus long : retenir le plus favorable.
 */
export function dureePreavisLegalMois(ancienneteMois: number): number | null {
  if (ancienneteMois < 6) return null;
  return ancienneteMois < 24 ? 1 : 2;
}

/**
 * Indemnité compensatrice de préavis : salaire que le salarié aurait perçu s'il avait travaillé
 * (C. trav. art. L1234-5). Version simple : salaire mensuel brut × nombre de mois non exécutés.
 */
export function indemniteCompensatricePreavis(salaireMensuelBrut: number, moisNonExecutes: number): number {
  return arrondir(salaireMensuelBrut * moisNonExecutes);
}

export interface SaisieFinCDD {
  /** Rémunération brute totale versée pendant le contrat (hors indemnités de fin de contrat). */
  remunerationTotale: number;
  /** Indemnités de congés payés déjà versées pendant le contrat. */
  indemnitesCongesDejaVersees?: number;
  /** true si un cas d'exclusion de l'indemnité de précarité s'applique (C. trav. art. L1243-10). */
  exclusionPrecarite?: boolean;
  /** Taux de précarité en % (10 ; 6 si accord de branche, C. trav. art. L1243-9). */
  tauxPrecarite?: number;
}

export interface ResultatFinCDD {
  precarite: number;
  indemniteCompensatriceConges: number;
  total: number;
}

/**
 * Fin de CDD : indemnité de précarité puis indemnité compensatrice de congés payés
 * au 1/10e, calculée sur la rémunération totale INCLUANT la précarité
 * (C. trav. art. L1243-8 et L3141-24).
 */
export function indemnitesFinCDD(s: SaisieFinCDD): ResultatFinCDD {
  const precarite = s.exclusionPrecarite ? 0 : arrondir((s.remunerationTotale * (s.tauxPrecarite ?? 10)) / 100);
  const iccp = arrondir(Math.max((s.remunerationTotale + precarite) * 0.1 - (s.indemnitesCongesDejaVersees ?? 0), 0));
  return { precarite, indemniteCompensatriceConges: iccp, total: arrondir(precarite + iccp) };
}
