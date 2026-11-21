import { arrondir } from '../commun/arrondi';

export interface SaisieCongesPayes {
  /** Rémunération brute de la période de référence (assiette des congés payés). */
  remunerationReference: number;
  /** Jours ouvrables acquis sur la période (30 pour une année complète). */
  joursAcquis: number;
  /** Jours ouvrables pris. */
  joursPris: number;
  /** Salaire mensuel qu'aurait perçu le salarié s'il avait travaillé. */
  salaireMensuel: number;
  /** Jours ouvrables réels du mois de prise des congés (méthode des jours réels). */
  joursOuvrablesMois: number;
}

export interface ResultatCongesPayes {
  dixieme: number;
  maintien: number;
  methodeRetenue: 'dixieme' | 'maintien';
  indemnite: number;
}

/**
 * Indemnité de congés payés : on retient la plus favorable des deux méthodes
 * (C. trav. art. L3141-24).
 * - 1/10e : rémunération de référence × 10 % × jours pris / jours acquis ;
 * - maintien : salaire mensuel × jours pris / jours ouvrables réels du mois.
 */
export function indemniteCongesPayes(s: SaisieCongesPayes): ResultatCongesPayes {
  if (s.joursAcquis <= 0) throw new RangeError('Aucun jour acquis.');
  if (s.joursPris > s.joursAcquis) throw new RangeError('Jours pris supérieurs aux jours acquis.');
  const dixieme = arrondir((s.remunerationReference * 0.1 * s.joursPris) / s.joursAcquis);
  const maintien = arrondir((s.salaireMensuel * s.joursPris) / s.joursOuvrablesMois);
  const methodeRetenue = dixieme >= maintien ? 'dixieme' : 'maintien';
  return { dixieme, maintien, methodeRetenue, indemnite: Math.max(dixieme, maintien) };
}
