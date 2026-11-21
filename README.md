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

Depuis la racine du dépôt :

```
python -m http.server 8000
```

Puis ouvrir http://localhost:8000/site/

## Publication

Chaque push sur `main` déclenche [.github/workflows/pages.yml](.github/workflows/pages.yml), qui vérifie les JSON, assemble le site et le publie sur GitHub Pages.

## Mettre à jour les paramètres légaux

Modifier uniquement `parametres/2026.json` (ou créer `parametres/2027.json`). Chaque valeur porte un `statut` :
`publie`, `A_VERIFIER` ou `stable`, avec sa référence juridique et sa source.
