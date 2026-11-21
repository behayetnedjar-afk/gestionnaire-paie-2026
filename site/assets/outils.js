/* Simulateur de bulletin et calculateurs rapides — utilisent window.MoteurPaie (packages/moteur-paie) */
(function () {
  'use strict';

  var M = window.MoteurPaie;

  /* ---------- utilitaires ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function eur(n) {
    if (n === undefined || n === null || n === '') return '';
    return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
  function pct(n) {
    if (n === undefined || n === null) return '';
    return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 4 }) + ' %';
  }
  function montant(n) {
    return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function nb(n) {
    return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }
  function num(v) {
    if (v === '' || v == null) return 0;
    var x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isNaN(x) ? 0 : x;
  }
  function stockLire(cle) { try { return JSON.parse(localStorage.getItem(cle)); } catch (e) { return null; } }
  function stockEcrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }

  /* ---------- formulaires déclaratifs ---------- */
  // champ : { id, label, type: 'num' | 'select' | 'check' | 'text', def, options, aide }
  function champHtml(prefixe, c, valeurs) {
    var id = prefixe + '-' + c.id;
    var v = valeurs && c.id in valeurs ? valeurs[c.id] : c.def;
    var aide = c.aide ? '<small id="' + id + '-aide">' + esc(c.aide) + '</small>' : '';
    var desc = c.aide ? ' aria-describedby="' + id + '-aide"' : '';
    if (c.type === 'check') {
      return '<div class="champ champ-check"><label><input type="checkbox" id="' + id + '" name="' + c.id + '"' + (v ? ' checked' : '') + desc + '> ' + esc(c.label) + '</label>' + aide + '</div>';
    }
    var input;
    if (c.type === 'select') {
      input = '<select id="' + id + '" name="' + c.id + '"' + desc + '>' + c.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
    } else {
      input = '<input id="' + id + '" name="' + c.id + '" type="text"' + (c.type === 'num' ? ' inputmode="decimal" autocomplete="off"' : '') +
        ' value="' + esc(v == null ? '' : String(v).replace('.', c.type === 'num' ? ',' : '.')) + '"' + desc + '>';
    }
    return '<div class="champ"><label for="' + id + '">' + esc(c.label) + '</label>' + input + aide + '</div>';
  }
  function formulaireHtml(prefixe, champs, valeurs) {
    var html = '', ouvert = false;
    champs.forEach(function (c) {
      if (c.groupe) {
        if (ouvert) html += '</div></fieldset>';
        html += '<fieldset class="groupe"><legend>' + esc(c.groupe) + '</legend><div class="form-grille">';
        ouvert = true;
      } else {
        if (!ouvert) { html += '<div class="form-grille">'; ouvert = true; }
        html += champHtml(prefixe, c, valeurs);
      }
    });
    if (ouvert) html += champs[0].groupe ? '</div></fieldset>' : '</div>';
    return html;
  }
  function lire(form, champs) {
    var r = {};
    champs.forEach(function (c) {
      if (!c.id) return;
      var el = form.elements[c.id];
      if (!el) return;
      r[c.id] = c.type === 'check' ? el.checked : c.type === 'num' ? num(el.value) : el.value;
    });
    return r;
  }
  function erreurHtml(e) {
    return '<div class="resultat resultat-erreur" role="alert"><strong>Calcul impossible.</strong> ' + esc(e.message) + '</div>';
  }

  /* ================================================================== */
  /* SIMULATEUR DE BULLETIN                                              */
  /* ================================================================== */
  var CHAMPS_BULLETIN = [
    { groupe: 'Salarié et entreprise' },
    { id: 'statut', label: 'Statut', type: 'select', options: [['non_cadre', 'Non-cadre'], ['cadre', 'Cadre']], def: 'non_cadre' },
    { id: 'effectif', label: 'Effectif de l\'entreprise', type: 'num', def: 35, aide: 'Seuils : 11, 20, 50 salariés' },
    { id: 'dureeHebdo', label: 'Durée hebdomadaire (h)', type: 'num', def: 35 },
    { id: 'salaireBase', label: 'Salaire de base mensuel brut (€)', type: 'num', def: 2275.05 },
    { groupe: 'Heures majorées du mois (décomptées semaine par semaine)' },
    { id: 'hs25', label: 'Heures sup. à 25 %', type: 'num', def: 0 },
    { id: 'hs50', label: 'Heures sup. à 50 %', type: 'num', def: 0 },
    { id: 'hc10', label: 'Heures compl. à 10 %', type: 'num', def: 0, aide: 'Temps partiel' },
    { id: 'hc25', label: 'Heures compl. à 25 %', type: 'num', def: 0 },
    { groupe: 'Éléments variables' },
    { id: 'primeLibelle', label: 'Libellé de la prime', type: 'text', def: 'Prime exceptionnelle' },
    { id: 'prime', label: 'Montant de la prime (€)', type: 'num', def: 0 },
    { id: 'absence', label: 'Retenue pour absence (€)', type: 'num', def: 0, aide: 'Montant positif, déduit du brut' },
    { id: 'avantageNature', label: 'Avantage en nature (€)', type: 'num', def: 0 },
    { groupe: 'Taux propres à l\'entreprise' },
    { id: 'tauxAT', label: 'Taux AT/MP (%)', type: 'num', def: 1.5, aide: 'Notifié par la CARSAT' },
    { id: 'tauxVM', label: 'Versement mobilité (%)', type: 'num', def: 0, aide: 'Taux de la commune (≥ 11 salariés)' },
    { id: 'alsace', label: 'Régime local Alsace-Moselle', type: 'check', def: false },
    { groupe: 'Complémentaire santé (montants mensuels)' },
    { id: 'santeSal', label: 'Part salariale (€)', type: 'num', def: 0 },
    { id: 'santePat', label: 'Part patronale (€)', type: 'num', def: 0 },
    { groupe: 'Entrée ou sortie en cours de mois' },
    { id: 'joursPresence', label: 'Jours calendaires de présence', type: 'num', def: 0, aide: 'Laisser 0 si mois complet' },
    { id: 'joursMois', label: 'Jours calendaires du mois', type: 'num', def: 31 },
    { groupe: 'Prélèvement à la source et paiement' },
    { id: 'pasMode', label: 'Type de taux', type: 'select', options: [['personnalise', 'Taux personnalisé (DGFiP)'], ['neutre', 'Taux neutre (grille)']], def: 'personnalise' },
    { id: 'pasTaux', label: 'Taux personnalisé (%)', type: 'num', def: 3 },
    { id: 'cumulHS', label: 'HS déjà exonérées depuis janvier (€)', type: 'num', def: 0, aide: 'Plafond annuel d\'exonération fiscale' },
    { id: 'frais', label: 'Remboursement de frais (€)', type: 'num', def: 0 },
    { id: 'acompte', label: 'Acompte déjà versé (€)', type: 'num', def: 0 }
  ];

  var EXEMPLES = {
    martin: { titre: 'Cas pratique module 1 — Mme Martin', valeurs: { statut: 'non_cadre', effectif: 35, dureeHebdo: 35, salaireBase: 2275.05, hs25: 13, hs50: 2, tauxAT: 1.5, pasTaux: 3 } },
    cadre: { titre: 'Cadre à 5 000 €', valeurs: { statut: 'cadre', effectif: 60, dureeHebdo: 35, salaireBase: 5000, tauxAT: 1, pasTaux: 5, santeSal: 35, santePat: 45 } },
    smic: { titre: 'Salarié au SMIC, TPE', valeurs: { statut: 'non_cadre', effectif: 8, dureeHebdo: 35, salaireBase: 1823.03, tauxAT: 2, pasTaux: 0 } }
  };

  var RUBRIQUES = [
    ['Santé', ['MALADIE', 'ALSACE', 'SANTE', 'PREV_CADRE']],
    ['Accidents du travail — maladies professionnelles', ['ATMP']],
    ['Retraite', ['VIEIL_PLAF', 'VIEIL_DEPLAF', 'AGIRC_T1', 'CEG_T1', 'AGIRC_T2', 'CEG_T2', 'CET', 'APEC']],
    ['Famille', ['FAMILLE']],
    ['Assurance chômage', ['CHOMAGE', 'AGS']],
    ['Autres contributions dues par l\'employeur', ['CSA', 'FNAL', 'CDS', 'FORMATION', 'TA', 'TA_SOLDE', 'VM', 'FORFAIT_SOCIAL']],
    ['Exonérations et allègements de cotisations', ['REDUC_HS_SAL', 'DEDUC_HS_PAT', 'RGDU']],
    ['CSG / CRDS', ['CSG_DED', 'CSG_NON_DED', 'CRDS', 'CSG_CRDS_HS']]
  ];

  function saisieDepuis(v) {
    var s = {
      statut: v.statut,
      effectif: v.effectif,
      salaireBase: v.salaireBase,
      dureeHebdo: v.dureeHebdo || 35,
      heuresSup25: v.hs25,
      heuresSup50: v.hs50,
      heuresComplementaires10: v.hc10,
      heuresComplementaires25: v.hc25,
      tauxAT: v.tauxAT,
      tauxVersementMobilite: v.tauxVM,
      alsaceMoselle: v.alsace,
      prelevementSource: v.pasMode === 'neutre' ? { tauxNeutre: true } : { taux: v.pasTaux },
      cumulHeuresSupExonereesAnnee: v.cumulHS,
      remboursementsFrais: v.frais,
      acompte: v.acompte,
      elementsSoumis: [],
      avantagesNature: []
    };
    if (v.prime) s.elementsSoumis.push({ libelle: v.primeLibelle || 'Prime', montant: v.prime });
    if (v.absence) s.elementsSoumis.push({ libelle: 'Absence non rémunérée', montant: -Math.abs(v.absence) });
    if (v.avantageNature) s.avantagesNature.push({ libelle: 'nourriture / logement', montant: v.avantageNature });
    if (v.santeSal || v.santePat) s.complementaireSante = { salarial: v.santeSal, patronal: v.santePat };
    if (v.joursPresence > 0) s.presence = { joursCalendairesPresence: v.joursPresence, joursCalendairesMois: v.joursMois || 31 };
    return s;
  }

  function ligneHtml(l) {
    return '<tr><th scope="row">' + esc(l.libelle) + '</th>' +
      '<td class="num">' + (l.base === undefined ? '' : l.code === 'DEDUC_HS_PAT' ? nb(l.base) + ' h' : montant(l.base)) + '</td>' +
      '<td class="num">' + (l.tauxSalarial ? pct(l.tauxSalarial) : '') + '</td>' +
      '<td class="num">' + (l.montantSalarial ? eur(l.montantSalarial) : '') + '</td>' +
      '<td class="num">' + (l.tauxPatronal ? pct(l.tauxPatronal) : '') + '</td>' +
      '<td class="num">' + (l.montantPatronal ? eur(l.montantPatronal) : '') + '</td></tr>';
  }

  function bulletinHtml(r, saisie) {
    var corps = '';
    var brut = r.lignes.filter(function (l) { return l.section === 'brut'; });
    corps += '<tbody><tr class="rubrique"><th colspan="6" scope="colgroup">Rémunération</th></tr>' +
      brut.map(function (l) {
        return '<tr><th scope="row">' + esc(l.libelle) + '</th><td class="num">' + (l.base !== undefined ? nb(l.base) : '') + '</td>' +
          '<td class="num">' + (l.tauxSalarial ? eur(l.tauxSalarial) : '') + '</td><td class="num">' + eur(l.montantSalarial) + '</td><td></td><td></td></tr>';
      }).join('') +
      '<tr class="total"><th scope="row">SALAIRE BRUT</th><td></td><td></td><td class="num">' + eur(r.brut) + '</td><td></td><td></td></tr></tbody>';

    RUBRIQUES.forEach(function (rub) {
      var ls = rub[1].map(function (code) { return r.lignes.find(function (l) { return l.code === code; }); }).filter(Boolean);
      if (!ls.length) return;
      corps += '<tbody><tr class="rubrique"><th colspan="6" scope="colgroup">' + esc(rub[0]) + '</th></tr>' + ls.map(ligneHtml).join('') + '</tbody>';
    });
    corps += '<tbody><tr class="total"><th scope="row">TOTAL DES COTISATIONS ET CONTRIBUTIONS</th><td></td><td></td>' +
      '<td class="num">' + eur(r.totaux.retenuesSalariales) + '</td><td></td><td class="num">' + eur(r.totaux.cotisationsPatronales + r.totaux.allegementsPatronaux) + '</td></tr></tbody>';

    var nets = [
      ['Net à payer avant impôt sur le revenu', r.netAvantImpot],
      ['Montant net social', r.netSocial],
      ['Net imposable', r.netImposable],
      ['Impôt sur le revenu prélevé à la source (' + (r.prelevementSource.type === 'neutre' ? 'taux neutre ' : 'taux personnalisé ') + pct(r.prelevementSource.taux) + ')', -r.prelevementSource.montant]
    ];
    if (saisie.avantagesNature.length) nets.push(['Avantages en nature (déjà perçus en nature)', -saisie.avantagesNature[0].montant]);
    if (saisie.remboursementsFrais) nets.push(['Remboursement de frais professionnels', saisie.remboursementsFrais]);
    if (saisie.acompte) nets.push(['Acompte', -saisie.acompte]);

    var avert = r.avertissements.length
      ? '<div class="alerte no-print-break"><strong>' + r.avertissements.length + ' paramètre(s) À VÉRIFIER utilisé(s) :</strong> ' +
        r.avertissements.map(function (a) { return '<code>' + esc(a) + '</code>'; }).join(', ') +
        '. <a href="#/parametres">Voir les paramètres 2026</a>. Résultat indicatif tant que ces valeurs ne sont pas confirmées.</div>'
      : '';

    return '<div class="bulletin" id="bulletin">' +
      '<div class="bulletin-entete"><div><strong>Bulletin de paie simulé — ' + r.annee + '</strong><br><span class="param-note">Document pédagogique, sans valeur légale. Données fictives.</span></div>' +
      '<div class="param-note">Statut : ' + (saisie.statut === 'cadre' ? 'cadre' : 'non-cadre') + ' · Effectif : ' + saisie.effectif +
      ' · Plafond du mois : ' + eur(r.plafond) + ' · Taux horaire : ' + eur(r.tauxHoraire) + '</div></div>' +
      '<div class="table-wrap"><table class="tableau tableau-bulletin"><caption class="sr-only">Détail des lignes du bulletin</caption>' +
      '<thead><tr><th scope="col">Élément</th><th scope="col" class="num">Base</th><th scope="col" class="num">Taux sal.</th><th scope="col" class="num">Part salarié</th>' +
      '<th scope="col" class="num">Taux pat.</th><th scope="col" class="num">Part employeur</th></tr></thead>' + corps + '</table></div>' +
      '<div class="nets">' + nets.map(function (n) { return '<div class="net-ligne"><span>' + esc(n[0]) + '</span><b>' + eur(n[1]) + '</b></div>'; }).join('') +
      '<div class="net-ligne net-paye"><span>NET PAYÉ</span><b>' + eur(r.netPaye) + '</b></div></div>' +
      '<div class="chiffres">' +
      '<div class="chiffre"><b>' + eur(r.coutEmployeur) + '</b><span>Coût total employeur</span></div>' +
      '<div class="chiffre"><b>' + eur(-r.totaux.allegementsPatronaux) + '</b><span>Allègements patronaux</span></div>' +
      '<div class="chiffre"><b>' + eur(r.smicCalcule) + '</b><span>SMIC de référence du mois</span></div></div>' +
      avert +
      '<details class="hypotheses"><summary>Hypothèses de calcul</summary><ul>' + r.hypotheses.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></details>' +
      '</div>';
  }

  function simulateur(main, parametres) {
    var valeurs = stockLire('simulateur') || EXEMPLES.martin.valeurs;
    main.innerHTML = '<h1>Simulateur de bulletin de paie</h1>' +
      '<p class="intro no-print">Saisissez la situation du mois : le bulletin est calculé ligne par ligne avec les paramètres 2026. ' +
      'Les heures supplémentaires doivent déjà être décomptées par semaine.</p>' +
      '<div class="exemples no-print"><span>Exemples :</span>' + Object.keys(EXEMPLES).map(function (k) {
        return '<button type="button" class="bouton secondaire petit" data-exemple="' + k + '">' + esc(EXEMPLES[k].titre) + '</button>';
      }).join('') + '</div>' +
      '<form id="formBulletin" class="no-print" novalidate>' + formulaireHtml('b', CHAMPS_BULLETIN, valeurs) +
      '<div class="qcm-actions"><button class="bouton" type="submit">Calculer le bulletin</button>' +
      '<button class="bouton secondaire" type="button" id="imprimer" hidden>Imprimer / enregistrer en PDF</button></div></form>' +
      '<div id="resultat" aria-live="polite"></div>';

    var form = main.querySelector('#formBulletin');
    var zone = main.querySelector('#resultat');
    var btnImprimer = main.querySelector('#imprimer');

    function calculer(defiler) {
      var v = lire(form, CHAMPS_BULLETIN);
      stockEcrire('simulateur', v);
      try {
        var saisie = saisieDepuis(v);
        var r = M.calculerBulletin(saisie, parametres);
        zone.innerHTML = bulletinHtml(r, saisie);
        btnImprimer.hidden = false;
        if (defiler) zone.scrollIntoView({ behavior: 'smooth' });
      } catch (e) {
        zone.innerHTML = erreurHtml(e);
        btnImprimer.hidden = true;
      }
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); calculer(true); });
    btnImprimer.addEventListener('click', function () { window.print(); });
    main.querySelectorAll('[data-exemple]').forEach(function (b) {
      b.addEventListener('click', function () {
        var base = {};
        CHAMPS_BULLETIN.forEach(function (c) { if (c.id) base[c.id] = c.def; });
        var v = Object.assign(base, EXEMPLES[b.dataset.exemple].valeurs);
        form.innerHTML = formulaireHtml('b', CHAMPS_BULLETIN, v) + form.querySelector('.qcm-actions').outerHTML;
        btnImprimer = form.querySelector('#imprimer');
        btnImprimer.addEventListener('click', function () { window.print(); });
        calculer(true);
      });
    });
    calculer(false);
  }

  /* ================================================================== */
  /* CALCULATEURS RAPIDES                                                */
  /* ================================================================== */
  function tableauResultat(lignes, formule, reference) {
    return '<div class="resultat"><dl>' + lignes.map(function (l) {
      return '<div class="' + (l[2] ? 'fort' : '') + '"><dt>' + esc(l[0]) + '</dt><dd>' + l[1] + '</dd></div>';
    }).join('') + '</dl>' +
      (formule ? '<p class="formule-rappel"><strong>Formule :</strong> ' + esc(formule) + '</p>' : '') +
      (reference ? '<p class="param-note">Référence : ' + esc(reference) + '</p>' : '') + '</div>';
  }

  var CALCULATEURS = [
    {
      id: 'hs', titre: 'Heures supplémentaires (une semaine)',
      champs: [
        { id: 'heures', label: 'Heures travaillées dans la semaine', type: 'num', def: 46 },
        { id: 'taux', label: 'Taux horaire brut (€)', type: 'num', def: 14 },
        { id: 'm1', label: 'Majoration 1er palier (%)', type: 'num', def: 25 },
        { id: 'm2', label: 'Majoration au-delà (%)', type: 'num', def: 50 }
      ],
      calcul: function (v) {
        var r = M.heuresSupSemaine(v.heures, v.taux, { majorationPremierTaux: v.m1, majorationSecondTaux: v.m2 });
        return tableauResultat([
          ['Heures au 1er taux (36e à 43e)', nb(r.heuresPremierTaux) + ' h → ' + eur(r.montantPremierTaux)],
          ['Heures au 2nd taux (dès la 44e)', nb(r.heuresSecondTaux) + ' h → ' + eur(r.montantSecondTaux)],
          ['Total brut des heures supplémentaires', eur(r.total), true]
        ], 'min(HS ; 8) × taux × (1 + m1) + max(HS − 8 ; 0) × taux × (1 + m2)', 'C. trav. art. L3121-33 et L3121-36');
      }
    },
    {
      id: 'hc', titre: 'Heures complémentaires (temps partiel)',
      champs: [
        { id: 'heures', label: 'Heures travaillées dans la semaine', type: 'num', def: 23 },
        { id: 'contrat', label: 'Durée contractuelle hebdomadaire (h)', type: 'num', def: 20 },
        { id: 'taux', label: 'Taux horaire brut (€)', type: 'num', def: 12.5 },
        { id: 'tiers', label: 'Accord autorisant jusqu\'au tiers', type: 'check', def: true }
      ],
      calcul: function (v) {
        var r = M.heuresComplementairesSemaine(v.heures, v.contrat, v.taux, { accordTiers: v.tiers });
        return tableauResultat([
          ['Dans la limite du 1/10e (+10 %)', nb(r.heuresDixieme) + ' h → ' + eur(r.montantDixieme)],
          ['Au-delà du 1/10e (+25 %)', nb(r.heuresAuDela) + ' h → ' + eur(r.montantAuDela)],
          ['Total brut', eur(r.total), true]
        ], 'HC ≤ 1/10e : +10 % ; au-delà (si accord, jusqu\'au 1/3) : +25 %', 'C. trav. art. L3123-20, L3123-28, L3123-29');
      }
    },
    {
      id: 'cp', titre: 'Indemnité de congés payés (1/10e ou maintien)',
      champs: [
        { id: 'ref', label: 'Rémunération brute de la période de référence (€)', type: 'num', def: 30000 },
        { id: 'acquis', label: 'Jours ouvrables acquis', type: 'num', def: 30 },
        { id: 'pris', label: 'Jours ouvrables pris', type: 'num', def: 12 },
        { id: 'salaire', label: 'Salaire mensuel actuel (€)', type: 'num', def: 2400 },
        { id: 'joursMois', label: 'Jours ouvrables du mois de prise', type: 'num', def: 26 }
      ],
      calcul: function (v) {
        var r = M.indemniteCongesPayes({ remunerationReference: v.ref, joursAcquis: v.acquis, joursPris: v.pris, salaireMensuel: v.salaire, joursOuvrablesMois: v.joursMois });
        return tableauResultat([
          ['Règle du 1/10e', eur(r.dixieme)],
          ['Maintien de salaire', eur(r.maintien)],
          ['Indemnité due (la plus favorable : ' + (r.methodeRetenue === 'dixieme' ? '1/10e' : 'maintien') + ')', eur(r.indemnite), true]
        ], '1/10e = réf. × 10 % × pris / acquis ; maintien = salaire × pris / jours ouvrables du mois', 'C. trav. art. L3141-24');
      }
    },
    {
      id: 'licenciement', titre: 'Indemnité légale de licenciement et préavis',
      champs: [
        { id: 'annees', label: 'Ancienneté : années complètes', type: 'num', def: 12 },
        { id: 'mois', label: 'Ancienneté : mois complets en plus', type: 'num', def: 6 },
        { id: 's12', label: 'Moyenne des 12 derniers mois (€)', type: 'num', def: 3000 },
        { id: 's3', label: 'Moyenne des 3 derniers mois (€)', type: 'num', def: 2900 }
      ],
      calcul: function (v) {
        var anc = Math.round(v.annees * 12 + v.mois);
        var r = M.indemniteLegaleLicenciement({ ancienneteMois: anc, salaireMoyen12Mois: v.s12, salaireMoyen3Mois: v.s3 });
        var preavis = M.dureePreavisLegalMois(anc);
        if (!r.eligible) return tableauResultat([['Indemnité légale', 'Non due : moins de 8 mois d\'ancienneté', true]], null, 'C. trav. art. L1234-9');
        return tableauResultat([
          ['Salaire de référence (le plus favorable)', eur(r.salaireReference)],
          ['Part jusqu\'à 10 ans (1/4 de mois par an)', eur(r.partJusqua10Ans)],
          ['Part au-delà de 10 ans (1/3 de mois par an)', eur(r.partAuDela10Ans)],
          ['Indemnité légale de licenciement', eur(r.indemnite), true],
          ['Préavis légal', preavis === null ? 'Selon convention collective ou usage' : preavis + ' mois'],
          ['Indemnité compensatrice de préavis (si dispensé)', preavis === null ? '—' : eur(M.indemniteCompensatricePreavis(r.salaireReference, preavis))]
        ], 'min(ans ; 10) × 1/4 × salaire + max(ans − 10 ; 0) × 1/3 × salaire', 'C. trav. art. L1234-1, L1234-9, R1234-2. Vérifier l\'indemnité conventionnelle, souvent plus favorable.');
      }
    },
    {
      id: 'cdd', titre: 'Fin de CDD : précarité et congés payés',
      champs: [
        { id: 'total', label: 'Rémunération brute totale du contrat (€)', type: 'num', def: 13200 },
        { id: 'deja', label: 'Indemnités de congés déjà versées (€)', type: 'num', def: 0 },
        { id: 'exclu', label: 'Cas d\'exclusion de la précarité (saisonnier, usage, refus de CDI…)', type: 'check', def: false }
      ],
      calcul: function (v) {
        var r = M.indemnitesFinCDD({ remunerationTotale: v.total, indemnitesCongesDejaVersees: v.deja, exclusionPrecarite: v.exclu });
        return tableauResultat([
          ['Indemnité de précarité (10 %)', eur(r.precarite)],
          ['Indemnité compensatrice de congés payés (1/10e)', eur(r.indemniteCompensatriceConges)],
          ['Total des indemnités de fin de contrat', eur(r.total), true]
        ], 'Précarité = total × 10 % ; ICCP = (total + précarité) × 10 % − ICP déjà versées', 'C. trav. art. L1243-8, L1243-10');
      }
    },
    {
      id: 'maintien', titre: 'Maintien de salaire légal (maladie, AT/MP)',
      champs: [
        { id: 'salaire', label: 'Salaire mensuel brut (€)', type: 'num', def: 2400 },
        { id: 'anciennete', label: 'Ancienneté (années complètes)', type: 'num', def: 3 },
        { id: 'jours', label: 'Durée de l\'arrêt (jours calendaires)', type: 'num', def: 20 },
        { id: 'origine', label: 'Origine', type: 'select', options: [['maladie', 'Maladie non professionnelle'], ['atmp', 'Accident du travail / maladie pro.']], def: 'maladie' },
        { id: 'ij', label: 'IJSS brutes par jour (€)', type: 'num', def: 39.45, aide: 'Montant figurant sur le relevé de la CPAM' },
        { id: 'deja', label: 'Jours déjà indemnisés sur 12 mois', type: 'num', def: 0 }
      ],
      calcul: function (v) {
        var r = M.maintienSalaireLegal({ salaireMensuelBrut: v.salaire, ancienneteAnnees: v.anciennete, joursArret: v.jours, origine: v.origine, ijssJournalieres: v.ij, joursDejaIndemnises12Mois: v.deja });
        if (!r.eligible) return tableauResultat([['Maintien légal', 'Non dû : moins d\'un an d\'ancienneté (vérifier la convention collective)', true]], null, 'C. trav. art. L1226-1');
        return tableauResultat([
          ['Carence employeur', r.carenceEmployeur + ' jours'],
          ['Durée de chaque période', r.dureeParPeriode + ' jours'],
          ['Jours indemnisés à 90 %', r.jours90 + ' j'],
          ['Jours indemnisés aux 2/3', r.jours6666 + ' j'],
          ['Salaire journalier (mensuel / 30)', eur(r.salaireJournalier)],
          ['Garantie brute', eur(r.garantieBrute)],
          ['IJSS sur la même période', eur(r.ijssPeriodeIndemnisee)],
          ['Complément employeur', eur(r.complementEmployeur), true]
        ], 'Complément = jours × salaire journalier × 90 % (puis 2/3) − IJSS', 'C. trav. art. L1226-1, D1226-1 à D1226-8. La convention collective est souvent plus favorable.');
      }
    },
    {
      id: 'plafond', titre: 'Plafond de Sécurité sociale proratisé',
      champs: [
        { id: 'duree', label: 'Durée hebdomadaire contractuelle (h)', type: 'num', def: 24 },
        { id: 'presence', label: 'Jours calendaires de présence (0 = mois complet)', type: 'num', def: 22 },
        { id: 'joursMois', label: 'Jours calendaires du mois', type: 'num', def: 31 }
      ],
      calcul: function (v, p) {
        var pmss = p.plafonds_securite_sociale.pmss_mensuel.valeur;
        var o = { pmss: pmss, dureeHebdoContrat: v.duree };
        if (v.presence > 0) { o.joursCalendairesPresence = v.presence; o.joursCalendairesMois = v.joursMois; }
        return tableauResultat([
          ['PMSS 2026', eur(pmss)],
          ['Plafond proratisé du mois', eur(M.plafondMensuel(o)), true]
        ], 'PMSS × durée contractuelle / 35 × jours de présence / 30', 'CSS art. R242-2 et R242-7');
      }
    },
    {
      id: 'cout', titre: 'Coût employeur rapide',
      champs: [
        { id: 'brut', label: 'Salaire brut mensuel (€)', type: 'num', def: 2500 },
        { id: 'statut', label: 'Statut', type: 'select', options: [['non_cadre', 'Non-cadre'], ['cadre', 'Cadre']], def: 'non_cadre' },
        { id: 'effectif', label: 'Effectif', type: 'num', def: 25 },
        { id: 'at', label: 'Taux AT/MP (%)', type: 'num', def: 1.5 }
      ],
      calcul: function (v, p) {
        var r = M.calculerBulletin({ statut: v.statut, effectif: v.effectif, salaireBase: v.brut, tauxAT: v.at, prelevementSource: { taux: 0 } }, p);
        return tableauResultat([
          ['Salaire brut', eur(r.brut)],
          ['Cotisations patronales', eur(r.totaux.cotisationsPatronales)],
          ['Allègements (réduction générale…)', eur(r.totaux.allegementsPatronaux)],
          ['Coût total employeur', eur(r.coutEmployeur), true],
          ['Net avant impôt du salarié', eur(r.netAvantImpot)],
          ['Ratio coût / net', nb(r.coutEmployeur / r.netAvantImpot)]
        ], 'Coût = brut + cotisations patronales − allègements', r.avertissements.length ? 'Résultat indicatif : ' + r.avertissements.length + ' paramètre(s) À VÉRIFIER utilisé(s).' : null);
      }
    }
  ];

  function calculateurs(main, parametres) {
    main.innerHTML = '<h1>Calculateurs rapides</h1>' +
      '<p class="intro">Chaque calculateur utilise le même moteur que le simulateur de bulletin, avec les paramètres 2026.</p>' +
      '<nav class="sommaire-calc" aria-label="Calculateurs">' + CALCULATEURS.map(function (c) {
        return '<a href="#/calculateurs" data-cible="calc-' + c.id + '">' + esc(c.titre) + '</a>';
      }).join('') + '</nav>' +
      CALCULATEURS.map(function (c) {
        return '<section class="calculateur" id="calc-' + c.id + '" aria-labelledby="t-' + c.id + '">' +
          '<h2 id="t-' + c.id + '">' + esc(c.titre) + '</h2>' +
          '<form data-calc="' + c.id + '" novalidate>' + formulaireHtml(c.id, c.champs) +
          '<div class="qcm-actions"><button class="bouton" type="submit">Calculer</button></div></form>' +
          '<div class="zone-resultat" aria-live="polite"></div></section>';
      }).join('');

    main.querySelector('.sommaire-calc').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cible]'); if (!a) return;
      e.preventDefault();
      var cible = document.getElementById(a.dataset.cible);
      cible.scrollIntoView({ behavior: 'smooth' });
      var premier = cible.querySelector('input, select'); if (premier) premier.focus({ preventScroll: true });
    });

    CALCULATEURS.forEach(function (c) {
      var form = main.querySelector('form[data-calc="' + c.id + '"]');
      var zone = form.nextElementSibling;
      var go = function () {
        try { zone.innerHTML = c.calcul(lire(form, c.champs), parametres); }
        catch (e) { zone.innerHTML = erreurHtml(e); }
      };
      form.addEventListener('submit', function (e) { e.preventDefault(); go(); });
      go();
    });
  }

  window.PagesOutils = { simulateur: simulateur, calculateurs: calculateurs };
})();
