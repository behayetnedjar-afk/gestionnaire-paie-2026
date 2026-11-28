/* Entraînement à l'entretien technique (oral).
 * Données : packages/contenu/oral.json — tableau de { id, bloc, theme, question, reponse_attendue, points_cles[], piege }.
 * Suivi : Stock « oral » = { id: { vus, acquis, dernier: 'acquis' | 'a_revoir', date, points } }. */
(function () {
  'use strict';
  window.Pages = window.Pages || {};
  var A = function () { return window.App; };
  var esc = function (s) { return A().esc(s); };

  function chargerOral() {
    return A().charger(A().CHEMINS.oral, true).then(function (d) {
      var liste = Array.isArray(d) ? d : (d && d.questions) || [];
      return liste.filter(function (q) { return q && q.id && q.question; });
    });
  }

  window.Pages.oral = function (main) {
    return chargerOral().then(function (banque) {
      var suivi = Stock.lire('oral', {});
      var cfg = Stock.lire('oral-config', { bloc: 'tous', theme: 'tous', minutes: 30 });
      var exemples = banque.some(function (q) { return q.exemple; });
      var acquises = banque.filter(function (q) { return suivi[q.id] && suivi[q.id].dernier === 'acquis'; }).length;
      var aRevoir = banque.filter(function (q) { return suivi[q.id] && suivi[q.id].dernier === 'a_revoir'; });

      function themes(bloc) {
        return banque.filter(function (q) { return bloc === 'tous' || q.bloc === bloc; })
          .map(function (q) { return q.theme; }).filter(function (t, i, a) { return t && a.indexOf(t) === i; }).sort();
      }

      main.innerHTML = '<div class="qcm"><h1>🎤 Entraînement oral</h1>' +
        '<p>Simulez l\'<strong>entretien technique</strong> (30 min) ou l\'<strong>entretien final</strong> (20 min) : une question tirée au sort, ' +
        'vous répondez à voix haute comme devant le jury, puis vous comparez avec la réponse-modèle et vous vous évaluez.</p>' +
        (exemples ? '<div class="alerte">Banque d\'exemples : remplacez <code>packages/contenu/oral.json</code> par votre propre fichier (même structure).</div>' : '') +
        '<div class="chiffres">' +
        '<div class="chiffre"><b>' + banque.length + '</b><span>Questions disponibles</span></div>' +
        '<div class="chiffre"><b>' + acquises + '</b><span>Acquises</span></div>' +
        '<div class="chiffre"><b>' + aRevoir.length + '</b><span>À revoir</span></div></div>' +
        '<form id="cfgOral" class="question" novalidate><fieldset><legend>Préparer la session</legend><div class="form-grille">' +
        '<div class="champ"><label for="oBloc">Bloc de compétences</label><select id="oBloc">' +
        '<option value="tous">Tous les blocs</option>' +
        Object.keys(A().BLOCS).map(function (k) { return '<option value="' + k + '">' + k + ' — ' + esc(A().BLOCS[k].titre) + '</option>'; }).join('') + '</select></div>' +
        '<div class="champ"><label for="oTheme">Thème</label><select id="oTheme"></select></div>' +
        '<div class="champ"><label for="oDuree">Durée</label><select id="oDuree">' +
        '<option value="30">30 minutes — entretien technique</option><option value="20">20 minutes — entretien final</option>' +
        '<option value="10">10 minutes — séance courte</option><option value="0">Sans chronomètre</option></select></div>' +
        '</div></fieldset><p class="param-note" id="oInfo" aria-live="polite"></p>' +
        '<div class="qcm-actions"><button class="bouton" type="submit">Commencer la session</button>' +
        (aRevoir.length ? '<button class="bouton secondaire" type="button" id="oRevoir">Revoir mes ' + aRevoir.length + ' question(s) à revoir</button>' : '') +
        '</div></form></div>';

      var selBloc = main.querySelector('#oBloc'), selTheme = main.querySelector('#oTheme'), selDuree = main.querySelector('#oDuree');
      function remplirThemes() {
        var t = themes(selBloc.value);
        selTheme.innerHTML = '<option value="tous">Tous les thèmes</option>' + t.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join('');
        if (t.indexOf(cfg.theme) >= 0) selTheme.value = cfg.theme;
      }
      selBloc.value = cfg.bloc; remplirThemes(); selDuree.value = String(cfg.minutes);
      selBloc.onchange = remplirThemes;
      main.querySelector('#cfgOral').addEventListener('submit', function (e) {
        e.preventDefault();
        cfg = { bloc: selBloc.value, theme: selTheme.value, minutes: Number(selDuree.value) };
        Stock.ecrire('oral-config', cfg);
        var pool = banque.filter(function (q) {
          return (cfg.bloc === 'tous' || q.bloc === cfg.bloc) && (cfg.theme === 'tous' || q.theme === cfg.theme);
        });
        if (!pool.length) { main.querySelector('#oInfo').textContent = 'Aucune question pour cette sélection.'; return; }
        session(main, pool, cfg.minutes);
      });
      var br = main.querySelector('#oRevoir');
      if (br) br.onclick = function () { session(main, aRevoir, Number(selDuree.value)); };
    });
  };

  /** Tirage pondéré : jamais vue ou « à revoir » = poids 3, acquise = poids 1. */
  function tirer(pool, dejaTirees, suivi) {
    var restantes = pool.filter(function (q) { return dejaTirees.indexOf(q.id) < 0; });
    if (!restantes.length) return null;
    var poids = restantes.map(function (q) { var s = suivi[q.id]; return !s || s.dernier === 'a_revoir' ? 3 : 1; });
    var total = poids.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * total;
    for (var i = 0; i < restantes.length; i++) { r -= poids[i]; if (r < 0) return restantes[i]; }
    return restantes[restantes.length - 1];
  }

  function session(main, pool, minutes) {
    var suivi = Stock.lire('oral', {});
    var tirees = [], bilan = [];
    var debut = Date.now(), fin = minutes ? debut + minutes * 60000 : null;
    var minuteur = null, finAnnoncee = false;

    main.innerHTML = '<div class="qcm"><div class="examen-barre"><strong>' + Icone('micro') + ' Oral' + (minutes ? ' — ' + minutes + ' min' : '') + '</strong>' +
      (fin ? '<span class="chrono" role="timer" aria-label="Temps restant" id="oChrono"></span>' : '') +
      '<button type="button" class="bouton secondaire petit" id="oFin">Terminer la session</button></div>' +
      '<p class="sr-only" aria-live="assertive" id="oAnnonce"></p><div id="oTemps" hidden class="alerte"></div><div id="oZone"></div></div>';
    var zone = main.querySelector('#oZone');

    function format(s) { return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'; }
    function tic() {
      if (!fin) return;
      var reste = Math.max(0, Math.round((fin - Date.now()) / 1000));
      var c = main.querySelector('#oChrono');
      if (!c) return;
      c.textContent = format(reste);
      c.classList.toggle('urgent', reste <= 60);
      if (reste === 0 && !finAnnoncee) {
        finAnnoncee = true;
        clearInterval(minuteur);
        main.querySelector('#oAnnonce').textContent = 'Temps écoulé.';
        var t = main.querySelector('#oTemps');
        t.hidden = false;
        t.innerHTML = '<strong>Temps écoulé.</strong> Terminez votre phrase, évaluez la question en cours puis consultez le bilan.';
      }
    }
    if (fin) { minuteur = setInterval(tic, 1000); tic(); }
    A().surDepart(function () { clearInterval(minuteur); });

    function suivante() {
      if (finAnnoncee && bilan.length) return terminer();
      var q = tirer(pool, tirees, suivi);
      if (!q) return terminer();
      tirees.push(q.id);
      zone.innerHTML = '<article class="question carte-oral ' + (q.bloc === 'BC02' ? 'bc2' : 'bc1') + '">' +
        '<div class="meta-q"><span class="pastille-bloc ' + (q.bloc === 'BC02' ? 'bc2' : 'bc1') + '">' + esc(q.bloc || '') + '</span>' +
        '<span class="etiquette">' + esc(q.theme || '') + '</span><span class="etiquette">Question ' + tirees.length + '</span></div>' +
        '<h2 class="question-oral" tabindex="-1">' + esc(q.question) + '</h2>' +
        '<p class="param-note">Répondez à voix haute : définissez, donnez la règle et sa source, illustrez par un exemple chiffré si possible.</p>' +
        '<div class="qcm-actions"><button type="button" class="bouton" id="oReveler">Révéler la réponse-modèle</button></div>' +
        '<div id="oReponse" hidden></div></article>';
      zone.querySelector('h2').focus();
      zone.querySelector('#oReveler').onclick = function () { reveler(q); };
    }
    function reveler(q) {
      var r = zone.querySelector('#oReponse');
      r.hidden = false;
      r.innerHTML = '<div class="reponse-modele"><h3>Réponse attendue</h3><p>' + esc(q.reponse_attendue) + '</p>' +
        (q.points_cles && q.points_cles.length ? '<fieldset class="points-cles"><legend>Points clés — cochez ceux que vous avez cités</legend>' +
          q.points_cles.map(function (p, k) { return '<label class="choix"><input type="checkbox" value="' + k + '"><span>' + esc(p) + '</span></label>'; }).join('') + '</fieldset>' : '') +
        (q.piege ? '<p class="piege-oral"><strong>Piège :</strong> ' + esc(q.piege) + '</p>' : '') + '</div>' +
        '<div class="qcm-actions"><button type="button" class="bouton ok" id="oAcquis">' + Icone('coche') + ' Acquis</button>' +
        '<button type="button" class="bouton secondaire" id="oRevoirQ">À revoir</button></div>';
      zone.querySelector('#oReveler').remove();
      r.querySelector('h3').setAttribute('tabindex', '-1');
      r.querySelector('h3').focus();
      r.querySelector('#oAcquis').onclick = function () { evaluer(q, true); };
      r.querySelector('#oRevoirQ').onclick = function () { evaluer(q, false); };
    }
    function evaluer(q, acquis) {
      var total = (q.points_cles || []).length;
      var cites = zone.querySelectorAll('.points-cles input:checked').length;
      var s = suivi[q.id] || { vus: 0, acquis: 0 };
      s.vus++; if (acquis) s.acquis++;
      s.dernier = acquis ? 'acquis' : 'a_revoir';
      s.date = Date.now();
      s.points = total ? Math.round(cites / total * 100) : null;
      suivi[q.id] = s;
      Stock.ecrire('oral', suivi);
      Stock.compterJour('oral');
      bilan.push({ q: q, acquis: acquis, cites: cites, total: total });
      if (acquis && window.Jeu) Jeu.gagner('oral');
      suivante();
    }
    function terminer() {
      clearInterval(minuteur);
      var acquis = bilan.filter(function (b) { return b.acquis; }).length;
      var dureeS = Math.round((Date.now() - debut) / 1000);
      if (bilan.length) Stock.ajouterHistorique({ type: 'oral', questions: bilan.length, acquis: acquis, duree: dureeS });
      var pts = bilan.filter(function (b) { return b.total; });
      var pctPoints = pts.length ? Math.round(pts.reduce(function (s, b) { return s + b.cites / b.total; }, 0) / pts.length * 100) : null;
      main.innerHTML = '<div class="qcm"><h1 tabindex="-1">Bilan de l\'oral</h1>' +
        '<div class="chiffres"><div class="chiffre"><b>' + bilan.length + '</b><span>Questions traitées</span></div>' +
        '<div class="chiffre"><b>' + acquis + '</b><span>Acquises</span></div>' +
        '<div class="chiffre"><b>' + (pctPoints === null ? '—' : pctPoints + ' %') + '</b><span>Points clés cités</span></div>' +
        '<div class="chiffre"><b>' + format(dureeS) + '</b><span>Durée</span></div></div>' +
        (bilan.length ? '<ul class="liste-simple">' + bilan.map(function (b) {
          return '<li><span>' + esc(b.q.theme || '') + '</span><b>' + esc(b.q.question) + ' — ' + (b.acquis ? 'acquis' : 'à revoir') + '</b></li>';
        }).join('') + '</ul>' : '<p>Aucune question évaluée.</p>') +
        '<div class="qcm-actions"><button type="button" class="bouton" id="oNouvelle">Nouvelle session</button>' +
        '<a class="bouton secondaire" href="#/tableau-de-bord">Tableau de bord</a></div></div>';
      main.querySelector('h1').focus();
      main.querySelector('#oNouvelle').onclick = function () { window.Pages.oral(main); };
      if (bilan.length >= 3 && acquis === bilan.length && window.Anim) Anim.confettis();
      if (window.Anim) Anim.activer(main);
    }
    main.querySelector('#oFin').onclick = terminer;
    suivante();
  }

  /** Statistiques pour le tableau de bord. */
  window.Pages.statsOral = function () {
    return chargerOral().catch(function () { return []; }).then(function (banque) {
      var s = Stock.lire('oral', {});
      var acquis = 0, revoir = 0;
      banque.forEach(function (q) { if (s[q.id]) { if (s[q.id].dernier === 'acquis') acquis++; else revoir++; } });
      return { total: banque.length, acquis: acquis, revoir: revoir, jamais: banque.length - acquis - revoir };
    });
  };
})();
