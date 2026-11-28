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
| Programme | Compte à rebours jusqu'à l'épreuve (27/01/2027), « À réviser aujourd'hui », 10 modules colorés par bloc (BC01 / BC02), chiffres clés 2026 |
| Tableau de bord | Progression globale et par bloc, courbe des scores, points faibles, série de jours, temps d'étude, objectif quotidien, badges, boîtes de flashcards, oral, rappel quotidien (notification + agenda .ics), export/import |
| Planning de révision | Thèmes répartis jusqu'à l'épreuve, points faibles en priorité, examen blanc hebdomadaire, cases « fait » |
| S'entraîner › Oral | Entretien technique : tirage par bloc et thème, chronomètre 10 / 20 min, réponse-modèle, points clés, auto-évaluation |
| Compte | Inscription / connexion e-mail via Supabase (facultatif), synchronisation de la progression — voir [livrables/06_configuration_compte_supabase.md](livrables/06_configuration_compte_supabase.md) |
| Apprendre › Cours | Module 1 avec sommaire, suivi de lecture, impression PDF (modules 2 à 10 en préparation) |
| Apprendre › Fiches | 10 fiches synthèse transverses, impression PDF |
| Apprendre › Glossaire | 65 termes et sigles, filtre, liens vers les modules |
| S'entraîner › QCM | Questions corrigées, filtres par niveau, thème ou dernières erreurs |
| S'entraîner › Examen blanc | 60 questions / 90 min (réduit au prorata tant que la banque est incomplète), temps majoré +1/3, correction détaillée |
| S'entraîner › Flashcards | Répétition espacée (SM-2), paquets module 1 et glossaire, raccourcis clavier |
| Outils › Simulateur | Bulletin de paie complet calculé par le moteur, impression / PDF |
| Outils › Calculateurs | Heures sup., heures compl., congés payés, licenciement, fin de CDD, maintien de salaire, plafond, coût employeur |
| Outils › Calendrier social | Échéances DSN 2026 avec report week-end / jours fériés, événements annuels |
| Outils › Paramètres 2026 | Toutes les valeurs légales, filtre « À VÉRIFIER » |
| Rechercher | Recherche plein texte dans le cours, les fiches, le glossaire et les QCM |

La progression est enregistrée dans le navigateur de l'apprenant (`localStorage`). Un compte Supabase facultatif la synchronise entre appareils ; sans configuration, le site reste 100 % statique.
Mode clair / sombre (préférence mémorisée, sinon celle du système) ; animations désactivées si le système demande moins de mouvement.

## Publication

Chaque push sur `main` déclenche [.github/workflows/pages.yml](.github/workflows/pages.yml), qui vérifie les JSON, assemble le site et le publie sur GitHub Pages.

## Mettre à jour les paramètres légaux

Modifier uniquement `parametres/2026.json` (ou créer `parametres/2027.json`). Chaque valeur porte un `statut` :
`publie`, `A_VERIFIER` ou `stable`, avec sa référence juridique et sa source.
