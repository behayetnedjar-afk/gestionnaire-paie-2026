# Livrable 1 — Arborescence du site et de l'application

**Plateforme « Gestionnaire de Paie — Référentiel 2026 »**

---

## 1. Principes d'architecture

| Choix | Décision | Justification |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React + TypeScript** | Pages de cours en rendu statique (SEO, rapidité), pages applicatives interactives côté client. |
| Style | **Tailwind CSS** + composants accessibles (Radix UI) | Mode sombre natif (`dark:`), conformité RGAA facilitée. |
| Back / Auth / BDD | **Supabase** (PostgreSQL + Auth + Row Level Security) | Authentification prête à l'emploi, SQL standard, sécurité par ligne. |
| Contenu pédagogique | **MDX versionné dans Git** + import en base pour la recherche | Les formateurs éditent du texte, pas du code. Historique des modifications. |
| Moteur de paie | **Package TypeScript isolé** `@paie/moteur`, sans dépendance à React ni à la BDD | Testable unitairement (Vitest), réutilisable (API, CLI, front). |
| Paramètres légaux | **Un fichier JSON par année** : `parametres/2026.json` | Mise à jour annuelle sans toucher au code. Ajout de 2027 = ajout d'un fichier. |
| Export PDF | `@react-pdf/renderer` côté serveur | Fiches de révision et bulletins simulés. |
| Organisation | **Monorepo pnpm + Turborepo** | Séparation claire : app web / moteur / contenu / paramètres. |

**Règle d'or :** aucun taux, plafond ou montant légal n'est écrit en dur dans le code. Tout passe par le fichier de paramètres de l'année concernée.

---

## 2. Arborescence du dépôt (monorepo)

```
gestionnaire-paie/
├── package.json                      # Scripts racine (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
├── .env.example                      # Clés Supabase (jamais commitées en clair)
│
├── parametres/                       # ★ PARAMÈTRES LÉGAUX — séparés du code
│   ├── schema.json                   # JSON Schema : valide la structure de chaque année
│   ├── 2026.json                     # = parametres_2026.json (livrable 3)
│   ├── 2027.json                     # (à créer au référentiel suivant)
│   └── CHANGELOG.md                  # Journal des mises à jour (date, valeur, source)
│
├── packages/
│   ├── moteur-paie/                  # ★ MOTEUR DE CALCUL ISOLÉ (livrable 5)
│   │   ├── src/
│   │   │   ├── index.ts              # Point d'entrée public
│   │   │   ├── parametres/
│   │   │   │   ├── chargeur.ts       # Charge + valide le JSON d'une année
│   │   │   │   └── types.ts          # Types TS générés depuis schema.json
│   │   │   ├── commun/
│   │   │   │   ├── arrondi.ts        # Règles d'arrondi (centime, taux)
│   │   │   │   └── plafond.ts        # PMSS, proratisation, tranches A/B/C
│   │   │   ├── brut/
│   │   │   │   ├── salaire-base.ts
│   │   │   │   ├── heures-sup.ts
│   │   │   │   ├── heures-complementaires.ts
│   │   │   │   ├── avantages-nature.ts
│   │   │   │   └── absences.ts       # Retenues (méthodes réelle, 21,67 j, 151,67 h)
│   │   │   ├── cotisations/
│   │   │   │   ├── securite-sociale.ts
│   │   │   │   ├── chomage-ags.ts
│   │   │   │   ├── retraite-complementaire.ts   # AGIRC-ARRCO, CEG, CET, APEC
│   │   │   │   ├── csg-crds.ts
│   │   │   │   ├── prevoyance-mutuelle.ts
│   │   │   │   └── contributions-diverses.ts    # FNAL, CSA, dialogue social, VM…
│   │   │   ├── allegements/
│   │   │   │   ├── reduction-generale.ts        # RGDU 2026
│   │   │   │   ├── taux-reduits.ts              # Maladie / famille
│   │   │   │   └── heures-sup-exoneration.ts
│   │   │   ├── nets/
│   │   │   │   ├── net-imposable.ts
│   │   │   │   ├── net-social.ts
│   │   │   │   └── prelevement-source.ts        # Taux perso / neutre / grille
│   │   │   ├── indemnites/
│   │   │   │   ├── conges-payes.ts              # 1/10e vs maintien
│   │   │   │   ├── licenciement.ts
│   │   │   │   ├── preavis.ts
│   │   │   │   ├── precarite.ts
│   │   │   │   └── maintien-salaire-maladie.ts  # IJSS + complément
│   │   │   ├── bulletin/
│   │   │   │   ├── calculer-bulletin.ts         # Orchestrateur
│   │   │   │   └── lignes.ts                    # Modèle de ligne de bulletin
│   │   │   └── cout-employeur.ts
│   │   ├── tests/                    # ★ Un fichier de test par formule (Vitest)
│   │   │   ├── plafond.test.ts
│   │   │   ├── reduction-generale.test.ts
│   │   │   ├── conges-payes.test.ts
│   │   │   ├── licenciement.test.ts
│   │   │   ├── … (un test par fichier src)
│   │   │   └── bulletins-reference/  # Bulletins complets vérifiés à la main
│   │   │       ├── non-cadre-smic.json
│   │   │       ├── cadre-au-dessus-pmss.json
│   │   │       └── temps-partiel-entree-mois.json
│   │   └── package.json
│   │
│   ├── contenu/                      # ★ CONTENU PÉDAGOGIQUE (MDX + JSON)
│   │   ├── modules/
│   │   │   ├── m01-cadre-juridique/
│   │   │   │   ├── module.json       # Métadonnées : titre, ordre, durée, objectifs
│   │   │   │   ├── cours/
│   │   │   │   │   ├── 01-sources-du-droit.mdx
│   │   │   │   │   ├── 02-contrat-de-travail.mdx
│   │   │   │   │   ├── 03-duree-du-travail.mdx
│   │   │   │   │   ├── 04-obligations-employeur.mdx
│   │   │   │   │   └── 05-archivage-rgpd.mdx
│   │   │   │   ├── resume.mdx
│   │   │   │   ├── formules.mdx
│   │   │   │   ├── fiche-revision.mdx
│   │   │   │   ├── cas-pratique.mdx
│   │   │   │   ├── flashcards.json
│   │   │   │   └── qcm.json          # Format QCM imposé
│   │   │   ├── m02-bulletin-de-paie/
│   │   │   ├── m03-cotisations/
│   │   │   ├── m04-absences/
│   │   │   ├── m05-temps-remuneration-variable/
│   │   │   ├── m06-fin-de-contrat/
│   │   │   ├── m07-dsn-declaratif/
│   │   │   ├── m08-cas-particuliers/
│   │   │   ├── m09-comptabilite-audit/
│   │   │   └── m10-pilotage-relation-sociale/
│   │   ├── fiches-synthese/          # 10 fiches transverses (Mode Révision)
│   │   │   └── fiches-synthese.md
│   │   ├── formulaire/               # Page « Formulaire de paie » (Partie 2)
│   │   │   └── formulaire.mdx
│   │   ├── glossaire.json
│   │   ├── calendrier-social-2026.json
│   │   ├── cas-pratiques/            # Dossiers complets transverses
│   │   └── scripts/
│   │       ├── valider-qcm.ts        # Vérifie format, répartition 40/40/20, ids uniques
│   │       └── importer-en-base.ts   # Synchronise MDX/JSON → Supabase
│   │
│   └── ui/                           # Composants partagés (design system)
│       ├── Encadre.tsx               # « Point d'attention », « Piège d'examen », « Formule »
│       ├── TableauBulletin.tsx
│       ├── BadgeAVerifier.tsx        # Affiche « À VÉRIFIER » + lien source
│       └── …
│
├── apps/
│   └── web/                          # Application Next.js (livrable 6)
│       ├── app/
│       │   ├── layout.tsx            # Thème clair/sombre, lien d'évitement, langue fr
│       │   ├── page.tsx              # Accueil public
│       │   │
│       │   ├── (public)/             # ─── SITE DE COURS (accès libre ou partiel)
│       │   │   ├── programme/page.tsx
│       │   │   ├── cours/
│       │   │   │   ├── page.tsx                      # Liste des 10 modules
│       │   │   │   └── [module]/
│       │   │   │       ├── page.tsx                  # Sommaire du module
│       │   │   │       ├── [chapitre]/page.tsx       # Chapitre de cours
│       │   │   │       ├── resume/page.tsx
│       │   │   │       ├── formules/page.tsx
│       │   │   │       ├── fiche/page.tsx
│       │   │   │       └── cas-pratique/page.tsx
│       │   │   ├── formulaire/page.tsx               # Formulaire de paie
│       │   │   ├── glossaire/page.tsx
│       │   │   ├── calendrier/page.tsx
│       │   │   ├── parametres-legaux/page.tsx        # Tableau lisible du JSON 2026
│       │   │   ├── recherche/page.tsx                # Recherche plein texte
│       │   │   ├── accessibilite/page.tsx            # Déclaration RGAA
│       │   │   └── mentions-legales/page.tsx
│       │   │
│       │   ├── (auth)/
│       │   │   ├── connexion/page.tsx
│       │   │   ├── inscription/page.tsx
│       │   │   └── mot-de-passe-oublie/page.tsx
│       │   │
│       │   ├── (app)/                # ─── APPLICATION (connexion requise)
│       │   │   ├── tableau-de-bord/page.tsx          # Progression, scores, points faibles
│       │   │   ├── profil/page.tsx                   # Objectif, date d'examen, RGPD
│       │   │   ├── revision/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── fiches/[module]/page.tsx
│       │   │   │   └── flashcards/page.tsx           # Répétition espacée (SM-2)
│       │   │   ├── qcm/
│       │   │   │   ├── page.tsx                      # Choix du mode
│       │   │   │   ├── entrainement/page.tsx         # Par module ou thème
│       │   │   │   ├── examen-blanc/page.tsx         # 60 questions / 90 min
│       │   │   │   ├── session/[id]/page.tsx         # Passage
│       │   │   │   ├── session/[id]/correction/page.tsx
│       │   │   │   └── historique/page.tsx
│       │   │   ├── simulateur-bulletin/page.tsx      # Saisie guidée → bulletin
│       │   │   ├── calculateurs/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── conges-payes/page.tsx
│       │   │   │   ├── heures-sup/page.tsx
│       │   │   │   ├── licenciement/page.tsx
│       │   │   │   ├── preavis/page.tsx
│       │   │   │   ├── maintien-salaire/page.tsx
│       │   │   │   ├── plafond-proratise/page.tsx
│       │   │   │   └── cout-employeur/page.tsx
│       │   │   └── cas-pratiques/
│       │   │       ├── page.tsx
│       │   │       └── [id]/page.tsx                 # Correction pas à pas
│       │   │
│       │   ├── (admin)/              # ─── BACK-OFFICE FORMATEUR
│       │   │   ├── contenus/page.tsx
│       │   │   ├── questions/page.tsx
│       │   │   ├── parametres/page.tsx               # Visualise / compare 2026 vs 2027
│       │   │   └── apprenants/page.tsx
│       │   │
│       │   └── api/
│       │       ├── pdf/fiche/[module]/route.ts
│       │       ├── pdf/bulletin/route.ts
│       │       ├── calcul/bulletin/route.ts          # Appelle @paie/moteur
│       │       └── recherche/route.ts
│       │
│       ├── components/
│       │   ├── layout/ (Header, Sidebar, ThemeToggle, SkipLink)
│       │   ├── cours/ (TableDesMatieres, NavigationChapitre)
│       │   ├── qcm/ (Question, Chronometre, Correction, Statistiques)
│       │   ├── simulateur/ (FormulaireSaisie, BulletinAffiche)
│       │   ├── revision/ (Flashcard, FicheRevision)
│       │   └── tableau-de-bord/ (JaugeModule, GraphiqueScores, PointsFaibles)
│       ├── lib/
│       │   ├── supabase/ (client.ts, server.ts, middleware.ts)
│       │   ├── annee-reference.ts   # Année active (2026) — sélectionnable
│       │   ├── repetition-espacee.ts
│       │   └── recherche.ts
│       ├── middleware.ts             # Protection des routes (app)/(admin)
│       └── tailwind.config.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 0001_schema_initial.sql   # Livrable 2
│   └── seed.sql
│
└── livrables/                        # Documents de conception (ce dossier)
    ├── 01_arborescence.md
    ├── 02_schema_bdd.md
    ├── 07_plan_production.md         (à venir)
    └── 08_checklist_juridique.md     (à venir)
```

---

## 3. Plan du site (vue utilisateur)

```
Accueil
├── Programme (10 modules, durée, prérequis)
├── Cours
│   └── Module 1 … 10
│       ├── Chapitres
│       ├── Résumé express
│       ├── Formules clés
│       ├── Fiche de révision
│       └── Cas pratique corrigé
├── Formulaire de paie
├── Paramètres légaux 2026
├── Glossaire
├── Calendrier social
├── Recherche
└── Espace apprenant (connexion)
    ├── Tableau de bord
    ├── Révision (fiches, flashcards, export PDF)
    ├── QCM (entraînement, examen blanc, historique)
    ├── Simulateur de bulletin
    ├── Calculateurs
    ├── Cas pratiques
    └── Profil
```

---

## 4. Gestion multi-année (prêt pour 2027)

1. Chaque année possède son fichier `parametres/AAAA.json`, validé par `schema.json`.
2. La table `referentiels` en base indique l'année active et les années archivées.
3. Le moteur reçoit **toujours** l'objet paramètres en argument : `calculerBulletin(saisie, parametres2026)`.
   Il ne connaît pas l'année « en cours ».
4. Les questions de QCM portent un champ `annees_valides` (ex. `[2026]`). Une question dont la réponse dépend d'un taux est automatiquement signalée quand on active 2027.
5. Le contenu MDX affiche les valeurs via un composant `<Param cle="pmss.mensuel" />` : le texte du cours se met à jour tout seul quand l'année change.

---

## 5. Accessibilité (RGAA 4.1) — prise en compte dès l'arborescence

- Lien d'évitement « Aller au contenu » sur chaque page.
- Navigation complète au clavier (QCM, flashcards, simulateur).
- Contrastes AA vérifiés en mode clair **et** sombre.
- Chronomètre de l'examen blanc : option « temps majoré » (+ 1/3) pour les apprenants en situation de handicap.
- Bulletins affichés en vrais tableaux HTML (`<th scope>`), pas en images.
- Page « Déclaration d'accessibilité » obligatoire.
