/* Gamification légère : XP, niveaux (« LEVEL UP ! »), statuts à faire / en cours / maîtrisé,
 * profil (prénom, avatar), astuces du jour et page « Mes badges ».
 * Données : Stock « xp » = { total, journal: [{ d, m, p }], recompenses: { cle: 1 } }
 *           Stock « statuts » = { 'module-1': 'en-cours', 'fiche-…': 'maitrise', … }
 *           Stock « profil » = { prenom } (mode local ; avec un compte, le prénom vient du compte). */
(function () {
  'use strict';

  /* ---------- XP et niveaux ---------- */
  var REGLES = {
    visite: [10, 'Connexion du jour'],
    section: [5, 'Section de cours lue'],
    chapitre: [100, 'Chapitre terminé'],
    maitrise: [40, 'Contenu maîtrisé'],
    qcm: [10, 'QCM terminé'],
    qcmReussi: [40, 'QCM réussi (80 % et plus)'],
    qcmParfait: [30, 'QCM parfait'],
    examen: [30, 'Examen blanc terminé'],
    examenReussi: [70, 'Examen blanc réussi (70 % et plus)'],
    flashcards: [15, 'Séance de flashcards'],
    oral: [15, 'Question d\'oral acquise']
  };
  var NIVEAUX = [
    { nom: 'Stagiaire', min: 0, emoji: '🎒' },
    { nom: 'Assistant paie', min: 250, emoji: '🧾' },
    { nom: 'Gestionnaire junior', min: 750, emoji: '💼' },
    { nom: 'Expert paie', min: 1750, emoji: '🧠' },
    { nom: 'Légende de la paie', min: 3500, emoji: '👑' }
  ];
  function xp() { var x = Stock.lire('xp', null) || {}; x.total = x.total || 0; x.journal = x.journal || []; x.recompenses = x.recompenses || {}; return x; }
  function niveau(total) {
    var k = 0;
    NIVEAUX.forEach(function (n, i) { if (total >= n.min) k = i; });
    var suivant = NIVEAUX[k + 1];
    return {
      rang: k + 1, nom: NIVEAUX[k].nom, emoji: NIVEAUX[k].emoji, total: total,
      suivant: suivant ? suivant.nom : null, manque: suivant ? suivant.min - total : 0,
      pct: suivant ? Math.round((total - NIVEAUX[k].min) / (suivant.min - NIVEAUX[k].min) * 100) : 100
    };
  }
  /**
   * Ajoute de l'XP. « unique » : clé de récompense à n'accorder qu'une fois (ex. chapitre terminé).
   * « discret » : pas de message (sections lues, visite du jour).
   */
  function gagner(regle, options) {
    options = options || {};
    var r = REGLES[regle]; if (!r) return 0;
    var x = xp();
    if (options.unique) { if (x.recompenses[options.unique]) return 0; x.recompenses[options.unique] = 1; }
    var avant = niveau(x.total);
    x.total += r[0];
    x.journal.unshift({ d: new Date().toISOString(), m: r[1], p: r[0] });
    x.journal = x.journal.slice(0, 50);
    Stock.ecrire('xp', x);
    var apres = niveau(x.total);
    if (apres.rang > avant.rang) levelUp(apres);
    else if (!options.discret && window.Anim) Anim.toast('+' + r[0] + ' XP — ' + r[1]);
    majProfil();
    return r[0];
  }
  function levelUp(n) {
    var o = document.createElement('div');
    o.className = 'level-up';
    o.setAttribute('role', 'status');
    o.innerHTML = '<div class="level-up-carte"><span class="level-up-emoji" aria-hidden="true">' + n.emoji + '</span>' +
      '<p class="level-up-titre">LEVEL UP !</p><p>Vous êtes maintenant <strong>' + App.esc(n.nom) + '</strong></p>' +
      '<button type="button" class="bouton petit">Continuer</button></div>';
    document.body.appendChild(o);
    var fermer = function () { o.classList.add('sortie'); setTimeout(function () { o.remove(); }, 300); };
    o.querySelector('button').onclick = fermer;
    o.addEventListener('click', function (e) { if (e.target === o) fermer(); });
    o.querySelector('button').focus({ preventScroll: true });
    setTimeout(fermer, 4500);
    if (window.Anim) Anim.confettis(160);
  }
  /** Visite du jour : XP une fois par jour. */
  function visiteDuJour() {
    var j = Stock.lire('jours', {}), d = Stock.aujourdhui();
    if (j[d] && j[d].visite) return;
    Stock.compterJour('visite');
    gagner('visite', { discret: true });
  }

  /* ---------- Statuts : à faire / en cours / maîtrisé ---------- */
  var STATUTS = [['a-faire', 'À faire'], ['en-cours', 'En cours'], ['maitrise', 'Maîtrisé']];
  function statut(cle) { return Stock.lire('statuts', {})[cle] || 'a-faire'; }
  function definirStatut(cle, valeur) {
    var s = Stock.lire('statuts', {});
    s[cle] = valeur;
    Stock.ecrire('statuts', s);
    if (valeur === 'maitrise') {
      gagner('maitrise', { unique: 'maitrise:' + cle });
      if (window.Anim) Anim.confettis(90);
    }
    majProfil();
  }
  /** Passe automatiquement « à faire » → « en cours » (ex. première section lue). */
  function demarrerStatut(cle) { if (statut(cle) === 'a-faire') { var s = Stock.lire('statuts', {}); s[cle] = 'en-cours'; Stock.ecrire('statuts', s); } }
  /** Contrôle à 3 états (boutons radio stylés), branché par délégation dans app.js. */
  function controleStatut(cle, libelle) {
    var v = statut(cle), nom = 'st-' + cle.replace(/[^a-z0-9-]/gi, '');
    return '<fieldset class="statut no-print" data-statut="' + App.esc(cle) + '"><legend class="sr-only">Statut : ' + App.esc(libelle) + '</legend>' +
      STATUTS.map(function (s) {
        return '<label class="st-' + s[0] + '"><input type="radio" name="' + nom + '" value="' + s[0] + '"' + (v === s[0] ? ' checked' : '') + '><span>' + s[1] + '</span></label>';
      }).join('') + '</fieldset>';
  }

  /* ---------- Profil ---------- */
  function prenom() {
    var c = window.Compte && Compte.etat().utilisateur;
    var meta = c && c.user_metadata && c.user_metadata.prenom;
    return meta || (Stock.lire('profil', {}).prenom || '');
  }
  function initiale() { var p = prenom(); return p ? p.charAt(0).toUpperCase() : '★'; }
  /** Avatar 3D : sphère éclairée (dégradés + ombres), couleurs dérivées du prénom, pivote avec la souris (animations.js). */
  function avatarHtml(classe) {
    var p = prenom() || 'paie', h = 0;
    for (var i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) % 360;
    return '<span class="avatar avatar3d ' + (classe || '') + '" style="--a1:hsl(' + h + ' 85% 58%);--a2:hsl(' + ((h + 70) % 360) + ' 80% 45%)" aria-hidden="true"><span>' + App.esc(initiale()) + '</span></span>';
  }
  /** En-tête : bouton « Connexion » ou avatar + menu profil. */
  function majProfil() {
    var zone = document.getElementById('zoneProfil');
    if (!zone) return;
    var connecte = !!(window.Compte && Compte.etat().utilisateur);
    var p = prenom();
    var n = niveau(xp().total);
    if (!connecte && !p) {
      zone.innerHTML = '<a class="bouton petit connexion" href="#/compte" data-nav="compte">Connexion</a>';
      return;
    }
    var ouvert = zone.querySelector('details') && zone.querySelector('details').open;
    zone.innerHTML = '<details class="menu menu-profil"' + (ouvert ? ' open' : '') + '><summary aria-label="Menu du profil' + (p ? ' de ' + App.esc(p) : '') + '">' +
      avatarHtml() + '</summary>' +
      '<div class="panneau-profil"><p class="profil-nom">' + (p ? App.esc(p) : 'Mon profil') + (connecte ? ' <span class="pastille-ok">connecté</span>' : '') + '</p>' +
      '<p class="param-note">' + n.emoji + ' ' + App.esc(n.nom) + ' · ' + n.total + ' XP</p>' +
      '<div class="jauge" role="progressbar" aria-label="Progression vers le niveau suivant" aria-valuenow="' + n.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + n.pct + '%"></i></div>' +
      '<p class="param-note">' + (n.suivant ? 'Encore ' + n.manque + ' XP avant « ' + App.esc(n.suivant) + ' »' : 'Niveau maximal atteint') + '</p>' +
      '<ul><li><a href="#/tableau-de-bord">📊 Ma progression</a></li><li><a href="#/badges">🏆 Mes badges</a></li><li><a href="#/compte">👤 Mon compte</a></li>' +
      (connecte ? '<li><button type="button" id="profilDeco">Se déconnecter</button></li>' : '') + '</ul></div></details>';
    var b = zone.querySelector('#profilDeco');
    if (b) b.onclick = function () { Compte.deconnecter(); };
  }

  /* ---------- Astuces du jour (humour léger, aucune valeur chiffrée inventée) ---------- */
  var ASTUCES = [
    'Le brut, c\'est comme le café du matin : tout part de lui. Reconstituez toujours le brut avant d\'attaquer les cotisations.',
    'Un plafond de Sécurité sociale se proratise en jours calendaires, pas en jours de bonne humeur.',
    'Net imposable et net à payer ne sont pas jumeaux : le premier nourrit le prélèvement à la source, le second fait sourire le salarié.',
    'À l\'oral, citez la source : « article L… du Code du travail » impressionne davantage que « on m\'a dit que ».',
    'Heures supplémentaires : on les compte à la semaine. Le mois, c\'est pour les loyers.',
    'Une DPAE se fait avant l\'embauche. Après, c\'est trop tard, même avec un grand sourire.',
    'Relisez vos erreurs de QCM : c\'est là que se cachent les points faciles du 27 janvier.',
    'Une pause de 5 minutes toutes les 45 minutes : votre cerveau cotise aussi.',
    'Contrôle express d\'un bulletin : brut moins cotisations salariales égale net avant impôt. Si ça ne tombe pas juste, une ligne vous ment.',
    'La CSG non déductible et la CRDS reviennent dans le net imposable. Elles adorent les retours surprises.',
    'Flashcards le matin, QCM le soir : la répétition espacée fait le reste du travail.',
    'Entretien technique : une définition, une règle, un exemple. Trois temps, comme une valse.',
    'Une valeur marquée « À VÉRIFIER » se vérifie sur la source officielle. Toujours. Même un dimanche.',
    'Fin de CDD : listez d\'abord les cas où l\'indemnité n\'est pas due. C\'est là que dorment les pièges.',
    'Le principe de faveur protège toujours le contrat de travail ; entre branche et entreprise, pensez aux trois blocs de 2017.',
    'Un examen blanc par semaine vaut mieux que dix relectures en diagonale.',
    'Un calcul qui résiste ? Posez l\'assiette, puis le taux, puis le montant. Toujours dans cet ordre.',
    'Le planning priorise vos points faibles : suivez-le, il est plus têtu que vous.'
  ];
  function astuceDuJour() {
    var d = new Date(), n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    return ASTUCES[n % ASTUCES.length];
  }
  function encouragement() {
    var s = window.Suivi ? Suivi.serie() : 0, jr = window.Suivi ? Suivi.joursRestants() : 0;
    var a = window.Suivi ? Suivi.avancementJour() : { atteint: false, pct: 0 };
    if (a.atteint) return 'Objectif du jour atteint. Le jury n\'a qu\'à bien se tenir.';
    if (s >= 7) return s + ' jours d\'affilée : la flamme brûle, ne la laissez pas s\'éteindre ce soir.';
    if (jr <= 7 && jr > 0) return 'Dernière ligne droite : on révise, on dort, on respire. Vous êtes prêt·e.';
    if (a.pct > 0) return 'Bien parti : encore un petit effort pour boucler l\'objectif du jour.';
    return 'Une session courte aujourd\'hui vaut mieux qu\'une longue demain. On s\'y met ?';
  }

  /* ---------- Page « Mes badges » (#/badges) ---------- */
  window.Pages = window.Pages || {};
  window.Pages.badges = function (main) {
    return window.Pages.contexteBadges().then(function (ctx) {
      var liste = Suivi.badges(ctx);
      var obtenus = liste.filter(function (b) { return b.obtenu; }).length;
      var n = niveau(xp().total);
      main.innerHTML = '<h1>🏆 Mes badges</h1>' +
        '<section class="niveau-carte"><span class="niveau-emoji" aria-hidden="true">' + n.emoji + '</span><div><p class="niveau-nom">Niveau ' + n.rang + ' — ' + App.esc(n.nom) + '</p>' +
        '<p class="param-note">' + n.total + ' XP' + (n.suivant ? ' · encore ' + n.manque + ' XP avant « ' + App.esc(n.suivant) + ' »' : ' · niveau maximal') + '</p>' +
        '<div class="jauge" role="progressbar" aria-label="Progression vers le niveau suivant" aria-valuenow="' + n.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + n.pct + '%"></i></div></div></section>' +
        '<p>' + obtenus + ' badge' + (obtenus > 1 ? 's' : '') + ' débloqué' + (obtenus > 1 ? 's' : '') + ' sur ' + liste.length + '.</p>' +
        '<ul class="badges grands">' + liste.map(carteBadge).join('') + '</ul>' +
        '<h2>Comment gagner de l\'XP</h2><div class="table-wrap"><table class="tableau"><thead><tr><th scope="col">Action</th><th scope="col">XP</th></tr></thead><tbody>' +
        Object.keys(REGLES).map(function (k) { return '<tr><td>' + App.esc(REGLES[k][1]) + '</td><td>+' + REGLES[k][0] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<h2>Niveaux</h2><ol class="niveaux">' + NIVEAUX.map(function (x, i) {
          return '<li class="' + (i + 1 <= n.rang ? 'atteint' : '') + '"><span aria-hidden="true">' + x.emoji + '</span> ' + App.esc(x.nom) + ' <small class="param-note">dès ' + x.min + ' XP</small></li>';
        }).join('') + '</ol>' +
        (xp().journal.length ? '<h2>Dernières XP gagnées</h2><ul class="liste-simple">' + xp().journal.slice(0, 10).map(function (j) {
          return '<li><span>' + new Date(j.d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + '</span><b>+' + j.p + ' XP — ' + App.esc(j.m) + '</b></li>';
        }).join('') + '</ul>' : '');
    });
  };
  function carteBadge(b) {
    return '<li class="badge-carte' + (b.obtenu ? ' obtenu' : ' verrouille') + '"><span class="badge-ico" aria-hidden="true">' + b.emoji + '</span><b>' + App.esc(b.titre) + '</b>' +
      '<span class="param-note">' + App.esc(b.desc) + '</span>' +
      (b.obtenu ? '<span class="badge-etat">Débloqué</span>'
        : '<span class="sr-only">Verrouillé</span><div class="jauge" role="progressbar" aria-label="Avancement du badge ' + App.esc(b.titre) + '" aria-valuenow="' + b.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + b.pct + '%"></i></div>') + '</li>';
  }

  window.Jeu = {
    REGLES: REGLES, NIVEAUX: NIVEAUX, xp: xp, niveau: niveau, gagner: gagner, visiteDuJour: visiteDuJour,
    statut: statut, definirStatut: definirStatut, demarrerStatut: demarrerStatut, controleStatut: controleStatut,
    prenom: prenom, majProfil: majProfil, avatarHtml: avatarHtml, astuceDuJour: astuceDuJour, encouragement: encouragement, carteBadge: carteBadge
  };
})();
