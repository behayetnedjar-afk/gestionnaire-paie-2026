import { describe, expect, it } from 'vitest';
import { coefficientRGDU, montantPAS, montantRGDU, Parametres, smicCalcule, tauxNeutre, type TrancheGrille } from '../src';
import { chargerParametres } from './aide';

const json = chargerParametres();
const p = new Parametres(json);
const rgdu = {
  Tmin: p.nombre('reduction_generale.Tmin'),
  Tdelta: p.nombre('reduction_generale.Tdelta_fnal_0_10'),
  P: p.nombre('reduction_generale.P'),
  seuilSmic: p.nombre('reduction_generale.seuil_sortie_x_smic'),
};

describe('réduction générale dégressive unique (paramètres À VÉRIFIER)', () => {
  it('au SMIC : coefficient maximal Tmin + Tdelta', () => {
    expect(coefficientRGDU(1823.03, 1823.03, rgdu)).toBe(0.3981);
  });

  it('à 3 SMIC ou plus : aucune réduction', () => {
    expect(coefficientRGDU(3 * 1823.03, 1823.03, rgdu)).toBe(0);
    expect(coefficientRGDU(6000, 1823.03, rgdu)).toBe(0);
  });

  it('juste sous 3 SMIC : coefficient proche de Tmin', () => {
    expect(coefficientRGDU(5469, 1823.03, rgdu)).toBe(0.02);
  });

  it('cas du module 1 : 2 563,80 € avec 15 h sup', () => {
    const smic = smicCalcule(1823.03, 12.02, 1, 15);
    expect(smic).toBe(2003.33);
    expect(coefficientRGDU(2563.8, smic, rgdu)).toBe(0.2086);
    expect(montantRGDU(2563.8, smic, rgdu)).toBe(534.81);
  });

  it('coefficient décroissant avec la rémunération', () => {
    const c = [1900, 2500, 3500, 4500].map((r) => coefficientRGDU(r, 1823.03, rgdu));
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeLessThan(c[i - 1]);
  });
});

describe('prélèvement à la source', () => {
  const grille = json.prelevement_a_la_source.grille_metropole_mensuelle as TrancheGrille[];

  it('taux neutre : bornes de la grille (borne haute exclue)', () => {
    expect(tauxNeutre(1500, grille)).toBe(0);
    expect(tauxNeutre(1619.99, grille)).toBe(0);
    expect(tauxNeutre(1620, grille)).toBe(0.5);
    expect(tauxNeutre(1865.74, grille)).toBe(2.1);
    expect(tauxNeutre(100000, grille)).toBe(43);
  });

  it('montant = net imposable × taux', () => {
    expect(montantPAS(1865.74, 3)).toBe(55.97);
    expect(montantPAS(-10, 3)).toBe(0);
  });
});
