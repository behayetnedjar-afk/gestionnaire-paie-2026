import { describe, expect, it } from 'vitest';
import { heuresComplementairesSemaine, heuresMensualisees, heuresSupSemaine } from '../src';

describe('heures supplémentaires (semaine civile)', () => {
  it('46 h à 14 € : 8 h à 25 % + 3 h à 50 % = 203 € (cours module 1)', () => {
    const r = heuresSupSemaine(46, 14);
    expect(r).toEqual({ heuresPremierTaux: 8, heuresSecondTaux: 3, montantPremierTaux: 140, montantSecondTaux: 63, total: 203 });
  });

  it('45 h à 16 € = 208 € (QCM M1-Q09)', () => {
    expect(heuresSupSemaine(45, 16).total).toBe(208);
  });

  it('semaine de 40 h : 5 h toutes à 25 %', () => {
    const r = heuresSupSemaine(40, 15);
    expect(r.heuresSecondTaux).toBe(0);
    expect(r.total).toBe(93.75);
  });

  it('35 h ou moins : aucune heure supplémentaire', () => {
    expect(heuresSupSemaine(35, 15).total).toBe(0);
    expect(heuresSupSemaine(30, 15).total).toBe(0);
  });

  it('accord d\'entreprise à 10 % unique', () => {
    expect(heuresSupSemaine(40, 15, { majorationPremierTaux: 10, majorationSecondTaux: 10 }).total).toBe(82.5);
  });

  it('refuse une majoration inférieure à 10 %', () => {
    expect(() => heuresSupSemaine(40, 15, { majorationPremierTaux: 5 })).toThrow(RangeError);
  });
});

describe('heures complémentaires (temps partiel)', () => {
  it('24 h contrat, 26 h faites, 13 € : 2 h à 10 % = 28,60 €', () => {
    expect(heuresComplementairesSemaine(26, 24, 13).total).toBe(28.6);
  });

  it('20 h contrat, 23 h faites, accord au tiers : 43,13 € (QCM M1-Q11)', () => {
    const r = heuresComplementairesSemaine(23, 20, 12.5, { accordTiers: true });
    expect(r.montantDixieme).toBe(27.5);
    expect(r.montantAuDela).toBe(15.63);
    expect(r.total).toBe(43.13);
  });

  it('refuse un dépassement du 1/10e sans accord', () => {
    expect(() => heuresComplementairesSemaine(23, 20, 12.5)).toThrow(/limite/);
  });

  it('refuse d\'atteindre la durée légale', () => {
    expect(() => heuresComplementairesSemaine(35, 30, 12, { accordTiers: true })).toThrow(/durée légale/);
  });
});

describe('mensualisation', () => {
  it('durée hebdomadaire × 52 / 12', () => {
    expect(heuresMensualisees(35)).toBe(151.67);
    expect(heuresMensualisees(24)).toBe(104);
    expect(heuresMensualisees(28)).toBe(121.33);
  });
});
