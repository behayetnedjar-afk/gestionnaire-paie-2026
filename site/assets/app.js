/* Gestionnaire de Paie — Référentiel 2026 — site statique (sans compilation) */
(function () {
  'use strict';

  // En ligne, le site est à la racine ; en local, on sert la racine du dépôt et on ouvre /site/.
  var BASE = /\/site\/?/.test(location.pathname) ? '../' : './';
  var CONTENU = BASE + 'packages/contenu/';

  /* Blocs de compétences du titre professionnel Gestionnaire de paie (RNCP37948) :
   *   BC01 — gestion administrative, juridique et présentation des bulletins de paie (bleu / violet)
   *   BC02 — valoriser en paie les événements de la vie professionnelle (orange / vert)
   * Le rattachement d'un module à un bloc se modifie ici uniquement (champ « bloc »). */
  var BLOCS = {
    BC01: { code: 'BC01', titre: 'Gestion administrative, juridique et présentation des bulletins de paie', court: 'Administratif, juridique, bulletins', cls: 'bc1' },
    BC02: { code: 'BC02', titre: 'Valoriser en paie les événements de la vie professionnelle', court: 'Événements de la vie professionnelle', cls: 'bc2' }
  };
  var MODULES = [
    { titre: 'Cadre juridique et environnement de la paie', dossier: 'm01-cadre-juridique', dispo: true, bloc: 'BC01', icone: 'livre',
      themes: ['Sources du droit, hiérarchie des normes', 'Contrats : CDI, CDD, temps partiel, intérim, apprentissage', 'Durée du travail, HS, forfaits jours', 'DPAE, registre du personnel', 'Archivage et RGPD'] },
    { titre: 'Le bulletin de paie', bloc: 'BC01', icone: 'bulletin', themes: ['Mentions obligatoires, bulletin clarifié', 'Brut, net social, net imposable, net à payer', 'Lecture et contrôle', 'Avantages en nature, primes'] },
    { titre: 'Cotisations et contributions sociales', bloc: 'BC01', icone: 'calcul', themes: ['PMSS, tranches A/B/C', 'Sécurité sociale, chômage, AGIRC-ARRCO', 'CSG/CRDS', 'Réduction générale 2026, taux réduits', 'Régularisation des plafonds'] },
    { titre: 'Absences et suspension du contrat', bloc: 'BC02', icone: 'calendrier', themes: ['Maladie : IJSS, maintien, subrogation', 'AT/MP', 'Maternité, paternité, congés familiaux', 'Congés payés : 1/10e et maintien'] },
    { titre: 'Temps de travail et rémunération variable', bloc: 'BC02', icone: 'horloge', themes: ['HS et heures complémentaires', 'Astreintes, nuit, dimanche', 'Primes et commissions', 'Épargne salariale, PPV'] },
    { titre: 'Fin de contrat et solde de tout compte', bloc: 'BC02', icone: 'fiche', themes: ['Démission, licenciement, rupture conventionnelle', 'Préavis, indemnités', 'Régime social et fiscal', 'Documents de fin de contrat'] },
    { titre: 'DSN et déclaratif', bloc: 'BC01', icone: 'eclair', themes: ['DSN mensuelle et événementielle', 'Anomalies et rejets', 'Prélèvement à la source', 'Échéances de paiement'] },
    { titre: 'Cas particuliers', bloc: 'BC02', icone: 'utilisateur', themes: ['Apprentis, stagiaires', 'Cadres, dirigeants, mandataires', 'Détachés, expatriés, frontaliers', 'Saisies, acomptes, frais professionnels'] },
    { titre: 'Comptabilité de la paie, contrôle et audit', bloc: 'BC01', icone: 'graphique', themes: ['Écritures de paie', 'Provisions de congés payés', 'Rapprochement DSN / compta / bulletins', 'Contrôle URSSAF'] },
    { titre: 'Pilotage et relation sociale', bloc: 'BC01', icone: 'cible', themes: ['Masse salariale, indicateurs', 'Communication', 'Veille et éthique', 'Préparation à l\'épreuve'] }
  ];

  var CHEMINS = {
    parametres: BASE + 'parametres/2026.json',
    fiches: CONTENU + 'fiches-synthese/fiches-synthese.md',
    glossaire: CONTENU + 'glossaire.json',
    calendrier: CONTENU + 'calendrier-social-2026.json',
    oral: CONTENU + 'oral.json',
    qcmReferentiel: CONTENU + 'qcm-referentiel.json',
    module: function (n) { return CONTENU + 'modules/' + MODULES[n - 1].dossier + '/module-' + String(n).padStart(2, '0') + '.md'; },
    qcm: function (n) { return CONTENU + 'modules/' + MODULES[n - 1].dossier + '/qcm.json'; },
    flashcards: function (n) { return CONTENU + 'modules/' + MODULES[n - 1].dossier + '/flashcards.json'; }
  };

  var main = document.getElementById('contenu');
  var cache = {};
  var nettoyages = [];

  /* ---------- utilitaires ---------- */
  function charger(url, json) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Fichier introuvable : ' + url);
      return json ? r.json() : r.text();
    }).then(function (d) { cache[url] = d; return d; });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slug(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function fmt(n) {
    return typeof n === 'number' ? n.toLocaleString('fr-FR', { maximumFractionDigits: 4 }) : n;
  }
  function erreur(e) {
    main.innerHTML = '<h1>Contenu indisponible</h1><p>' + esc(e.message) + '</p>' +
      '<p class="param-note">En local, lancez <code>npm run dev</code> à la racine du dépôt puis ouvrez <code>/site/</code>.</p>';
  }
  function titrePage(t) { document.title = t + ' — Gestionnaire de Paie 2026'; }
  function badge(statut) {
    if (statut === 'publie') return '<span class="badge badge-publie">Publié</span>';
    if (statut === 'A_VERIFIER') return '<span class="badge badge-verif">À VÉRIFIER</span>';
    if (statut === 'stable') return '<span class="badge badge-stable">Règle stable</span>';
    return '';
  }
  function melanger(t) {
    var a = t.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  /** Fonction appelée quand on quitte la page courante (chronomètre, écouteurs…). */
  function surDepart(fn) { nettoyages.push(fn); }
  function allerA(id) {
    var cible = document.getElementById(id);
    if (!cible) return false;
    cible.setAttribute('tabindex', '-1');
    cible.scrollIntoView({ behavior: window.Anim && Anim.reduit() ? 'auto' : 'smooth', block: 'start' });
    cible.focus({ preventScroll: true });
    return true;
  }
  /** Toutes les questions : QCM des modules publiés + banque du référentiel (200 questions, modules 1 à 10). */
  function toutesLesQuestions() {
    var sources = MODULES.map(function (m, i) { return m.dispo ? charger(CHEMINS.qcm(i + 1), true) : []; });
    sources.push(charger(CHEMINS.qcmReferentiel, true).catch(function () { return []; }));
    return Promise.all(sources).then(function (l) { return [].concat.apply([], l); });
  }

  /* ---------- rendu Markdown ---------- */
  function rendreMarkdown(texte, conteneur) {
    conteneur.innerHTML = marked.parse(texte);
    conteneur.querySelectorAll('table').forEach(function (t) {
      var w = document.createElement('div'); w.className = 'table-wrap';
      t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
    conteneur.querySelectorAll('blockquote').forEach(function (b) {
      var d = b.textContent.trim().toUpperCase();
      if (d.indexOf('PIÈGE') === 0) b.classList.add('piege');
      else if (d.indexOf('POINT D') === 0) b.classList.add('attention');
      else if (d.indexOf('FORMULE') === 0) b.classList.add('formule');
    });
    conteneur.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/qcm\.json$/.test(h)) a.setAttribute('href', '#/qcm/1');
      else if (/^https?:/.test(h)) { a.target = '_blank'; a.rel = 'noopener'; }
    });
    return idsTitres(conteneur.querySelectorAll('h2, h3'));
  }
  /** Identifiants stables des titres (partagés avec la recherche). */
  function idsTitres(titres) {
    var vus = {};
    return Array.prototype.map.call(titres, function (h) {
      var id = slug(h.textContent) || 'section';
      while (vus[id]) id += '-b';
      vus[id] = true; h.id = id;
      return { id: id, texte: h.textContent, niveau: h.tagName === 'H2' ? 2 : 3, el: h };
    });
  }

  function pageMarkdown(url, titre, ancre, numeroModule) {
    return charger(url).then(function (texte) {
      titrePage(titre);
      var J = window.Jeu;
      main.innerHTML = '<div class="barre-lecture no-print" aria-hidden="true"><i></i></div>' +
        '<div class="cours"><nav class="toc" aria-label="Sommaire"><p>Sommaire</p><ul></ul></nav>' +
        '<div><div class="barre-outils no-print">' + (numeroModule && J ? J.controleStatut('module-' + numeroModule, 'Module ' + numeroModule) : '') +
        '<button type="button" class="bouton secondaire petit" id="imprimer">Imprimer / enregistrer en PDF</button></div>' +
        '<article class="md"></article></div></div>';
      var titres = rendreMarkdown(texte, main.querySelector('.md'));
      main.querySelector('.toc ul').innerHTML = titres.map(function (t) {
        return '<li class="n' + t.niveau + '"><button type="button" data-cible="' + t.id + '">' + esc(t.texte) + '</button></li>';
      }).join('');
      main.querySelector('.toc').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-cible]'); if (b) allerA(b.dataset.cible);
      });
      main.querySelector('#imprimer').addEventListener('click', function () { window.print(); });

      // Statuts à 3 états sur chaque fiche (page des fiches) et chaque cas pratique / exercice (page de module).
      if (J) {
        titres.filter(function (t) { return t.niveau === 2; }).forEach(function (t) {
          var cle = null;
          if (!numeroModule) cle = 'fiche-' + t.id;
          else if (/cas pratique|exercice|travaux pratiques/i.test(t.texte)) cle = 'exo-' + numeroModule + '-' + t.id;
          if (cle) t.el.insertAdjacentHTML('afterend', J.controleStatut(cle, t.texte));
        });
        var surStatut = function (e) {
          var r = e.target;
          if (r.type === 'radio' && r.closest('fieldset.statut')) J.definirStatut(r.closest('fieldset.statut').dataset.statut, r.value);
        };
        main.addEventListener('change', surStatut);
        surDepart(function () { main.removeEventListener('change', surStatut); });
      }

      // Barre de progression de lecture (en haut, sous l'en-tête) : transform scaleX, sans recalcul de mise en page.
      var barreLecture = main.querySelector('.barre-lecture i');
      var article = main.querySelector('.md');
      var majBarre = function () {
        var r = article.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (window.innerHeight * 0.35 - r.top) / Math.max(1, r.height - window.innerHeight * 0.5)));
        barreLecture.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      };
      window.addEventListener('scroll', majBarre, { passive: true });
      surDepart(function () { window.removeEventListener('scroll', majBarre); });
      majBarre();

      // Suivi de lecture : une section est « vue » quand son titre de niveau 2 passe dans les 60 % hauts de l'écran.
      if (numeroModule) {
        var h2 = titres.filter(function (t) { return t.niveau === 2; });
        var lu = (Stock.lire('lecture', {})[numeroModule] || { sections: {} }).sections;
        var cocherToc = function (id) { var b = main.querySelector('.toc button[data-cible="' + id + '"]'); if (b) b.classList.add('lu'); };
        Object.keys(lu).forEach(cocherToc);
        var dejaVu = {};
        var minuteurLecture = null;
        var verifierLecture = function () {
          minuteurLecture = null;
          majBarre();
          var limite = window.innerHeight * 0.6;
          h2.forEach(function (t) {
            if (!dejaVu[t.id] && t.el.getBoundingClientRect().top < limite) {
              dejaVu[t.id] = true;
              Stock.marquerLu(numeroModule, t.id, h2.length);
              cocherToc(t.id);
              if (J) {
                J.demarrerStatut('module-' + numeroModule);
                J.gagner('section', { discret: true, unique: 'section:' + numeroModule + ':' + t.id });
              }
            }
          });
          // Chapitre terminé : toutes les sections vues → confettis et XP (une seule fois).
          var l = Stock.lire('lecture', {})[numeroModule];
          if (J && l && Object.keys(l.sections).length >= h2.length && J.gagner('chapitre', { unique: 'chapitre:' + numeroModule })) {
            if (window.Anim) { Anim.confettis(); Anim.toast('Chapitre terminé ! Pensez à le marquer « Maîtrisé » quand vous serez prêt.'); }
          }
        };
        var surDefilement = function () { if (!minuteurLecture) minuteurLecture = setTimeout(verifierLecture, 250); };
        window.addEventListener('scroll', surDefilement, { passive: true });
        // Filet de sécurité : certains navigateurs suspendent les événements de défilement (onglet en arrière-plan…).
        var veille = setInterval(verifierLecture, 1500);
        surDepart(function () { window.removeEventListener('scroll', surDefilement); clearTimeout(minuteurLecture); clearInterval(veille); });
        setTimeout(verifierLecture, 300);
      }
      if (ancre) {
        setTimeout(function () { allerA(ancre); }, 50);
        return 'garder-defilement';
      }
    });
  }

  /* ---------- accueil ---------- */
  function pageAccueil() {
    titrePage('Programme');
    return charger(CHEMINS.parametres, true).catch(function () { return null; }).then(function (p) {
      var c = function (chemin) {
        try { return chemin.split('.').reduce(function (o, k) { return o[k]; }, p).valeur; } catch (e) { return null; }
      };
      var chiffres = p ? [
        [fmt(c('plafonds_securite_sociale.pmss_mensuel')) + ' €', 'PMSS 2026'],
        [fmt(c('plafonds_securite_sociale.pass_annuel')) + ' €', 'PASS 2026'],
        [fmt(c('smic.horaire_brut')) + ' €', 'SMIC horaire brut'],
        [fmt(c('smic.mensuel_35h')) + ' €', 'SMIC mensuel 35 h']
      ] : [];
      var scores = Stock.lire('qcm', {});
      // Carte d'outil : émoji dans une pastille lumineuse, couleur de son « univers » (cours, cas, memos, glossaire, revisions, oral).
      var carte = function (emoji, univers, num, titre, items, actions) {
        return '<article class="carte carte-outil" data-univers="' + univers + '"><div class="carte-tete"><span class="carte-emoji" aria-hidden="true">' + emoji + '</span><span class="num">' + esc(num) + '</span></div>' +
          '<h3>' + esc(titre) + '</h3><ul>' +
          items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><div class="actions">' + actions + '</div></article>';
      };
      var jr = window.Suivi ? Suivi.joursRestants() : null;
      var dateEx = window.Suivi ? Suivi.dateExamen().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      var PHRASES = ['réviser le brut', 'maîtriser les cotisations', 'préparer l\'oral', 'réussir le 27/01/2027'];
      main.innerHTML =
        '<section class="hero"><div class="hero-texte"><span class="surtitre">Titre professionnel Gestionnaire de paie · RNCP37948</span>' +
        '<h1 class="titre-degrade"><span class="invite" aria-hidden="true">&gt;</span> Devenez gestionnaire de paie</h1>' +
        '<p>Cours structurés, fiches de révision, QCM corrigés, entraînement oral, simulateur de bulletin et paramètres légaux 2026. ' +
        'Pour les étudiants, alternants, personnes en reconversion et candidats au titre professionnel.</p>' +
        // Faux terminal : décoratif (aria-hidden) ; la même information est donnée en texte pour les lecteurs d'écran.
        '<div class="terminal" aria-hidden="true"><div class="terminal-barre"><i></i><i></i><i></i><span>objectifs.sh</span></div>' +
        '<p><span class="prompt">$</span> <span id="tapeur">' + esc(PHRASES[PHRASES.length - 1]) + '</span><span class="curseur">▋</span></p></div>' +
        '<p class="sr-only">Objectifs : ' + PHRASES.join(', ') + '.</p>' +
        '<div class="hero-actions"><a class="bouton" href="#/planning">' + Icone('planning') + ' Mon planning</a>' +
        '<a class="bouton secondaire" href="#/module/1">' + Icone('livre') + ' Commencer le cours</a></div></div>' +
        (jr !== null && jr >= 0 ? '<a class="hero-rebours" href="#/planning" aria-label="Épreuve dans ' + jr + ' jours, le ' + esc(dateEx) + ' — ouvrir le planning">' +
          '<span class="rebours-titre">Épreuve dans</span>' +
          '<span class="decompte" aria-hidden="true"><span><b id="dJ">' + jr + '</b><small>jours</small></span><span><b id="dH">--</b><small>h</small></span>' +
          '<span><b id="dM">--</b><small>min</small></span><span><b id="dS">--</b><small>s</small></span></span>' +
          '<span class="rebours-d">' + esc(dateEx) + '</span></a>' : '') + '</section>' +
        '<section class="aujourdhui" id="aujourdhui" aria-live="polite"><h2>' + Icone('cloche') + ' À réviser aujourd\'hui</h2><p class="chargement">Préparation de votre programme…</p></section>' +
        (chiffres.length ? '<div class="chiffres chiffres-legaux">' + chiffres.map(function (x) {
          return '<div class="chiffre"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>';
        }).join('') + '</div>' : '') +
        '<h2>S\'entraîner et réviser</h2><div class="grille-modules" style="margin-bottom:32px">' +
        carte('📘', 'cours', 'Cours', 'Cours structurés', ['Objectifs, cours, résumé, formules', 'Encadrés « Point d\'attention » et « Piège d\'examen »', 'Statut à faire / en cours / maîtrisé'], '<a class="bouton" href="#/module/1">Module 1</a>') +
        carte('🧾', 'cas', 'Cas pratiques', 'Simulateur de bulletin', ['Saisie guidée', 'Bulletin détaillé ligne par ligne', 'Impression PDF'], '<a class="bouton" href="#/simulateur">Ouvrir</a>') +
        carte('🧮', 'cas', 'Cas pratiques', 'Calculateurs rapides', ['HS, congés payés, licenciement', 'Fin de CDD, maintien de salaire', 'Plafond, coût employeur'], '<a class="bouton" href="#/calculateurs">Ouvrir</a>') +
        carte('🗂️', 'memos', 'Mémos', 'Fiches synthèse', ['10 fiches transverses', 'Impression PDF'], '<a class="bouton" href="#/fiches">Lire</a>') +
        carte('🧠', 'memos', 'Mémos', 'Flashcards', ['Répétition espacée, boîtes type Leitner', 'Cartes du module 1 et du glossaire'], '<a class="bouton" href="#/flashcards">Réviser</a>') +
        carte('📖', 'glossaire', 'Glossaire', 'Glossaire et calendrier', ['65 termes et sigles', 'Échéances DSN et sociales 2026'], '<a class="bouton" href="#/glossaire">Glossaire</a><a class="bouton secondaire" href="#/calendrier">Calendrier</a>') +
        carte('📝', 'revisions', 'Révisions', 'QCM et examen blanc', ['200 questions du référentiel, BC01 et BC02', 'Examen blanc 60 questions / 90 min', 'Aménagement du temps (+1/3)'], '<a class="bouton" href="#/qcm/ref">200 QCM</a><a class="bouton secondaire" href="#/examen">Examen blanc</a>') +
        carte('📊', 'revisions', 'Révisions', 'Ma progression', ['Progression globale et par bloc', 'Courbe des scores, XP et badges', 'Objectif quotidien, série de jours'], '<a class="bouton" href="#/tableau-de-bord">Ouvrir</a>') +
        carte('🗓️', 'revisions', 'Révisions', 'Planning de révision', ['Réparti jusqu\'au jour de l\'épreuve', 'Priorité aux points faibles', 'Rappel quotidien'], '<a class="bouton" href="#/planning">Voir le planning</a>') +
        carte('🎤', 'oral', 'Oral', 'Entraînement oral', ['Questions tirées au sort par bloc', 'Chronomètre 30 min / 20 min', 'Réponse-modèle et auto-évaluation'], '<a class="bouton" href="#/oral">S\'entraîner</a>') +
        '</div>' +
        '<div class="titre-modules"><h2>Les 10 modules</h2><p class="legende-blocs">' +
        Object.keys(BLOCS).map(function (k) { var b = BLOCS[k]; return '<span><span class="pastille-bloc ' + b.cls + '">' + b.code + '</span> ' + esc(b.titre) + '</span>'; }).join('') +
        '</p></div><div class="grille-modules">' +
        MODULES.map(function (m, i) {
          var n = i + 1, b = BLOCS[m.bloc] || {};
          return '<article class="carte carte-module ' + (b.cls || '') + (m.dispo ? '' : ' a-venir') + '">' +
            '<div class="carte-tete"><span class="carte-ico">' + Icone(m.icone || 'livre') + '</span><span class="num">Module ' + n + '</span>' +
            '<span class="pastille-bloc ' + (b.cls || '') + '" title="' + esc(b.titre || '') + '">' + esc(m.bloc || '') + '</span></div><h3>' + esc(m.titre) + '</h3>' +
            '<ul>' + m.themes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
            '<div class="actions">' + (m.dispo
              ? '<a class="bouton" href="#/module/' + n + '">Cours</a><a class="bouton secondaire" href="#/qcm/' + n + '">QCM</a>' +
                (scores[n] ? '<span class="etiquette">Meilleur score : ' + scores[n].meilleur + ' %</span>' : '')
              : '<span class="etiquette">En préparation</span>') +
            '</div></article>';
        }).join('') + '</div>';

      // Machine à écrire du faux terminal (texte fixe si l'utilisateur demande moins d'animations).
      var tapeur = document.getElementById('tapeur');
      if (tapeur && !(window.Anim && Anim.reduit())) {
        var iP = 0, iC = 0, efface = false, minuteurT = null;
        var etape = function () {
          var ph = PHRASES[iP];
          if (!efface) {
            tapeur.textContent = ph.slice(0, ++iC);
            if (iC === ph.length) { efface = true; minuteurT = setTimeout(etape, 1600); return; }
            minuteurT = setTimeout(etape, 55 + Math.random() * 45);
          } else {
            tapeur.textContent = ph.slice(0, --iC);
            if (iC === 0) { efface = false; iP = (iP + 1) % PHRASES.length; minuteurT = setTimeout(etape, 350); return; }
            minuteurT = setTimeout(etape, 28);
          }
        };
        tapeur.textContent = '';
        etape();
        surDepart(function () { clearTimeout(minuteurT); });
      }
      // Compte à rebours détaillé (jours, heures, minutes, secondes), mis à jour chaque seconde.
      if (window.Suivi && document.getElementById('dJ')) {
        var deux = function (n) { return String(n).padStart(2, '0'); };
        var tic = function () {
          var d = Suivi.decompte();
          document.getElementById('dJ').textContent = d.j;
          document.getElementById('dH').textContent = deux(d.h);
          document.getElementById('dM').textContent = deux(d.m);
          document.getElementById('dS').textContent = deux(d.s);
        };
        tic();
        var minuteurD = setInterval(tic, 1000);
        surDepart(function () { clearInterval(minuteurD); });
      }

      // Programme du jour (calculé à partir du planning, des flashcards dues et des points faibles).
      if (window.Suivi) Suivi.aReviserAujourdhui().then(function (a) {
        var zone = document.getElementById('aujourdhui');
        if (!zone) return;
        var serie = Suivi.serie();
        zone.innerHTML = '<div class="aujourdhui-tete"><h2>' + Icone('cloche') + ' À réviser aujourd\'hui</h2>' +
          '<span class="etiquette serie"><span class="flamme' + (serie ? ' vive' : '') + '" aria-hidden="true">🔥</span> ' + serie + ' jour' + (serie > 1 ? 's' : '') + ' d\'affilée</span></div>' +
          (window.Jeu ? '<p class="astuce"><span aria-hidden="true">💡</span> <strong>Astuce du jour :</strong> ' + esc(Jeu.astuceDuJour()) + '</p>' : '') +
          (a.jour ? '<ul class="a-faire">' + a.jour.items.map(function (it) {
            return '<li><span>' + esc(it.titre) + '</span><span class="liens">' + (it.liens || []).map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + '</a>'; }).join(' · ') + '</span></li>';
          }).join('') + (a.cartesDues ? '<li><span>' + a.cartesDues + ' flashcard(s) à revoir</span><span class="liens"><a href="#/flashcards">Réviser</a></span></li>' : '') + '</ul>'
            : '<p>Bonne épreuve !</p>') +
          '<div class="ligne-prog"><span>Objectif du jour</span><span>' + a.avancement.pct + ' %</span></div>' +
          '<div class="jauge' + (a.avancement.atteint ? ' ok' : '') + '" role="progressbar" aria-label="Objectif du jour" aria-valuenow="' + a.avancement.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + a.avancement.pct + '%"></i></div>';
        if (window.Anim) Anim.activer(zone);
      });
    });
  }

  /* ---------- QCM d'entraînement ---------- */
  /** QCM d'un module. filtreInitial (facultatif, depuis l'URL #/qcm/n/<filtre>) : facile, moyen, difficile, calcul, faibles ou theme:<nom>. */
  /* n = numéro de module, ou « ref » pour la banque du référentiel (200 questions couvrant les 10 modules). */
  function pageQcm(n, filtreInitial) {
    var ref = n === 'ref';
    if (!ref && (!MODULES[n - 1] || !MODULES[n - 1].dispo)) {
      main.innerHTML = '<h1>QCM en préparation</h1><p>Le cours de ce module est en préparation, mais ses questions sont disponibles dans le ' +
        '<a href="#/qcm/ref/module:' + n + '">QCM du référentiel</a>.</p>';
      return Promise.resolve();
    }
    return charger(ref ? CHEMINS.qcmReferentiel : CHEMINS.qcm(n), true).then(function (toutes) {
      var nomQcm = ref ? 'QCM du référentiel' : 'QCM — Module ' + n;
      titrePage(ref ? 'QCM du référentiel' : 'QCM module ' + n);
      var etat = { filtre: 'tous', liste: [], i: 0, reponses: [], serie: 0 };
      var themes = toutes.map(function (q) { return q.theme; }).filter(function (t, i, a) { return t && a.indexOf(t) === i; });
      var modulesRef = ref ? toutes.map(function (q) { return q.module; }).filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(function (a, b) { return a - b; }) : [];
      var filtresValides = ['tous', 'facile', 'moyen', 'difficile', 'calcul', 'faibles'].concat(themes.map(function (t) { return 'theme:' + t; }))
        .concat(ref ? ['bloc:BC01', 'bloc:BC02'].concat(modulesRef.map(function (m) { return 'module:' + m; })) : []);
      if (filtreInitial && filtresValides.indexOf(filtreInitial) >= 0) etat.filtre = filtreInitial;

      function demarrer(liste) {
        etat.liste = liste; etat.i = 0; etat.reponses = []; etat.serie = 0;
        afficherQuestion();
      }
      function filtrer() {
        var f = etat.filtre;
        if (f === 'tous') return toutes.slice();
        if (f === 'faibles') {
          var s = Stock.lire('reponses', {});
          return toutes.filter(function (q) { return s[q.id] && s[q.id].dernier === false; });
        }
        if (f.indexOf('theme:') === 0) return toutes.filter(function (q) { return q.theme === f.slice(6); });
        if (f.indexOf('bloc:') === 0) return toutes.filter(function (q) { return q.bloc === f.slice(5); });
        if (f.indexOf('module:') === 0) return toutes.filter(function (q) { return String(q.module) === f.slice(7); });
        return toutes.filter(function (q) { return f === 'calcul' ? q.type === 'calcul' : q.niveau === f; });
      }
      function ecranAccueil() {
        main.innerHTML = '<div class="qcm"><h1>' + (ref ? '✅ ' : '') + esc(nomQcm) + '</h1>' +
          '<p>' + toutes.length + ' questions avec correction détaillée, référence juridique et piège à éviter.' +
          (ref ? ' Elles couvrent les 10 modules et les deux blocs du titre (BC01 et BC02) ; les valeurs chiffrées sont celles publiées pour 2026.' : '') + '</p>' +
          '<div class="filtres"><label for="filtre">Questions :</label><select id="filtre">' +
          '<option value="tous">Toutes</option><option value="facile">Faciles</option><option value="moyen">Moyennes</option>' +
          '<option value="difficile">Difficiles</option><option value="calcul">Calculs uniquement</option>' +
          '<option value="faibles">Mes dernières erreurs</option>' +
          (ref ? '<optgroup label="Par bloc"><option value="bloc:BC01">BC01 — ' + esc(BLOCS.BC01.court) + '</option><option value="bloc:BC02">BC02 — ' + esc(BLOCS.BC02.court) + '</option></optgroup>' +
            '<optgroup label="Par module">' + modulesRef.map(function (m) { return '<option value="module:' + m + '">Module ' + m + ' — ' + esc(MODULES[m - 1].titre) + '</option>'; }).join('') + '</optgroup>' : '') +
          '<optgroup label="Par thème">' + themes.map(function (t) { return '<option value="theme:' + esc(t) + '">' + esc(t) + '</option>'; }).join('') + '</optgroup>' +
          '</select>' +
          (ref ? '<label for="nombre">Nombre :</label><select id="nombre"><option value="10">10 au hasard</option><option value="20" selected>20 au hasard</option>' +
            '<option value="40">40 au hasard</option><option value="0">Toute la sélection</option></select>' : '') +
          '<button class="bouton" id="go" type="button">Commencer</button></div><p id="info" class="param-note" aria-live="polite"></p>' +
          '<p class="param-note">Pour une épreuve en conditions réelles, utilisez l\'<a href="#/examen">examen blanc chronométré</a>.</p></div>';
        main.querySelector('#filtre').value = etat.filtre;
        main.querySelector('#filtre').onchange = function (e) { etat.filtre = e.target.value; };
        main.querySelector('#go').onclick = function () {
          var l = filtrer();
          if (!l.length) { main.querySelector('#info').textContent = 'Aucune question dans cette sélection.'; return; }
          if (ref) {
            var nb = Number(main.querySelector('#nombre').value);
            l = melanger(l);
            if (nb) l = l.slice(0, nb);
          }
          demarrer(l);
        };
      }
      function afficherQuestion() {
        var q = etat.liste[etat.i];
        var multiple = q.type === 'choix multiple';
        var pct = Math.round(etat.i / etat.liste.length * 100);
        main.innerHTML = '<div class="qcm qcm-en-cours">' +
          '<div class="qcm-entete"><h1 style="margin:0;font-size:22px">' + esc(nomQcm) + '</h1>' +
          '<span class="etiquette">Question ' + (etat.i + 1) + ' / ' + etat.liste.length + '</span>' +
          (etat.serie >= 2 ? '<span class="etiquette serie">' + Icone('flamme') + ' Série : ' + etat.serie + '</span>' : '') + '</div>' +
          '<div class="progression" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progression"><div style="width:' + pct + '%"></div></div>' +
          '<form class="question" novalidate><div class="meta-q"><span class="etiquette">' + esc(q.id) + '</span>' +
          (q.bloc ? '<span class="pastille-bloc ' + (q.bloc === 'BC02' ? 'bc2' : 'bc1') + '">' + esc(q.bloc) + '</span>' : '') +
          '<span class="etiquette">' + esc(q.niveau) + '</span><span class="etiquette">' + esc(q.type) + '</span>' +
          (q.theme ? '<span class="etiquette">' + esc(q.theme) + '</span>' : '') + '</div>' +
          '<fieldset><legend>' + esc(q.enonce) + (multiple ? ' <small>(plusieurs réponses possibles)</small>' : '') + '</legend>' +
          q.choix.map(function (c) {
            var l = c.charAt(0);
            return '<label class="choix" data-l="' + l + '"><input type="' + (multiple ? 'checkbox' : 'radio') + '" name="r" value="' + l + '"><span>' + esc(c) + '</span></label>';
          }).join('') + '</fieldset>' +
          '<div aria-live="polite" id="retour"></div>' +
          '<div class="qcm-actions"><button class="bouton" type="submit" id="valider">Valider</button></div></form></div>';
        var form = main.querySelector('form');
        form.querySelector('legend').setAttribute('tabindex', '-1');
        form.querySelector('legend').focus();
        form.onsubmit = function (e) {
          e.preventDefault();
          if (form.dataset.corrige) { suivante(); return; }
          var choisies = Array.prototype.map.call(form.querySelectorAll('input:checked'), function (x) { return x.value; }).sort();
          if (!choisies.length) { form.querySelector('#retour').innerHTML = '<p class="param-note">Choisissez au moins une réponse.</p>'; return; }
          var bonnes = q.bonne_reponse.slice().sort();
          var ok = choisies.join() === bonnes.join();
          etat.reponses.push({ q: q, ok: ok });
          Stock.enregistrerReponse(q, ok);
          form.dataset.corrige = '1';
          form.querySelectorAll('input').forEach(function (x) { x.disabled = true; });
          form.querySelectorAll('.choix').forEach(function (lab) {
            var l = lab.dataset.l;
            if (bonnes.indexOf(l) >= 0) lab.classList.add('bon');
            else if (choisies.indexOf(l) >= 0) lab.classList.add('faux');
          });
          form.querySelector('#retour').innerHTML = correctionHtml(q, ok, bonnes);
          // Série de bonnes réponses : petite célébration toutes les 5 bonnes réponses d'affilée.
          etat.serie = ok ? etat.serie + 1 : 0;
          if (ok && etat.serie % 5 === 0 && window.Anim) {
            Anim.confettis();
            Anim.toast('Série de ' + etat.serie + ' bonnes réponses !');
          }
          var btn = form.querySelector('#valider');
          btn.textContent = etat.i + 1 < etat.liste.length ? 'Question suivante' : 'Voir le résultat';
          btn.focus();
        };
      }
      function suivante() {
        etat.i++;
        if (etat.i < etat.liste.length) afficherQuestion(); else resultat();
      }
      function resultat() {
        var bons = etat.reponses.filter(function (r) { return r.ok; }).length;
        var pct = Math.round(bons / etat.reponses.length * 100);
        if (etat.liste.length === toutes.length) Stock.enregistrerScoreQcm(n, pct);
        Stock.ajouterHistorique({
          type: 'qcm', module: n, bons: bons, total: etat.reponses.length, pct: pct,
          erreurs: etat.reponses.filter(function (r) { return !r.ok; }).map(function (r) { return r.q.id; })
        });
        var parNiveau = ['facile', 'moyen', 'difficile'].map(function (niv) {
          var r = etat.reponses.filter(function (x) { return x.q.niveau === niv; });
          return r.length ? '<tr><td>' + niv + '</td><td>' + r.filter(function (x) { return x.ok; }).length + ' / ' + r.length + '</td></tr>' : '';
        }).join('');
        var ratees = etat.reponses.filter(function (r) { return !r.ok; }).map(function (r) { return r.q; });
        main.innerHTML = '<div class="qcm"><h1 tabindex="-1">Résultat</h1><p class="score">' + bons + ' / ' + etat.reponses.length + ' <small>(' + pct + ' %)</small></p>' +
          '<div class="table-wrap"><table class="tableau"><thead><tr><th scope="col">Niveau</th><th scope="col">Bonnes réponses</th></tr></thead><tbody>' + parNiveau + '</tbody></table></div>' +
          (ratees.length ? '<p>À revoir : ' + ratees.map(function (q) { return esc(q.id); }).join(', ') + '</p>' : '<p>Aucune erreur. Bravo.</p>') +
          '<div class="qcm-actions">' + (ratees.length ? '<button class="bouton" id="revoir" type="button">Refaire les questions ratées</button>' : '') +
          '<button class="bouton secondaire" id="recommencer" type="button">Recommencer</button>' +
          (ref ? '<a class="bouton secondaire" href="#/fiches">Revoir les fiches</a>' : '<a class="bouton secondaire" href="#/module/' + n + '">Revoir le cours</a>') +
          '<a class="bouton secondaire" href="#/tableau-de-bord">Tableau de bord</a></div></div>';
        main.querySelector('h1').focus();
        if (ratees.length) main.querySelector('#revoir').onclick = function () { demarrer(ratees); };
        main.querySelector('#recommencer').onclick = ecranAccueil;
        if (window.Anim) { Anim.activer(main); if (pct >= 80 && etat.reponses.length >= 5) Anim.confettis(); }
        if (window.Jeu) {
          Jeu.gagner('qcm', { discret: true });
          if (pct >= 80 && etat.reponses.length >= 5) Jeu.gagner('qcmReussi');
          if (pct === 100 && etat.reponses.length >= 5) Jeu.gagner('qcmParfait');
        }
      }
      ecranAccueil();
    });
  }
  function correctionHtml(q, ok, bonnes) {
    return '<div class="correction ' + (ok ? 'ok' : 'ko') + '">' +
      '<h3>' + (ok ? 'Bonne réponse' : 'Réponse incorrecte — bonne réponse : ' + esc(bonnes.join(', '))) + '</h3>' +
      '<p>' + esc(q.explication) + '</p>' +
      (q.piege ? '<p><strong>Piège :</strong> ' + esc(q.piege) + '</p>' : '') +
      (q.reference ? '<p class="param-note"><strong>Référence :</strong> ' + esc(q.reference) + '</p>' : '') + '</div>';
  }

  /* ---------- paramètres 2026 ---------- */
  var LIBELLES_SECTIONS = {
    plafonds_securite_sociale: 'Plafonds de la Sécurité sociale', smic: 'SMIC et minimum garanti', duree_travail: 'Durée du travail',
    cotisations: 'Cotisations et contributions (taux en %)', reduction_generale: 'Réduction générale (RGDU 2026)',
    heures_supplementaires_exoneration: 'Heures supplémentaires : exonérations', absences: 'Absences', rupture_contrat: 'Rupture du contrat',
    apprentis: 'Apprentis', stagiaires: 'Stagiaires', avantages_en_nature: 'Avantages en nature', frais_professionnels: 'Frais professionnels',
    epargne_salariale: 'Épargne salariale', prelevement_a_la_source: 'Prélèvement à la source', saisies_sur_salaire: 'Saisies sur salaire',
    seuils_effectif: 'Seuils d\'effectif', conservation_documents: 'Conservation des documents'
  };
  var CLES_META = ['statut', 'reference', 'references', 'note', 'source', 'date_effet', 'unite', '_note'];

  function valeurLisible(v) {
    if (v === null) return '<span class="badge badge-verif">À renseigner</span>';
    if (typeof v !== 'object') return esc(fmt(v));
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') {
        return '<details><summary>' + v.length + ' lignes</summary><div class="table-wrap"><table class="tableau"><tbody>' +
          v.map(function (l) { return '<tr>' + Object.keys(l).map(function (k) { return '<td>' + esc(k) + ' : ' + esc(l[k] === null ? 'au-delà' : fmt(l[k])) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div></details>';
      }
      return esc(v.map(fmt).join(', '));
    }
    if ('valeur' in v) return valeurLisible(v.valeur) + (v.unite && v.valeur !== null ? ' ' + esc(v.unite) : '');
    if ('salarial' in v || 'patronal' in v) {
      var p = [];
      if ('salarial' in v) p.push('S : ' + (v.salarial === null ? '—' : fmt(v.salarial)));
      if ('patronal' in v) p.push('P : ' + (v.patronal === null ? 'taux propre' : fmt(v.patronal)));
      return esc(p.join(' · ')) + (v.assiette ? '<br><span class="param-note">Assiette : ' + esc(v.assiette) + '</span>' : '');
    }
    return Object.keys(v).filter(function (k) { return CLES_META.indexOf(k) < 0; }).map(function (k) {
      var x = v[k];
      return '<span class="param-note">' + esc(k.replace(/_/g, ' ')) + ' :</span> ' + (typeof x === 'object' && x !== null && !Array.isArray(x) ? esc(JSON.stringify(x)) : valeurLisible(x));
    }).join('<br>');
  }

  function pageParametres() {
    return charger(CHEMINS.parametres, true).then(function (p) {
      titrePage('Paramètres 2026');
      var nbVerif = 0;
      var sections = Object.keys(p).filter(function (k) { return k !== 'meta' && k[0] !== '$'; }).map(function (sec) {
        var obj = p[sec], statutSec = obj.statut;
        var lignes = Object.keys(obj).filter(function (k) { return CLES_META.indexOf(k) < 0 && k !== 'denomination'; }).map(function (k) {
          var v = obj[k];
          var statut = (v && typeof v === 'object' && v.statut) || statutSec;
          if (statut === 'A_VERIFIER') nbVerif++;
          var note = v && typeof v === 'object' ? [v.note, v.reference, v.condition].filter(Boolean).join(' — ') : '';
          return '<tr data-statut="' + esc(statut || '') + '"><th scope="row"><span class="param-cle">' + esc(k) + '</span></th>' +
            '<td class="param-val">' + valeurLisible(v) + '</td><td>' + badge(statut) + '</td><td class="param-note">' + esc(note) + '</td></tr>';
        }).join('');
        var entete = [obj.denomination, obj.reference, obj.note, obj._note].filter(Boolean).map(esc).join('<br>');
        return '<section class="param-section"><h2>' + esc(LIBELLES_SECTIONS[sec] || sec) + ' ' + badge(statutSec) + '</h2>' +
          (entete ? '<p class="param-note">' + entete + '</p>' : '') +
          '<div class="table-wrap"><table class="tableau"><thead><tr><th scope="col">Clé</th><th scope="col">Valeur</th><th scope="col">Statut</th><th scope="col">Référence / note</th></tr></thead><tbody>' + lignes + '</tbody></table></div></section>';
      }).join('');
      main.innerHTML = '<h1>Paramètres légaux 2026</h1>' +
        '<div class="alerte"><strong>' + nbVerif + ' valeurs à vérifier.</strong> ' + esc(p.meta.avertissement) + '</div>' +
        '<div class="filtres"><label><input type="checkbox" id="seulVerif"> Afficher seulement les valeurs À VÉRIFIER</label>' +
        '<span class="param-note">Mise à jour : ' + esc(p.meta.date_derniere_maj) + '</span></div>' + sections;
      main.querySelector('#seulVerif').onchange = function (e) {
        main.querySelectorAll('tbody tr[data-statut]').forEach(function (tr) {
          tr.hidden = e.target.checked && tr.dataset.statut !== 'A_VERIFIER';
        });
      };
    });
  }

  /* ---------- pages définies dans les autres fichiers ---------- */
  function pageExterne(nom, titre) {
    var args = Array.prototype.slice.call(arguments, 2);
    if (!window.Pages || !window.Pages[nom]) return Promise.reject(new Error('Module de page non chargé : ' + nom));
    titrePage(titre);
    return Promise.resolve(window.Pages[nom].apply(null, [main].concat(args)));
  }
  function pageOutil(nom) {
    if (!window.MoteurPaie || !window.PagesOutils) {
      return Promise.reject(new Error('Moteur de calcul non chargé. En local, lancez « npm run build:site » pour générer site/assets/moteur.js.'));
    }
    return charger(CHEMINS.parametres, true).then(function (p) {
      titrePage(nom === 'simulateur' ? 'Simulateur de bulletin' : 'Calculateurs');
      window.PagesOutils[nom](main, p);
    });
  }

  /* ---------- navigation ---------- */
  function mettreAJourNav(nav) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('details.menu').forEach(function (d) {
      d.open = false;
      d.classList.toggle('actif', !!d.querySelector('[aria-current="page"]'));
    });
    // Pastille de progression (anneau) à côté de « Cours » : part du module 1 lue.
    var anneau = document.getElementById('anneauCours');
    if (anneau) {
      var l = Stock.lire('lecture', {})[1];
      var pct = l && l.total ? Math.round(Object.keys(l.sections).length / l.total * 100) : 0;
      anneau.style.setProperty('--p', pct);
      anneau.title = pct + ' % lu';
      anneau.parentNode.setAttribute('aria-label', 'Cours, module 1 lu à ' + pct + ' %');
    }
  }
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.menu[open]').forEach(function (d) { if (!d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var ouvert = document.querySelector('details.menu[open]');
    if (ouvert) { ouvert.open = false; ouvert.querySelector('summary').focus(); }
  });

  function router() {
    nettoyages.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    var nav = parts[0] || 'accueil';
    mettreAJourNav(nav);
    main.innerHTML = '<p class="chargement">Chargement…</p>';
    var n = parseInt(parts[1], 10) || 1;
    var p;
    switch (nav) {
      case 'module':
        p = MODULES[n - 1] && MODULES[n - 1].dispo ? pageMarkdown(CHEMINS.module(n), 'Module ' + n, parts[2], n)
          : Promise.resolve(main.innerHTML = '<h1>Module en préparation</h1>');
        break;
      case 'qcm': p = pageQcm(parts[1] === 'ref' ? 'ref' : n, parts.slice(2).join('/')); break;
      case 'oral': p = pageExterne('oral', 'Entraînement oral'); break;
      case 'planning': p = pageExterne('planning', 'Planning de révision'); break;
      case 'compte': p = pageExterne('compte', 'Mon compte', parts[1]); break;
      case 'badges': p = pageExterne('badges', 'Mes badges'); break;
      case 'fiches': p = pageMarkdown(CHEMINS.fiches, 'Fiches synthèse', parts[1]); break;
      case 'parametres': p = pageParametres(); break;
      case 'simulateur': case 'calculateurs': p = pageOutil(nav); break;
      case 'tableau-de-bord': p = pageExterne('tableauDeBord', 'Tableau de bord'); break;
      case 'examen': p = pageExterne('examen', 'Examen blanc'); break;
      case 'flashcards': p = pageExterne('flashcards', 'Flashcards'); break;
      case 'glossaire': p = pageExterne('glossaire', 'Glossaire', parts[1]); break;
      case 'calendrier': p = pageExterne('calendrier', 'Calendrier social'); break;
      case 'recherche': p = pageExterne('recherche', 'Recherche', parts.slice(1).join('/')); break;
      default: p = pageAccueil();
    }
    p.catch(erreur).then(function (r) {
      if (window.Anim) { Anim.entreePage(main); Anim.activer(main); }
      if (window.Suivi) Suivi.majCompteRebours();
      if (r === 'garder-defilement') return; // la page défile elle-même vers l'ancre demandée
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    });
  }

  /* ---------- thèmes : Néon violet, Océan cyan, Aurore rose, Clair ----------
   * Choix mémorisé dans localStorage (« theme »). Sans choix (« Automatique »), le site suit le système :
   * sombre → Néon violet, clair → Clair. */
  var THEMES = { neon: 'Néon violet', ocean: 'Océan cyan', aurore: 'Aurore rose', light: 'Clair' };
  var menuTheme = document.getElementById('menuTheme');
  function themeActif() {
    var t = document.documentElement.dataset.theme;
    if (THEMES[t]) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'neon' : 'light';
  }
  function majMenuTheme() {
    var choisi = document.documentElement.dataset.theme || 'auto';
    var actif = themeActif();
    menuTheme.querySelector('summary').innerHTML = Icone(actif === 'light' ? 'soleil' : 'lune') + '<span class="sr-only">Thème : ' + THEMES[actif] + '</span>';
    menuTheme.querySelectorAll('[data-theme-choix]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeChoix === choisi)); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = { neon: '#1a1038', ocean: '#06222e', aurore: '#2a0f2a', light: '#4f46e5' }[actif];
  }
  menuTheme.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-choix]');
    if (!b) return;
    var v = b.dataset.themeChoix;
    if (v === 'auto') { delete document.documentElement.dataset.theme; try { localStorage.removeItem('theme'); } catch (x) {} }
    else { document.documentElement.dataset.theme = v; try { localStorage.setItem('theme', v); } catch (x) {} }
    majMenuTheme();
    menuTheme.open = false;
    menuTheme.querySelector('summary').focus();
  });
  if (window.matchMedia) {
    var mqTheme = matchMedia('(prefers-color-scheme: dark)');
    if (mqTheme.addEventListener) mqTheme.addEventListener('change', majMenuTheme);
  }
  majMenuTheme();

  /* ---------- champ de recherche de l'en-tête ---------- */
  var formRecherche = document.getElementById('formRecherche');
  if (formRecherche) formRecherche.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = formRecherche.querySelector('input').value.trim();
    location.hash = '#/recherche' + (q ? '/' + encodeURIComponent(q) : '');
  });

  window.App = {
    MODULES: MODULES, BLOCS: BLOCS, CHEMINS: CHEMINS, charger: charger, esc: esc, slug: slug, fmt: fmt, melanger: melanger,
    titrePage: titrePage, surDepart: surDepart, allerA: allerA, correctionHtml: correctionHtml,
    toutesLesQuestions: toutesLesQuestions, idsTitres: idsTitres
  };

  window.addEventListener('hashchange', router);
  // Les autres scripts (revision.js, ressources.js) sont chargés après : on attend la fin du chargement.
  // Hauteur réelle de l'en-tête collant (il passe sur deux lignes sur petit écran) : sert aux éléments collants et aux ancres.
  var entete = document.querySelector('.entete');
  function majHauteurEntete() { document.documentElement.style.setProperty('--h-entete', entete.offsetHeight + 'px'); }
  if (window.ResizeObserver) new ResizeObserver(majHauteurEntete).observe(entete);
  majHauteurEntete();

  function demarrer() {
    if (window.Jeu) {
      Jeu.visiteDuJour();
      Jeu.majProfil();
      if (window.Compte) Compte.surChangement(Jeu.majProfil);
      window.addEventListener('stock:change', function (e) { if (e.detail === 'profil' || e.detail === '*') Jeu.majProfil(); });
    }
    router();
    // Rappel « à réviser aujourd'hui » : notification à la première ouverture du jour, si l'apprenant l'a activée.
    if (window.Suivi) setTimeout(Suivi.notifierSiBesoin, 3000);
  }
  if (document.readyState === 'complete') demarrer(); else window.addEventListener('load', demarrer);
})();
