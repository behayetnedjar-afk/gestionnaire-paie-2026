import { appliquerTaux, arrondir, somme } from '../commun/arrondi';
import { decouperTranches, plafondMensuel, type Tranches } from '../commun/plafond';
import { heuresMensualisees } from '../brut/heures-sup';
import { montantRGDU, smicCalcule as calculerSmic } from '../allegements/reduction-generale';
import { montantPAS, tauxNeutre, type TrancheGrille } from '../nets/prelevement-source';
import { Parametres, type TauxCotisation } from '../parametres/lecteur';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ElementMontant {
  libelle: string;
  /** Positif (prime) ou négatif (retenue pour absence). */
  montant: number;
}

export interface SaisieBulletin {
  statut: 'non_cadre' | 'cadre';
  /** Effectif de l'entreprise (seuils 11, 20, 50). */
  effectif: number;
  /** Salaire de base mensuel brut. */
  salaireBase: number;
  /** Durée hebdomadaire contractuelle (35 h par défaut). */
  dureeHebdo?: number;
  /** Taux horaire ; par défaut salaire de base / heures mensualisées. */
  tauxHoraire?: number;
  /** Heures supplémentaires du mois, déjà décomptées semaine par semaine. */
  heuresSup25?: number;
  heuresSup50?: number;
  /** Heures complémentaires du mois (temps partiel). */
  heuresComplementaires10?: number;
  heuresComplementaires25?: number;
  /** Primes et retenues soumises à cotisations. */
  elementsSoumis?: ElementMontant[];
  /** Avantages en nature (soumis, puis déduits du net payé). */
  avantagesNature?: ElementMontant[];
  /** Entrée ou sortie en cours de mois. */
  presence?: { joursCalendairesPresence: number; joursCalendairesMois: number };
  /** Taux AT/MP notifié (en %). */
  tauxAT: number;
  /** Taux de versement mobilité de la commune (en %), 0 si non applicable. */
  tauxVersementMobilite?: number;
  alsaceMoselle?: boolean;
  /** Complémentaire santé : montants mensuels forfaitaires. */
  complementaireSante?: { salarial: number; patronal: number };
  /** Prélèvement à la source : taux transmis par la DGFiP, ou taux neutre (grille). */
  prelevementSource: { taux: number } | { tauxNeutre: true };
  /** Heures supplémentaires déjà exonérées d'impôt depuis le 1er janvier. */
  cumulHeuresSupExonereesAnnee?: number;
  /** Remboursements de frais professionnels (non soumis). */
  remboursementsFrais?: number;
  acompte?: number;
}

export type SectionLigne = 'brut' | 'cotisation' | 'allegement' | 'csg' | 'net';

export interface LigneBulletin {
  section: SectionLigne;
  code: string;
  libelle: string;
  base?: number;
  tauxSalarial?: number;
  montantSalarial?: number;
  tauxPatronal?: number;
  montantPatronal?: number;
}

export interface ResultatBulletin {
  annee: number;
  plafond: number;
  tranches: Tranches;
  tauxHoraire: number;
  smicCalcule: number;
  brut: number;
  lignes: LigneBulletin[];
  totaux: {
    cotisationsSalariales: number;
    csgCrds: number;
    retenuesSalariales: number;
    cotisationsPatronales: number;
    allegementsPatronaux: number;
  };
  netAvantImpot: number;
  netImposable: number;
  netSocial: number;
  prelevementSource: { type: 'personnalise' | 'neutre'; taux: number; montant: number };
  netPaye: number;
  coutEmployeur: number;
  /** Chemins des paramètres « À VÉRIFIER » utilisés pour ce calcul. */
  avertissements: string[];
  /** Simplifications pédagogiques appliquées. */
  hypotheses: string[];
}

/* ------------------------------------------------------------------ */
/* Calcul                                                              */
/* ------------------------------------------------------------------ */

export function calculerBulletin(saisie: SaisieBulletin, donneesParametres: unknown): ResultatBulletin {
  const p = new Parametres(donneesParametres);
  const lignes: LigneBulletin[] = [];
  const hypotheses: string[] = [
    'Taux réduits maladie / famille et RGDU appréciés sur le mois (la loi raisonne sur l\'année, avec régularisation progressive).',
    'Plafond d\'exonération fiscale des HS apprécié sur le montant brut des heures.',
    'Net social = net avant impôt + part patronale de complémentaire santé (règles détaillées : BOSS, fiche « montant net social »).',
  ];

  /* ---------- 1. Paramètres de base ---------- */
  const pmss = p.nombre('plafonds_securite_sociale.pmss_mensuel');
  const smicMensuel = p.nombre('smic.mensuel_35h');
  const smicHoraire = p.nombre('smic.horaire_brut');
  const duree = saisie.dureeHebdo ?? 35;
  const fractionTemps = Math.min(duree / 35, 1);
  const fractionPresence = saisie.presence ? saisie.presence.joursCalendairesPresence / saisie.presence.joursCalendairesMois : 1;
  const plafond = plafondMensuel({ pmss, dureeHebdoContrat: duree, ...saisie.presence });
  const heuresMois = heuresMensualisees(duree);
  const tauxHoraire = saisie.tauxHoraire ?? arrondir(saisie.salaireBase / heuresMois, 4);

  /* ---------- 2. Salaire brut ---------- */
  const brutLigne = (code: string, libelle: string, montant: number, base?: number, taux?: number) => {
    lignes.push({ section: 'brut', code, libelle, base, tauxSalarial: taux, montantSalarial: arrondir(montant) });
    return arrondir(montant);
  };
  const elementsBrut: number[] = [brutLigne('BASE', 'Salaire de base', saisie.salaireBase, heuresMois, tauxHoraire)];

  const majorees: Array<[string, string, number | undefined, number]> = [
    ['HS25', 'Heures supplémentaires à 25 %', saisie.heuresSup25, 1.25],
    ['HS50', 'Heures supplémentaires à 50 %', saisie.heuresSup50, 1.5],
    ['HC10', 'Heures complémentaires à 10 %', saisie.heuresComplementaires10, 1.1],
    ['HC25', 'Heures complémentaires à 25 %', saisie.heuresComplementaires25, 1.25],
  ];
  let montantHeuresMajorees = 0;
  let heuresSup = 0;
  let heuresMajorees = 0;
  for (const [code, libelle, heures, coef] of majorees) {
    if (!heures) continue;
    const tauxMajore = arrondir(tauxHoraire * coef, 4);
    const m = brutLigne(code, libelle, heures * tauxMajore, heures, tauxMajore);
    elementsBrut.push(m);
    montantHeuresMajorees += m;
    heuresMajorees += heures;
    if (code.startsWith('HS')) heuresSup += heures;
  }
  for (const e of saisie.elementsSoumis ?? []) elementsBrut.push(brutLigne('ELEM', e.libelle, e.montant));
  const totalAvantages = somme((saisie.avantagesNature ?? []).map((a) => a.montant));
  for (const a of saisie.avantagesNature ?? []) elementsBrut.push(brutLigne('AN', `Avantage en nature — ${a.libelle}`, a.montant));

  const brut = somme(elementsBrut);
  montantHeuresMajorees = arrondir(montantHeuresMajorees);
  const t = decouperTranches(brut, plafond);
  const smic = calculerSmic(smicMensuel, smicHoraire, fractionTemps * fractionPresence, heuresMajorees);

  /* ---------- 3. Cotisations ---------- */
  const cot = (code: string, libelle: string, base: number, taux: TauxCotisation): LigneBulletin => {
    const l: LigneBulletin = {
      section: 'cotisation', code, libelle, base,
      tauxSalarial: taux.salarial, montantSalarial: appliquerTaux(base, taux.salarial),
      tauxPatronal: taux.patronal, montantPatronal: appliquerTaux(base, taux.patronal),
    };
    if (base > 0 && (l.montantSalarial || l.montantPatronal)) lignes.push(l);
    return l;
  };
  const patronalSeul = (patronal: number): TauxCotisation => ({ salarial: 0, patronal });

  // Santé
  const seuilMaladie = p.nombre('cotisations.maladie_taux_reduit.condition_seuil_smic');
  const maladie = brut <= seuilMaladie * smic ? p.cotisation('maladie_taux_reduit') : p.cotisation('maladie');
  cot('MALADIE', 'Sécurité sociale — maladie, maternité, invalidité, décès', brut, { salarial: 0, patronal: maladie.patronal });
  if (saisie.alsaceMoselle) cot('ALSACE', 'Complément maladie Alsace-Moselle', brut, { salarial: p.cotisation('maladie_alsace_moselle').salarial, patronal: 0 });
  cot('CSA', 'Contribution solidarité autonomie', brut, p.cotisation('contribution_solidarite_autonomie'));

  // Accidents du travail
  cot('ATMP', 'Accidents du travail — maladies professionnelles', brut, patronalSeul(saisie.tauxAT));

  // Retraite
  const vPlaf = p.cotisation('vieillesse_plafonnee');
  const vDeplaf = p.cotisation('vieillesse_deplafonnee');
  const t1 = p.cotisation('agirc_arrco_t1');
  const ceg1 = p.cotisation('ceg_t1');
  cot('VIEIL_PLAF', 'Sécurité sociale plafonnée', t.A, vPlaf);
  cot('VIEIL_DEPLAF', 'Sécurité sociale déplafonnée', brut, vDeplaf);
  cot('AGIRC_T1', 'Complémentaire Tranche 1', t.T1, t1);
  cot('CEG_T1', 'Contribution d\'équilibre général T1', t.T1, ceg1);
  if (t.T2 > 0) {
    cot('AGIRC_T2', 'Complémentaire Tranche 2', t.T2, p.cotisation('agirc_arrco_t2'));
    cot('CEG_T2', 'Contribution d\'équilibre général T2', t.T2, p.cotisation('ceg_t2'));
  }
  const cetDue = brut > plafond;
  if (cetDue) cot('CET', 'Contribution d\'équilibre technique', arrondir(t.T1 + t.T2), p.cotisation('cet'));
  if (saisie.statut === 'cadre') cot('APEC', 'APEC', t.jusqua4, p.cotisation('apec'));

  // Famille
  const seuilFamille = p.nombre('cotisations.allocations_familiales_taux_reduit.condition_seuil_smic');
  const famille = brut <= seuilFamille * smic ? p.cotisation('allocations_familiales_taux_reduit') : p.cotisation('allocations_familiales');
  cot('FAMILLE', 'Allocations familiales', brut, famille);

  // Chômage
  cot('CHOMAGE', 'Assurance chômage', t.jusqua4, p.cotisation('chomage'));
  cot('AGS', 'AGS (garantie des salaires)', t.jusqua4, p.cotisation('ags'));

  // Prévoyance et santé
  let prevoyancePatronale = 0;
  if (saisie.statut === 'cadre') {
    prevoyancePatronale = cot('PREV_CADRE', 'Prévoyance cadres (minimum conventionnel)', t.A, p.cotisation('prevoyance_cadres_minimum')).montantPatronal ?? 0;
  }
  const santeSal = arrondir(saisie.complementaireSante?.salarial ?? 0);
  const santePat = arrondir(saisie.complementaireSante?.patronal ?? 0);
  if (santeSal || santePat) {
    lignes.push({ section: 'cotisation', code: 'SANTE', libelle: 'Complémentaire santé', montantSalarial: santeSal, montantPatronal: santePat });
  }

  // Autres contributions employeur
  const fnal = saisie.effectif < 50 ? p.cotisation('fnal_moins_50') : p.cotisation('fnal_50_et_plus');
  cot('FNAL', 'FNAL', saisie.effectif < 50 ? t.A : brut, fnal);
  cot('CDS', 'Contribution au dialogue social', brut, p.cotisation('contribution_dialogue_social'));
  cot('FORMATION', 'Contribution formation professionnelle', brut,
    p.cotisation(saisie.effectif < 11 ? 'formation_professionnelle_moins_11' : 'formation_professionnelle_11_et_plus'));
  cot('TA', 'Taxe d\'apprentissage', brut, p.cotisation('taxe_apprentissage_principale'));
  cot('TA_SOLDE', 'Solde de la taxe d\'apprentissage', brut, p.cotisation('taxe_apprentissage_solde'));
  if (saisie.effectif >= 11 && (saisie.tauxVersementMobilite ?? 0) > 0) {
    cot('VM', 'Versement mobilité', brut, patronalSeul(saisie.tauxVersementMobilite ?? 0));
  }
  if (saisie.effectif >= 11 && prevoyancePatronale + santePat > 0) {
    cot('FORFAIT_SOCIAL', 'Forfait social sur prévoyance (8 %)', arrondir(prevoyancePatronale + santePat),
      patronalSeul(p.nombre('cotisations.forfait_social_prevoyance_11_et_plus.patronal')));
  }

  /* ---------- 4. Allègements ---------- */
  // Réduction de cotisations salariales sur heures sup et complémentaires (CSS art. L241-17)
  const tauxRetraiteSalarial = vPlaf.salarial + vDeplaf.salarial + t1.salarial + ceg1.salarial + (cetDue ? p.cotisation('cet').salarial : 0);
  const tauxReductionHS = Math.min(p.nombre('heures_supplementaires_exoneration.reduction_cotisations_salariales_taux_max_pct'), tauxRetraiteSalarial);
  if (montantHeuresMajorees > 0) {
    lignes.push({
      section: 'allegement', code: 'REDUC_HS_SAL', libelle: 'Réduction de cotisations salariales heures sup. / compl.',
      base: montantHeuresMajorees, tauxSalarial: -tauxReductionHS, montantSalarial: -appliquerTaux(montantHeuresMajorees, tauxReductionHS),
    });
  }
  // Déduction forfaitaire patronale sur HS (entreprises de moins de 20 salariés, CSS art. L241-18)
  if (saisie.effectif < 20 && heuresSup > 0) {
    const unitaire = p.nombre('heures_supplementaires_exoneration.deduction_forfaitaire_patronale_moins_20');
    lignes.push({ section: 'allegement', code: 'DEDUC_HS_PAT', libelle: 'Déduction forfaitaire patronale heures sup.', base: heuresSup, montantPatronal: -arrondir(heuresSup * unitaire) });
  }
  // Réduction générale dégressive unique (CSS art. L241-13)
  const rgdu = montantRGDU(brut, smic, {
    Tmin: p.nombre('reduction_generale.Tmin'),
    Tdelta: p.nombre(saisie.effectif < 50 ? 'reduction_generale.Tdelta_fnal_0_10' : 'reduction_generale.Tdelta_fnal_0_50'),
    P: p.nombre('reduction_generale.P'),
    seuilSmic: p.nombre('reduction_generale.seuil_sortie_x_smic'),
  });
  if (rgdu > 0) {
    lignes.push({ section: 'allegement', code: 'RGDU', libelle: 'Réduction générale des cotisations patronales', base: brut, montantPatronal: -rgdu });
  }

  /* ---------- 5. CSG / CRDS ---------- */
  const plafondExoFiscale = p.nombre('heures_supplementaires_exoneration.exoneration_impot_plafond_annuel');
  const hsExonerees = arrondir(Math.min(montantHeuresMajorees, Math.max(plafondExoFiscale - (saisie.cumulHeuresSupExonereesAnnee ?? 0), 0)));
  const abattement = p.nombre('cotisations.base_csg.abattement_frais_pro_pct');
  const limiteAbattement = p.nombre('cotisations.base_csg.limite_abattement_x_pass') * plafond;
  const brutHorsHS = brut - hsExonerees;
  const baseCsg = arrondir(
    Math.min(brutHorsHS, limiteAbattement) * (1 - abattement / 100) + Math.max(brutHorsHS - limiteAbattement, 0) + prevoyancePatronale + santePat,
  );
  const csgDed = p.cotisation('csg_deductible').salarial;
  const csgNonDed = p.cotisation('csg_non_deductible').salarial;
  const crds = p.cotisation('crds').salarial;
  const csg = (code: string, libelle: string, base: number, taux: number): number => {
    const montant = appliquerTaux(base, taux);
    lignes.push({ section: 'csg', code, libelle, base, tauxSalarial: taux, montantSalarial: montant });
    return montant;
  };
  const montantCsgDed = csg('CSG_DED', 'CSG déductible de l\'impôt sur le revenu', baseCsg, csgDed);
  csg('CSG_NON_DED', 'CSG non déductible de l\'impôt sur le revenu', baseCsg, csgNonDed);
  csg('CRDS', 'CRDS non déductible', baseCsg, crds);
  if (hsExonerees > 0) {
    csg('CSG_CRDS_HS', 'CSG/CRDS non déductibles sur heures sup. exonérées', arrondir(hsExonerees * (1 - abattement / 100)), arrondir(csgDed + csgNonDed + crds, 4));
  }

  /* ---------- 6. Totaux et nets ---------- */
  const sal = (f: (l: LigneBulletin) => boolean) => somme(lignes.filter(f).map((l) => l.montantSalarial ?? 0));
  const pat = (f: (l: LigneBulletin) => boolean) => somme(lignes.filter(f).map((l) => l.montantPatronal ?? 0));

  const cotisationsSalariales = sal((l) => l.section === 'cotisation' || l.section === 'allegement');
  const csgCrds = sal((l) => l.section === 'csg');
  const retenuesSalariales = somme([cotisationsSalariales, csgCrds]);
  const cotisationsPatronales = pat((l) => l.section === 'cotisation');
  const allegementsPatronaux = pat((l) => l.section === 'allegement');

  const netAvantImpot = arrondir(brut - retenuesSalariales);
  const cotisationsResiduellesHS = Math.max(tauxRetraiteSalarial - tauxReductionHS, 0);
  const hsExonereesNettes = arrondir(hsExonerees * (1 - cotisationsResiduellesHS / 100));
  const netImposable = arrondir(brut - cotisationsSalariales - montantCsgDed - hsExonereesNettes + santePat);
  const netSocial = arrondir(netAvantImpot + santePat);

  let pas: ResultatBulletin['prelevementSource'];
  if ('taux' in saisie.prelevementSource) {
    pas = { type: 'personnalise', taux: saisie.prelevementSource.taux, montant: montantPAS(netImposable, saisie.prelevementSource.taux) };
  } else {
    const grille = p.noeud<TrancheGrille[]>('prelevement_a_la_source.grille_metropole_mensuelle');
    const taux = tauxNeutre(netImposable, grille);
    pas = { type: 'neutre', taux, montant: montantPAS(netImposable, taux) };
  }

  const netPaye = arrondir(netAvantImpot - pas.montant - totalAvantages + (saisie.remboursementsFrais ?? 0) - (saisie.acompte ?? 0));
  const coutEmployeur = arrondir(brut + cotisationsPatronales + allegementsPatronaux);

  return {
    annee: p.annee,
    plafond,
    tranches: t,
    tauxHoraire,
    smicCalcule: smic,
    brut,
    lignes,
    totaux: { cotisationsSalariales, csgCrds, retenuesSalariales, cotisationsPatronales, allegementsPatronaux },
    netAvantImpot,
    netImposable,
    netSocial,
    prelevementSource: pas,
    netPaye,
    coutEmployeur,
    avertissements: Array.from(p.avertissements).sort(),
    hypotheses,
  };
}
