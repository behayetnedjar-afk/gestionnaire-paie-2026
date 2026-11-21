/**
 * @paie/moteur — moteur de calcul de paie pédagogique.
 * Toutes les valeurs légales viennent du fichier de paramètres de l'année,
 * passé en argument. Le moteur ne connaît aucune année « par défaut ».
 */
export { arrondir, appliquerTaux, somme } from './commun/arrondi';
export { plafondMensuel, decouperTranches, type OptionsPlafond, type Tranches } from './commun/plafond';
export { Parametres, ParametreManquantError, type StatutParametre, type TauxCotisation } from './parametres/lecteur';
export { heuresSupSemaine, heuresComplementairesSemaine, heuresMensualisees } from './brut/heures-sup';
export { indemniteCongesPayes, type SaisieCongesPayes, type ResultatCongesPayes } from './indemnites/conges-payes';
export {
  indemniteLegaleLicenciement,
  dureePreavisLegalMois,
  indemniteCompensatricePreavis,
  indemnitesFinCDD,
  type SaisieLicenciement,
  type SaisieFinCDD,
} from './indemnites/rupture';
export { maintienSalaireLegal, dureePeriodeMaintien, type SaisieMaintienSalaire } from './indemnites/maintien-salaire';
export { coefficientRGDU, montantRGDU, smicCalcule, type ParametresRGDU } from './allegements/reduction-generale';
export { tauxNeutre, montantPAS, type TrancheGrille } from './nets/prelevement-source';
export {
  calculerBulletin,
  type SaisieBulletin,
  type ResultatBulletin,
  type LigneBulletin,
  type ElementMontant,
} from './bulletin/calculer-bulletin';
