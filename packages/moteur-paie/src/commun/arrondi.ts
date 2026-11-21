/**
 * Arrondi commercial (demi-unité vers le haut en valeur absolue).
 * Le petit epsilon corrige les erreurs de représentation binaire
 * (ex. 4005 × 0,069 = 276,34499999… doit donner 276,35).
 */
export function arrondir(n: number, decimales = 2): number {
  const f = 10 ** decimales;
  const r = Math.round(Math.abs(n) * f + 1e-6) / f;
  return n < 0 ? -r : r;
}

/** Applique un taux exprimé en pourcentage à une base, arrondi au centime. */
export function appliquerTaux(base: number, tauxPourcent: number): number {
  return arrondir((base * tauxPourcent) / 100);
}

/** Somme de montants déjà arrondis, ré-arrondie pour neutraliser les erreurs flottantes. */
export function somme(montants: number[]): number {
  return arrondir(montants.reduce((a, b) => a + b, 0));
}
