import { describe, expect, it } from 'vitest';
import { calculerBulletin, type ResultatBulletin, type SaisieBulletin } from '../src';
import { chargerParametres } from './aide';

const json = chargerParametres();
const ligne = (r: ResultatBulletin, code: string) => {
  const l = r.lignes.find((x) => x.code === code);
  if (!l) throw new Error(`Ligne ${code} absente`);
  return l;
};

/** Cas pratique du Module 1 : Mme Martin, mars 2026. Valeurs calculées à la main dans le cours. */
const mmeMartin: SaisieBulletin = {
  statut: 'non_cadre',
  effectif: 35,
  salaireBase: 2275.05,
  heuresSup25: 13,
  heuresSup50: 2,
  tauxAT: 1.5,
  prelevementSource: { taux: 3 },
};

describe('bulletin de référence — cas pratique Module 1 (Mme Martin)', () => {
  const r = calculerBulletin(mmeMartin, json);

  it('salaire brut', () => {
    expect(r.tauxHoraire).toBe(15);
    expect(ligne(r, 'HS25').montantSalarial).toBe(243.75);
    expect(ligne(r, 'HS50').montantSalarial).toBe(45);
    expect(r.brut).toBe(2563.8);
    expect(r.plafond).toBe(4005);
  });

  it('cotisations salariales ligne à ligne', () => {
    expect(ligne(r, 'VIEIL_PLAF').montantSalarial).toBe(176.9);
    expect(ligne(r, 'VIEIL_DEPLAF').montantSalarial).toBe(10.26);
    expect(ligne(r, 'AGIRC_T1').montantSalarial).toBe(80.76);
    expect(ligne(r, 'CEG_T1').montantSalarial).toBe(22.05);
    expect(ligne(r, 'REDUC_HS_SAL').montantSalarial).toBe(-32.66);
    expect(r.lignes.find((l) => l.code === 'CET')).toBeUndefined();
    expect(r.totaux.cotisationsSalariales).toBe(257.31);
  });

  it('CSG / CRDS, avec la part sur HS entièrement non déductible', () => {
    expect(ligne(r, 'CSG_DED').base).toBe(2235.24);
    expect(ligne(r, 'CSG_DED').montantSalarial).toBe(152);
    expect(ligne(r, 'CSG_NON_DED').montantSalarial).toBe(53.65);
    expect(ligne(r, 'CRDS').montantSalarial).toBe(11.18);
    expect(ligne(r, 'CSG_CRDS_HS').base).toBe(283.7);
    expect(ligne(r, 'CSG_CRDS_HS').montantSalarial).toBe(27.52);
    expect(r.totaux.csgCrds).toBe(244.35);
  });

  it('nets et prélèvement à la source', () => {
    expect(r.totaux.retenuesSalariales).toBe(501.66);
    expect(r.netAvantImpot).toBe(2062.14);
    expect(r.netImposable).toBe(1865.74);
    expect(r.prelevementSource).toEqual({ type: 'personnalise', taux: 3, montant: 55.97 });
    expect(r.netPaye).toBe(2006.17);
    expect(r.netSocial).toBe(2062.14);
  });

  it('côté employeur : taux réduit maladie, RGDU, pas de déduction forfaitaire (35 salariés)', () => {
    expect(ligne(r, 'MALADIE').tauxPatronal).toBe(7);
    expect(ligne(r, 'MALADIE').montantPatronal).toBe(179.47);
    expect(ligne(r, 'FAMILLE').tauxPatronal).toBe(3.45);
    expect(ligne(r, 'RGDU').montantPatronal).toBe(-534.81);
    expect(r.lignes.find((l) => l.code === 'DEDUC_HS_PAT')).toBeUndefined();
    expect(ligne(r, 'FORMATION').tauxPatronal).toBe(1);
    expect(ligne(r, 'FNAL').base).toBe(2563.8); // tranche A (< 50 salariés)
  });

  it('coût employeur = brut + cotisations patronales − allègements', () => {
    expect(r.coutEmployeur).toBeCloseTo(r.brut + r.totaux.cotisationsPatronales + r.totaux.allegementsPatronaux, 2);
    expect(r.coutEmployeur).toBeGreaterThan(r.brut);
  });

  it('signale les paramètres À VÉRIFIER utilisés', () => {
    expect(r.avertissements).toContain('reduction_generale.Tmin');
    expect(r.avertissements).toContain('cotisations.maladie_taux_reduit.condition_seuil_smic');
    expect(r.avertissements).toContain('cotisations.ags');
    expect(r.avertissements).not.toContain('plafonds_securite_sociale.pmss_mensuel');
  });
});

describe('bulletin de référence — cadre à 5 000 € (au-dessus du PMSS)', () => {
  const r = calculerBulletin({ statut: 'cadre', effectif: 60, salaireBase: 5000, tauxAT: 1, prelevementSource: { taux: 5 } }, json);

  it('tranches et cotisations retraite T1 / T2 / CET / APEC', () => {
    expect(r.tranches.T2).toBe(995);
    expect(ligne(r, 'VIEIL_PLAF').montantSalarial).toBe(276.35);
    expect(ligne(r, 'VIEIL_DEPLAF').montantSalarial).toBe(20);
    expect(ligne(r, 'AGIRC_T1').montantSalarial).toBe(126.16);
    expect(ligne(r, 'AGIRC_T2').montantSalarial).toBe(85.97);
    expect(ligne(r, 'CEG_T1').montantSalarial).toBe(34.44);
    expect(ligne(r, 'CEG_T2').montantSalarial).toBe(10.75);
    expect(ligne(r, 'CET').montantSalarial).toBe(7);
    expect(ligne(r, 'APEC').montantSalarial).toBe(1.2);
    expect(r.totaux.cotisationsSalariales).toBe(561.87);
  });

  it('prévoyance cadre patronale réintégrée dans l\'assiette CSG', () => {
    expect(ligne(r, 'PREV_CADRE').montantPatronal).toBe(60.08);
    expect(ligne(r, 'CSG_DED').base).toBe(4972.58);
    expect(r.totaux.csgCrds).toBe(482.34);
  });

  it('nets', () => {
    expect(r.netAvantImpot).toBe(3955.79);
    expect(r.netImposable).toBe(4099.99);
    expect(r.prelevementSource.montant).toBe(205);
    expect(r.netPaye).toBe(3750.79);
  });

  it('taux pleins maladie, taux réduit famille, FNAL 0,50 % et forfait social (≥ 50 salariés)', () => {
    expect(ligne(r, 'MALADIE').montantPatronal).toBe(650);
    expect(ligne(r, 'FAMILLE').montantPatronal).toBe(172.5);
    expect(ligne(r, 'FNAL').tauxPatronal).toBe(0.5);
    expect(ligne(r, 'FORFAIT_SOCIAL').base).toBe(60.08);
  });
});

describe('autres situations', () => {
  it('taux neutre lu dans la grille (signalé À VÉRIFIER)', () => {
    const r = calculerBulletin({ ...mmeMartin, prelevementSource: { tauxNeutre: true } }, json);
    expect(r.prelevementSource).toEqual({ type: 'neutre', taux: 2.1, montant: 39.18 });
    expect(r.avertissements).toContain('prelevement_a_la_source.grille_metropole_mensuelle');
  });

  it('entreprise de moins de 20 salariés : déduction forfaitaire de 1,50 € par HS', () => {
    const r = calculerBulletin({ ...mmeMartin, effectif: 12 }, json);
    expect(ligne(r, 'DEDUC_HS_PAT').montantPatronal).toBe(-22.5);
    expect(ligne(r, 'FORMATION').tauxPatronal).toBe(1);
  });

  it('temps partiel 24 h entré le 10 du mois : plafond proratisé', () => {
    const r = calculerBulletin({ statut: 'non_cadre', effectif: 8, salaireBase: 1300, dureeHebdo: 24, presence: { joursCalendairesPresence: 22, joursCalendairesMois: 31 }, tauxAT: 1, prelevementSource: { taux: 0 } }, json);
    expect(r.plafond).toBe(2013.94);
    expect(r.tauxHoraire).toBe(12.5);
    expect(ligne(r, 'FORMATION').tauxPatronal).toBe(0.55);
  });

  it('complémentaire santé : part patronale dans le net imposable, le net social et la base CSG', () => {
    const sans = calculerBulletin(mmeMartin, json);
    const avec = calculerBulletin({ ...mmeMartin, complementaireSante: { salarial: 30, patronal: 40 } }, json);
    expect(avec.netAvantImpot).toBeLessThan(sans.netAvantImpot);
    expect(ligne(avec, 'CSG_DED').base).toBe(2275.24);
    expect(avec.netSocial).toBe(arrondi2(avec.netAvantImpot + 40));
    expect(ligne(avec, 'FORFAIT_SOCIAL').montantPatronal).toBe(3.2);
  });

  it('Alsace-Moselle : cotisation salariale maladie supplémentaire', () => {
    const r = calculerBulletin({ ...mmeMartin, alsaceMoselle: true }, json);
    expect(ligne(r, 'ALSACE').montantSalarial).toBe(33.33);
    expect(r.avertissements).toContain('cotisations.maladie_alsace_moselle');
  });

  it('avantage en nature : soumis puis déduit du net payé ; frais remboursés ajoutés', () => {
    const r = calculerBulletin({ ...mmeMartin, avantagesNature: [{ libelle: 'repas', montant: 100 }], remboursementsFrais: 50 }, json);
    expect(r.brut).toBe(2663.8);
    expect(r.netPaye).toBe(arrondi2(r.netAvantImpot - r.prelevementSource.montant - 100 + 50));
  });

  it('refuse un calcul si un taux obligatoire manque dans les paramètres', () => {
    const casse = structuredClone(json);
    casse.cotisations.vieillesse_plafonnee.salarial = null;
    expect(() => calculerBulletin(mmeMartin, casse)).toThrow(/non renseigné/);
  });
});

function arrondi2(n: number) {
  return Math.round(n * 100) / 100;
}
