import { arrondir } from '../commun/arrondi';

export interface OptionsHeuresSup {
  /** Durée de référence hebdomadaire (35 h). */
  dureeReference?: number;
  /** Nombre d'heures au premier taux (8 à défaut d'accord : 36e à 43e heure). */
  heuresPremierTaux?: number;
  /** Majoration du premier palier en % (25 à défaut d'accord ; minimum 10 si accord). */
  majorationPremierTaux?: number;
  /** Majoration au-delà en % (50 à défaut d'accord). */
  majorationSecondTaux?: number;
}

export interface ResultatHeuresSup {
  heuresPremierTaux: number;
  heuresSecondTaux: number;
  montantPremierTaux: number;
  montantSecondTaux: number;
  total: number;
}

/**
 * Heures supplémentaires d'UNE semaine civile (C. trav. art. L3121-33 et L3121-36).
 * Les HS se décomptent semaine par semaine, jamais au mois.
 */
export function heuresSupSemaine(heuresTravaillees: number, tauxHoraire: number, o: OptionsHeuresSup = {}): ResultatHeuresSup {
  const ref = o.dureeReference ?? 35;
  const palier = o.heuresPremierTaux ?? 8;
  const m1 = o.majorationPremierTaux ?? 25;
  const m2 = o.majorationSecondTaux ?? 50;
  if (m1 < 10 || m2 < 10) throw new RangeError('La majoration des heures supplémentaires ne peut pas être inférieure à 10 % (C. trav. art. L3121-33).');

  const hs = Math.max(heuresTravaillees - ref, 0);
  const h1 = Math.min(hs, palier);
  const h2 = Math.max(hs - palier, 0);
  const montant1 = arrondir(h1 * tauxHoraire * (1 + m1 / 100));
  const montant2 = arrondir(h2 * tauxHoraire * (1 + m2 / 100));
  return { heuresPremierTaux: h1, heuresSecondTaux: h2, montantPremierTaux: montant1, montantSecondTaux: montant2, total: arrondir(montant1 + montant2) };
}

export interface OptionsHeuresComplementaires {
  /** true si un accord de branche étendu autorise les HC jusqu'au tiers de la durée contractuelle. */
  accordTiers?: boolean;
  /** Majoration dans la limite du 1/10e (10 %). */
  majorationDixieme?: number;
  /** Majoration au-delà du 1/10e (25 % à défaut de taux conventionnel). */
  majorationAuDela?: number;
  /** Durée légale (35 h) : les HC ne peuvent pas l'atteindre. */
  dureeLegale?: number;
}

export interface ResultatHeuresComplementaires {
  heuresDixieme: number;
  heuresAuDela: number;
  montantDixieme: number;
  montantAuDela: number;
  total: number;
}

/**
 * Heures complémentaires d'une semaine pour un salarié à temps partiel
 * (C. trav. art. L3123-20, L3123-21, L3123-28 et L3123-29).
 */
export function heuresComplementairesSemaine(
  heuresTravaillees: number,
  dureeContrat: number,
  tauxHoraire: number,
  o: OptionsHeuresComplementaires = {},
): ResultatHeuresComplementaires {
  const legale = o.dureeLegale ?? 35;
  const hc = Math.max(heuresTravaillees - dureeContrat, 0);
  const dixieme = dureeContrat / 10;
  const limite = o.accordTiers ? dureeContrat / 3 : dixieme;
  if (hc > limite + 1e-9) {
    throw new RangeError(`Heures complémentaires (${hc} h) au-delà de la limite autorisée (${arrondir(limite)} h).`);
  }
  if (heuresTravaillees >= legale) {
    throw new RangeError('Les heures complémentaires ne peuvent pas porter la durée du travail au niveau de la durée légale.');
  }
  const h1 = Math.min(hc, dixieme);
  const h2 = Math.max(hc - dixieme, 0);
  const montant1 = arrondir(h1 * tauxHoraire * (1 + (o.majorationDixieme ?? 10) / 100));
  const montant2 = arrondir(h2 * tauxHoraire * (1 + (o.majorationAuDela ?? 25) / 100));
  return { heuresDixieme: h1, heuresAuDela: h2, montantDixieme: montant1, montantAuDela: montant2, total: arrondir(montant1 + montant2) };
}

/** Heures mensualisées : durée hebdomadaire × 52 / 12 (arrondi au centième). */
export function heuresMensualisees(dureeHebdo: number): number {
  return arrondir((dureeHebdo * 52) / 12);
}
