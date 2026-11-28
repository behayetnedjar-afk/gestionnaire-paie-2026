/* Animations légères (CSS + requestAnimationFrame, sans dépendance).
 * Tout est désactivé si l'utilisateur a demandé moins d'animations (prefers-reduced-motion). */
(function () {
  'use strict';
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduit() { return !!(mq && mq.matches); }

  var observateur = null;
  function observer() {
    if (observateur || !('IntersectionObserver' in window)) return observateur;
    observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('revele'); observateur.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    return observateur;
  }

  /** Apparition progressive : les éléments déjà visibles entrent en cascade, les autres au défilement. */
  function reveler(racine) {
    var els = racine.querySelectorAll('.carte, .bloc, .chiffre, .calculateur, .resultats li, .jour-plan, .badge-carte');
    if (reduit()) return;
    var obs = observer();
    var hauteur = window.innerHeight;
    var rang = 0;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < hauteur) {
        el.style.setProperty('--i', Math.min(rang++, 12));
        el.classList.add('entre');
      } else if (obs) {
        el.classList.add('a-reveler');
        obs.observe(el);
      }
    });
  }

  /** Barres de progression : partent de 0 puis atteignent leur valeur (hors QCM en cours). */
  function barres(racine) {
    if (reduit()) return;
    var cibles = [];
    racine.querySelectorAll('.progression > div, .jauge > i').forEach(function (b) {
      if (b.closest('.qcm-en-cours')) return;
      var w = b.style.width;
      if (!w) return;
      b.style.transition = 'none';
      b.style.width = '0';
      cibles.push([b, w]);
    });
    if (!cibles.length) return;
    void racine.offsetWidth; // force le calcul pour que la transition parte de 0
    cibles.forEach(function (c) { c[0].style.transition = ''; c[0].style.width = c[1]; });
  }

  /** Compteurs : le premier nombre du texte défile de 0 à sa valeur ; le texte final est rétabli à l'identique.
   *  Jamais sur les valeurs légales (.chiffres-legaux) : un PMSS ou un SMIC ne doit pas s'afficher faux, même un instant. */
  function compteurs(racine) {
    if (reduit()) return;
    racine.querySelectorAll('.chiffre b, [data-compteur]').forEach(function (el) {
      if (el.closest('.chiffres-legaux')) return;
      var final = el.textContent;
      var m = final.match(/\d[\d\s  ]*(,\d+)?/);
      if (!m) return;
      var brut = m[0];
      var dec = m[1] ? m[1].length - 1 : 0;
      var cible = parseFloat(brut.replace(/[\s  ]/g, '').replace(',', '.'));
      if (!isFinite(cible) || cible === 0) return;
      var debut = null, duree = 700;
      function pas(t) {
        if (!el.isConnected) return;
        if (debut === null) debut = t;
        var p = Math.min(1, (t - debut) / duree);
        var v = cible * (1 - Math.pow(1 - p, 3));
        if (p < 1) {
          el.textContent = final.replace(brut, v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
          requestAnimationFrame(pas);
        } else el.textContent = final;
      }
      requestAnimationFrame(pas);
    });
  }

  /** Transition d'entrée de page (fondu + léger glissement). */
  function entreePage(main) {
    if (reduit()) return;
    main.classList.remove('entree-page');
    void main.offsetWidth;
    main.classList.add('entree-page');
  }

  /** À appeler après chaque rendu de page. */
  function activer(racine) {
    reveler(racine);
    barres(racine);
    compteurs(racine);
  }

  /** Petite célébration : confettis sur un canevas temporaire (≈ 1,6 s). */
  function confettis(n) {
    if (reduit()) return;
    var c = document.createElement('canvas');
    c.className = 'confettis';
    c.setAttribute('aria-hidden', 'true');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    var couleurs = ['#6366f1', '#8b5cf6', '#f97316', '#22c55e', '#eab308', '#ec4899'];
    var parts = [];
    for (var i = 0; i < (n || 110); i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .35,
        vx: (Math.random() - .5) * 13, vy: -Math.random() * 11 - 4,
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .35,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: couleurs[i % couleurs.length]
      });
    }
    var debut = performance.now();
    function cadre(t) {
      var ecoule = t - debut;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.max(0, 1 - ecoule / 1600);
      parts.forEach(function (p) {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (ecoule < 1600) requestAnimationFrame(cadre); else c.remove();
    }
    requestAnimationFrame(cadre);
  }

  /** Message court (toast) annoncé aux lecteurs d'écran. */
  function toast(texte) {
    var zone = document.getElementById('toasts');
    if (!zone) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = texte;
    zone.appendChild(t);
    setTimeout(function () { t.classList.add('sortie'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  /** Inclinaison 3D au survol (cartes d'outils : 6° max ; avatar : 18° max). Un seul écouteur pour tout le document. */
  function inclinaison(e) {
    if (reduit() || e.pointerType === 'touch') return;
    var el = e.target.closest && e.target.closest('.carte-outil, .avatar3d');
    if (!el) return;
    var r = el.getBoundingClientRect();
    var max = el.classList.contains('avatar3d') ? 18 : 6;
    var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    var vX = el.classList.contains('avatar3d') ? '--ax' : '--rx', vY = el.classList.contains('avatar3d') ? '--ay' : '--ry';
    el.style.setProperty(vX, (-y * max).toFixed(2) + 'deg');
    el.style.setProperty(vY, (x * max).toFixed(2) + 'deg');
  }
  document.addEventListener('pointermove', inclinaison, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var el = e.target.closest && e.target.closest('.carte-outil, .avatar3d');
    if (el && !el.contains(e.relatedTarget)) ['--rx', '--ry', '--ax', '--ay'].forEach(function (v) { el.style.removeProperty(v); });
  });

  window.Anim = { reduit: reduit, activer: activer, entreePage: entreePage, confettis: confettis, toast: toast };
})();
