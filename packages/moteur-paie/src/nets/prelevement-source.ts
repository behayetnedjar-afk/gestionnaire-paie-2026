import { appliquerTaux } from '../commun/arrondi';

export interface TrancheGrille {
  /** Borne haute de la tranche de net imposable mensuel ; null pour la dernière. */
  jusqua: number | null;
  /** Taux en %. */
  taux: number;
}

/** Taux non personnalisé (taux neutre) lu dans la grille mensuelle (CGI art. 204 H). */
export function tauxNeutre(netImposable: number, grille: TrancheGrille[]): number {
  for (const t of grille) {
    if (t.jusqua === null || netImposable < t.jusqua) return t.taux;
  }
  throw new RangeError('Grille du taux neutre incomplète.');
}

/** Montant du prélèvement à la source : net imposable × taux, arrondi au centime. */
export function montantPAS(netImposable: number, tauxPourcent: number): number {
  return appliquerTaux(Math.max(netImposable, 0), tauxPourcent);
}
