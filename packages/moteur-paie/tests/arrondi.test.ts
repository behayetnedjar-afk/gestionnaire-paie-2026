import { describe, expect, it } from 'vitest';
import { appliquerTaux, arrondir, somme } from '../src';

describe('arrondi', () => {
  it('arrondit au centime, demi vers le haut', () => {
    expect(arrondir(176.9022)).toBe(176.9);
    expect(arrondir(15.625)).toBe(15.63);
    expect(arrondir(1112.0483)).toBe(1112.05);
  });

  it('corrige les erreurs de représentation binaire', () => {
    // 4005 × 6,90 % = 276,345 exactement, mais vaut 276,34499… en flottant
    expect(appliquerTaux(4005, 6.9)).toBe(276.35);
    expect(appliquerTaux(4005, 1.5)).toBe(60.08);
  });

  it('gère les montants négatifs symétriquement', () => {
    expect(arrondir(-32.6576)).toBe(-32.66);
  });

  it('arrondit à 4 décimales pour les coefficients', () => {
    expect(arrondir(0.208626, 4)).toBe(0.2086);
  });

  it('additionne sans dérive flottante', () => {
    expect(somme([0.1, 0.2])).toBe(0.3);
    expect(somme([176.9, 10.26, 80.76, 22.05])).toBe(289.97);
  });
});
