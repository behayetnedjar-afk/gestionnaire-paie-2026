/* Progression de l'apprenant, stockée dans ce navigateur (localStorage, clés préfixées « gp: »).
 * Chaque écriture émet l'événement « stock:change » : compte.js s'en sert pour synchroniser
 * la progression avec le compte Supabase quand l'apprenant est connecté. */
(function () {
  'use strict';
  var PREFIXE = 'gp:';

  function lire(cle, defaut) {
    try {
      var v = localStorage.getItem(PREFIXE + cle);
      return v === null ? defaut : JSON.parse(v);
    } catch (e) { return defaut; }
  }
  /** Écrit une valeur et prévient les abonnés (synchronisation du compte, tableau de bord…). */
  function ecrire(cle, valeur, silencieux) {
    try { localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur)); } catch (e) { return false; }
    if (!silencieux) {
      try { window.dispatchEvent(new CustomEvent('stock:change', { detail: cle })); } catch (e) {}
    }
    return true;
  }
  /** Journal par jour : { 'AAAA-MM-JJ': { secondes, questions, bonnes, cartes, oral, sections } }. */
  function compterJour(champ, n) {
    var j = lire('jours', {});
    var d = aujourdhui();
    j[d] = j[d] || {};
    j[d][champ] = (j[d][champ] || 0) + (n || 1);
    ecrire('jours', j);
  }
  function cles() {
    var r = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIXE) === 0) r.push(k.slice(PREFIXE.length));
      }
    } catch (e) {}
    return r;
  }
  function aujourdhui() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  window.Stock = {
    lire: lire,
    ecrire: ecrire,
    aujourdhui: aujourdhui,
    compterJour: compterJour,
    cles: cles,

    /** Statistiques par question (sert aux points faibles). */
    enregistrerReponse: function (q, ok) {
      var s = lire('reponses', {});
      var r = s[q.id] || { vus: 0, bons: 0 };
      r.vus++;
      if (ok) r.bons++;
      r.dernier = ok;
      r.module = q.module;
      r.theme = q.theme || 'Sans thème';
      r.date = Date.now();
      s[q.id] = r;
      ecrire('reponses', s);
      compterJour('questions');
      if (ok) compterJour('bonnes');
    },

    /** Journal des activités (QCM avec erreurs, examens, flashcards, oral). 300 entrées maximum. */
    ajouterHistorique: function (entree) {
      var h = lire('historique', []);
      entree.date = new Date().toISOString();
      h.unshift(entree);
      ecrire('historique', h.slice(0, 300));
    },

    /** Meilleur score par module de QCM. */
    enregistrerScoreQcm: function (module, pct) {
      var s = lire('qcm', {});
      var m = s[module] || { meilleur: 0, tentatives: 0 };
      m.meilleur = Math.max(m.meilleur, pct);
      m.tentatives++;
      m.dernier = pct;
      s[module] = m;
      ecrire('qcm', s);
    },

    /** Sections de cours vues. */
    marquerLu: function (module, sectionId, total) {
      var l = lire('lecture', {});
      var m = l[module] || { sections: {} };
      if (!m.sections[sectionId]) compterJour('sections');
      m.sections[sectionId] = 1;
      if (total) m.total = total;
      l[module] = m;
      ecrire('lecture', l);
    },

    exporter: function () {
      var o = { application: 'gestionnaire-paie-2026', exporte_le: new Date().toISOString(), donnees: {} };
      cles().forEach(function (k) { o.donnees[k] = lire(k, null); });
      return o;
    },
    importer: function (o) {
      if (!o || o.application !== 'gestionnaire-paie-2026' || typeof o.donnees !== 'object') throw new Error('Fichier de progression non reconnu.');
      Object.keys(o.donnees).forEach(function (k) { ecrire(k, o.donnees[k], true); });
      try { window.dispatchEvent(new CustomEvent('stock:change', { detail: '*' })); } catch (e) {}
    },
    reinitialiser: function () {
      cles().forEach(function (k) { try { localStorage.removeItem(PREFIXE + k); } catch (e) {} });
      try { window.dispatchEvent(new CustomEvent('stock:change', { detail: '*' })); } catch (e) {}
    }
  };
})();
