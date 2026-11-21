# @paie/moteur — moteur de calcul de paie

Moteur pédagogique isolé : aucune dépendance à l'interface ni à la base de données.
**Aucun taux n'est écrit dans le code** : le fichier `parametres/AAAA.json` est passé en argument.

```ts
import { calculerBulletin } from '@paie/moteur';
import parametres2026 from '../../parametres/2026.json';

const r = calculerBulletin({
  statut: 'non_cadre', effectif: 35, salaireBase: 2275.05,
  heuresSup25: 13, heuresSup50: 2, tauxAT: 1.5,
  prelevementSource: { taux: 3 },
}, parametres2026);

r.netPaye;          // 2006.17
r.avertissements;   // ['cotisations.ags', 'reduction_generale.Tmin', …] → paramètres À VÉRIFIER utilisés
```

## Règles de sécurité

| Situation | Comportement |
|---|---|
| Valeur `null` dans les paramètres | Le calcul **échoue** (`ParametreManquantError`) : jamais de valeur inventée. |
| Valeur au statut `A_VERIFIER` | Le calcul aboutit, et le chemin du paramètre est listé dans `avertissements`. |
| Taux propre à l'entreprise (AT/MP, versement mobilité) | Doit être saisi. |
| Simplifications pédagogiques | Listées dans `hypotheses` (ex. taux réduits appréciés au mois). |

## Formules disponibles

| Fonction | Objet | Référence |
|---|---|---|
| `plafondMensuel`, `decouperTranches` | Plafond proratisé (temps partiel, entrée/sortie), tranches A/B/C et T1/T2 | CSS L242-8, R242-2 |
| `heuresSupSemaine`, `heuresComplementairesSemaine` | HS et HC d'une semaine, majorations | C. trav. L3121-36, L3123-29 |
| `indemniteCongesPayes` | 1/10e contre maintien, plus favorable | C. trav. L3141-24 |
| `indemniteLegaleLicenciement` | 1/4 puis 1/3 de mois par année, 8 mois minimum | C. trav. L1234-9, R1234-2 |
| `dureePreavisLegalMois`, `indemniteCompensatricePreavis` | Préavis légal | C. trav. L1234-1, L1234-5 |
| `indemnitesFinCDD` | Précarité puis indemnité compensatrice de congés payés | C. trav. L1243-8, L1243-10 |
| `maintienSalaireLegal` | Maintien légal maladie / AT (carence, 90 %, 2/3) | C. trav. L1226-1, D1226-1 et s. |
| `coefficientRGDU`, `montantRGDU` | Réduction générale 2026 (paramètres À VÉRIFIER) | CSS L241-13 |
| `tauxNeutre`, `montantPAS` | Prélèvement à la source | CGI art. 204 H |
| `calculerBulletin` | Bulletin complet : brut, cotisations, allègements, nets, coût employeur | — |

## Tests

```
npm test          # depuis la racine du dépôt
```

74 tests, dont **2 bulletins de référence calculés à la main** :
- le cas pratique du Module 1 (non-cadre, heures supplémentaires) ;
- un cadre à 5 000 € (tranche 2, CET, APEC, prévoyance).

Les tests lisent le vrai fichier `parametres/2026.json` : une valeur modifiée qui change un résultat fait échouer la série, et la publication du site est bloquée.
