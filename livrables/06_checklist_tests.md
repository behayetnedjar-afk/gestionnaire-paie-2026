# Checklist de tests — modernisation du site

Le test automatisé de bout en bout (Edge sans fenêtre) couvre les points marqués **[auto]**. Il passe à 74/74 dans trois configurations : 1 280 px, 400 px, et 400 px avec mouvement réduit.

## Non-régression (fonctions existantes)

- [ ] [auto] Accueil : 8 cartes d'outils et 10 modules ; chiffres légaux 2026 affichés **sans animation**.
- [ ] [auto] QCM module 1 : filtres (niveau, calcul, dernières erreurs, thème), correction, référence, piège, résultat.
- [ ] [auto] Examen blanc : chronomètre, grille, « à revoir », remise de la copie, correction ; temps majoré d'un tiers.
- [ ] [auto] Flashcards : répétition espacée, raccourcis Espace et 1 à 4.
- [ ] [auto] Glossaire (65 termes, ancres), calendrier (report des échéances, jours fériés), recherche.
- [ ] [auto] Suivi de lecture du cours.
- [ ] Simulateur de bulletin : exemple « Mme Martin », net payé 2 006,17 € ; impression.
- [ ] Calculateurs : les 8 formulaires.
- [ ] Paramètres 2026 : filtre « À VÉRIFIER » ; avertissement légal présent en pied de page.
- [ ] Export, import et effacement de la progression.

## Design et accessibilité

- [ ] [auto] Bascule clair / sombre : `aria-pressed` change, le choix est mémorisé, retour au thème initial.
- [ ] Sans choix mémorisé, le site suit le réglage clair / sombre du système.
- [ ] Contrastes AA (calculés) : texte 16:1, texte secondaire ≥ 6,2:1, boutons ≥ 5,7:1, pastilles BC01 / BC02 ≥ 4,6:1, dans les deux thèmes.
- [ ] Navigation au clavier :
  - Tab sur tout le site ;
  - Échap ferme les menus ;
  - focus visible ;
  - points de la courbe atteignables au clavier, avec infobulle.
- [ ] Lecteur d'écran :
  - compte à rebours lisible ;
  - jauges en `role="progressbar"` ;
  - annonces d'oral et d'examen ;
  - toasts annoncés.
- [ ] [auto] Aucune page ne déborde à 400 px.
- [ ] La police Inter se charge (et le site reste correct hors ligne, avec la police système).

## Animations

- [ ] Transition à chaque changement de page ; cartes en cascade ; blocs qui apparaissent au défilement.
- [ ] [auto] QCM : animation verte sur la bonne réponse, secousse rouge sur la mauvaise.
- [ ] Confettis toutes les 5 bonnes réponses d'affilée, et en fin de QCM ou d'examen à 80 % ou plus.
- [ ] [auto] Flashcard : retournement 3D (cliquer sur la carte ou appuyer sur Espace).
- [ ] Jauges et compteurs animés dans le tableau de bord.
- [ ] [auto] **Mouvement réduit** (réglage Windows « Effets d'animation » désactivé) : aucune animation, aucun confetti, tout le contenu visible.

## Progression et tableau de bord

- [ ] [auto] Journal du jour : questions et cartes comptées.
- [ ] Temps d'étude : il augmente quand l'onglet est visible et utilisé, pas quand il est inactif.
- [ ] [auto] Série de jours consécutifs ; [auto] objectif quotidien modifiable.
- [ ] [auto] Progression par bloc BC01 / BC02 ; [auto] courbe des scores à 2 séries, avec tableau de données.
- [ ] [auto] 12 badges ; [auto] boîtes de type Leitner ; [auto] statistiques de l'oral.
- [ ] Rappel :
  - notification à la première ouverture du jour (après autorisation) ;
  - [auto] fichier agenda `.ics` quotidien jusqu'au 26/01/2027, plus l'épreuve le 27/01/2027.

## Compte à rebours et planning

- [ ] [auto] « J-n » dans l'en-tête et sur le tableau de bord, cohérents avec le planning.
- [ ] [auto] Un jour de planning par jour restant ; examen blanc tous les 7 jours ; veille allégée.
- [ ] Après des erreurs (thème à moins de 60 % sur au moins 3 réponses), « Point faible : … » passe en tête, avec un lien « QCM ciblé ».
- [ ] [auto] Cases « fait » mémorisées.

## Oral

- [ ] [auto] Tirage, chronomètre 10 / 20 min, réponse-modèle, points clés, piège, Acquis / À revoir, bilan.
- [ ] Remplacer `packages/contenu/oral.json` par le vrai fichier : les filtres bloc et thème se remplissent seuls.

## Compte (après configuration de Supabase)

- [ ] [auto] Sans configuration : page « Mode local » ; [auto] fusion de deux progressions.
- [ ] Inscription, e-mail de confirmation, connexion, déconnexion, mot de passe oublié, nouveau mot de passe.
- [ ] Synchronisation entre deux navigateurs ; une ligne Supabase par compte.
- [ ] Le rôle `anon` ne lit rien (voir 06_configuration_compte_supabase.md, étape 6).
