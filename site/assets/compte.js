/* Compte utilisateur (facultatif) : inscription / connexion par e-mail et mot de passe via Supabase Auth,
 * puis synchronisation de la progression (clés « gp: » du localStorage) dans la table progression_sync.
 *
 * - Sans configuration (config.js vide), rien n'est chargé : le site reste 100 % local.
 * - La bibliothèque supabase-js n'est téléchargée que si le compte est configuré.
 * - À la connexion, progression locale et progression en ligne sont FUSIONNÉES (rien n'est perdu),
 *   puis chaque modification locale est envoyée (regroupée toutes les 2,5 s).
 * - Sécurité : la clé « anon » est publique ; chaque ligne n'est lisible et modifiable que par son
 *   propriétaire grâce aux règles Row Level Security (supabase/migrations/0002_progression_sync.sql). */
(function () {
  'use strict';
  var CFG = window.CONFIG || {};
  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  var TABLE = 'progression_sync';
  var configure = !!(CFG.supabaseUrl && CFG.supabaseCleAnon);

  var client = null;
  var etat = { utilisateur: null, synchro: 'inactive', derniere: null, erreur: null };
  var enFusion = false, minuteurEnvoi = null, abonnes = [];

  function notifier() {
    majEntete();
    abonnes.forEach(function (f) { try { f(etat); } catch (e) {} });
  }
  function majEntete() {
    var a = document.getElementById('lienCompte');
    if (!a) return;
    var connecte = !!etat.utilisateur;
    a.classList.toggle('connecte', connecte);
    a.querySelector('span').textContent = connecte ? 'Connecté' : 'Compte';
    a.setAttribute('aria-label', connecte ? 'Mon compte (connecté : ' + etat.utilisateur.email + ')' : 'Mon compte');
    var pied = document.getElementById('piedStockage');
    if (pied) pied.textContent = connecte ? 'Votre progression est synchronisée avec votre compte.' : 'Votre progression est enregistrée dans ce navigateur.';
  }

  function chargerSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = SDK; s.async = true;
      s.onload = ok; s.onerror = function () { ko(new Error('Impossible de charger le module de connexion (réseau ?).')); };
      document.head.appendChild(s);
    });
  }

  /* ---------- fusion des progressions ---------- */
  function parId(a, b, meilleur) {
    var r = {};
    Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (k) {
      var x = a && a[k], y = b && b[k];
      r[k] = !x ? y : !y ? x : meilleur(x, y);
    });
    return r;
  }
  function fusion(L, D) {
    var R = {};
    Object.keys(L).concat(Object.keys(D)).forEach(function (k) {
      if (k in R) return;
      var l = L[k], d = D[k];
      if (l === undefined || l === null) { R[k] = d; return; }
      if (d === undefined || d === null) { R[k] = l; return; }
      switch (k) {
        case 'reponses': case 'oral':
          R[k] = parId(l, d, function (x, y) { return (x.vus || 0) !== (y.vus || 0) ? ((x.vus || 0) > (y.vus || 0) ? x : y) : ((x.date || 0) >= (y.date || 0) ? x : y); });
          break;
        case 'historique':
          var vus = {};
          R[k] = l.concat(d).filter(function (h) { var c = h.date + '|' + h.type; if (vus[c]) return false; vus[c] = 1; return true; })
            .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 300);
          break;
        case 'qcm':
          R[k] = parId(l, d, function (x, y) {
            var plus = (x.tentatives || 0) >= (y.tentatives || 0) ? x : y;
            return { meilleur: Math.max(x.meilleur || 0, y.meilleur || 0), tentatives: Math.max(x.tentatives || 0, y.tentatives || 0), dernier: plus.dernier };
          });
          break;
        case 'lecture':
          R[k] = parId(l, d, function (x, y) {
            return { sections: Object.assign({}, x.sections, y.sections), total: Math.max(x.total || 0, y.total || 0) || undefined };
          });
          break;
        case 'flashcards':
          R[k] = parId(l, d, function (x, y) { return x.echeance !== y.echeance ? (x.echeance > y.echeance ? x : y) : ((x.reps || 0) >= (y.reps || 0) ? x : y); });
          break;
        case 'jours':
          R[k] = parId(l, d, function (x, y) {
            var z = {};
            Object.keys(x).concat(Object.keys(y)).forEach(function (c) { z[c] = Math.max(x[c] || 0, y[c] || 0); });
            return z;
          });
          break;
        case 'planning':
          R[k] = parId(l, d, function (x, y) { return Object.assign({}, x, y); });
          break;
        case 'xp': // le total le plus élevé, récompenses déjà accordées réunies (pas de double gain)
          var base = (l.total || 0) >= (d.total || 0) ? l : d;
          R[k] = { total: base.total || 0, journal: base.journal || [], recompenses: Object.assign({}, d.recompenses, l.recompenses) };
          break;
        case 'statuts': // l'état le plus avancé l'emporte
          var rang = { 'a-faire': 0, 'en-cours': 1, maitrise: 2 };
          R[k] = parId(l, d, function (x, y) { return rang[x] >= rang[y] ? x : y; });
          break;
        default:
          R[k] = l; // réglages (objectif, rappel…) : la valeur de cet appareil l'emporte
      }
    });
    return R;
  }

  /* ---------- échanges avec Supabase ---------- */
  function tirerEtFusionner() {
    if (!client || !etat.utilisateur) return Promise.resolve();
    etat.synchro = 'en-cours'; notifier();
    return client.from(TABLE).select('donnees, maj_le').eq('user_id', etat.utilisateur.id).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      var local = Stock.exporter().donnees;
      var distant = (r.data && r.data.donnees) || {};
      var fusionne = fusion(local, distant);
      enFusion = true;
      Object.keys(fusionne).forEach(function (k) { Stock.ecrire(k, fusionne[k], true); });
      enFusion = false;
      return envoyer();
    }).catch(echec);
  }
  function envoyer() {
    if (!client || !etat.utilisateur) return Promise.resolve();
    etat.synchro = 'en-cours'; notifier();
    return client.from(TABLE).upsert({ user_id: etat.utilisateur.id, donnees: Stock.exporter().donnees, maj_le: new Date().toISOString() })
      .then(function (r) {
        if (r.error) throw r.error;
        etat.synchro = 'ok'; etat.derniere = new Date(); etat.erreur = null; notifier();
      }).catch(echec);
  }
  function echec(e) {
    enFusion = false;
    etat.synchro = 'erreur'; etat.erreur = (e && e.message) || String(e); notifier();
  }
  window.addEventListener('stock:change', function () {
    if (!etat.utilisateur || enFusion) return;
    clearTimeout(minuteurEnvoi);
    minuteurEnvoi = setTimeout(envoyer, 2500);
  });

  function init() {
    majEntete();
    if (!configure) return;
    chargerSdk().then(function () {
      client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseCleAnon, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'paie-auth' }
      });
      client.auth.onAuthStateChange(function (evenement, session) {
        var avant = etat.utilisateur && etat.utilisateur.id;
        etat.utilisateur = session ? session.user : null;
        if (evenement === 'PASSWORD_RECOVERY') { location.hash = '#/compte/nouveau-mot-de-passe'; }
        else if (/access_token=|error_description=/.test(location.hash)) { location.hash = '#/compte'; }
        if (etat.utilisateur && etat.utilisateur.id !== avant) tirerEtFusionner();
        if (!etat.utilisateur) etat.synchro = 'inactive';
        notifier();
      });
    }).catch(echec);
  }

  function exiger() { if (!client) throw new Error('Le module de connexion n\'est pas encore chargé. Réessayez dans un instant.'); }
  function lancer(p) { return p.then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function adresseRetour() { return location.origin + location.pathname; }

  window.Compte = {
    configure: configure,
    etat: function () { return etat; },
    surChangement: function (f) { abonnes.push(f); return function () { abonnes = abonnes.filter(function (x) { return x !== f; }); }; },
    // Le mot de passe est transmis à Supabase Auth (HTTPS), qui le stocke haché : le site ne le conserve jamais.
    inscrire: function (email, mdp, prenom) { exiger(); return lancer(client.auth.signUp({ email: email, password: mdp, options: { emailRedirectTo: adresseRetour(), data: { prenom: prenom || '' } } })); },
    connecter: function (email, mdp) { exiger(); return lancer(client.auth.signInWithPassword({ email: email, password: mdp })); },
    deconnecter: function () { exiger(); return lancer(client.auth.signOut()); },
    motDePasseOublie: function (email) { exiger(); return lancer(client.auth.resetPasswordForEmail(email, { redirectTo: adresseRetour() })); },
    changerMotDePasse: function (mdp) { exiger(); return lancer(client.auth.updateUser({ password: mdp })); },
    synchroniser: tirerEtFusionner,
    supprimerEnLigne: function () {
      exiger();
      return lancer(client.from(TABLE).delete().eq('user_id', etat.utilisateur.id)).then(function () { etat.derniere = null; notifier(); });
    },
    _fusion: fusion
  };

  /* ---------- page « Mon compte » (#/compte) ---------- */
  window.Pages = window.Pages || {};
  window.Pages.compte = function (main, sousPage) {
    var esc = App.esc;
    if (!configure) {
      var nl = window.Jeu ? Jeu.niveau(Jeu.xp().total) : null;
      main.innerHTML = '<div class="qcm"><h1>Mon compte</h1>' +
        (window.Jeu ? '<section class="carte-compte bloc">' + Jeu.avatarHtml('grand') + '<div><p class="niveau-nom">' + esc(Jeu.prenom() || 'Mon profil') + '</p>' +
          '<p class="param-note">' + nl.emoji + ' Niveau ' + nl.rang + ' — ' + esc(nl.nom) + ' · ' + nl.total + ' XP</p>' +
          '<div class="qcm-actions"><a class="bouton petit" href="#/tableau-de-bord">📊 Ma progression</a><a class="bouton petit secondaire" href="#/badges">🏆 Mes badges</a></div></div></section>' : '') +
        '<div class="alerte"><strong>Mode local.</strong> Les comptes ne sont pas encore activés sur ce site : votre progression est enregistrée ' +
        'dans ce navigateur uniquement.</div>' +
        '<p>Pour retrouver votre progression sur un autre appareil, utilisez <strong>Exporter</strong> puis <strong>Importer</strong> dans le ' +
        '<a href="#/tableau-de-bord">tableau de bord</a> (rubrique « Mes données »).</p>' +
        '<form class="question" id="fProfilLocal" novalidate><div class="champ"><label for="pPrenom">Mon prénom <small>(affiché dans l\'avatar, enregistré dans ce navigateur)</small></label>' +
        '<input type="text" id="pPrenom" autocomplete="given-name" maxlength="40" value="' + esc(Stock.lire('profil', {}).prenom || '') + '"></div>' +
        '<div class="qcm-actions"><button class="bouton" type="submit">Enregistrer</button></div><div id="msgC" aria-live="polite"></div></form>' +
        '<p class="param-note">Administrateur du site : la procédure d\'activation (projet Supabase gratuit, clés publiques, règles de sécurité) est décrite dans ' +
        '<code>livrables/06_configuration_compte_supabase.md</code>.</p></div>';
      main.querySelector('#fProfilLocal').onsubmit = function (ev) {
        ev.preventDefault();
        var p = Stock.lire('profil', {});
        p.prenom = main.querySelector('#pPrenom').value.trim().slice(0, 40);
        Stock.ecrire('profil', p);
        main.querySelector('#msgC').innerHTML = '<p class="resultat">Prénom enregistré.</p>';
      };
      return;
    }
    function rendre() {
      var e = etat;
      if (sousPage === 'nouveau-mot-de-passe' && e.utilisateur) {
        main.innerHTML = '<div class="qcm"><h1>Nouveau mot de passe</h1><form class="question" id="fNouveau" novalidate>' +
          '<div class="champ"><label for="nMdp">Nouveau mot de passe <small>(8 caractères minimum)</small></label>' +
          '<input type="password" id="nMdp" autocomplete="new-password" minlength="8" required></div>' +
          '<div class="qcm-actions"><button class="bouton" type="submit">Enregistrer</button></div><div id="msgC" aria-live="polite"></div></form></div>';
        main.querySelector('#fNouveau').onsubmit = function (ev) {
          ev.preventDefault();
          var m = main.querySelector('#nMdp').value;
          if (m.length < 8) return message('Le mot de passe doit contenir au moins 8 caractères.', true);
          Compte.changerMotDePasse(m).then(function () { sousPage = null; message('Mot de passe modifié.'); setTimeout(rendre, 1200); }).catch(function (x) { message(x.message, true); });
        };
        return;
      }
      if (e.utilisateur) {
        var libelleSynchro = { 'en-cours': 'Synchronisation en cours…', ok: 'À jour', erreur: 'Erreur : ' + (e.erreur || ''), inactive: '—' }[e.synchro];
        var n = window.Jeu ? Jeu.niveau(Jeu.xp().total) : null;
        main.innerHTML = '<div class="qcm"><h1>Mon compte</h1>' +
          (window.Jeu ? '<section class="carte-compte bloc">' + Jeu.avatarHtml('grand') + '<div><p class="niveau-nom">' + esc(Jeu.prenom() || 'Bienvenue') + '</p>' +
            '<p class="param-note">' + n.emoji + ' Niveau ' + n.rang + ' — ' + esc(n.nom) + ' · ' + n.total + ' XP</p>' +
            '<div class="jauge" role="progressbar" aria-label="Progression vers le niveau suivant" aria-valuenow="' + n.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + n.pct + '%"></i></div>' +
            '<div class="qcm-actions"><a class="bouton petit" href="#/tableau-de-bord">📊 Ma progression</a><a class="bouton petit secondaire" href="#/badges">🏆 Mes badges</a></div></div></section>' : '') +
          '<div class="bloc"><p>Connecté avec <strong>' + esc(e.utilisateur.email) + '</strong>.</p>' +
          '<dl class="infos-compte"><div><dt>Synchronisation</dt><dd>' + esc(libelleSynchro) + '</dd></div>' +
          '<div><dt>Dernier envoi</dt><dd>' + (e.derniere ? e.derniere.toLocaleString('fr-FR') : '—') + '</dd></div></dl>' +
          '<p class="param-note">Chapitres lus, QCM, examens blancs, flashcards, oral, temps d\'étude et objectifs sont enregistrés sur votre compte ' +
          'et restent aussi disponibles hors connexion dans ce navigateur.</p>' +
          '<div class="qcm-actions"><button type="button" class="bouton" id="cSync">Synchroniser maintenant</button>' +
          '<button type="button" class="bouton secondaire" id="cDeco">Se déconnecter</button>' +
          '<button type="button" class="bouton secondaire" id="cSuppr">Supprimer mes données en ligne</button></div>' +
          '<div id="msgC" aria-live="polite"></div></div></div>';
        main.querySelector('#cSync').onclick = function () { Compte.synchroniser(); };
        main.querySelector('#cDeco').onclick = function () { Compte.deconnecter().catch(function (x) { message(x.message, true); }); };
        main.querySelector('#cSuppr').onclick = function () {
          var z = main.querySelector('#msgC');
          z.innerHTML = '<div class="alerte"><p><strong>Supprimer la copie en ligne de votre progression ?</strong> Les données de ce navigateur sont conservées. ' +
            'Pour supprimer le compte lui-même, contactez l\'administrateur du site.</p><div class="qcm-actions">' +
            '<button type="button" class="bouton" id="sOui">Oui, supprimer</button><button type="button" class="bouton secondaire" id="sNon">Annuler</button></div></div>';
          z.querySelector('#sOui').onclick = function () {
            Compte.supprimerEnLigne().then(function () { return Compte.deconnecter(); }).then(function () { message('Données en ligne supprimées, vous êtes déconnecté.'); })
              .catch(function (x) { message(x.message, true); });
          };
          z.querySelector('#sNon').onclick = function () { z.innerHTML = ''; };
          z.querySelector('#sNon').focus();
        };
        return;
      }
      var inscription = sousPage === 'inscription';
      main.innerHTML = '<div class="qcm"><h1>' + Icone('utilisateur', 'ico-titre') + ' ' + (inscription ? 'Créer un compte' : 'Se connecter') + '</h1>' +
        '<p>Un compte permet de retrouver votre progression sur tous vos appareils. Sans compte, elle reste dans ce navigateur.</p>' +
        '<div class="onglets" role="tablist" aria-label="Connexion ou inscription">' +
        '<a role="tab" href="#/compte" aria-selected="' + !inscription + '">Connexion</a>' +
        '<a role="tab" href="#/compte/inscription" aria-selected="' + inscription + '">Inscription</a></div>' +
        '<form class="question" id="fCompte" novalidate>' +
        (inscription ? '<div class="champ"><label for="cPrenom">Prénom <small>(affiché dans votre avatar)</small></label><input type="text" id="cPrenom" autocomplete="given-name" maxlength="40"></div>' : '') +
        '<div class="champ"><label for="cEmail">Adresse e-mail</label><input type="email" id="cEmail" autocomplete="email" required></div>' +
        '<div class="champ"><label for="cMdp">Mot de passe' + (inscription ? ' <small>(8 caractères minimum)</small>' : '') + '</label>' +
        '<input type="password" id="cMdp" autocomplete="' + (inscription ? 'new-password' : 'current-password') + '" minlength="8" required></div>' +
        '<div class="qcm-actions"><button class="bouton" type="submit">' + (inscription ? 'Créer mon compte' : 'Se connecter') + '</button>' +
        (inscription ? '' : '<button class="bouton secondaire" type="button" id="cOubli">Mot de passe oublié</button>') + '</div>' +
        '<div id="msgC" aria-live="polite"></div></form>' +
        '<p class="param-note">Votre progression locale actuelle sera fusionnée avec celle du compte : rien n\'est perdu.</p></div>';
      var email = main.querySelector('#cEmail'), mdp = main.querySelector('#cMdp');
      main.querySelector('#fCompte').onsubmit = function (ev) {
        ev.preventDefault();
        if (!email.value || !/^\S+@\S+\.\S+$/.test(email.value)) return message('Saisissez une adresse e-mail valide.', true, email);
        if (mdp.value.length < 8) return message('Le mot de passe doit contenir au moins 8 caractères.', true, mdp);
        var bouton = ev.target.querySelector('[type=submit]'); bouton.disabled = true;
        var champPrenom = main.querySelector('#cPrenom');
        (inscription ? Compte.inscrire(email.value, mdp.value, champPrenom ? champPrenom.value.trim() : '') : Compte.connecter(email.value, mdp.value)).then(function (d) {
          if (inscription && (!d || !d.session)) message('Compte créé. Ouvrez le lien de confirmation reçu par e-mail, puis connectez-vous.');
        }).catch(function (x) { message(traduire(x.message), true); }).then(function () { bouton.disabled = false; });
      };
      var oubli = main.querySelector('#cOubli');
      if (oubli) oubli.onclick = function () {
        if (!email.value) return message('Saisissez d\'abord votre adresse e-mail.', true, email);
        Compte.motDePasseOublie(email.value).then(function () { message('Si un compte existe pour cette adresse, un lien de réinitialisation vient d\'être envoyé.'); })
          .catch(function (x) { message(traduire(x.message), true); });
      };
    }
    function traduire(m) {
      if (/Invalid login credentials/i.test(m)) return 'Adresse e-mail ou mot de passe incorrect.';
      if (/Email not confirmed/i.test(m)) return 'Adresse e-mail non confirmée : ouvrez le lien reçu par e-mail.';
      if (/already registered/i.test(m)) return 'Un compte existe déjà avec cette adresse.';
      if (/rate limit/i.test(m)) return 'Trop de tentatives. Patientez quelques minutes.';
      return m;
    }
    function message(t, erreur, champ) {
      var z = main.querySelector('#msgC');
      if (z) z.innerHTML = '<p class="resultat' + (erreur ? ' resultat-erreur' : '') + '">' + esc(t) + '</p>';
      if (champ) { champ.setAttribute('aria-invalid', 'true'); champ.focus(); }
    }
    rendre();
    var stop = Compte.surChangement(function () { if (main.isConnected && /^#\/compte/.test(location.hash)) rendre(); });
    App.surDepart(stop);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
