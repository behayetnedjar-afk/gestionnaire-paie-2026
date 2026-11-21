# Gestionnaire de Paie — Référentiel 2026

Plateforme d'apprentissage de la gestion de la paie : cours, fiches de révision, QCM corrigés et paramètres légaux 2026.
Public : étudiants, alternants, personnes en reconversion, candidats au titre professionnel de Gestionnaire de paie.

> **Avertissement.** Contenu pédagogique en cours de rédaction. Il ne remplace pas les sources officielles.
> Les valeurs marquées **À VÉRIFIER** dans `parametres/2026.json` doivent être confirmées sur urssaf.fr, boss.gouv.fr,
> service-public.fr, legifrance.gouv.fr ou agirc-arrco.fr avant tout usage professionnel.

## Contenu actuel

| Élément | Emplacement |
|---|---|
| Site statique (GitHub Pages) | [site/](site/) |
| Paramètres légaux 2026 | [parametres/2026.json](parametres/2026.json) |
| Module 1 — Cadre juridique (cours + cas pratique) | [packages/contenu/modules/m01-cadre-juridique/](packages/contenu/modules/m01-cadre-juridique/) |
| Fiches synthèse transverses | [packages/contenu/fiches-synthese/](packages/contenu/fiches-synthese/) |
| Arborescence cible et schéma de base de données | [livrables/](livrables/) |
| Script SQL Supabase | [supabase/migrations/](supabase/migrations/) |

## Prévisualiser en local

Prérequis : Node.js et Python. Depuis la racine du dépôt :

```
npm install
npm run dev
```

`npm run dev` compile le moteur de paie pour le navigateur (`site/assets/moteur.js`) puis lance un serveur local.
Ouvrir ensuite http://localhost:8000/site/

## Pages du site

| Page | Contenu |
|---|---|
| Programme | Les 10 modules, chiffres clés 2026, accès aux outils |
| Cours | Module 1 avec sommaire (modules 2 à 10 en préparation) |
| Fiches | 10 fiches synthèse transverses |
| QCM | 20 questions corrigées, filtres par niveau, meilleur score mémorisé |
| Simulateur | Bulletin de paie complet calculé par le moteur, impression / PDF |
| Calculateurs | Heures sup., heures compl., congés payés, licenciement, fin de CDD, maintien de salaire, plafond, coût employeur |
| Paramètres 2026 | Toutes les valeurs légales, filtre « À VÉRIFIER » |

## Publication

Chaque push sur `main` déclenche [.github/workflows/pages.yml](.github/workflows/pages.yml), qui vérifie les JSON, assemble le site et le publie sur GitHub Pages.

## Mettre à jour les paramètres légaux

Modifier uniquement `parametres/2026.json` (ou créer `parametres/2027.json`). Chaque valeur porte un `statut` :
`publie`, `A_VERIFIER` ou `stable`, avec sa référence juridique et sa source.
