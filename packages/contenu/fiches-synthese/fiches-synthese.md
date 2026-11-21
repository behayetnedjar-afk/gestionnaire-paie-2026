# Fiches synthèse transverses — Référentiel 2026

> Usage : **Mode Révision → Fiches synthèse**. Une fiche = une page imprimable / exportable en PDF.
> Origine : fiches fournies par le porteur de projet, **relues et corrigées**. Chaque correction est signalée par **[Corrigé]**.
> Les valeurs chiffrées renvoient à `parametres/2026.json`. Mention **À VÉRIFIER** = à confirmer sur la source officielle.

---

## FICHE 1 — Le bulletin de paie : structure et mentions

**Mentions obligatoires** (C. trav. art. R3243-1 et arrêté du 25 février 2016 modifié, bulletin clarifié)

- **Employeur :** nom et adresse, SIRET de l'établissement, code APE (NAF), convention collective applicable (intitulé et IDCC).
- **Salarié :** nom, emploi, position dans la classification (niveau / coefficient).
- **Période et durée :** période de paie, nombre d'heures rémunérées (en distinguant heures normales et heures majorées), nature et volume du forfait le cas échéant.
- **Rémunération :** salaire brut et chacun de ses éléments.
- **Cotisations :** regroupées par risque (santé, accidents du travail, retraite, famille, chômage, autres contributions dues par l'employeur), avec assiette, taux, part salariale et part patronale.
- **Allègements :** montant total des exonérations et réductions de cotisations patronales.
- **Total versé par l'employeur** (coût total), obligatoire avec le bulletin clarifié depuis 2018.
- **Nets :** montant net social **[Corrigé : obligatoire depuis le 1er juillet 2023, généralisé au 1er janvier 2024]**, net à payer avant impôt, net imposable, taux et montant du prélèvement à la source, net payé.
- **Congés payés :** dates de congé et montant de l'indemnité correspondante pour la période.
- **Mention** invitant le salarié à conserver son bulletin sans limitation de durée, et renvoi vers la rubrique dédiée au bulletin de paie sur service-public.fr.
- Date de paiement.

**Mentions interdites** (C. trav. art. R3243-4) : exercice du droit de grève, activité de représentation des salariés.

**[Corrigé] NIR :** le numéro de sécurité sociale n'est **pas** une mention listée par R3243-1. Il figure en pratique sur la plupart des bulletins, mais son usage est encadré (RGPD, décret-cadre NIR). À ne jamais reprendre hors paie et DSN.

**Conservation :** employeur 5 ans (double, C. trav. art. L3243-4) ; salarié sans limite (conseillé). Format électronique possible sauf opposition du salarié, avec disponibilité 50 ans ou jusqu'aux 75 ans du salarié (C. trav. art. L3243-2, D3243-8).

---

## FICHE 2 — Du brut au net, pas à pas

**[Corrigé]** La version initiale plaçait le net social juste après les cotisations, puis passait directement au net à payer. L'ordre exact est le suivant :

```
   Salaire de base (taux horaire × heures, ou forfait)
 + Éléments variables soumis : HS, primes, commissions, avantages en nature, indemnités
 − Absences (retenues)
 = SALAIRE BRUT
 − Cotisations et contributions salariales (dont CSG/CRDS)
 = NET À PAYER AVANT IMPÔT SUR LE REVENU
 − Prélèvement à la source (taux × net imposable)
 − Avantages en nature (déjà payés en nature), part salariale titres-restaurant,
   acomptes, saisies sur salaire
 + Remboursements de frais professionnels, indemnités non soumises
 = NET PAYÉ (virement)
```

**Les trois « nets » à ne pas confondre**

| Indicateur | Définition | Usage |
|---|---|---|
| **Net à payer avant impôt** | Brut − toutes les cotisations et contributions salariales | Base du net payé |
| **Net imposable** | Brut − cotisations salariales déductibles − CSG déductible (6,80 %) − éléments exonérés d'impôt (HS dans la limite de 7 500 €…) + part patronale de mutuelle | Assiette du prélèvement à la source |
| **Montant net social** | Brut − cotisations et contributions sociales obligatoires + certains éléments (part patronale mutuelle, avantages…) | Calcul du RSA et de la prime d'activité |

**Points clés**
- **Assiette CSG/CRDS :** 98,25 % du brut (abattement de 1,75 % limité à 4 PASS) + 100 % de la part patronale de prévoyance, retraite supplémentaire et complémentaire santé. CSG déductible 6,80 %, non déductible 2,40 %, CRDS 0,50 %.
- **PASS 2026 : 48 060 € ; PMSS : 4 005 €.** Sur un bulletin mensuel, on raisonne en **PMSS** (proratisé en cas de temps partiel ou d'entrée/sortie en cours de mois).
- **Tranches AGIRC-ARRCO :** T1 jusqu'à 1 PMSS, T2 de 1 à 8 PMSS (en mensuel).

---

## FICHE 3 — Les cotisations sociales

| Famille | Exemples | Assiette |
|---|---|---|
| Santé | Maladie-maternité-invalidité-décès (13 % patronal ; 7 % sous 2,25 SMIC — À VÉRIFIER) | Totalité du brut |
| Accidents du travail | AT/MP | Totalité (taux notifié par la CARSAT) |
| Retraite de base | Vieillesse plafonnée / déplafonnée | PMSS / totalité |
| Retraite complémentaire | AGIRC-ARRCO, CEG, CET (si brut > PMSS), APEC (cadres) | T1 / T2 |
| Famille | Allocations familiales (5,25 % ; 3,45 % sous le seuil — À VÉRIFIER) | Totalité |
| Chômage | Part patronale 4 % + AGS (part salariale supprimée depuis octobre 2018) | Dans la limite de 4 PMSS |
| CSG / CRDS **[Ajouté]** | CSG déductible, non déductible, CRDS | 98,25 % du brut + parts patronales prévoyance/santé |
| Autres | FNAL, CSA, versement mobilité, contribution dialogue social, formation, taxe d'apprentissage, forfait social | Variable selon effectif |

**[Corrigé] Organismes de collecte**
La version initiale citait France Travail et l'OPCO comme organismes de collecte : ce n'est plus le cas.
- **URSSAF** (régime général) ou **MSA** (régime agricole) : sécurité sociale, CSG/CRDS, **assurance chômage et AGS** (collecte transférée à l'URSSAF depuis 2011), **contributions formation et taxe d'apprentissage** (collecte transférée à l'URSSAF depuis 2022), versement mobilité.
- **Caisses AGIRC-ARRCO** : retraite complémentaire (le transfert du recouvrement à l'URSSAF a été reporté — **À VÉRIFIER** pour 2026).
- **Organismes assureurs** (institutions de prévoyance, mutuelles, assureurs) : prévoyance et complémentaire santé.
- Tout est déclaré via la **DSN** sur net-entreprises.fr.

---

## FICHE 4 — Durée du travail et heures supplémentaires

- **Durée légale :** 35 h par semaine civile (151,67 h par mois) — C. trav. art. L3121-27.
- **Durées maximales :** 10 h par jour, 48 h par semaine, 44 h en moyenne sur 12 semaines.
- **Repos :** 11 h consécutives par jour, 35 h consécutives par semaine.
- **Majorations HS (à défaut d'accord) :** +25 % de la 36e à la 43e heure, +50 % dès la 44e. Un accord peut fixer un taux d'au moins 10 %. Décompte **par semaine**.
- **Contingent annuel :** 220 h par défaut.
- **[Corrigé] Contrepartie obligatoire en repos** (et non « repos compensateur ») au-delà du contingent : 50 % (≤ 20 salariés) ou 100 % (> 20 salariés). Le **repos compensateur de remplacement** est un autre mécanisme : il remplace le paiement des HS, sur accord.
- **Exonérations HS :** réduction de cotisations salariales (taux maximal 11,31 %) ; exonération d'impôt dans la limite de 7 500 € nets par an ; déduction forfaitaire patronale de 1,50 €/h dans les entreprises de moins de 20 salariés (dispositif 2026 à VÉRIFIER pour les autres tailles).
- **Forfaits :** en heures (hebdomadaire, mensuel, annuel) ; en jours (218 jours maximum, accord collectif + convention individuelle + suivi de la charge).
- **[Corrigé] Cadres dirigeants :** ce n'est pas un forfait. Ils sont **exclus** de la réglementation sur la durée du travail (C. trav. art. L3111-2).

---

## FICHE 5 — Les absences en paie

**Maladie non professionnelle**
- Carence Sécurité sociale : **3 jours**.
- IJSS : **50 %** du salaire journalier de base (moyenne des 3 derniers mois / 91,25), revenu pris en compte plafonné à **1,4 SMIC** depuis le 1er avril 2025 (À VÉRIFIER pour 2026).
- Maintien de salaire légal (C. trav. art. L1226-1) : ancienneté d'au moins 1 an, carence de **7 jours**, 90 % pendant 30 jours puis 66,66 % pendant 30 jours (+10 jours par tranche de 5 ans d'ancienneté, maximum 90 jours par période). La convention collective est souvent plus favorable.
- Subrogation : l'employeur maintient le salaire et perçoit directement les IJSS.

**Accident du travail / maladie professionnelle**
- Pas de carence Sécurité sociale. **[Précisé]** IJ : 60 % du salaire journalier de référence pendant 28 jours, puis 80 % (montants plafonnés — À VÉRIFIER sur ameli.fr).
- Maintien légal employeur : **dès le 1er jour** (pas de carence de 7 jours), toujours sous condition d'**1 an d'ancienneté**.

**Maternité / paternité**
- Congé maternité : 16 semaines (1er et 2e enfant), 26 semaines (à partir du 3e), plus en cas de naissances multiples.
- Congé de paternité et d'accueil de l'enfant : 25 jours calendaires (32 en cas de naissances multiples), dont 4 jours obligatoires après le congé de naissance de 3 jours.
- **À VÉRIFIER :** la création d'un nouveau « congé de naissance » a été annoncée pour les années 2026-2027. Contrôler les textes en vigueur sur service-public.fr.
- Signalement d'arrêt en **DSN événementielle** (dans les 5 jours).

**Congés payés**
- Acquisition : 2,5 jours ouvrables par mois, soit 30 jours ouvrables (5 semaines) par an.
- Indemnité : **la plus favorable** entre le maintien de salaire et le 1/10e de la rémunération brute de la période de référence.
- Période de référence : du 1er juin au 31 mai, sauf accord.
- **[Précisé]** Arrêt maladie non professionnel : acquisition de **2 jours ouvrables par mois**, dans la limite de 24 jours par an. AT/MP : 2,5 jours par mois **sans limite de durée**. Report de 15 mois pour les congés non pris en raison de l'arrêt (loi n° 2024-364 du 22 avril 2024 ; C. trav. art. L3141-5, L3141-5-1, L3141-19-1).

---

## FICHE 6 — Éléments de rémunération particuliers

- **Avantages en nature** (logement, véhicule, nourriture, outils numériques) : évalués au **forfait** (barème URSSAF) ou à la **valeur réelle**. Ils entrent dans le brut et l'assiette des cotisations, puis sont déduits du net (déjà perçus en nature). Barèmes 2026 : **À VÉRIFIER**.
- **Frais professionnels** : remboursés sur justificatifs ou par allocations forfaitaires (repas, grand déplacement, télétravail, mobilité). Exonérés dans les limites fixées par l'arrêté du 20 décembre 2002 et le BOSS. Montants 2026 : **À VÉRIFIER**.
- **Titres-restaurant** : participation patronale entre **50 % et 60 %** de la valeur faciale, exonérée dans une limite par titre (7,26 € en 2025 ; montant 2026 **À VÉRIFIER**).
- **Intéressement / participation** : exonérés de cotisations sociales, mais soumis à **CSG/CRDS**. **[Précisé]** Forfait social de 20 % selon l'effectif : pas de forfait social sur la participation dans les entreprises de moins de 50 salariés, ni sur l'intéressement dans celles de moins de 250 salariés.
- **Prime de partage de la valeur** : plafonds de 3 000 € et 6 000 € ; régime social et fiscal selon l'effectif, la rémunération et la date de versement : **À VÉRIFIER** pour 2026 (BOSS).

---

## FICHE 7 — Contrats et fin de contrat

**Types de contrats** : CDI ; CDD (précarité 10 % puis ICCP 10 % calculée **sur salaires + précarité**) ; temps partiel ; apprentissage et professionnalisation (rémunération en % du SMIC, exonérations spécifiques) ; intérim (l'entreprise de travail temporaire fait la paie).

**Solde de tout compte**
- Salaire jusqu'à la date de sortie (avec proratisation du plafond).
- Indemnité compensatrice de congés payés.
- Indemnité compensatrice de préavis (si le préavis est dispensé par l'employeur).
- Indemnité de licenciement : légale = **1/4 de mois par année** jusqu'à 10 ans, **1/3 au-delà** ; ancienneté minimale **8 mois** ; salaire de référence le plus favorable entre la moyenne des 12 ou des 3 derniers mois (C. trav. art. L1234-9, R1234-2).
- Indemnité spécifique de rupture conventionnelle : au moins égale à l'indemnité légale (ou conventionnelle si elle est plus favorable, selon la branche). Contribution patronale spécifique de 30 % (**À VÉRIFIER** pour 2026).

**Documents de fin de contrat** : certificat de travail, attestation France Travail (transmise via la DSN), reçu pour solde de tout compte (dénonçable dans les 6 mois), dernier bulletin de paie.

---

## FICHE 8 — La DSN (déclaration sociale nominative)

- **DSN mensuelle :** au plus tard le **5** du mois suivant (entreprises d'au moins 50 salariés qui paient dans le mois) ou le **15** (autres cas).
- **Signalements événementiels :** arrêt de travail et reprise anticipée dans les **5 jours** ; fin de contrat de travail (dans les 5 jours, ou intégrée à la DSN mensuelle selon les cas).
- **Support :** net-entreprises.fr (dépôt depuis le logiciel de paie).
- **Alimente :** Sécurité sociale (URSSAF, CPAM, CNAV), retraite complémentaire, France Travail, administration fiscale (PAS), organismes de prévoyance et de santé.
- **Vigilance :** cohérence paie ↔ DSN ↔ comptabilité ; traitement des comptes rendus métier (CRM) et des anomalies ; corrections par la DSN suivante (régularisation) ou par une **DSN annule et remplace** avant l'échéance.

---

## FICHE 9 — Le prélèvement à la source (PAS)

- L'employeur applique le taux transmis par la DGFiP dans le **compte rendu métier (CRM)** reçu après la DSN.
- **Taux personnalisé** (foyer fiscal), **taux individualisé** (couple, choisi par le salarié), **taux non personnalisé / neutre** (grille par défaut : salarié sans taux transmis, nouvel embauché, ou salarié qui le demande).
- **[Corrigé] Assiette = net imposable**, calculé ainsi :
  `Net imposable = Brut − cotisations salariales déductibles − CSG déductible − éléments exonérés (HS…) + part patronale de complémentaire santé`
  Ou, à partir du net avant impôt : `Net avant impôt + CSG non déductible + CRDS − éléments exonérés + part patronale santé`.
  La version initiale additionnait la CSG non déductible au brut, ce qui est faux.
- Grille du taux neutre 2026 : **À VÉRIFIER** (BOFiP, BOI-BAREME-000037).
- Reversement à la DGFiP via la DSN, en même temps que les cotisations.

---

## FICHE 10 — Repères essentiels de droit du travail

- **Hiérarchie des normes :** loi → convention de branche / accord d'entreprise → contrat de travail. Depuis 2017, l'accord d'entreprise prime sur la branche sauf dans les blocs 1 et 2 ; entre accord et contrat, le principe de faveur s'applique (sauf accord de performance collective).
- **SMIC 2026 :** 12,02 €/h, soit 1 823,03 € par mois pour 151,67 h (au 1er janvier 2026). Revalorisation automatique en cours d'année si l'inflation dépasse 2 % : toujours vérifier le montant du jour.
- **Conventions collectives :** à appliquer quand elles sont plus favorables que la loi (minima, ancienneté, maintien de salaire, primes). Le salarié perçoit au moins le plus élevé du SMIC et du minimum conventionnel.
- **[Corrigé] CSE :** obligatoire dès **11 salariés** (seuil atteint pendant 12 mois consécutifs). Entre 11 et 49 salariés, il présente les réclamations individuelles et collectives et veille à la santé et la sécurité. Les **attributions économiques et la consultation** (orientations stratégiques, situation économique, politique sociale) ne s'appliquent qu'à partir de **50 salariés**.
- **Prescription :** 3 ans pour le paiement du salaire, 2 ans pour l'exécution du contrat, 1 an pour la rupture.
