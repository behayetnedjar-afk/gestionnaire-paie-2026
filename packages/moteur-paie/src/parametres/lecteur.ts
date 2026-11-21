/**
 * Lecture sécurisée du fichier parametres/AAAA.json.
 *
 * Règles :
 * - une valeur null fait échouer le calcul (jamais de valeur inventée) ;
 * - toute valeur lue dont le statut est « A_VERIFIER » (directement ou par héritage
 *   de la section parente) est enregistrée dans `avertissements`, pour être
 *   affichée à côté du résultat.
 */
export type StatutParametre = 'publie' | 'A_VERIFIER' | 'stable';

export class ParametreManquantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParametreManquantError';
  }
}

export interface TauxCotisation {
  salarial: number;
  patronal: number;
}

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export class Parametres {
  readonly avertissements = new Set<string>();

  constructor(readonly donnees: Json) {
    if (!donnees || typeof donnees !== 'object' || typeof donnees.meta?.annee !== 'number') {
      throw new ParametreManquantError('Fichier de paramètres invalide : meta.annee manquant.');
    }
  }

  get annee(): number {
    return this.donnees.meta.annee;
  }

  /** Parcourt le chemin et renvoie le nœud trouvé + le statut hérité. */
  private parcourir(chemin: string): { noeud: Json; statut?: StatutParametre } {
    let noeud: Json = this.donnees;
    let statut: StatutParametre | undefined;
    for (const cle of chemin.split('.')) {
      if (noeud && typeof noeud === 'object' && typeof noeud.statut === 'string') statut = noeud.statut;
      noeud = noeud?.[cle];
      if (noeud === undefined) throw new ParametreManquantError(`Paramètre inconnu : ${chemin}`);
    }
    if (noeud && typeof noeud === 'object' && typeof noeud.statut === 'string') statut = noeud.statut;
    return { noeud, statut };
  }

  private signaler(chemin: string, statut?: StatutParametre): void {
    if (statut === 'A_VERIFIER') this.avertissements.add(chemin);
  }

  /** Lit un nombre (champ `valeur` si le nœud est un objet). */
  nombre(chemin: string): number {
    const { noeud, statut } = this.parcourir(chemin);
    const v = noeud !== null && typeof noeud === 'object' && 'valeur' in noeud ? noeud.valeur : noeud;
    if (v === null || v === undefined) {
      throw new ParametreManquantError(
        `Paramètre « ${chemin} » non renseigné pour ${this.annee}. Complétez parametres/${this.annee}.json depuis la source officielle.`,
      );
    }
    if (typeof v !== 'number') throw new ParametreManquantError(`Paramètre « ${chemin} » : nombre attendu.`);
    this.signaler(chemin, statut);
    return v;
  }

  /** Lit un nœud brut (tableau, objet) en signalant son statut. */
  noeud<T = Json>(chemin: string): T {
    const { noeud, statut } = this.parcourir(chemin);
    if (noeud === null) throw new ParametreManquantError(`Paramètre « ${chemin} » non renseigné pour ${this.annee}.`);
    this.signaler(chemin, statut);
    return noeud as T;
  }

  /** Taux salarial et patronal d'une cotisation (en %). Absent = 0 ; null = erreur. */
  cotisation(code: string): TauxCotisation {
    const chemin = `cotisations.${code}`;
    const { noeud, statut } = this.parcourir(chemin);
    for (const cote of ['salarial', 'patronal'] as const) {
      if (cote in noeud && noeud[cote] === null) {
        throw new ParametreManquantError(`Taux ${cote} de « ${code} » non renseigné : il doit être saisi (taux propre à l'entreprise).`);
      }
    }
    this.signaler(chemin, statut);
    return { salarial: noeud.salarial ?? 0, patronal: noeud.patronal ?? 0 };
  }
}
