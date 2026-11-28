/* Examen blanc, flashcards (répétition espacée) et tableau de bord. Dépend de App (app.js) et Stock (stock.js). */
(function () {
  'use strict';
  window.Pages = window.Pages || {};
  var A = function () { return window.App; };
  var esc = function (s) { return A().esc(s); };

  var EXAMEN_QUESTIONS = 60;
  var EXAMEN_MINUTES = 90;

  /* ================================================================== */
  /* EXAMEN BLANC                                                        */
  /* ================================================================== */
  window.Pages.examen = function (main) {
    return A().toutesLesQuestions().then(function (banque) {
      var nb = Math.min(EXAMEN_QUESTIONS, banque.length);
      var minutesBase = Math.round(EXAMEN_MINUTES * nb / EXAMEN_QUESTIONS);

      main.innerHTML = '<div class="qcm"><h1>Examen blanc</h1>' +
        '<p>Format cible : <strong>' + EXAMEN_QUESTIONS + ' questions en ' + EXAMEN_MINUTES + ' minutes</strong>, sans correction pendant l\'épreuve.</p>' +
        (banque.length < EXAMEN_QUESTIONS
          ? '<div class="alerte">La banque compte actuellement <strong>' + banque.length + ' questions</strong> (module 1). ' +
            'L\'examen est donc réduit à ' + nb + ' questions en ' + minutesBase + ' minutes, au même rythme (1 min 30 par question). ' +
            'Il passera au format complet quand les modules suivants seront publiés.</div>' : '') +
        '<form id="cfg" class="question" novalidate><fieldset><legend>Paramètres de l\'épreuve</legend>' +
        '<label class="choix"><input type="checkbox" id="majore"><span><strong>Temps majoré d\'un tiers</strong> — aménagement pour les candidats en situation de handicap</span></label>' +
        '</fieldset><p class="param-note">Le chronomètre démarre dès que vous cliquez. Vous pouvez naviguer entre les questions et marquer celles à revoir. ' +
        'À la fin du temps, la copie est remise automatiquement.</p>' +
        '<div class="qcm-actions"><button class="bouton" type="submit">Commencer l\'examen</button></div></form></div>';

      main.querySelector('#cfg').addEventListener('submit', function (e) {
        e.preventDefault();
        var majore = main.querySelector('#majore').checked;
        lancer(main, A().melanger(banque).slice(0, nb), Math.round(minutesBase * (majore ? 4 / 3 : 1) * 60), majore);
      });
    });
  };

  function lancer(main, questions, dureeS, majore) {
    var reponses = questions.map(function () { return []; });
    var aRevoir = questions.map(function () { return false; });
    var i = 0;
    var fin = Date.now() + dureeS * 1000;
    var termine = false;
    var annonces = { 600: false, 60: false };

    var avantQuitter = function (e) { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avantQuitter);
    var minuteur = setInterval(tic, 1000);
    A().surDepart(function () { clearInterval(minuteur); window.removeEventListener('beforeunload', avantQuitter); });

    main.innerHTML = '<div class="examen qcm-en-cours">' +
      '<div class="examen-barre"><strong>Examen blanc</strong><span class="chrono" role="timer" aria-label="Temps restant" id="chrono"></span>' +
      '<button type="button" class="bouton secondaire petit" id="terminer">Remettre ma copie</button></div>' +
      '<p class="sr-only" aria-live="assertive" id="annonce"></p>' +
      '<div id="confirmer" class="alerte" hidden></div>' +
      '<div class="examen-corps"><div id="zoneQ"></div>' +
      '<nav class="grille-q" aria-label="Accès direct aux questions"><p>Questions</p><div id="grille"></div>' +
      '<p class="param-note legende"><span class="pastille repondu"></span> répondue <span class="pastille revoir"></span> à revoir</p></nav></div></div>';

    var zoneQ = main.querySelector('#zoneQ');
    var grille = main.querySelector('#grille');
    var chrono = main.querySelector('#chrono');

    function format(s) {
      var m = Math.floor(s / 60), r = s % 60;
      return (m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') : m) + ' min ' + String(r).padStart(2, '0') + ' s';
    }
    function tic() {
      var reste = Math.max(0, Math.round((fin - Date.now()) / 1000));
      chrono.textContent = format(reste);
      chrono.classList.toggle('urgent', reste <= 300);
      [600, 60].forEach(function (seuil) {
        if (reste <= seuil && !annonces[seuil]) {
          annonces[seuil] = true;
          main.querySelector('#annonce').textContent = 'Attention : il reste ' + (seuil / 60) + ' minute' + (seuil > 60 ? 's' : '') + '.';
        }
      });
      if (reste === 0) remettre(true);
    }
    function dessinerGrille() {
      grille.innerHTML = questions.map(function (q, k) {
        var cls = (reponses[k].length ? ' repondu' : '') + (aRevoir[k] ? ' revoir' : '') + (k === i ? ' courant' : '');
        var etat = (reponses[k].length ? ', répondue' : ', non répondue') + (aRevoir[k] ? ', à revoir' : '');
        return '<button type="button" class="num-q' + cls + '" data-k="' + k + '" aria-label="Question ' + (k + 1) + etat + '"' + (k === i ? ' aria-current="step"' : '') + '>' + (k + 1) + '</button>';
      }).join('');
    }
    function afficher() {
      var q = questions[i];
      var multiple = q.type === 'choix multiple';
      zoneQ.innerHTML = '<form class="question" novalidate><div class="meta-q"><span class="etiquette">Question ' + (i + 1) + ' / ' + questions.length + '</span>' +
        '<span class="etiquette">' + esc(q.type) + '</span></div>' +
        '<fieldset><legend tabindex="-1">' + esc(q.enonce) + (multiple ? ' <small>(plusieurs réponses possibles)</small>' : '') + '</legend>' +
        q.choix.map(function (c) {
          var l = c.charAt(0);
          return '<label class="choix"><input type="' + (multiple ? 'checkbox' : 'radio') + '" name="r" value="' + l + '"' +
            (reponses[i].indexOf(l) >= 0 ? ' checked' : '') + '><span>' + esc(c) + '</span></label>';
        }).join('') + '</fieldset>' +
        '<label class="drapeau"><input type="checkbox" id="revoir"' + (aRevoir[i] ? ' checked' : '') + '> Marquer à revoir</label>' +
        '<div class="qcm-actions"><button type="button" class="bouton secondaire" id="prec"' + (i === 0 ? ' disabled' : '') + '>Précédente</button>' +
        '<button type="button" class="bouton" id="suiv">' + (i + 1 < questions.length ? 'Suivante' : 'Revoir la grille') + '</button></div></form>';
      var form = zoneQ.querySelector('form');
      form.addEventListener('change', function (e) {
        if (e.target.id === 'revoir') aRevoir[i] = e.target.checked;
        else reponses[i] = Array.prototype.map.call(form.querySelectorAll('input[name="r"]:checked'), function (x) { return x.value; });
        dessinerGrille();
      });
      form.querySelector('#prec').onclick = function () { aller(i - 1); };
      form.querySelector('#suiv').onclick = function () {
        if (i + 1 < questions.length) aller(i + 1);
        else grille.querySelector('button').focus();
      };
      dessinerGrille();
      form.querySelector('legend').focus();
    }
    function aller(k) { if (k >= 0 && k < questions.length) { i = k; afficher(); } }
    grille.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) aller(Number(b.dataset.k)); });

    main.querySelector('#terminer').onclick = function () {
      var vides = reponses.filter(function (r) { return !r.length; }).length;
      var marquees = aRevoir.filter(Boolean).length;
      var c = main.querySelector('#confirmer');
      c.hidden = false;
      c.innerHTML = '<p><strong>Remettre votre copie ?</strong> ' + (vides ? vides + ' question(s) sans réponse. ' : 'Toutes les questions ont une réponse. ') +
        (marquees ? marquees + ' marquée(s) à revoir.' : '') + '</p><div class="qcm-actions"><button type="button" class="bouton" id="oui">Oui, remettre</button>' +
        '<button type="button" class="bouton secondaire" id="non">Continuer l\'épreuve</button></div>';
      c.querySelector('#oui').onclick = function () { remettre(false); };
      c.querySelector('#non').onclick = function () { c.hidden = true; main.querySelector('#terminer').focus(); };
      c.querySelector('#oui').focus();
    };

    function remettre(tempsEcoule) {
      if (termine) return;
      termine = true;
      clearInterval(minuteur);
      window.removeEventListener('beforeunload', avantQuitter);
      var dureeUtilisee = Math.round(dureeS - Math.max(0, (fin - Date.now()) / 1000));
      var resultats = questions.map(function (q, k) {
        var bonnes = q.bonne_reponse.slice().sort();
        var ok = reponses[k].slice().sort().join() === bonnes.join();
        Stock.enregistrerReponse(q, ok);
        return { q: q, ok: ok, donnee: reponses[k], bonnes: bonnes };
      });
      var bons = resultats.filter(function (r) { return r.ok; }).length;
      var pct = Math.round(bons / questions.length * 100);
      Stock.ajouterHistorique({
        type: 'examen', bons: bons, total: questions.length, pct: pct, duree: dureeUtilisee, majore: majore,
        erreurs: resultats.filter(function (r) { return !r.ok; }).map(function (r) { return r.q.id; })
      });

      var parTheme = {};
      resultats.forEach(function (r) {
        var t = r.q.theme || 'Sans thème';
        parTheme[t] = parTheme[t] || { bons: 0, total: 0 };
        parTheme[t].total++;
        if (r.ok) parTheme[t].bons++;
      });
      main.innerHTML = '<div class="qcm"><h1 tabindex="-1">Résultat de l\'examen blanc</h1>' +
        (tempsEcoule ? '<p class="alerte">Temps écoulé : la copie a été remise automatiquement.</p>' : '') +
        '<p class="score">' + bons + ' / ' + questions.length + ' <small>(' + pct + ' %)</small></p>' +
        '<p class="param-note">Temps utilisé : ' + format(dureeUtilisee) + (majore ? ' (temps majoré)' : '') + '</p>' +
        '<h2>Résultats par thème</h2><div class="table-wrap"><table class="tableau"><thead><tr><th scope="col">Thème</th><th scope="col">Score</th><th scope="col">Taux</th></tr></thead><tbody>' +
        Object.keys(parTheme).map(function (t) {
          var x = parTheme[t], taux = Math.round(x.bons / x.total * 100);
          return '<tr><th scope="row">' + esc(t) + '</th><td>' + x.bons + ' / ' + x.total + '</td><td>' + taux + ' %' + (taux < 60 ? ' <span class="badge badge-verif">À retravailler</span>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="qcm-actions"><a class="bouton" href="#/tableau-de-bord">Tableau de bord</a><button type="button" class="bouton secondaire" id="refaire">Nouvel examen</button></div>' +
        '<h2>Correction détaillée</h2>' +
        resultats.map(function (r, k) {
          return '<article class="question correction-examen"><p class="meta-q"><span class="etiquette">' + (k + 1) + '</span><span class="etiquette">' + esc(r.q.id) + '</span></p>' +
            '<p><strong>' + esc(r.q.enonce) + '</strong></p><ul class="liste-choix">' + r.q.choix.map(function (c) {
              var l = c.charAt(0), cls = r.bonnes.indexOf(l) >= 0 ? 'bon' : r.donnee.indexOf(l) >= 0 ? 'faux' : '';
              return '<li class="' + cls + '">' + esc(c) + (r.donnee.indexOf(l) >= 0 ? ' <em>(votre réponse)</em>' : '') + '</li>';
            }).join('') + '</ul>' + (r.donnee.length ? '' : '<p class="param-note">Sans réponse.</p>') +
            A().correctionHtml(r.q, r.ok, r.bonnes) + '</article>';
        }).join('') + '</div>';
      main.querySelector('h1').focus();
      main.querySelector('#refaire').onclick = function () { window.Pages.examen(main); };
      if (window.Anim) { Anim.activer(main); if (pct >= 80) Anim.confettis(); }
    }

    tic();
    afficher();
  }

  /* ================================================================== */
  /* FLASHCARDS — répétition espacée (algorithme SM-2)                   */
  /* ================================================================== */
  var NOUVELLES_PAR_SEANCE = 15;

  function paquets() {
    var M = A().MODULES;
    var p = M.map(function (m, i) {
      return m.dispo ? A().charger(A().CHEMINS.flashcards(i + 1), true).then(function (c) { return { id: 'm' + (i + 1), titre: 'Module ' + (i + 1) + ' — ' + m.titre, cartes: c }; }) : null;
    }).filter(Boolean);
    p.push(A().charger(A().CHEMINS.glossaire, true).then(function (g) {
      return { id: 'glossaire', titre: 'Glossaire — termes et sigles', cartes: g.map(function (t) {
        return { id: 'G-' + A().slug(t.terme), recto: t.terme + (t.sigle && t.sigle.length < 12 ? ' (' + t.sigle + ')' : ''), verso: t.definition, reference: t.reference };
      }) };
    }));
    return Promise.all(p);
  }
  function ajouterJours(jours) {
    var d = new Date(); d.setDate(d.getDate() + jours);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  /** SM-2 : qualité 1 (à revoir), 3 (difficile), 4 (bien), 5 (facile). */
  function planifier(etat, qualite) {
    var e = etat || { ef: 2.5, intervalle: 0, reps: 0 };
    if (qualite < 3) { e.reps = 0; e.intervalle = 1; }
    else {
      e.reps++;
      e.intervalle = e.reps === 1 ? 1 : e.reps === 2 ? 6 : Math.round(e.intervalle * e.ef);
    }
    e.ef = Math.max(1.3, e.ef + (0.1 - (5 - qualite) * (0.08 + (5 - qualite) * 0.02)));
    e.ef = Math.round(e.ef * 100) / 100;
    e.echeance = ajouterJours(e.intervalle);
    return e;
  }
  function statsPaquet(paquet, etats) {
    var auj = Stock.aujourdhui();
    var dues = 0, nouvelles = 0, maitrisees = 0;
    paquet.cartes.forEach(function (c) {
      var e = etats[c.id];
      if (!e) nouvelles++;
      else {
        if (e.echeance <= auj) dues++;
        if (e.intervalle >= 21) maitrisees++;
      }
    });
    return { dues: dues, nouvelles: nouvelles, maitrisees: maitrisees, total: paquet.cartes.length };
  }
  /**
   * Boîte « type Leitner » (1 à 5) déduite de l'intervalle de répétition espacée :
   * 1 = nouvelle ou ratée (revue le lendemain), 2 = ≤ 6 j, 3 = ≤ 14 j, 4 = ≤ 30 j, 5 = au-delà (connue).
   */
  function leitner(e) {
    if (!e || e.intervalle <= 1) return 1;
    if (e.intervalle <= 6) return 2;
    if (e.intervalle <= 14) return 3;
    if (e.intervalle <= 30) return 4;
    return 5;
  }
  /** Nombre total de cartes à revoir aujourd'hui (tous paquets). */
  function cartesDues() {
    return paquets().then(function (l) {
      var etats = Stock.lire('flashcards', {});
      return l.reduce(function (s, p) { return s + statsPaquet(p, etats).dues; }, 0);
    }).catch(function () { return 0; });
  }
  window.Revision = { paquets: function () { return paquets(); }, statsPaquet: statsPaquet, leitner: leitner, cartesDues: cartesDues };

  window.Pages.flashcards = function (main) {
    return paquets().then(function (liste) {
      var etats = Stock.lire('flashcards', {});
      main.innerHTML = '<div class="qcm"><h1>Flashcards</h1>' +
        '<p>Révision par <strong>répétition espacée</strong> : une carte bien connue revient de moins en moins souvent ; une carte ratée revient le lendemain. ' +
        'Quelques minutes par jour suffisent.</p><div class="grille-modules">' +
        liste.map(function (p) {
          var s = statsPaquet(p, etats);
          var aReviser = s.dues + Math.min(s.nouvelles, NOUVELLES_PAR_SEANCE);
          return '<article class="carte"><span class="num">' + s.total + ' cartes</span><h3>' + esc(p.titre) + '</h3>' +
            '<ul><li>' + s.dues + ' à revoir aujourd\'hui</li><li>' + s.nouvelles + ' nouvelles</li><li>' + s.maitrisees + ' maîtrisées (intervalle ≥ 21 jours)</li></ul>' +
            '<div class="actions"><button type="button" class="bouton" data-paquet="' + p.id + '"' + (aReviser ? '' : ' disabled') + '>' +
            (aReviser ? 'Réviser ' + aReviser + ' carte' + (aReviser > 1 ? 's' : '') : 'À jour pour aujourd\'hui') + '</button></div></article>';
        }).join('') + '</div></div>';
      main.querySelectorAll('[data-paquet]').forEach(function (b) {
        b.onclick = function () {
          var p = liste.filter(function (x) { return x.id === b.dataset.paquet; })[0];
          seance(main, p);
        };
      });
    });
  };

  function seance(main, paquet) {
    var etats = Stock.lire('flashcards', {});
    var auj = Stock.aujourdhui();
    var dues = paquet.cartes.filter(function (c) { return etats[c.id] && etats[c.id].echeance <= auj; });
    var nouvelles = paquet.cartes.filter(function (c) { return !etats[c.id]; }).slice(0, NOUVELLES_PAR_SEANCE);
    var file = A().melanger(dues).concat(nouvelles);
    var vues = 0, reussies = 0;
    var clavier = null;

    function afficher() {
      if (!file.length) return bilan();
      var c = file[0];
      var e = etats[c.id];
      main.innerHTML = '<div class="qcm qcm-en-cours"><div class="qcm-entete"><h1 style="margin:0;font-size:22px">' + esc(paquet.titre) + '</h1>' +
        '<span class="etiquette">' + file.length + ' restante' + (file.length > 1 ? 's' : '') + '</span>' +
        '<span class="etiquette">Boîte ' + leitner(e) + ' / 5</span></div>' +
        // Carte à deux faces : recto et verso superposés, retournement 3D en CSS (désactivé si moins d'animations).
        '<div class="scene-carte"><div class="flashcard" id="carte" aria-live="polite">' +
        '<div class="face face-recto"><span class="face-libelle">Question</span><p class="recto">' + esc(c.recto) + '</p>' +
        '<p class="param-note indice">Cliquez sur la carte ou appuyez sur Espace</p></div>' +
        '<div class="face face-verso" id="verso" hidden><span class="face-libelle">Réponse</span><p class="rappel-recto">' + esc(c.recto) + '</p><hr><p>' + esc(c.verso) + '</p>' +
        (c.reference ? '<p class="param-note">' + esc(c.reference) + '</p>' : '') + '</div></div></div>' +
        '<div class="qcm-actions" id="actions"><button type="button" class="bouton" id="montrer">Afficher la réponse <kbd>Espace</kbd></button></div>' +
        '<p class="param-note">Raccourcis : Espace pour retourner, puis 1 à 4 pour noter.</p></div>';
      var montrer = main.querySelector('#montrer');
      montrer.focus();
      montrer.onclick = retourner;
      main.querySelector('#carte').onclick = function () { if (main.querySelector('#verso').hidden) retourner(); };
    }
    function retourner() {
      var carte = main.querySelector('#carte');
      main.querySelector('#verso').hidden = false;
      carte.querySelector('.face-recto').setAttribute('aria-hidden', 'true');
      void carte.offsetWidth; // la face verso est maintenant dans la mise en page : la transition 3D peut partir
      carte.classList.add('retournee');
      var notes = [[1, 'À revoir', 'demain'], [3, 'Difficile', ''], [4, 'Bien', ''], [5, 'Facile', '']];
      main.querySelector('#actions').innerHTML = notes.map(function (n, k) {
        return '<button type="button" class="bouton ' + (k === 0 ? 'secondaire' : '') + '" data-q="' + n[0] + '">' + n[1] + ' <kbd>' + (k + 1) + '</kbd></button>';
      }).join('');
      main.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { noter(Number(b.dataset.q)); }; });
      main.querySelector('[data-q="4"]').focus();
    }
    function noter(q) {
      var c = file.shift();
      etats[c.id] = planifier(etats[c.id], q);
      Stock.ecrire('flashcards', etats);
      Stock.compterJour('cartes');
      vues++;
      if (q >= 3) reussies++; else file.push(c); // une carte ratée revient en fin de séance
      afficher();
    }
    function bilan() {
      document.removeEventListener('keydown', clavier);
      Stock.ajouterHistorique({ type: 'flashcards', paquet: paquet.titre, cartes: vues, reussies: reussies });
      main.innerHTML = '<div class="qcm"><h1 tabindex="-1">Séance terminée</h1><p class="score">' + vues + ' <small>réponses</small></p>' +
        '<p>Revenez demain : les cartes sont programmées selon vos réponses.</p>' +
        '<div class="qcm-actions"><a class="bouton" href="#/tableau-de-bord">Tableau de bord</a><button type="button" class="bouton secondaire" id="retour">Autres paquets</button></div></div>';
      main.querySelector('h1').focus();
      main.querySelector('#retour').onclick = function () { window.Pages.flashcards(main); };
      if (window.Anim) Anim.activer(main);
    }
    clavier = function (e) {
      if (e.target && e.target.matches && e.target.matches('input, select, textarea')) return;
      var verso = main.querySelector('#verso');
      if (!verso) return;
      if (e.key === ' ' && verso.hidden) { e.preventDefault(); retourner(); }
      else if (!verso.hidden && ['1', '2', '3', '4'].indexOf(e.key) >= 0) { e.preventDefault(); noter([1, 3, 4, 5][Number(e.key) - 1]); }
    };
    document.addEventListener('keydown', clavier);
    A().surDepart(function () { document.removeEventListener('keydown', clavier); });
    afficher();
  }

  /* ================================================================== */
  /* TABLEAU DE BORD                                                     */
  /* ================================================================== */
  window.Pages.tableauDeBord = function (main) {
    return Promise.all([
      A().toutesLesQuestions(),
      paquets(),
      window.Pages.prochainesEcheances ? window.Pages.prochainesEcheances(4) : Promise.resolve([]),
      window.Pages.statsOral ? window.Pages.statsOral() : Promise.resolve({ total: 0, acquis: 0, revoir: 0, jamais: 0 })
    ]).then(function (r) {
      var banque = r[0], liste = r[1], echeances = r[2], oral = r[3];
      var stats = Stock.lire('reponses', {});
      var lecture = Stock.lire('lecture', {});
      var scores = Stock.lire('qcm', {});
      var historique = Stock.lire('historique', []);
      var etatsCartes = Stock.lire('flashcards', {});

      // Progression de lecture par module
      var progression = A().MODULES.map(function (m, i) {
        var n = i + 1, l = lecture[n];
        var pct = l && l.total ? Math.round(Object.keys(l.sections).length / l.total * 100) : 0;
        return '<li><div class="ligne-prog"><span>' + (m.dispo ? '<a href="#/module/' + n + '">Module ' + n + '</a>' : 'Module ' + n) +
          ' — ' + esc(m.titre) + '</span><span>' + (m.dispo ? pct + ' %' : 'en préparation') + '</span></div>' +
          '<div class="progression" role="progressbar" aria-label="Lecture du module ' + n + '" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div style="width:' + pct + '%"></div></div></li>';
      }).join('');

      // Questions et points faibles
      var ids = banque.map(function (q) { return q.id; });
      var repondues = ids.filter(function (id) { return stats[id]; });
      var vus = 0, bons = 0, themes = {};
      repondues.forEach(function (id) {
        var s = stats[id];
        vus += s.vus; bons += s.bons;
        themes[s.theme] = themes[s.theme] || { vus: 0, bons: 0 };
        themes[s.theme].vus += s.vus; themes[s.theme].bons += s.bons;
      });
      var lignesThemes = Object.keys(themes).map(function (t) {
        return { t: t, vus: themes[t].vus, taux: Math.round(themes[t].bons / themes[t].vus * 100) };
      }).sort(function (a, b) { return a.taux - b.taux; });
      var faibles = lignesThemes.filter(function (x) { return x.vus >= 3 && x.taux < 60; });

      // Flashcards
      var cartes = { dues: 0, maitrisees: 0, total: 0 };
      liste.forEach(function (p) {
        var s = statsPaquet(p, etatsCartes);
        cartes.dues += s.dues; cartes.maitrisees += s.maitrisees; cartes.total += s.total;
      });

      // Boîtes de type Leitner (toutes cartes)
      var boites = [0, 0, 0, 0, 0];
      liste.forEach(function (p) { p.cartes.forEach(function (c) { if (etatsCartes[c.id]) boites[leitner(etatsCartes[c.id]) - 1]++; }); });
      var nouvellesCartes = cartes.total - boites.reduce(function (a, b) { return a + b; }, 0);

      // Progression par module = moyenne (lecture %, questions réussies à la dernière tentative %), puis par bloc.
      var parModule = A().MODULES.map(function (m, i) {
        var n = i + 1, l = lecture[n];
        if (!m.dispo) return { n: n, bloc: m.bloc, dispo: false, pct: 0 };
        var lu = l && l.total ? Object.keys(l.sections).length / l.total : 0;
        var qs = banque.filter(function (q) { return q.module === n; });
        var maitrise = qs.length ? qs.filter(function (q) { return stats[q.id] && stats[q.id].dernier === true; }).length / qs.length : 0;
        return { n: n, bloc: m.bloc, dispo: true, pct: Math.round((lu + maitrise) / 2 * 100) };
      });
      var moyenne = function (l) { return l.length ? Math.round(l.reduce(function (s, x) { return s + x.pct; }, 0) / l.length) : null; };
      var dispo = parModule.filter(function (x) { return x.dispo; });
      var global = moyenne(dispo);
      var blocs = [['BC01', 'Bulletin, brut, cotisations, net', 'bc1'], ['BC02', 'Événements de la vie professionnelle', 'bc2']].map(function (b) {
        var mods = parModule.filter(function (x) { return x.bloc === b[0]; });
        var pub = mods.filter(function (x) { return x.dispo; });
        return { code: b[0], titre: b[1], cls: b[2], pct: moyenne(pub), publies: pub.length, total: mods.length };
      });

      // Série, temps, objectif, badges
      var serie = Suivi.serie(), meilleure = Suivi.meilleureSerie();
      var avancement = Suivi.avancementJour();
      var obj = avancement.objectif;
      var lus = A().MODULES.filter(function (m, i) { var l = lecture[i + 1]; return m.dispo && l && l.total && Object.keys(l.sections).length >= l.total; }).length;
      var meilleurExamen = historique.filter(function (h) { return h.type === 'examen'; }).reduce(function (m, h) { return Math.max(m, h.pct); }, 0);
      var listeBadges = Suivi.badges({
        questions: Object.keys(stats).reduce(function (s, k) { return s + stats[k].vus; }, 0),
        serieMax: Math.max(serie, meilleure), modulesLus: lus, meilleurExamen: meilleurExamen,
        cartesMaitrisees: cartes.maitrisees, oralAcquis: oral.acquis, joursObjectif: Suivi.joursObjectifAtteint(), secondes: Suivi.tempsTotal()
      });
      var obtenus = listeBadges.filter(function (b) { return b.obtenu; }).length;

      // Compte à rebours et programme du jour
      var jr = Suivi.joursRestants();
      var plan = Suivi.construirePlanning(stats, lecture);
      var jourPlan = plan.jours[0];
      var fait = Suivi.planningFait()[Stock.aujourdhui()] || {};
      var rappel = Suivi.rappel();
      var connecte = window.Compte && Compte.etat().utilisateur;

      var examens = historique.filter(function (h) { return h.type === 'examen'; }).slice(0, 5);
      var date = function (iso) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };
      var libelleHisto = function (h) {
        if (h.type === 'qcm') return 'QCM module ' + h.module + ' : ' + h.bons + ' / ' + h.total + ' (' + h.pct + ' %)';
        if (h.type === 'examen') return 'Examen blanc : ' + h.bons + ' / ' + h.total + ' (' + h.pct + ' %)';
        if (h.type === 'flashcards') return 'Flashcards — ' + h.paquet + ' : ' + h.cartes + ' réponses';
        if (h.type === 'oral') return 'Oral : ' + h.acquis + ' acquise(s) sur ' + h.questions + ' question(s)';
        return h.type;
      };
      var vide = !historique.length;
      var jauge = function (pct, cls, libelle) {
        return '<div class="jauge ' + (cls || '') + '" role="progressbar" aria-label="' + esc(libelle) + '" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>';
      };
      var ligneObjectif = function (lib, v, o, unite) {
        var pct = o ? Math.min(100, Math.round(v / o * 100)) : 0;
        return '<li><div class="ligne-prog"><span>' + lib + '</span><span>' + v + ' / ' + o + ' ' + unite + '</span></div>' + jauge(pct, pct >= 100 ? 'ok' : '', lib) + '</li>';
      };

      main.innerHTML = '<h1>' + Icone('graphique', 'ico-titre') + ' Tableau de bord</h1>' +
        '<p class="intro">' + (connecte
          ? 'Votre progression est <strong>synchronisée avec votre compte</strong> et reste disponible hors connexion.'
          : 'Votre progression est enregistrée <strong>dans ce navigateur</strong>. Pour la retrouver sur un autre appareil, ' +
            (window.Compte && Compte.configure ? '<a href="#/compte">connectez-vous</a> ou ' : '') + 'exportez-la puis importez-la.') + '</p>' +
        (vide ? '<div class="alerte">Aucune activité pour l\'instant. Commencez par le <a href="#/module/1">cours du module 1</a> ou un <a href="#/qcm/1">QCM</a>.</div>' : '') +

        // Compte à rebours + programme du jour
        '<section class="bandeau-jour">' +
        '<div class="rebours"><span class="rebours-n" data-compteur>' + (jr > 0 ? jr : 0) + '</span><span class="rebours-l">' +
        (jr > 0 ? 'jour' + (jr > 1 ? 's' : '') + ' avant l\'épreuve' : jr === 0 ? 'C\'est le jour J' : 'Épreuve passée') + '</span>' +
        '<span class="rebours-d">' + esc(Suivi.dateExamen().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + '</span></div>' +
        '<div class="jour-contenu"><h2>' + Icone('cloche') + ' À réviser aujourd\'hui</h2>' +
        (jourPlan ? '<ul class="a-faire">' + jourPlan.items.map(function (it) {
          return '<li class="' + (fait[it.cle] ? 'fait' : '') + '"><span>' + (fait[it.cle] ? Icone('coche') : '') + esc(it.titre) + (fait[it.cle] ? '<span class="sr-only"> (fait)</span>' : '') + '</span>' +
            '<span class="liens">' + (it.liens || []).map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + '</a>'; }).join(' · ') + '</span></li>';
        }).join('') + (cartes.dues ? '<li><span>' + cartes.dues + ' flashcard(s) à revoir</span><span class="liens"><a href="#/flashcards">Réviser</a></span></li>' : '') + '</ul>'
          : '<p>Plus de jour de révision avant l\'épreuve. Bon courage !</p>') +
        '<div class="ligne-prog"><span>Objectif du jour</span><span>' + avancement.pct + ' %</span></div>' + jauge(avancement.pct, avancement.atteint ? 'ok' : '', 'Objectif du jour') +
        '<div class="qcm-actions"><a class="bouton petit" href="#/planning">' + Icone('planning') + ' Planning complet</a></div></div></section>' +

        '<div class="chiffres">' +
        '<div class="chiffre"><b>' + (global === null ? '—' : global + ' %') + '</b><span>Progression globale (modules publiés)</span></div>' +
        '<div class="chiffre chiffre-serie"><b>' + serie + ' j</b><span>' + Icone('flamme') + ' Série en cours (record ' + Math.max(serie, meilleure) + ' j)</span></div>' +
        '<div class="chiffre"><b>' + Suivi.duree(Suivi.tempsSemaine()) + '</b><span>Étude sur 7 jours (total ' + Suivi.duree(Suivi.tempsTotal()) + ')</span></div>' +
        '<div class="chiffre"><b>' + repondues.length + ' / ' + ids.length + '</b><span>Questions déjà travaillées</span></div>' +
        '<div class="chiffre"><b>' + (vus ? Math.round(bons / vus * 100) + ' %' : '—') + '</b><span>Taux de réussite global</span></div>' +
        '<div class="chiffre"><b>' + (scores[1] ? scores[1].meilleur + ' %' : '—') + '</b><span>Meilleur score QCM module 1</span></div>' +
        '<div class="chiffre"><b>' + cartes.dues + '</b><span>Flashcards à revoir aujourd\'hui</span></div>' +
        '</div>' +

        '<div class="tdb">' +
        '<section class="bloc bloc-large" id="tdbCourbe"><h2>Évolution des scores</h2>' + Suivi.graphiqueScores(historique) + '</section>' +
        '<section class="bloc" id="tdbBlocs"><h2>Progression par bloc</h2><ul class="liste-prog">' +
        blocs.map(function (b) {
          return '<li><div class="ligne-prog"><span><span class="pastille-bloc ' + b.cls + '">' + b.code + '</span> ' + esc(b.titre) + '</span><span>' +
            (b.pct === null ? 'en préparation' : b.pct + ' %') + '</span></div>' + jauge(b.pct || 0, b.cls, 'Progression ' + b.code) +
            '<p class="param-note">' + b.publies + ' module(s) publié(s) sur ' + b.total + '</p></li>';
        }).join('') + '</ul><p class="param-note">Progression d\'un module = moyenne entre la part du cours lue et la part de ses questions réussies à la dernière tentative.</p></section>' +
        '<section class="bloc"><h2>Progression de lecture</h2><ul class="liste-prog">' + progression + '</ul></section>' +
        '<section class="bloc"><h2>Points faibles</h2>' +
        (lignesThemes.length
          ? (faibles.length ? '<p>À retravailler en priorité : <strong>' + faibles.map(function (x) { return esc(x.t); }).join(', ') + '</strong>.</p>'
                            : '<p>Aucun thème sous 60 % de réussite (minimum 3 réponses par thème).</p>') +
            '<div class="table-wrap"><table class="tableau"><thead><tr><th scope="col">Thème</th><th scope="col">Réponses</th><th scope="col">Réussite</th></tr></thead><tbody>' +
            lignesThemes.map(function (x) {
              return '<tr><th scope="row">' + esc(x.t) + '</th><td>' + x.vus + '</td><td>' + x.taux + ' %' + (x.vus >= 3 && x.taux < 60 ? ' <span class="badge badge-verif">Faible</span>' : '') + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="qcm-actions"><a class="bouton petit" href="#/qcm/1">S\'entraîner</a></div>'
          : '<p class="param-note">Répondez à quelques questions pour voir apparaître vos points faibles.</p>') +
        '</section>' +
        '<section class="bloc"><h2>Examens blancs</h2>' + (examens.length
          ? '<ul class="liste-simple">' + examens.map(function (h) { return '<li><span>' + date(h.date) + '</span><b>' + h.bons + ' / ' + h.total + ' (' + h.pct + ' %)</b></li>'; }).join('') + '</ul>'
          : '<p class="param-note">Aucun examen passé.</p>') + '<div class="qcm-actions"><a class="bouton petit" href="#/examen">Passer un examen blanc</a></div></section>' +
        '<section class="bloc"><h2>Flashcards</h2><p>' + cartes.maitrisees + ' cartes maîtrisées sur ' + cartes.total + '.</p>' +
        '<p class="param-note">Classement par boîtes (type Leitner) : une carte monte d\'une boîte quand vous la connaissez et redescend en boîte 1 si vous la ratez.</p>' +
        '<ul class="boites" aria-label="Répartition des cartes par boîte">' +
        '<li><b>' + nouvellesCartes + '</b><span>Nouvelles</span></li>' +
        boites.map(function (n, k) { return '<li class="boite-' + (k + 1) + '"><b>' + n + '</b><span>Boîte ' + (k + 1) + (k === 0 ? ' (à revoir)' : k === 4 ? ' (connues)' : '') + '</span></li>'; }).join('') + '</ul>' +
        '<div class="qcm-actions"><a class="bouton petit" href="#/flashcards">Réviser</a></div></section>' +
        '<section class="bloc"><h2>Prochaines échéances</h2>' + (echeances.length
          ? '<ul class="liste-simple">' + echeances.map(function (e) { return '<li><span>' + esc(e.dateLisible) + '</span><b>' + esc(e.libelleCourt || e.libelle) + '</b></li>'; }).join('') + '</ul>'
          : '<p class="param-note">Aucune échéance à venir dans le calendrier 2026.</p>') +
        '<div class="qcm-actions"><a class="bouton petit secondaire" href="#/calendrier">Calendrier complet</a></div></section>' +
        '<section class="bloc"><h2>Activité récente</h2>' + (historique.length
          ? '<ul class="liste-simple">' + historique.slice(0, 8).map(function (h) { return '<li><span>' + date(h.date) + '</span><b>' + esc(libelleHisto(h)) + '</b></li>'; }).join('') + '</ul>'
          : '<p class="param-note">Rien pour l\'instant.</p>') + '</section>' +
        '<section class="bloc" id="tdbOral"><h2>' + Icone('micro') + ' Entraînement oral</h2>' +
        (oral.total ? '<ul class="liste-simple"><li><span>Acquises</span><b>' + oral.acquis + ' / ' + oral.total + '</b></li>' +
          '<li><span>À revoir</span><b>' + oral.revoir + '</b></li><li><span>Jamais tirées</span><b>' + oral.jamais + '</b></li></ul>' +
          jauge(Math.round(oral.acquis / oral.total * 100), 'bc2', 'Questions d\'oral acquises')
          : '<p class="param-note">Aucune question d\'oral chargée.</p>') +
        '<div class="qcm-actions"><a class="bouton petit" href="#/oral">S\'entraîner à l\'oral</a></div></section>' +
        '<section class="bloc" id="tdbObjectif"><h2>' + Icone('cible') + ' Objectif quotidien</h2><ul class="liste-prog">' +
        ligneObjectif('Temps d\'étude', avancement.fait.minutes, obj.minutes, 'min') +
        ligneObjectif('Questions', avancement.fait.questions, obj.questions, '') +
        ligneObjectif('Flashcards', avancement.fait.cartes, obj.cartes, '') + '</ul>' +
        '<details><summary>Modifier mon objectif</summary><form id="formObjectif" class="form-grille" novalidate>' +
        '<div class="champ"><label for="oMin">Minutes par jour</label><input type="text" inputmode="numeric" id="oMin" value="' + obj.minutes + '"></div>' +
        '<div class="champ"><label for="oQ">Questions par jour</label><input type="text" inputmode="numeric" id="oQ" value="' + obj.questions + '"></div>' +
        '<div class="champ"><label for="oC">Flashcards par jour</label><input type="text" inputmode="numeric" id="oC" value="' + obj.cartes + '"></div>' +
        '<div class="champ champ-check"><button class="bouton petit" type="submit">Enregistrer</button></div></form></details></section>' +
        '<section class="bloc bloc-large" id="tdbBadges"><h2>' + Icone('badge') + ' Badges <small class="param-note">' + obtenus + ' / ' + listeBadges.length + '</small></h2>' +
        '<ul class="badges">' + listeBadges.map(function (b) {
          return '<li class="badge-carte' + (b.obtenu ? ' obtenu' : '') + '"><span class="badge-ico">' + Icone(b.icone) + '</span><b>' + esc(b.titre) + '</b>' +
            '<span class="param-note">' + esc(b.desc) + '</span>' + (b.obtenu ? '<span class="sr-only">Obtenu</span>' : jauge(b.pct, '', 'Avancement du badge ' + b.titre)) + '</li>';
        }).join('') + '</ul></section>' +
        '<section class="bloc" id="tdbRappel"><h2>' + Icone('cloche') + ' Rappel quotidien</h2>' +
        '<p class="param-note">Le site étant statique, deux solutions complémentaires : une notification à la première ouverture du jour, ' +
        'et un rappel récurrent dans votre agenda (téléphone ou ordinateur) jusqu\'à la veille de l\'épreuve.</p>' +
        '<div class="form-grille"><div class="champ champ-check"><label><input type="checkbox" id="rActif"' + (rappel.actif ? ' checked' : '') + '> Notification du navigateur</label></div>' +
        '<div class="champ"><label for="rHeure">Heure du rappel agenda</label><input type="time" id="rHeure" value="' + esc(rappel.heure || '19:00') + '"></div>' +
        '<div class="champ champ-check"><button type="button" class="bouton petit secondaire" id="rAgenda">' + Icone('calendrier') + ' Ajouter à mon agenda (.ics)</button></div></div>' +
        '<div id="msgRappel" aria-live="polite"></div></section>' +
        '</div>' +
        '<section class="bloc donnees"><h2>Mes données</h2>' +
        '<div class="qcm-actions"><button type="button" class="bouton secondaire petit" id="exporter">Exporter ma progression</button>' +
        '<label class="bouton secondaire petit" for="importer">Importer une progression</label><input type="file" id="importer" accept="application/json,.json" class="sr-only">' +
        '<button type="button" class="bouton secondaire petit" id="effacer">Effacer ma progression</button></div>' +
        '<div id="msgDonnees" aria-live="polite"></div></section>';

      var msg = main.querySelector('#msgDonnees');
      main.querySelector('#exporter').onclick = function () {
        var blob = new Blob([JSON.stringify(Stock.exporter(), null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'progression-paie-' + Stock.aujourdhui() + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        msg.innerHTML = '<p class="param-note">Fichier exporté.</p>';
      };
      main.querySelector('#importer').onchange = function (e) {
        var f = e.target.files[0]; if (!f) return;
        f.text().then(function (t) {
          Stock.importer(JSON.parse(t));
          window.Pages.tableauDeBord(main);
        }).catch(function (err) { msg.innerHTML = '<p class="resultat resultat-erreur">' + esc(err.message) + '</p>'; });
      };
      main.querySelector('#effacer').onclick = function () {
        msg.innerHTML = '<div class="alerte"><p><strong>Effacer toute votre progression ?</strong> Scores, historique, flashcards et lecture seront supprimés de ce navigateur.</p>' +
          '<div class="qcm-actions"><button type="button" class="bouton" id="confOui">Oui, tout effacer</button><button type="button" class="bouton secondaire" id="confNon">Annuler</button></div></div>';
        msg.querySelector('#confOui').onclick = function () { Stock.reinitialiser(); window.Pages.tableauDeBord(main); };
        msg.querySelector('#confNon').onclick = function () { msg.innerHTML = ''; };
        msg.querySelector('#confNon').focus();
      };

      // Objectif quotidien
      main.querySelector('#formObjectif').onsubmit = function (e) {
        e.preventDefault();
        var v = function (id) { var n = parseInt(main.querySelector(id).value, 10); return isFinite(n) && n >= 0 ? Math.min(n, 1000) : 0; };
        Stock.ecrire('objectif', { minutes: v('#oMin'), questions: v('#oQ'), cartes: v('#oC') });
        window.Pages.tableauDeBord(main).then(function () { var s = main.querySelector('#tdbObjectif'); if (s) A().allerA('tdbObjectif'); });
      };
      // Rappel quotidien
      var msgR = main.querySelector('#msgRappel');
      var majRappel = function (modif) { var r2 = Suivi.rappel(); Object.assign(r2, modif); Stock.ecrire('rappel', r2); };
      main.querySelector('#rActif').onchange = function (e) {
        var coche = e.target.checked;
        if (!coche) { majRappel({ actif: false }); msgR.innerHTML = '<p class="param-note">Notification désactivée.</p>'; return; }
        if (!('Notification' in window)) {
          e.target.checked = false;
          msgR.innerHTML = '<p class="resultat resultat-erreur">Ce navigateur ne gère pas les notifications : utilisez le rappel agenda.</p>'; return;
        }
        Notification.requestPermission().then(function (p) {
          if (p === 'granted') {
            majRappel({ actif: true, dernier: null });
            msgR.innerHTML = '<p class="param-note">Notification activée : elle s\'affichera à votre première visite de chaque journée.</p>';
            Suivi.notifierSiBesoin();
          } else {
            e.target.checked = false; majRappel({ actif: false });
            msgR.innerHTML = '<p class="resultat resultat-erreur">Autorisation refusée par le navigateur. Utilisez le rappel agenda.</p>';
          }
        });
      };
      main.querySelector('#rHeure').onchange = function (e) { majRappel({ heure: e.target.value || '19:00' }); };
      main.querySelector('#rAgenda').onclick = function () {
        var heure = main.querySelector('#rHeure').value || '19:00';
        majRappel({ heure: heure });
        var blob = new Blob([Suivi.fichierAgenda(heure)], { type: 'text/calendar;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'rappel-revision-paie.ics';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        msgR.innerHTML = '<p class="param-note">Fichier téléchargé : ouvrez-le pour ajouter le rappel quotidien (' + esc(heure) + ') à votre agenda.</p>';
      };
      Suivi.brancherGraphique(main);
    });
  };
})();
