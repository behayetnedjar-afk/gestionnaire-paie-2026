/* Gestionnaire de Paie — Référentiel 2026 — site statique (sans compilation) */
(function () {
  'use strict';

  // En ligne, le site est à la racine ; en local, on sert la racine du dépôt et on ouvre /site/.
  var BASE = /\/site\/?/.test(location.pathname) ? '../' : './';
  var CONTENU = BASE + 'packages/contenu/';

  var MODULES = [
    { titre: 'Cadre juridique et environnement de la paie', dossier: 'm01-cadre-juridique', dispo: true,
      themes: ['Sources du droit, hiérarchie des normes', 'Contrats : CDI, CDD, temps partiel, intérim, apprentissage', 'Durée du travail, HS, forfaits jours', 'DPAE, registre du personnel', 'Archivage et RGPD'] },
    { titre: 'Le bulletin de paie', themes: ['Mentions obligatoires, bulletin clarifié', 'Brut, net social, net imposable, net à payer', 'Lecture et contrôle', 'Avantages en nature, primes'] },
    { titre: 'Cotisations et contributions sociales', themes: ['PMSS, tranches A/B/C', 'Sécurité sociale, chômage, AGIRC-ARRCO', 'CSG/CRDS', 'Réduction générale 2026, taux réduits', 'Régularisation des plafonds'] },
    { titre: 'Absences et suspension du contrat', themes: ['Maladie : IJSS, maintien, subrogation', 'AT/MP', 'Maternité, paternité, congés familiaux', 'Congés payés : 1/10e et maintien'] },
    { titre: 'Temps de travail et rémunération variable', themes: ['HS et heures complémentaires', 'Astreintes, nuit, dimanche', 'Primes et commissions', 'Épargne salariale, PPV'] },
    { titre: 'Fin de contrat et solde de tout compte', themes: ['Démission, licenciement, rupture conventionnelle', 'Préavis, indemnités', 'Régime social et fiscal', 'Documents de fin de contrat'] },
    { titre: 'DSN et déclaratif', themes: ['DSN mensuelle et événementielle', 'Anomalies et rejets', 'Prélèvement à la source', 'Échéances de paiement'] },
    { titre: 'Cas particuliers', themes: ['Apprentis, stagiaires', 'Cadres, dirigeants, mandataires', 'Détachés, expatriés, frontaliers', 'Saisies, acomptes, frais professionnels'] },
    { titre: 'Comptabilité de la paie, contrôle et audit', themes: ['Écritures de paie', 'Provisions de congés payés', 'Rapprochement DSN / compta / bulletins', 'Contrôle URSSAF'] },
    { titre: 'Pilotage et relation sociale', themes: ['Masse salariale, indicateurs', 'Communication', 'Veille et éthique', 'Préparation à l\'épreuve'] }
  ];

  var CHEMINS = {
    parametres: BASE + 'parametres/2026.json',
    fiches: CONTENU + 'fiches-synthese/fiches-synthese.md',
    glossaire: CONTENU + 'glossaire.json',
    calendrier: CONTENU + 'calendrier-social-2026.json',
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
    cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
    cible.focus({ preventScroll: true });
    return true;
  }
  /** Toutes les questions des modules disponibles. */
  function toutesLesQuestions() {
    return Promise.all(MODULES.map(function (m, i) { return m.dispo ? charger(CHEMINS.qcm(i + 1), true) : []; }))
      .then(function (l) { return [].concat.apply([], l); });
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
      main.innerHTML = '<div class="cours"><nav class="toc" aria-label="Sommaire"><p>Sommaire</p><ul></ul></nav>' +
        '<div><div class="barre-outils no-print"><button type="button" class="bouton secondaire petit" id="imprimer">Imprimer / enregistrer en PDF</button></div>' +
        '<article class="md"></article></div></div>';
      var titres = rendreMarkdown(texte, main.querySelector('.md'));
      main.querySelector('.toc ul').innerHTML = titres.map(function (t) {
        return '<li class="n' + t.niveau + '"><button type="button" data-cible="' + t.id + '">' + esc(t.texte) + '</button></li>';
      }).join('');
      main.querySelector('.toc').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-cible]'); if (b) allerA(b.dataset.cible);
      });
      main.querySelector('#imprimer').addEventListener('click', function () { window.print(); });

      // Suivi de lecture : une section est « vue » quand son titre de niveau 2 passe dans les 60 % hauts de l'écran.
      if (numeroModule) {
        var h2 = titres.filter(function (t) { return t.niveau === 2; });
        var dejaVu = {};
        var minuteurLecture = null;
        var verifierLecture = function () {
          minuteurLecture = null;
          var limite = window.innerHeight * 0.6;
          h2.forEach(function (t) {
            if (!dejaVu[t.id] && t.el.getBoundingClientRect().top < limite) {
              dejaVu[t.id] = true;
              Stock.marquerLu(numeroModule, t.id, h2.length);
            }
          });
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
      var carte = function (num, titre, items, actions) {
        return '<article class="carte"><span class="num">' + esc(num) + '</span><h3>' + esc(titre) + '</h3><ul>' +
          items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><div class="actions">' + actions + '</div></article>';
      };
      main.innerHTML =
        '<section class="hero"><h1>Devenez gestionnaire de paie</h1>' +
        '<p>Cours structurés, fiches de révision, QCM corrigés, simulateur de bulletin et paramètres légaux 2026. ' +
        'Pour les étudiants, alternants, personnes en reconversion et candidats au titre professionnel.</p></section>' +
        (chiffres.length ? '<div class="chiffres">' + chiffres.map(function (x) {
          return '<div class="chiffre"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>';
        }).join('') + '</div>' : '') +
        '<h2>S\'entraîner et réviser</h2><div class="grille-modules" style="margin-bottom:32px">' +
        carte('Suivi', 'Tableau de bord', ['Progression de lecture', 'Scores et points faibles', 'Prochaines échéances'], '<a class="bouton" href="#/tableau-de-bord">Ouvrir</a>') +
        carte('Entraînement', 'QCM et examen blanc', ['Questions corrigées et référencées', 'Examen chronométré', 'Aménagement du temps (+1/3)'], '<a class="bouton" href="#/qcm/1">QCM</a><a class="bouton secondaire" href="#/examen">Examen blanc</a>') +
        carte('Mémorisation', 'Flashcards', ['Répétition espacée', 'Cartes du module 1 et du glossaire'], '<a class="bouton" href="#/flashcards">Réviser</a>') +
        carte('Application', 'Simulateur de bulletin', ['Saisie guidée', 'Bulletin détaillé ligne par ligne', 'Impression PDF'], '<a class="bouton" href="#/simulateur">Ouvrir</a>') +
        carte('Application', 'Calculateurs rapides', ['HS, congés payés, licenciement', 'Fin de CDD, maintien de salaire', 'Plafond, coût employeur'], '<a class="bouton" href="#/calculateurs">Ouvrir</a>') +
        carte('Ressources', 'Glossaire et calendrier', ['65 termes et sigles', 'Échéances DSN et sociales 2026'], '<a class="bouton" href="#/glossaire">Glossaire</a><a class="bouton secondaire" href="#/calendrier">Calendrier</a>') +
        '</div>' +
        '<h2>Les 10 modules</h2><div class="grille-modules">' +
        MODULES.map(function (m, i) {
          var n = i + 1;
          return '<article class="carte' + (m.dispo ? '' : ' a-venir') + '">' +
            '<span class="num">Module ' + n + '</span><h3>' + esc(m.titre) + '</h3>' +
            '<ul>' + m.themes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
            '<div class="actions">' + (m.dispo
              ? '<a class="bouton" href="#/module/' + n + '">Cours</a><a class="bouton secondaire" href="#/qcm/' + n + '">QCM</a>' +
                (scores[n] ? '<span class="etiquette">Meilleur score : ' + scores[n].meilleur + ' %</span>' : '')
              : '<span class="etiquette">En préparation</span>') +
            '</div></article>';
        }).join('') + '</div>';
    });
  }

  /* ---------- QCM d'entraînement ---------- */
  function pageQcm(n) {
    if (!MODULES[n - 1] || !MODULES[n - 1].dispo) { main.innerHTML = '<h1>QCM en préparation</h1>'; return Promise.resolve(); }
    return charger(CHEMINS.qcm(n), true).then(function (toutes) {
      titrePage('QCM module ' + n);
      var etat = { filtre: 'tous', liste: [], i: 0, reponses: [] };
      var themes = toutes.map(function (q) { return q.theme; }).filter(function (t, i, a) { return t && a.indexOf(t) === i; });

      function demarrer(liste) {
        etat.liste = liste; etat.i = 0; etat.reponses = [];
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
        return toutes.filter(function (q) { return f === 'calcul' ? q.type === 'calcul' : q.niveau === f; });
      }
      function ecranAccueil() {
        main.innerHTML = '<div class="qcm"><h1>QCM — Module ' + n + '</h1>' +
          '<p>' + toutes.length + ' questions avec correction détaillée, référence juridique et piège à éviter.</p>' +
          '<div class="filtres"><label for="filtre">Questions :</label><select id="filtre">' +
          '<option value="tous">Toutes</option><option value="facile">Faciles</option><option value="moyen">Moyennes</option>' +
          '<option value="difficile">Difficiles</option><option value="calcul">Calculs uniquement</option>' +
          '<option value="faibles">Mes dernières erreurs</option>' +
          '<optgroup label="Par thème">' + themes.map(function (t) { return '<option value="theme:' + esc(t) + '">' + esc(t) + '</option>'; }).join('') + '</optgroup>' +
          '</select><button class="bouton" id="go" type="button">Commencer</button></div><p id="info" class="param-note" aria-live="polite"></p>' +
          '<p class="param-note">Pour une épreuve en conditions réelles, utilisez l\'<a href="#/examen">examen blanc chronométré</a>.</p></div>';
        main.querySelector('#filtre').value = etat.filtre;
        main.querySelector('#filtre').onchange = function (e) { etat.filtre = e.target.value; };
        main.querySelector('#go').onclick = function () {
          var l = filtrer();
          if (!l.length) { main.querySelector('#info').textContent = 'Aucune question dans cette sélection.'; return; }
          demarrer(l);
        };
      }
      function afficherQuestion() {
        var q = etat.liste[etat.i];
        var multiple = q.type === 'choix multiple';
        var pct = Math.round(etat.i / etat.liste.length * 100);
        main.innerHTML = '<div class="qcm">' +
          '<div class="qcm-entete"><h1 style="margin:0;font-size:22px">QCM — Module ' + n + '</h1>' +
          '<span class="etiquette">Question ' + (etat.i + 1) + ' / ' + etat.liste.length + '</span></div>' +
          '<div class="progression" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progression"><div style="width:' + pct + '%"></div></div>' +
          '<form class="question" novalidate><div class="meta-q"><span class="etiquette">' + esc(q.id) + '</span>' +
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
        Stock.ajouterHistorique({ type: 'qcm', module: n, bons: bons, total: etat.reponses.length, pct: pct });
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
          '<a class="bouton secondaire" href="#/module/' + n + '">Revoir le cours</a>' +
          '<a class="bouton secondaire" href="#/tableau-de-bord">Tableau de bord</a></div></div>';
        main.querySelector('h1').focus();
        if (ratees.length) main.querySelector('#revoir').onclick = function () { demarrer(ratees); };
        main.querySelector('#recommencer').onclick = ecranAccueil;
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
      case 'qcm': p = pageQcm(n); break;
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
      if (r === 'garder-defilement') return; // la page défile elle-même vers l'ancre demandée
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    });
  }

  document.getElementById('themeBtn').addEventListener('click', function () {
    var root = document.documentElement;
    var sombre = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = sombre ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  window.App = {
    MODULES: MODULES, CHEMINS: CHEMINS, charger: charger, esc: esc, slug: slug, fmt: fmt, melanger: melanger,
    titrePage: titrePage, surDepart: surDepart, allerA: allerA, correctionHtml: correctionHtml,
    toutesLesQuestions: toutesLesQuestions, idsTitres: idsTitres
  };

  window.addEventListener('hashchange', router);
  // Les autres scripts (revision.js, ressources.js) sont chargés après : on attend la fin du chargement.
  if (document.readyState === 'complete') router(); else window.addEventListener('load', router);
})();
