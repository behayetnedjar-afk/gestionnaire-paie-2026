/* Suivi de l'apprenant : temps d'étude, série de jours, objectif quotidien, badges,
 * compte à rebours jusqu'à l'épreuve, planning de révision automatique, rappel quotidien
 * et graphique d'évolution des scores. Dépend de CONFIG (config.js) et Stock (stock.js) ;
 * App et Revision sont utilisés plus tard, au moment des appels. */
(function () {
  'use strict';
  var CFG = window.CONFIG || {};
  var JOUR_MS = 864e5;

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function minuit(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dateExamen() { return new Date((CFG.dateExamen || '2027-01-27') + 'T00:00:00'); }
  /** Nombre de jours entre aujourd'hui et l'épreuve (0 = c'est aujourd'hui). */
  function joursRestants() { return Math.round((dateExamen() - minuit(new Date())) / JOUR_MS); }
  /** Instant de l'épreuve pour le compte à rebours détaillé (heure de convocation réglable dans config.js). */
  function instantExamen() { return new Date((CFG.dateExamen || '2027-01-27') + 'T' + (CFG.heureExamen || '00:00') + ':00'); }
  /** Temps restant découpé en jours, heures, minutes, secondes. */
  function decompte() {
    var s = Math.max(0, Math.floor((instantExamen() - new Date()) / 1000));
    return { j: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60, fini: s === 0 };
  }
  function esc(s) { return window.App ? App.esc(s) : String(s); }

  /* ------------------------------------------------------------------ */
  /* Temps d'étude : compté par tranches de 15 s quand l'onglet est      */
  /* visible et que l'apprenant a interagi dans les 2 dernières minutes. */
  /* ------------------------------------------------------------------ */
  var derniereActivite = Date.now();
  var enAttente = 0;
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { derniereActivite = Date.now(); }, { passive: true });
  });
  function vider() { if (enAttente) { Stock.compterJour('secondes', enAttente); enAttente = 0; } }
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - derniereActivite < 120000) {
      enAttente += 15;
      if (enAttente >= 60) vider();
    }
  }, 15000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') vider(); });
  window.addEventListener('pagehide', vider);

  /* ------------------------------------------------------------------ */
  /* Jours actifs, série, objectif quotidien                             */
  /* ------------------------------------------------------------------ */
  function journal() { return Stock.lire('jours', {}); }
  function jourActif(j) {
    return !!j && ((j.secondes || 0) >= 300 || (j.questions || 0) > 0 || (j.cartes || 0) > 0 || (j.oral || 0) > 0 || (j.sections || 0) > 0);
  }
  /** Série en cours : jours consécutifs actifs, jusqu'à aujourd'hui (ou hier si rien encore aujourd'hui). */
  function serie() {
    var j = journal(), d = minuit(new Date()), n = 0;
    if (!jourActif(j[iso(d)])) d = new Date(d - JOUR_MS);
    while (jourActif(j[iso(d)])) { n++; d = new Date(d - JOUR_MS); }
    return n;
  }
  function meilleureSerie() {
    var dates = Object.keys(journal()).filter(function (k) { return jourActif(journal()[k]); }).sort();
    var max = 0, cur = 0, prec = null;
    dates.forEach(function (k) {
      var t = new Date(k + 'T00:00:00').getTime();
      cur = prec !== null && Math.round((t - prec) / JOUR_MS) === 1 ? cur + 1 : 1;
      max = Math.max(max, cur); prec = t;
    });
    return max;
  }
  function objectif() {
    var o = Stock.lire('objectif', null) || CFG.objectifParDefaut || { minutes: 45, questions: 20, cartes: 20 };
    return { minutes: +o.minutes || 0, questions: +o.questions || 0, cartes: +o.cartes || 0 };
  }
  /** Avancement de l'objectif pour une date : chaque critère plafonné à 100 %, puis moyenne. */
  function avancementJour(date) {
    var j = journal()[date || Stock.aujourdhui()] || {};
    var o = objectif();
    var fait = { minutes: Math.floor((j.secondes || 0) / 60), questions: j.questions || 0, cartes: j.cartes || 0 };
    var criteres = ['minutes', 'questions', 'cartes'].filter(function (k) { return o[k] > 0; });
    var ratio = criteres.length ? criteres.reduce(function (s, k) { return s + Math.min(1, fait[k] / o[k]); }, 0) / criteres.length : 0;
    return { fait: fait, objectif: o, pct: Math.round(ratio * 100), atteint: criteres.length > 0 && ratio >= 1 };
  }
  function joursObjectifAtteint() {
    return Object.keys(journal()).filter(function (d) { return avancementJour(d).atteint; }).length;
  }
  function tempsTotal() {
    var j = journal();
    return Object.keys(j).reduce(function (s, k) { return s + (j[k].secondes || 0); }, 0);
  }
  function tempsSemaine() {
    var j = journal(), s = 0;
    for (var i = 0; i < 7; i++) { var k = iso(new Date(minuit(new Date()) - i * JOUR_MS)); s += (j[k] && j[k].secondes) || 0; }
    return s;
  }
  function duree(sec) {
    var m = Math.round(sec / 60);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
  }

  /* ------------------------------------------------------------------ */
  /* Badges : calculés à partir des données, rien de plus à stocker.     */
  /* ------------------------------------------------------------------ */
  function badges(ctx) {
    // [id, titre, description, icône SVG, émoji, valeur, cible]
    var L = [
      ['premier-quiz', 'Premier quiz', 'Terminer un premier QCM', 'quiz', '🥇', ctx.qcmTermines, 1],
      ['quiz-100', 'Sans faute', 'Obtenir 100 % à un QCM', 'cible', '🎯', ctx.qcmParfaits, 1],
      ['serie-7', '7 jours de suite', 'Réviser 7 jours d\'affilée', 'flamme', '🔥', ctx.serieMax, 7],
      ['bc01', 'BC01 terminé', 'Tous les modules du bloc BC01 maîtrisés', 'livre', '📘', ctx.bc1.maitrises, ctx.bc1.total],
      ['bc02', 'BC02 terminé', 'Tous les modules du bloc BC02 maîtrisés', 'livre', '📗', ctx.bc2.maitrises, ctx.bc2.total],
      ['oral', 'Oral validé', '10 questions d\'oral acquises', 'micro', '🎤', ctx.oralAcquis, 10],
      ['premiers-pas', 'Premiers pas', 'Répondre à une première question', 'eclair', '⚡', ctx.questions, 1],
      ['cent', 'Centurion', '100 réponses à des questions', 'quiz', '💯', ctx.questions, 100],
      ['serie-3', 'Régularité', '3 jours de révision d\'affilée', 'flamme', '🕯️', ctx.serieMax, 3],
      ['serie-21', 'Habitude installée', '21 jours d\'affilée', 'flamme', '🌋', ctx.serieMax, 21],
      ['lecteur', 'Lecteur assidu', 'Lire un module en entier', 'livre', '📖', ctx.modulesLus, 1],
      ['examen', 'Examen réussi', 'Au moins 70 % à un examen blanc', 'chrono', '📝', ctx.meilleurExamen, 70],
      ['memoire', 'Mémoire d\'éléphant', '25 flashcards maîtrisées', 'cartes', '🐘', ctx.cartesMaitrisees, 25],
      ['objectif', 'Objectif tenu', 'Objectif quotidien atteint 5 jours', 'cible', '✅', ctx.joursObjectif, 5],
      ['heures', 'Dix heures de travail', '10 heures d\'étude cumulées', 'horloge', '⏳', Math.floor(ctx.secondes / 3600), 10]
    ];
    return L.map(function (b) {
      return { id: b[0], titre: b[1], desc: b[2], icone: b[3], emoji: b[4], obtenu: b[6] > 0 && b[5] >= b[6], pct: Math.min(100, Math.round((b[5] || 0) / b[6] * 100)) };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Planning de révision automatique                                    */
  /* ------------------------------------------------------------------ */
  /** Thèmes faibles par module, à partir des statistiques de réponses. */
  function themesFaibles(stats) {
    var t = {};
    Object.keys(stats).forEach(function (id) {
      var s = stats[id], k = s.module + '|' + s.theme;
      t[k] = t[k] || { module: s.module, theme: s.theme, vus: 0, bons: 0 };
      t[k].vus += s.vus; t[k].bons += s.bons;
    });
    return Object.keys(t).map(function (k) { var x = t[k]; x.taux = Math.round(x.bons / x.vus * 100); return x; })
      .filter(function (x) { return x.vus >= 3 && x.taux < 60; })
      .sort(function (a, b) { return a.taux - b.taux; });
  }

  /**
   * Répartit les thèmes sur les jours restants avant l'épreuve :
   *  - les points faibles passent en premier et reviennent à chaque cycle ;
   *  - puis les modules publiés pas encore lus, puis tous les thèmes en alternant BC01 / BC02 ;
   *  - un examen blanc tous les 7 jours, révision générale les 2 jours avant la veille, veille allégée.
   * Le planning est recalculé à chaque visite : il s'adapte aux jours restants et aux résultats.
   */
  function construirePlanning(stats, lecture) {
    var M = App.MODULES;
    var faibles = themesFaibles(stats);
    var unites = [];
    M.forEach(function (m, i) {
      var n = i + 1, l = lecture[n];
      var lu = l && l.total ? Object.keys(l.sections).length / l.total : 0;
      m.themes.forEach(function (t, k) {
        unites.push({
          cle: 'm' + n + '-' + k, titre: t, module: n, bloc: m.bloc,
          priorite: m.dispo && lu < 1 ? 1 : 2,
          liens: m.dispo
            ? [['Cours', '#/module/' + n], ['QCM', '#/qcm/' + n]]
            : [['Fiches synthèse', '#/fiches'], ['Glossaire', '#/glossaire']],
          note: m.dispo ? '' : 'module en préparation'
        });
      });
    });
    var ordre = unites.filter(function (u) { return u.priorite === 1; });
    // Alternance BC01 / BC02 pour le reste.
    var b1 = unites.filter(function (u) { return u.priorite === 2 && u.bloc === 'BC01'; });
    var b2 = unites.filter(function (u) { return u.priorite === 2 && u.bloc === 'BC02'; });
    while (b1.length || b2.length) { if (b1.length) ordre.push(b1.shift()); if (b2.length) ordre.push(b2.shift()); }
    var unitesFaibles = faibles.map(function (f) {
      return {
        cle: 'faible-' + f.module + '-' + App.slug(f.theme), titre: 'Point faible : ' + f.theme + ' (' + f.taux + ' %)', module: f.module,
        bloc: M[f.module - 1] ? M[f.module - 1].bloc : '', faible: true,
        // Thème faible d'un module publié → QCM du module ; sinon → QCM du référentiel filtré sur le thème.
        liens: M[f.module - 1] && M[f.module - 1].dispo
          ? [['QCM ciblé', '#/qcm/' + f.module + '/theme:' + encodeURIComponent(f.theme)], ['Cours', '#/module/' + f.module]]
          : [['QCM ciblé', '#/qcm/ref/theme:' + encodeURIComponent(f.theme)], ['Fiches', '#/fiches']]
      };
    });

    var total = joursRestants();
    var jours = [];
    var curseur = 0, cycle = 0;
    function prochaine() {
      // Un cycle = tous les thèmes ; les points faibles sont réinsérés en tête de chaque cycle.
      var file = unitesFaibles.concat(ordre);
      if (!file.length) return null;
      if (curseur >= file.length) { curseur = 0; cycle++; }
      var u = file[curseur++];
      return cycle ? Object.assign({}, u, { titre: (u.faible ? '' : 'Révision : ') + u.titre, cle: u.cle + '-c' + cycle }) : u;
    }
    for (var i = 0; i < total; i++) {
      var d = new Date(minuit(new Date()).getTime() + i * JOUR_MS);
      var reste = total - i;
      var items = [];
      if (reste === 1) {
        items.push({ cle: 'veille', titre: 'Veille d\'épreuve : relecture légère des fiches synthèse, flashcards, repos', liens: [['Fiches', '#/fiches'], ['Flashcards', '#/flashcards']] });
      } else if (reste <= 3) {
        items.push({ cle: 'general', titre: 'Révision générale : examen blanc complet puis correction', liens: [['Examen blanc', '#/examen']] });
        items.push({ cle: 'oral20', titre: 'Entraînement oral : session de 20 minutes', liens: [['Oral', '#/oral']] });
      } else if (i % 7 === 6) {
        items.push({ cle: 'examen', titre: 'Examen blanc chronométré et bilan des erreurs', liens: [['Examen blanc', '#/examen'], ['Tableau de bord', '#/tableau-de-bord']] });
        var u0 = prochaine(); if (u0) items.push(u0);
      } else {
        var u1 = prochaine(), u2 = prochaine();
        if (u1) items.push(u1);
        if (u2 && (!u1 || u2.cle !== u1.cle)) items.push(u2);
      }
      if (reste > 1) items.push({ cle: 'cartes', titre: 'Flashcards du jour (répétition espacée)', liens: [['Réviser', '#/flashcards']], routine: true });
      if (reste > 3 && i % 2 === 0) items.push({ cle: 'oral', titre: 'Oral : une question tirée au sort (10 min)', liens: [['Oral', '#/oral']], routine: true });
      jours.push({ date: iso(d), rang: i, reste: reste, items: items });
    }
    return { jours: jours, faibles: faibles };
  }
  function planningFait() { return Stock.lire('planning', {}); }
  function cocher(date, cle, valeur) {
    var p = planningFait();
    p[date] = p[date] || {};
    if (valeur) p[date][cle] = 1; else delete p[date][cle];
    Stock.ecrire('planning', p);
  }

  /** Ce qu'il faut réviser aujourd'hui (pour le bandeau d'accueil, le tableau de bord et le rappel). */
  function aReviserAujourdhui() {
    return Promise.all([
      window.Revision ? Revision.cartesDues() : Promise.resolve(0)
    ]).then(function (r) {
      var plan = construirePlanning(Stock.lire('reponses', {}), Stock.lire('lecture', {}));
      var jour = plan.jours[0] || null;
      return { jour: jour, cartesDues: r[0], faibles: plan.faibles, avancement: avancementJour(), joursRestants: joursRestants() };
    });
  }
  function resumeTexte(a) {
    if (!a.jour) return 'Bonne épreuve !';
    var t = a.jour.items.filter(function (x) { return !x.routine; }).map(function (x) { return x.titre; });
    if (a.cartesDues) t.push(a.cartesDues + ' flashcard' + (a.cartesDues > 1 ? 's' : '') + ' à revoir');
    return t.join(' · ');
  }

  /* ------------------------------------------------------------------ */
  /* Rappel quotidien                                                    */
  /* ------------------------------------------------------------------ */
  function rappel() { return Stock.lire('rappel', { actif: false, heure: '19:00', dernier: null }); }
  /** Notification du navigateur à la première ouverture du jour (si autorisée). */
  function notifierSiBesoin() {
    var r = rappel();
    if (!r.actif || !('Notification' in window) || Notification.permission !== 'granted' || r.dernier === Stock.aujourdhui()) return;
    aReviserAujourdhui().then(function (a) {
      try { new Notification('À réviser aujourd\'hui — J-' + a.joursRestants, { body: resumeTexte(a), tag: 'revision-paie' }); } catch (e) { return; }
      r.dernier = Stock.aujourdhui();
      Stock.ecrire('rappel', r);
    });
  }
  /** Fichier agenda (.ics) : un rappel chaque jour jusqu'à la veille de l'épreuve, plus le jour J. */
  function fichierAgenda(heure) {
    var h = (heure || '19:00').replace(':', '') + '00';
    var debut = iso(new Date(minuit(new Date()).getTime() + JOUR_MS)).replace(/-/g, '');
    var veille = iso(new Date(dateExamen() - JOUR_MS)).replace(/-/g, '');
    var jourJ = (CFG.dateExamen || '2027-01-27').replace(/-/g, '');
    var lendemain = iso(new Date(dateExamen().getTime() + JOUR_MS)).replace(/-/g, '');
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var url = location.origin + location.pathname + '#/planning';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gestionnaire de paie 2026//Planning//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:rappel-revision-paie-' + debut + '@gestionnaire-paie', 'DTSTAMP:' + stamp,
      'DTSTART:' + debut + 'T' + h, 'DURATION:PT45M', 'RRULE:FREQ=DAILY;UNTIL=' + veille + 'T235959',
      'SUMMARY:Révision paie — à réviser aujourd\'hui', 'DESCRIPTION:Planning du jour : ' + url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:Révision paie', 'END:VALARM', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:epreuve-' + jourJ + '@gestionnaire-paie', 'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + jourJ, 'DTEND;VALUE=DATE:' + lendemain, 'SUMMARY:' + (CFG.libelleExamen || 'Épreuve'), 'END:VEVENT',
      'END:VCALENDAR'].join('\r\n');
  }

  /* ------------------------------------------------------------------ */
  /* Graphique d'évolution des scores (SVG, sans bibliothèque)           */
  /* ------------------------------------------------------------------ */
  /**
   * Deux séries (QCM, examens blancs) sur une seule échelle 0–100 %.
   * Identité portée par la couleur ET la forme du marqueur (rond / carré), légende toujours affichée,
   * infobulle au survol et au clavier, tableau de données en alternative.
   */
  var pointsCourbe = [];
  /** Renvoie la légende, la zone du graphique (dessinée ensuite à la bonne largeur) et le tableau de données. */
  function graphiqueScores(historique) {
    var points = historique.filter(function (h) { return (h.type === 'qcm' || h.type === 'examen') && typeof h.pct === 'number'; })
      .slice(0, 30).reverse();
    pointsCourbe = points;
    if (points.length < 2) return '<p class="param-note">La courbe apparaîtra après au moins deux QCM ou examens terminés.</p>';
    var date = function (s) { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); };
    var legende = '<div class="legende-courbe"><span><i class="cle s1"></i>QCM</span><span><i class="cle s2 carre"></i>Examen blanc</span></div>';
    var table = '<details class="vue-table"><summary>Voir les données en tableau</summary><div class="table-wrap"><table class="tableau"><thead><tr><th scope="col">Date</th><th scope="col">Activité</th><th scope="col">Score</th></tr></thead><tbody>' +
      points.slice().reverse().map(function (p) {
        return '<tr><td>' + date(p.date) + '</td><td>' + (p.type === 'qcm' ? (p.module === 'ref' ? 'QCM du référentiel' : 'QCM module ' + p.module) : 'Examen blanc') + '</td><td>' + p.pct + ' %</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    return legende + '<div class="courbe-zone"></div>' + table;
  }
  /** Dessine le SVG à la largeur réelle du conteneur (textes toujours à 12 px, quel que soit l'écran). */
  function dessinerCourbe(points, W) {
    var H = 240, g = 44, d = 14, haut = 14, bas = 30;
    var x = function (k) { return g + (points.length === 1 ? 0 : k * (W - g - d) / (points.length - 1)); };
    var y = function (v) { return haut + (100 - v) * (H - haut - bas) / 100; };
    var date = function (s) { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); };
    var series = [
      { type: 'qcm', nom: 'QCM', cls: 's1' },
      { type: 'examen', nom: 'Examen blanc', cls: 's2' }
    ];
    var svg = '<svg class="courbe" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="courbeTitre">' +
      '<title id="courbeTitre">Évolution des scores en pourcentage, ' + points.length + ' derniers résultats</title>';
    [0, 25, 50, 75, 100].forEach(function (v) {
      svg += '<line class="grille" x1="' + g + '" x2="' + (W - d) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="axe" x="' + (g - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + ' %</text>';
    });
    svg += '<text class="axe" x="' + g + '" y="' + (H - 8) + '">' + date(points[0].date) + '</text>' +
      '<text class="axe" x="' + (W - d) + '" y="' + (H - 8) + '" text-anchor="end">' + date(points[points.length - 1].date) + '</text>';
    series.forEach(function (s) {
      var pts = points.map(function (p, k) { return { p: p, k: k }; }).filter(function (o) { return o.p.type === s.type; });
      if (!pts.length) return;
      if (pts.length > 1) svg += '<polyline class="ligne ' + s.cls + '" points="' + pts.map(function (o) { return x(o.k) + ',' + y(o.p.pct); }).join(' ') + '"/>';
      pts.forEach(function (o) {
        var lib = s.nom + (o.p.module === 'ref' ? ' du référentiel' : o.p.module ? ' module ' + o.p.module : '') + ' — ' + date(o.p.date) + ' : ' + o.p.pct + ' % (' + o.p.bons + '/' + o.p.total + ')';
        var cx = x(o.k), cy = y(o.p.pct);
        svg += '<g class="point" tabindex="0" role="img" aria-label="' + esc(lib) + '" data-info="' + esc(lib) + '" data-x="' + cx + '" data-y="' + cy + '">' +
          '<circle class="cible-survol" cx="' + cx + '" cy="' + cy + '" r="12"/>' +
          (s.cls === 's1' ? '<circle class="marque ' + s.cls + '" cx="' + cx + '" cy="' + cy + '" r="4.5"/>'
            : '<rect class="marque ' + s.cls + '" x="' + (cx - 4.5) + '" y="' + (cy - 4.5) + '" width="9" height="9" rx="1.5"/>') + '</g>';
      });
    });
    svg += '</svg>';
    return svg + '<div class="infobulle" role="status" hidden></div>';
  }
  /** Dessine la courbe, la redessine si la largeur change, et branche l'infobulle (survol souris et focus clavier). */
  function brancherGraphique(racine) {
    var zone = racine.querySelector('.courbe-zone');
    if (!zone || pointsCourbe.length < 2) return;
    var points = pointsCourbe, largeur = 0;
    function dessiner() {
      var w = Math.max(280, Math.round(zone.clientWidth));
      if (w === largeur) return;
      largeur = w;
      zone.innerHTML = dessinerCourbe(points, w);
      var bulle = zone.querySelector('.infobulle');
      var montrer = function (gr) {
        bulle.textContent = gr.dataset.info;
        bulle.hidden = false;
        bulle.style.left = Math.max(0, Math.min(w - bulle.offsetWidth, Number(gr.dataset.x) - bulle.offsetWidth / 2)) + 'px';
        bulle.style.top = Math.max(0, Number(gr.dataset.y) - bulle.offsetHeight - 12) + 'px';
      };
      var cacher = function () { bulle.hidden = true; };
      zone.querySelectorAll('.point').forEach(function (gr) {
        gr.addEventListener('pointerenter', function () { montrer(gr); });
        gr.addEventListener('pointerleave', cacher);
        gr.addEventListener('focus', function () { montrer(gr); });
        gr.addEventListener('blur', cacher);
      });
    }
    dessiner();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(dessiner);
      ro.observe(zone);
      if (window.App) App.surDepart(function () { ro.disconnect(); });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Compte à rebours dans l'en-tête                                     */
  /* ------------------------------------------------------------------ */
  function majCompteRebours() {
    var el = document.getElementById('jRebours');
    if (!el) return;
    var n = joursRestants();
    var dateLisible = dateExamen().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    el.querySelector('b').textContent = n > 0 ? 'J-' + n : n === 0 ? 'Jour J' : 'Terminé';
    el.setAttribute('aria-label', (n > 0 ? 'Épreuve dans ' + n + ' jours' : n === 0 ? 'Épreuve aujourd\'hui' : 'Épreuve passée') + ', le ' + dateLisible + ' — ouvrir le planning');
  }

  /* ------------------------------------------------------------------ */
  /* Page « Planning de révision » (#/planning)                          */
  /* ------------------------------------------------------------------ */
  window.Pages = window.Pages || {};
  window.Pages.planning = function (main) {
    var plan = construirePlanning(Stock.lire('reponses', {}), Stock.lire('lecture', {}));
    var fait = planningFait();
    var n = joursRestants();
    var dateLisible = dateExamen().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var jourLisible = function (d) { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); };
    var semaines = [];
    plan.jours.forEach(function (j, k) { var s = Math.floor(k / 7); (semaines[s] = semaines[s] || []).push(j); });

    main.innerHTML = '<h1>' + Icone('planning', 'ico-titre') + ' Planning de révision</h1>' +
      '<section class="bandeau-jour"><div class="rebours"><span class="rebours-n" data-compteur>' + Math.max(0, n) + '</span>' +
      '<span class="rebours-l">jour' + (n > 1 ? 's' : '') + ' avant l\'épreuve</span><span class="rebours-d">' + esc(dateLisible) + '</span></div>' +
      '<div class="jour-contenu"><h2>Comment ce planning est construit</h2><ul class="liste-puces">' +
      '<li>Tous les thèmes des 10 modules sont répartis sur les jours restants, en alternant BC01 et BC02.</li>' +
      '<li>Vos <strong>points faibles</strong> (thème à moins de 60 % de réussite après au moins 3 réponses) passent en tête et reviennent à chaque cycle.</li>' +
      '<li>Un examen blanc tous les 7 jours, une révision générale les deux jours précédant la veille, une veille allégée.</li>' +
      '<li>Le planning est <strong>recalculé à chaque visite</strong> : il s\'adapte à vos résultats et au temps qui reste.</li></ul>' +
      '<div class="qcm-actions no-print"><button type="button" class="bouton petit secondaire" id="pImprimer">Imprimer / PDF</button>' +
      '<a class="bouton petit secondaire" href="#/tableau-de-bord">Tableau de bord</a></div></div></section>' +
      (plan.faibles.length ? '<div class="alerte"><strong>Points faibles prioritaires :</strong> ' +
        plan.faibles.map(function (f) { return esc(f.theme) + ' (' + f.taux + ' %)'; }).join(', ') + '</div>' : '') +
      (!plan.jours.length ? '<p>L\'épreuve est passée ou a lieu aujourd\'hui : plus de jour à planifier.</p>' : '') +
      semaines.map(function (s, k) {
        return '<section class="semaine"><h2>Semaine ' + (k + 1) + ' <small class="param-note">' + jourLisible(s[0].date) + ' – ' + jourLisible(s[s.length - 1].date) + '</small></h2>' +
          '<div class="jours-plan">' + s.map(function (j) {
            var f = fait[j.date] || {};
            return '<article class="jour-plan' + (j.rang === 0 ? ' aujourdhui' : '') + '"' + (j.rang === 0 ? ' aria-current="date"' : '') + '>' +
              '<header><b>' + (j.rang === 0 ? 'Aujourd\'hui' : jourLisible(j.date)) + '</b><span class="etiquette">J-' + j.reste + '</span></header><ul>' +
              j.items.map(function (it) {
                var idc = 'p-' + j.date + '-' + it.cle;
                return '<li class="' + (it.faible ? 'faible ' : '') + (it.bloc === 'BC01' ? 'bc1' : it.bloc === 'BC02' ? 'bc2' : '') + '">' +
                  '<input type="checkbox" id="' + esc(idc) + '" data-date="' + j.date + '" data-cle="' + esc(it.cle) + '"' + (f[it.cle] ? ' checked' : '') + '>' +
                  '<label for="' + esc(idc) + '">' + esc(it.titre) + (it.note ? ' <small class="param-note">(' + esc(it.note) + ')</small>' : '') + '</label>' +
                  '<span class="liens-plan">' + (it.liens || []).map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + '</a>'; }).join(' · ') + '</span></li>';
              }).join('') + '</ul></article>';
          }).join('') + '</div></section>';
      }).join('');
    main.querySelector('#pImprimer').onclick = function () { window.print(); };
    // Écouteur posé sur <main> (qui persiste d'une page à l'autre) : retiré quand on quitte la page.
    var surCoche = function (e) {
      var c = e.target;
      if (c.matches && c.matches('input[data-cle]')) {
        cocher(c.dataset.date, c.dataset.cle, c.checked);
        if (c.checked && window.Anim) Anim.toast('Bravo, c\'est fait !');
      }
    };
    main.addEventListener('change', surCoche);
    App.surDepart(function () { main.removeEventListener('change', surCoche); });
  };

  window.Suivi = {
    joursRestants: joursRestants, dateExamen: dateExamen, iso: iso, decompte: decompte,
    serie: serie, meilleureSerie: meilleureSerie, objectif: objectif, avancementJour: avancementJour,
    joursObjectifAtteint: joursObjectifAtteint, tempsTotal: tempsTotal, tempsSemaine: tempsSemaine, duree: duree,
    badges: badges, construirePlanning: construirePlanning, planningFait: planningFait, cocher: cocher,
    aReviserAujourdhui: aReviserAujourdhui, resumeTexte: resumeTexte,
    rappel: rappel, notifierSiBesoin: notifierSiBesoin, fichierAgenda: fichierAgenda,
    graphiqueScores: graphiqueScores, brancherGraphique: brancherGraphique, majCompteRebours: majCompteRebours,
    vider: vider
  };
})();
