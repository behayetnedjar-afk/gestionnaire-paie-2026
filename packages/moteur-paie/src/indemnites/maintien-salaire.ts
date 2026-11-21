import { arrondir } from '../commun/arrondi';

export interface SaisieMaintienSalaire {
  salaireMensuelBrut: number;
  /** Ancienneté en années complètes au premier jour d'absence. */
  ancienneteAnnees: number;
  /** Durée de l'arrêt en jours calendaires. */
  joursArret: number;
  origine: 'maladie' | 'atmp';
  /** IJSS brutes journalières versées par la CPAM. */
  ijssJournalieres: number;
  /** Jours déjà indemnisés par l'employeur au cours des 12 mois précédents. */
  joursDejaIndemnises12Mois?: number;
}

export interface ResultatMaintienSalaire {
  eligible: boolean;
  carenceEmployeur: number;
  dureeParPeriode: number;
  jours90: number;
  jours6666: number;
  salaireJournalier: number;
  garantieBrute: number;
  ijssPeriodeIndemnisee: number;
  complementEmployeur: number;
}

/** Durée de chaque période (90 % puis 2/3) : 30 jours + 10 jours par tranche entière de 5 ans au-delà de 1 an, maximum 90. */
export function dureePeriodeMaintien(ancienneteAnnees: number): number {
  if (ancienneteAnnees < 1) return 0;
  return Math.min(30 + 10 * Math.floor((ancienneteAnnees - 1) / 5), 90);
}

/**
 * Maintien de salaire LÉGAL en cas de maladie ou d'AT/MP (C. trav. art. L1226-1, D1226-1 à D1226-8).
 *
 * Hypothèses pédagogiques (à adapter à la convention collective, souvent plus favorable) :
 * - salaire journalier = salaire mensuel / 30 (méthode calendaire) ;
 * - complément = garantie − IJSS brutes des jours indemnisés par l'employeur ;
 * - carence employeur : 7 jours en maladie, aucune en AT/MP.
 */
export function maintienSalaireLegal(s: SaisieMaintienSalaire): ResultatMaintienSalaire {
  const duree = dureePeriodeMaintien(s.ancienneteAnnees);
  const carence = s.origine === 'maladie' ? 7 : 0;
  const salaireJournalier = s.salaireMensuelBrut / 30;
  const vide = { carenceEmployeur: carence, dureeParPeriode: duree, jours90: 0, jours6666: 0, salaireJournalier: arrondir(salaireJournalier), garantieBrute: 0, ijssPeriodeIndemnisee: 0, complementEmployeur: 0 };
  if (duree === 0) return { eligible: false, ...vide };

  let joursIndemnisables = Math.max(s.joursArret - carence, 0);
  let deja = s.joursDejaIndemnises12Mois ?? 0;
  const restant90 = Math.max(duree - deja, 0);
  deja = Math.max(deja - duree, 0);
  const restant6666 = Math.max(duree - deja, 0);

  const jours90 = Math.min(joursIndemnisables, restant90);
  joursIndemnisables -= jours90;
  const jours6666 = Math.min(joursIndemnisables, restant6666);

  const garantieBrute = arrondir(jours90 * salaireJournalier * 0.9 + (jours6666 * salaireJournalier * 2) / 3);
  const ijss = arrondir((jours90 + jours6666) * s.ijssJournalieres);
  return {
    eligible: true,
    carenceEmployeur: carence,
    dureeParPeriode: duree,
    jours90,
    jours6666,
    salaireJournalier: arrondir(salaireJournalier),
    garantieBrute,
    ijssPeriodeIndemnisee: ijss,
    complementEmployeur: arrondir(Math.max(garantieBrute - ijss, 0)),
  };
}
