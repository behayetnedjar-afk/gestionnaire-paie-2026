import { describe, expect, it } from 'vitest';
import { decouperTranches, plafondMensuel } from '../src';

const pmss = 4005;

describe('plafond mensuel proratisé', () => {
  it('mois complet à temps plein = PMSS', () => {
    expect(plafondMensuel({ pmss })).toBe(4005);
    expect(plafondMensuel({ pmss, dureeHebdoContrat: 35 })).toBe(4005);
  });

  it('temps partiel : PMSS × durée contractuelle / 35', () => {
    // 4005 × 24 / 35 = 2 746,2857
    expect(plafondMensuel({ pmss, dureeHebdoContrat: 24 })).toBe(2746.29);
  });

  it('entrée en cours de mois : PMSS × jours calendaires / 30', () => {
    // Entrée le 10 mars : 22 jours calendaires de présence sur 31
    expect(plafondMensuel({ pmss, joursCalendairesPresence: 22, joursCalendairesMois: 31 })).toBe(2937);
  });

  it('cumule temps partiel et entrée en cours de mois', () => {
    expect(plafondMensuel({ pmss, dureeHebdoContrat: 24, joursCalendairesPresence: 22, joursCalendairesMois: 31 })).toBe(2013.94);
  });

  it('pas de proratisation si présent tout le mois', () => {
    expect(plafondMensuel({ pmss, joursCalendairesPresence: 28, joursCalendairesMois: 28 })).toBe(4005);
  });
});

describe('tranches', () => {
  it('salaire sous le plafond : tout en tranche A / T1', () => {
    expect(decouperTranches(2563.8, pmss)).toEqual({ A: 2563.8, B: 0, C: 0, T1: 2563.8, T2: 0, jusqua4: 2563.8 });
  });

  it('cadre à 5 000 €', () => {
    expect(decouperTranches(5000, pmss)).toEqual({ A: 4005, B: 995, C: 0, T1: 4005, T2: 995, jusqua4: 5000 });
  });

  it('haut salaire à 20 000 € : tranches B et C bornées', () => {
    const t = decouperTranches(20000, pmss);
    expect(t.B).toBe(12015); // 3 × PMSS
    expect(t.C).toBe(3980); // 20 000 − 4 × 4 005
    expect(t.T2).toBe(15995);
    expect(t.jusqua4).toBe(16020);
  });
});
