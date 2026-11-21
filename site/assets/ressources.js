/* Glossaire, calendrier social et recherche plein texte. Dépend de App (app.js). */
(function () {
  'use strict';
  window.Pages = window.Pages || {};
  var A = function () { return window.App; };
  var esc = function (s) { return A().esc(s); };

  /** Normalise caractère par caractère (minuscule, sans accent) en conservant les positions. */
  function normaliser(s) {
    var r = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      r += c.length === 1 ? c : s[i].toLowerCase().charAt(0);
    }
    return r;
  }

  /* ================================================================== */
  /* GLOSSAIRE                                                           */
  /* ================================================================== */
  window.Pages.glossaire = function (main, ancre) {
    return A().charger(A().CHEMINS.glossaire, true).then(function (termes) {
      var tries = termes.slice().sort(function (a, b) { return a.terme.localeCompare(b.terme, 'fr'); });
      var lettres = [];
      tries.forEach(function (t) {
        var l = normaliser(t.terme.charAt(0)).toUpperCase();
        if (lettres.indexOf(l) < 0) lettres.push(l);
      });
      main.innerHTML = '<h1>Glossaire</h1><p class="intro">' + termes.length + ' termes et sigles de la paie, avec leur référence. ' +
        'Chaque terme existe aussi en <a href="#/flashcards">flashcard</a>.</p>' +
        '<div class="filtres"><label for="filtreG">Filtrer :</label><input type="search" id="filtreG" class="champ-recherche" placeholder="ex. CSG, plafond, carence" autocomplete="off">' +
        '<span class="param-note" id="nbG" aria-live="polite"></span></div>' +
        '<nav class="lettres" aria-label="Initiales">' + lettres.map(function (l) { return '<a href="#/glossaire" data-lettre="' + l + '">' + l + '</a>'; }).join('') + '</nav>' +
        '<dl class="glossaire">' + tries.map(function (t) {
          var id = A().slug(t.terme);
          return '<div class="terme" id="' + id + '" data-lettre="' + normaliser(t.terme.charAt(0)).toUpperCase() + '" data-texte="' + esc(normaliser(t.terme + ' ' + (t.sigle || '') + ' ' + t.definition)) + '">' +
            '<dt>' + esc(t.terme) + (t.sigle ? ' <span class="sigle">' + esc(t.sigle) + '</span>' : '') + '</dt>' +
            '<dd><p>' + esc(t.definition) + '</p>' +
            '<p class="param-note">' + (t.reference ? esc(t.reference) + ' · ' : '') +
            (t.modules || []).map(function (m) {
              return A().MODULES[m - 1] && A().MODULES[m - 1].dispo ? '<a href="#/module/' + m + '">Module ' + m + '</a>' : 'Module ' + m;
            }).join(', ') + '</p></dd></div>';
        }).join('') + '</dl>';

      var filtre = main.querySelector('#filtreG');
      var nb = main.querySelector('#nbG');
      filtre.addEventListener('input', function () {
        var q = normaliser(filtre.value.trim());
        var vus = 0;
        main.querySelectorAll('.terme').forEach(function (el) {
          var ok = !q || el.dataset.texte.indexOf(q) >= 0;
          el.hidden = !ok;
          if (ok) vus++;
        });
        nb.textContent = q ? vus + ' terme' + (vus > 1 ? 's' : '') : '';
      });
      main.querySelector('.lettres').addEventListener('click', function (e) {
        var a = e.target.closest('[data-lettre]'); if (!a) return;
        e.preventDefault();
        var cible = main.querySelector('.terme[data-lettre="' + a.dataset.lettre + '"]:not([hidden])');
        if (cible) A().allerA(cible.id);
      });
      if (ancre) {
        setTimeout(function () {
          if (A().allerA(ancre)) document.getElementById(ancre).classList.add('surligne');
        }, 50);
        return 'garder-defilement';
      }
    });
  };

  /* ================================================================== */
  /* CALENDRIER SOCIAL                                                   */
  /* ================================================================== */
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  /** Dimanche de Pâques (algorithme de Meeus / Jones / Butcher). */
  function paques(annee) {
    var a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(annee, mois - 1, jour);
  }
  function joursFeries(annee) {
    var p = paques(annee);
    var plus = function (j) { var d = new Date(p); d.setDate(d.getDate() + j); return d; };
    return [
      [new Date(annee, 0, 1), 'Jour de l\'an'], [plus(1), 'Lundi de Pâques'], [new Date(annee, 4, 1), 'Fête du travail'],
      [new Date(annee, 4, 8), 'Victoire 1945'], [plus(39), 'Ascension'], [plus(50), 'Lundi de Pentecôte'],
      [new Date(annee, 6, 14), 'Fête nationale'], [new Date(annee, 7, 15), 'Assomption'], [new Date(annee, 10, 1), 'Toussaint'],
      [new Date(annee, 10, 11), 'Armistice 1918'], [new Date(annee, 11, 25), 'Noël']
    ].map(function (x) { return { date: iso(x[0]), libelle: x[1] }; });
  }
  function reporter(date, feries) {
    var d = new Date(date);
    var f = feries.map(function (x) { return x.date; });
    while (d.getDay() === 0 || d.getDay() === 6 || f.indexOf(iso(d)) >= 0) d.setDate(d.getDate() + 1);
    return d;
  }
  function dateLisible(isoDate) {
    var p = isoDate.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
  }

  function genererCalendrier(cal) {
    var an = cal.annee;
    var feries = joursFeries(an);
    var ev = [];
    feries.forEach(function (f) { ev.push({ date: f.date, categorie: 'Jour férié', libelle: f.libelle }); });
    for (var m = 0; m < 12; m++) {
      cal.echeances_mensuelles.forEach(function (e) {
        var theorique = new Date(an, m, e.jour);
        var reelle = reporter(theorique, feries);
        ev.push({
          date: iso(reelle), categorie: e.categorie, libelle: e.libelle, condition: e.condition, reference: e.reference,
          libelleCourt: 'DSN — échéance du ' + e.jour + ' (' + (e.jour === 5 ? '≥ 50 salariés' : 'autres') + ')',
          report: iso(reelle) !== iso(theorique) ? iso(theorique) : null
        });
      });
      (cal.echeances_trimestrielles || []).forEach(function (e) {
        if (e.mois.indexOf(m + 1) < 0) return;
        var t = new Date(an, m, e.jour), r = reporter(t, feries);
        ev.push({ date: iso(r), categorie: e.categorie, libelle: e.libelle, condition: e.condition, statut: e.statut, report: iso(r) !== iso(t) ? iso(t) : null });
      });
    }
    cal.evenements.forEach(function (e) {
      if (e.date) ev.push(e);
      else if (e.mois) ev.push(Object.assign({}, e, { date: an + '-' + String(e.mois).padStart(2, '0') + '-01', moisEntier: true }));
    });
    ev.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    ev.forEach(function (e) { e.dateLisible = e.moisEntier ? 'Courant ' + new Date(e.date).toLocaleDateString('fr-FR', { month: 'long' }) : dateLisible(e.date); });
    return ev;
  }

  window.Pages.prochainesEcheances = function (n) {
    return A().charger(A().CHEMINS.calendrier, true).then(function (cal) {
      var auj = Stock.aujourdhui();
      return genererCalendrier(cal).filter(function (e) { return e.date >= auj && e.categorie !== 'Jour férié'; }).slice(0, n);
    }).catch(function () { return []; });
  };

  window.Pages.calendrier = function (main) {
    return A().charger(A().CHEMINS.calendrier, true).then(function (cal) {
      var ev = genererCalendrier(cal);
      var auj = Stock.aujourdhui();
      var categories = ev.map(function (e) { return e.categorie; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
      var moisNoms = [];
      for (var m = 0; m < 12; m++) moisNoms.push(new Date(cal.annee, m, 1).toLocaleDateString('fr-FR', { month: 'long' }));

      main.innerHTML = '<h1>Calendrier social ' + cal.annee + '</h1>' +
        '<div class="alerte">' + esc(cal.avertissement) + ' <br><span class="param-note">' + esc(cal.regle_report) + '</span></div>' +
        '<fieldset class="filtres-cat"><legend>Afficher</legend>' + categories.map(function (c) {
          return '<label><input type="checkbox" value="' + esc(c) + '" checked> ' + esc(c) + '</label>';
        }).join('') + '<label><input type="checkbox" id="passees"> Échéances passées</label></fieldset>' +
        moisNoms.map(function (nom, m) {
          var liste = ev.filter(function (e) { return +e.date.slice(5, 7) === m + 1; });
          return '<section class="mois" data-mois="' + (m + 1) + '"><h2>' + nom.charAt(0).toUpperCase() + nom.slice(1) + '</h2><ul class="echeances">' +
            liste.map(function (e) {
              return '<li data-cat="' + esc(e.categorie) + '" data-passee="' + (e.date < auj) + '" class="cat-' + A().slug(e.categorie) + '">' +
                '<span class="ech-date">' + esc(e.dateLisible) + '</span><div><span class="etiquette">' + esc(e.categorie) + '</span> ' +
                (e.statut === 'A_VERIFIER' ? '<span class="badge badge-verif">À VÉRIFIER</span> ' : '') +
                '<strong>' + esc(e.libelle) + '</strong>' +
                (e.condition ? '<br><span class="param-note">' + esc(e.condition) + '</span>' : '') +
                (e.report ? '<br><span class="param-note">Reportée du ' + esc(dateLisible(e.report)) + ' (week-end ou jour férié)</span>' : '') +
                (e.note ? '<br><span class="param-note">' + esc(e.note) + '</span>' : '') +
                (e.reference ? '<br><span class="param-note">' + esc(e.reference) + '</span>' : '') + '</div></li>';
            }).join('') + '</ul></section>';
        }).join('') +
        '<p class="param-note">Jours fériés du régime général. En Alsace-Moselle, le Vendredi saint et le 26 décembre sont aussi fériés.</p>';

      function filtrer() {
        var actives = Array.prototype.filter.call(main.querySelectorAll('.filtres-cat input[value]'), function (x) { return x.checked; }).map(function (x) { return x.value; });
        var passees = main.querySelector('#passees').checked;
        main.querySelectorAll('.echeances li').forEach(function (li) {
          li.hidden = actives.indexOf(li.dataset.cat) < 0 || (!passees && li.dataset.passee === 'true');
        });
        main.querySelectorAll('.mois').forEach(function (s) { s.hidden = !s.querySelector('li:not([hidden])'); });
      }
      main.querySelector('.filtres-cat').addEventListener('change', filtrer);
      filtrer();
    });
  };

  /* ================================================================== */
  /* RECHERCHE PLEIN TEXTE                                               */
  /* ================================================================== */
  var index = null;

  function texteBrut(md) {
    return md.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_>#|]/g, ' ').replace(/-{3,}/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function texteTitre(md) {
    var d = document.createElement('div');
    d.innerHTML = marked.parseInline(md);
    return d.textContent;
  }
  /** Découpe un Markdown en sections ## / ### avec les mêmes identifiants que l'affichage. */
  function sections(md, source, lien) {
    var lignes = md.split(/\r?\n/), res = [], courante = null, dansCode = false, titres = [];
    lignes.forEach(function (l) {
      if (/^```/.test(l)) dansCode = !dansCode;
      var m = !dansCode && /^(#{2,3})\s+(.*)$/.exec(l);
      if (m) {
        courante = { titre: texteTitre(m[2]), corps: [] };
        titres.push(courante);
        res.push(courante);
      } else if (courante) courante.corps.push(l);
    });
    var faux = titres.map(function (t) { var h = document.createElement('h2'); h.textContent = t.titre; return h; });
    var ids = A().idsTitres(faux);
    return res.map(function (s, k) {
      return { source: source, titre: s.titre, texte: texteBrut(s.corps.join('\n')), lien: lien + ids[k].id };
    });
  }
  function construireIndex() {
    if (index) return Promise.resolve(index);
    var M = A().MODULES, C = A().CHEMINS;
    var taches = [];
    M.forEach(function (m, i) {
      if (!m.dispo) return;
      var n = i + 1;
      taches.push(A().charger(C.module(n)).then(function (md) { return sections(md, 'Cours — module ' + n, '#/module/' + n + '/'); }));
      taches.push(A().charger(C.qcm(n), true).then(function (qs) {
        return qs.map(function (q) { return { source: 'QCM — module ' + n, titre: q.id + ' · ' + q.enonce, texte: q.choix.join(' ') + ' ' + q.explication + ' ' + (q.piege || ''), lien: '#/qcm/' + n }; });
      }));
    });
    taches.push(A().charger(C.fiches).then(function (md) { return sections(md, 'Fiches synthèse', '#/fiches/'); }));
    taches.push(A().charger(C.glossaire, true).then(function (g) {
      return g.map(function (t) { return { source: 'Glossaire', titre: t.terme + (t.sigle ? ' — ' + t.sigle : ''), texte: t.definition + ' ' + (t.reference || ''), lien: '#/glossaire/' + A().slug(t.terme) }; });
    }));
    return Promise.all(taches).then(function (l) {
      index = [].concat.apply([], l).map(function (d) {
        d.titreN = normaliser(d.titre); d.texteN = normaliser(d.texte);
        return d;
      });
      return index;
    });
  }
  function chercher(q) {
    var mots = normaliser(q).split(/\s+/).filter(function (m) { return m.length >= 2; });
    if (!mots.length) return [];
    return index.map(function (d) {
      var score = 0;
      for (var k = 0; k < mots.length; k++) {
        var dansTitre = d.titreN.indexOf(mots[k]) >= 0;
        var occ = d.texteN.split(mots[k]).length - 1;
        if (!dansTitre && !occ) return null;
        score += (dansTitre ? 10 : 0) + Math.min(occ, 5);
      }
      return { d: d, score: score, mots: mots };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
  }
  function extrait(d, mots) {
    var pos = -1;
    mots.forEach(function (m) { var p = d.texteN.indexOf(m); if (p >= 0 && (pos < 0 || p < pos)) pos = p; });
    if (pos < 0) return esc(d.texte.slice(0, 180)) + (d.texte.length > 180 ? '…' : '');
    var debut = Math.max(0, pos - 70), fin = Math.min(d.texte.length, pos + 170);
    var brut = d.texte.slice(debut, fin), norm = d.texteN.slice(debut, fin);
    var marques = [];
    mots.forEach(function (m) {
      var i = norm.indexOf(m);
      while (i >= 0) { marques.push([i, i + m.length]); i = norm.indexOf(m, i + m.length); }
    });
    marques.sort(function (a, b) { return a[0] - b[0]; });
    var html = '', curseur = 0;
    marques.forEach(function (mk) {
      if (mk[0] < curseur) return;
      html += esc(brut.slice(curseur, mk[0])) + '<mark>' + esc(brut.slice(mk[0], mk[1])) + '</mark>';
      curseur = mk[1];
    });
    html += esc(brut.slice(curseur));
    return (debut > 0 ? '…' : '') + html + (fin < d.texte.length ? '…' : '');
  }

  window.Pages.recherche = function (main, requeteInitiale) {
    main.innerHTML = '<h1>Recherche</h1>' +
      '<form role="search" id="formR" class="filtres"><label for="q" class="sr-only">Rechercher dans le cours, les fiches, le glossaire et les QCM</label>' +
      '<input type="search" id="q" class="champ-recherche large" placeholder="ex. carence CDD, net imposable, DPAE" autocomplete="off">' +
      '<button class="bouton" type="submit">Rechercher</button></form>' +
      '<p class="param-note" id="nbR" aria-live="polite">Indexation du contenu…</p><ol class="resultats" id="resR"></ol>';
    var champ = main.querySelector('#q');
    var nb = main.querySelector('#nbR');
    var liste = main.querySelector('#resR');
    champ.value = requeteInitiale || '';

    function lancer() {
      var q = champ.value.trim();
      try { history.replaceState(null, '', '#/recherche/' + encodeURIComponent(q)); } catch (e) {}
      if (q.length < 2) { nb.textContent = 'Saisissez au moins 2 caractères.'; liste.innerHTML = ''; return; }
      var r = chercher(q);
      nb.textContent = r.length ? r.length + ' résultat' + (r.length > 1 ? 's' : '') + ' pour « ' + q + ' »' : 'Aucun résultat pour « ' + q + ' ».';
      liste.innerHTML = r.slice(0, 40).map(function (x) {
        return '<li><a href="' + esc(x.d.lien) + '"><span class="etiquette">' + esc(x.d.source) + '</span> <strong>' + esc(x.d.titre) + '</strong></a>' +
          '<p>' + extrait(x.d, x.mots) + '</p></li>';
      }).join('');
    }
    var minuteur;
    champ.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(lancer, 200); });
    main.querySelector('#formR').addEventListener('submit', function (e) { e.preventDefault(); lancer(); });

    return construireIndex().then(function () {
      nb.textContent = '';
      if (champ.value) lancer();
      champ.focus();
    });
  };
})();
