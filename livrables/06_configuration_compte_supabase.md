# Activer les comptes utilisateurs (Supabase, offre gratuite)

Le site reste un site statique hébergé sur GitHub Pages. Les comptes sont **facultatifs**.

- **Sans configuration**, la progression reste dans le navigateur (`localStorage`). Elle s'exporte et s'importe en JSON depuis le tableau de bord, rubrique « Mes données ».
- **Avec configuration**, l'apprenant crée un compte avec son e-mail et un mot de passe. Sa progression est alors copiée dans Supabase et fusionnée entre ses appareils.

Durée : environ 15 minutes. Aucun serveur à installer.

## 1. Créer le projet

1. Créez un compte sur supabase.com, puis cliquez sur **New project**.
2. Choisissez un nom, par exemple `gestionnaire-paie`, et une région en Europe (Paris ou Francfort).
3. Saisissez un mot de passe de base de données solide et conservez-le hors du dépôt.

## 2. Créer la table et les règles de sécurité

1. Ouvrez **SQL Editor**, puis **New query**.
2. Collez le contenu de [`supabase/migrations/0002_progression_sync.sql`](../supabase/migrations/0002_progression_sync.sql) et cliquez sur **Run**.

Ce script :

- crée la table `progression_sync`, une ligne par compte (`user_id`, `donnees` en jsonb, `maj_le`) ;
- active et **force** la sécurité au niveau des lignes (Row Level Security) ;
- retire tout accès aux visiteurs non connectés (`anon`) ;
- crée 4 règles : lecture, création, modification et suppression **uniquement de sa propre ligne**, avec la condition `auth.uid() = user_id` ;
- fixe la date de mise à jour côté serveur.

**Vérification :** ouvrez **Table Editor › progression_sync**. Le cadenas « RLS enabled » doit être affiché.

## 3. Régler l'authentification

1. Ouvrez **Authentication › Providers › Email** et vérifiez que **Email** est activé.
2. Laissez **Confirm email** activé (recommandé).
3. Ouvrez **Authentication › URL Configuration** :
   - **Site URL** : `https://behayetnedjar-afk.github.io/gestionnaire-paie-2026/`
   - **Redirect URLs** : ajoutez cette même adresse, puis `http://localhost:8000/site/` pour les essais en local.
4. Facultatif : dans **Authentication › Policies** (ou **Password security**, selon la version), fixez une longueur minimale de mot de passe de 8 caractères. Le site l'exige déjà de son côté.

**Mots de passe :** ils ne sont jamais stockés par le site. Supabase Auth les conserve hachés avec bcrypt. Le navigateur ne garde qu'un jeton de session, sous la clé `paie-auth` du `localStorage`.

## 4. Renseigner les clés publiques

Ouvrez **Project Settings › API** et copiez :

- **Project URL**, par exemple `https://abcdefgh.supabase.co` ;
- **anon public key**, une longue chaîne commençant par `eyJ…`.

Collez-les dans [`site/assets/config.js`](../site/assets/config.js) :

```js
supabaseUrl: 'https://abcdefgh.supabase.co',
supabaseCleAnon: 'eyJhbGciOi…',
```

La clé `anon` est **faite pour être publique** : elle ne donne accès qu'à ce qu'autorisent les règles RLS.
Ne copiez **jamais** la clé `service_role`, qui contourne toutes les règles.

## 5. Publier

```
git add site/assets/config.js
git commit -m "Activer les comptes Supabase"
git push
```

GitHub Actions publie le site en 1 à 2 minutes.

## 6. Tester

1. Ouvrez le site, cliquez sur **Compte** puis **Inscription**, et saisissez un e-mail et un mot de passe.
2. Ouvrez le lien de confirmation reçu par e-mail. Vous revenez sur le site, connecté.
3. Répondez à un QCM. Dans Supabase, **Table Editor › progression_sync** affiche une ligne avec vos données.
4. Connectez-vous depuis un autre navigateur : la progression apparaît, fusionnée avec celle de ce navigateur.
5. **Contrôle de sécurité :** dans le SQL Editor, exécutez :

   ```sql
   set role anon;
   select * from progression_sync;
   reset role;
   ```

   Vous devez obtenir une erreur de permission ou zéro ligne.

## Fonctionnement de la synchronisation

| Situation | Comportement |
|---|---|
| Connexion | La progression locale et celle du compte sont **fusionnées**, rien n'est perdu |
| Activité (QCM, flashcards, lecture…) | Écrite d'abord dans le navigateur, puis envoyée au compte, avec des envois regroupés toutes les 2,5 s |
| Hors connexion | Le site fonctionne normalement ; l'envoi reprend à la prochaine connexion |
| Déconnexion | Les données restent dans ce navigateur |
| « Supprimer mes données en ligne » | Efface la ligne Supabase et conserve les données locales |

Règles de fusion :

- **réponses et oral** : on garde l'enregistrement le plus travaillé ;
- **historique** : union des deux, sans doublons ;
- **meilleurs scores** : maximum des deux ;
- **sections lues** : union ;
- **flashcards** : on garde l'échéance la plus lointaine ;
- **journal quotidien** : maximum par jour ;
- **réglages** (objectif, rappel) : ceux de l'appareil utilisé l'emportent.

## Schéma JSON de la progression

Contenu de `donnees`, identique à l'export JSON du tableau de bord :

```json
{
  "reponses":   { "M1-Q01": { "vus": 3, "bons": 2, "dernier": true, "module": 1, "theme": "Sources du droit", "date": 1764300000000 } },
  "historique": [ { "type": "qcm", "module": 1, "bons": 15, "total": 20, "pct": 75, "erreurs": ["M1-Q04"], "date": "2026-11-28T18:00:00.000Z" },
                  { "type": "examen", "bons": 14, "total": 20, "pct": 70, "duree": 1500, "majore": false, "erreurs": [], "date": "…" },
                  { "type": "flashcards", "paquet": "…", "cartes": 18, "reussies": 15, "date": "…" },
                  { "type": "oral", "questions": 4, "acquis": 3, "duree": 600, "date": "…" } ],
  "qcm":        { "1": { "meilleur": 85, "tentatives": 3, "dernier": 75 } },
  "lecture":    { "1": { "sections": { "a-objectifs": 1 }, "total": 7 } },
  "flashcards": { "M1-F01": { "ef": 2.5, "intervalle": 6, "reps": 2, "echeance": "2026-12-04" } },
  "oral":       { "OR-EX-01": { "vus": 2, "acquis": 1, "dernier": "acquis", "points": 75, "date": 1764300000000 } },
  "jours":      { "2026-11-28": { "secondes": 2700, "questions": 25, "bonnes": 19, "cartes": 20, "oral": 2, "sections": 3 } },
  "objectif":   { "minutes": 45, "questions": 20, "cartes": 20 },
  "planning":   { "2026-11-28": { "m1-0": 1, "cartes": 1 } },
  "rappel":     { "actif": true, "heure": "19:00", "dernier": "2026-11-28" },
  "oral-config":{ "bloc": "tous", "theme": "tous", "minutes": 30 },
  "xp":         { "total": 385, "journal": [ { "d": "2026-11-28T18:00:00.000Z", "m": "QCM réussi (80 % et plus)", "p": 40 } ],
                  "recompenses": { "chapitre:1": 1, "section:1:a-objectifs": 1 } },
  "statuts":    { "module-1": "en-cours", "fiche-fiche-1-le-bulletin": "maitrise", "exo-1-g-cas-pratique": "a-faire" },
  "profil":     { "prenom": "Nadia" }
}
```

Avec un compte, le prénom est aussi enregistré dans les métadonnées Supabase (`user_metadata.prenom`) à l'inscription.
Fusion entre deux appareils :
- **xp** : on garde le total le plus élevé, et les récompenses déjà accordées sont réunies (pas de double gain) ;
- **statuts** : l'état le plus avancé l'emporte.

La boîte « type Leitner » d'une flashcard n'est pas stockée. Elle est calculée à partir de `intervalle` :

| Boîte | Intervalle |
|---|---|
| 1 | 1 jour ou moins |
| 2 | 6 jours ou moins |
| 3 | 14 jours ou moins |
| 4 | 30 jours ou moins |
| 5 | au-delà de 30 jours |
