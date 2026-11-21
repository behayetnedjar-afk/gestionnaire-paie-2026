import { describe, expect, it } from 'vitest';
import {
  dureePeriodeMaintien,
  dureePreavisLegalMois,
  indemniteCompensatricePreavis,
  indemniteCongesPayes,
  indemniteLegaleLicenciement,
  indemnitesFinCDD,
  maintienSalaireLegal,
} from '../src';

describe('indemnité de congés payés (1/10e vs maintien)', () => {
  it('le 1/10e est plus favorable', () => {
    const r = indemniteCongesPayes({ remunerationReference: 30000, joursAcquis: 30, joursPris: 12, salaireMensuel: 2400, joursOuvrablesMois: 26 });
    expect(r.dixieme).toBe(1200);
    expect(r.maintien).toBe(1107.69);
    expect(r.methodeRetenue).toBe('dixieme');
    expect(r.indemnite).toBe(1200);
  });

  it('le maintien est plus favorable après une augmentation', () => {
    const r = indemniteCongesPayes({ remunerationReference: 24000, joursAcquis: 30, joursPris: 6, salaireMensuel: 2600, joursOuvrablesMois: 26 });
    expect(r.dixieme).toBe(480);
    expect(r.maintien).toBe(600);
    expect(r.methodeRetenue).toBe('maintien');
  });

  it('refuse plus de jours pris que de jours acquis', () => {
    expect(() => indemniteCongesPayes({ remunerationReference: 1, joursAcquis: 5, joursPris: 6, salaireMensuel: 1, joursOuvrablesMois: 26 })).toThrow();
  });
});

describe('indemnité légale de licenciement', () => {
  it('12 ans et 6 mois à 3 000 € = 10 000 €', () => {
    const r = indemniteLegaleLicenciement({ ancienneteMois: 150, salaireMoyen12Mois: 3000, salaireMoyen3Mois: 2900 });
    expect(r.partJusqua10Ans).toBe(7500);
    expect(r.partAuDela10Ans).toBe(2500);
    expect(r.indemnite).toBe(10000);
  });

  it('8 mois à 2 400 € = 400 € (prorata des mois complets)', () => {
    expect(indemniteLegaleLicenciement({ ancienneteMois: 8, salaireMoyen12Mois: 2400, salaireMoyen3Mois: 2400 }).indemnite).toBe(400);
  });

  it('moins de 8 mois : non due', () => {
    const r = indemniteLegaleLicenciement({ ancienneteMois: 7, salaireMoyen12Mois: 2400, salaireMoyen3Mois: 2400 });
    expect(r.eligible).toBe(false);
    expect(r.indemnite).toBe(0);
  });

  it('retient la moyenne la plus favorable (3 derniers mois)', () => {
    const r = indemniteLegaleLicenciement({ ancienneteMois: 48, salaireMoyen12Mois: 2000, salaireMoyen3Mois: 2200 });
    expect(r.salaireReference).toBe(2200);
    expect(r.indemnite).toBe(2200); // 4 ans × 1/4 × 2 200
  });
});

describe('préavis', () => {
  it('durées légales selon l\'ancienneté', () => {
    expect(dureePreavisLegalMois(5)).toBeNull();
    expect(dureePreavisLegalMois(6)).toBe(1);
    expect(dureePreavisLegalMois(23)).toBe(1);
    expect(dureePreavisLegalMois(24)).toBe(2);
  });

  it('indemnité compensatrice de préavis', () => {
    expect(indemniteCompensatricePreavis(2500, 2)).toBe(5000);
  });
});

describe('fin de CDD', () => {
  it('13 200 € : 1 320 € + 1 452 € = 2 772 € (cours module 1)', () => {
    expect(indemnitesFinCDD({ remunerationTotale: 13200 })).toEqual({ precarite: 1320, indemniteCompensatriceConges: 1452, total: 2772 });
  });

  it('11 500 € : total 2 415 € (QCM M1-Q18)', () => {
    expect(indemnitesFinCDD({ remunerationTotale: 11500 }).total).toBe(2415);
  });

  it('CDD saisonnier : pas de précarité, ICCP seule', () => {
    expect(indemnitesFinCDD({ remunerationTotale: 10000, exclusionPrecarite: true })).toEqual({ precarite: 0, indemniteCompensatriceConges: 1000, total: 1000 });
  });

  it('déduit les indemnités de congés déjà versées', () => {
    expect(indemnitesFinCDD({ remunerationTotale: 10000, indemnitesCongesDejaVersees: 300 }).indemniteCompensatriceConges).toBe(800);
  });
});

describe('maintien de salaire légal', () => {
  it('durée des périodes selon l\'ancienneté', () => {
    expect(dureePeriodeMaintien(0.5)).toBe(0);
    expect(dureePeriodeMaintien(1)).toBe(30);
    expect(dureePeriodeMaintien(5)).toBe(30);
    expect(dureePeriodeMaintien(6)).toBe(40);
    expect(dureePeriodeMaintien(11)).toBe(50);
    expect(dureePeriodeMaintien(31)).toBe(90);
    expect(dureePeriodeMaintien(40)).toBe(90);
  });

  it('maladie de 20 jours, 3 ans d\'ancienneté : 7 jours de carence, 13 jours à 90 %', () => {
    const r = maintienSalaireLegal({ salaireMensuelBrut: 2400, ancienneteAnnees: 3, joursArret: 20, origine: 'maladie', ijssJournalieres: 39.45 });
    expect(r.jours90).toBe(13);
    expect(r.garantieBrute).toBe(936);
    expect(r.ijssPeriodeIndemnisee).toBe(512.85);
    expect(r.complementEmployeur).toBe(423.15);
  });

  it('AT de 20 jours : pas de carence employeur', () => {
    const r = maintienSalaireLegal({ salaireMensuelBrut: 2400, ancienneteAnnees: 3, joursArret: 20, origine: 'atmp', ijssJournalieres: 48 });
    expect(r.carenceEmployeur).toBe(0);
    expect(r.jours90).toBe(20);
    expect(r.complementEmployeur).toBe(480);
  });

  it('arrêt long : 30 jours à 90 % puis 30 jours aux 2/3', () => {
    const r = maintienSalaireLegal({ salaireMensuelBrut: 2400, ancienneteAnnees: 3, joursArret: 70, origine: 'maladie', ijssJournalieres: 0 });
    expect(r.jours90).toBe(30);
    expect(r.jours6666).toBe(30);
    expect(r.garantieBrute).toBe(3760);
  });

  it('tient compte des jours déjà indemnisés sur 12 mois', () => {
    const r = maintienSalaireLegal({ salaireMensuelBrut: 2400, ancienneteAnnees: 3, joursArret: 20, origine: 'maladie', ijssJournalieres: 0, joursDejaIndemnises12Mois: 25 });
    expect(r.jours90).toBe(5);
    expect(r.jours6666).toBe(8);
  });

  it('moins d\'un an d\'ancienneté : pas de maintien légal', () => {
    expect(maintienSalaireLegal({ salaireMensuelBrut: 2400, ancienneteAnnees: 0, joursArret: 20, origine: 'maladie', ijssJournalieres: 30 }).eligible).toBe(false);
  });
});
