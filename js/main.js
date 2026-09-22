/* ============================================================
   BRANDÍSIMAS — main.js
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Datos de contacto -------------------------------------- */
  var WHATSAPP = '56982879392';                       // sin +, sin espacios
  var WA_TEXT  = 'Hola Brandísimas! Quiero cotizar el patch bar para mi evento.';
  var INSTAGRAM = 'https://www.instagram.com/brandisimas.cl';

  var WA_URL = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(WA_TEXT);

  document.querySelectorAll('[data-wa]').forEach(function (el) {
    el.href = WA_URL;
    el.target = '_blank';
    el.rel = 'noopener';
  });

  document.querySelectorAll('[data-ig]').forEach(function (el) {
    el.href = INSTAGRAM;
  });

  /* ---------- Año del footer ---------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Loader ------------------------------------------------- */
  var loader = document.getElementById('loader');
  window.addEventListener('load', function () {
    if (loader) loader.classList.add('is-done');
  });

  /* ---------- Navbar: clase .scrolled a los 50px --------------------- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menú móvil --------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');

  function closeMenu() {
    if (!links || !toggle) return;
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Carrusel infinito de productos --------------------------
     Se clona el set completo a cada lado y se salta el scroll un set
     entero al llegar a un borde. El salto es instantáneo, así que la
     costura no se ve y las flechas nunca se topan con un extremo.     */
  var track = document.getElementById('prodTrack');
  var prev  = document.getElementById('prodPrev');
  var next  = document.getElementById('prodNext');

  if (track && prev && next) {
    var originals = Array.prototype.slice.call(track.children);
    var setLen = originals.length;

    // Un set antes y otro después de los originales.
    var before = document.createDocumentFragment();
    var after  = document.createDocumentFragment();
    originals.forEach(function (li) {
      var a = li.cloneNode(true);
      var b = li.cloneNode(true);
      [a, b].forEach(function (c) {
        c.setAttribute('data-clone', '');
        c.setAttribute('aria-hidden', 'true');
        c.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      });
      before.appendChild(a);
      after.appendChild(b);
    });
    track.insertBefore(before, track.firstChild);
    track.appendChild(after);

    var setWidth = 0;

    function measure() {
      var items = track.children;
      if (!items.length) return 0;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var w = items[0].getBoundingClientRect().width + gap;
      setWidth = w * setLen;
      return w;
    }

    function jump(delta) {
      var prevBehavior = track.style.scrollBehavior;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft += delta;
      // forzar reflow para que el navegador aplique el salto sin animar
      void track.offsetWidth;
      track.style.scrollBehavior = prevBehavior;
    }

    function recenter() {
      if (!setWidth) return;
      if (track.scrollLeft < setWidth * 0.5) jump(setWidth);
      else if (track.scrollLeft > setWidth * 1.5) jump(-setWidth);
    }

    function reset() {
      measure();
      jump(setWidth - track.scrollLeft);
    }

    /* El recentrado nunca interrumpe una animación en curso:
       con arrastre manual se hace al quedar quieto, y con las flechas
       justo ANTES de animar. Si se hiciera durante el scroll suave, el
       salto se come el avance del click en la costura. */
    var idle;
    track.addEventListener('scroll', function () {
      clearTimeout(idle);
      idle = setTimeout(recenter, 140);
    }, { passive: true });

    function move(dir) {
      var itemWidth = measure();
      recenter();
      track.scrollBy({ left: dir * itemWidth, behavior: reduced ? 'auto' : 'smooth' });
    }

    prev.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });

    window.addEventListener('resize', reset);
    reset();
    // Las imágenes cambian el layout al cargar; recentrar cuando terminen.
    window.addEventListener('load', reset);
  }

  /* ---------- GSAP ----------------------------------------------------
     Solo posición, escala y rotación. Nunca opacity: si GSAP no carga,
     todo el contenido ya es visible por CSS.                           */
  if (window.gsap && window.ScrollTrigger && !reduced) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.from('.hero-copy h1',      { y: 34, duration: 0.8, ease: 'power3.out', delay: 0.9 });
    gsap.from('.hero-lead',         { y: 26, duration: 0.8, ease: 'power3.out', delay: 1.02 });
    gsap.from('.hero-actions .btn', { y: 22, duration: 0.7, ease: 'power3.out', delay: 1.14, stagger: 0.08 });
    gsap.from('.hero-media img',    { y: 40, scale: 0.96, duration: 1, ease: 'power3.out', delay: 0.95 });

    document.querySelectorAll('.banner').forEach(function (el) {
      gsap.from(el, {
        scale: 0.9, y: 18, duration: 0.6, ease: 'back.out(1.6)',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    gsap.from('.step', {
      y: 46, duration: 0.75, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.steps-grid', start: 'top 82%' }
    });

    document.querySelectorAll('.service').forEach(function (el) {
      gsap.from(el, {
        y: 44, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 82%' }
      });
    });

    gsap.from('.barra-box', {
      y: 44, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.barra-box', start: 'top 85%' }
    });

    gsap.from('.barra-pills li', {
      x: 34, duration: 0.6, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: '.barra-pills', start: 'top 85%' }
    });

    // Solo los originales: los clones del carrusel ya entran colocados.
    gsap.from('.product:not([data-clone])', {
      y: 40, duration: 0.7, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: '.carousel', start: 'top 85%' }
    });

    gsap.from('.cta-copy, .cta-btn', {
      y: 32, duration: 0.75, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '.cta-final', start: 'top 80%' }
    });

    /* --- Flores: giro lento ligado al scroll (sobre el contenedor) --- */
    document.querySelectorAll('.flor').forEach(function (el, i) {
      gsap.to(el, {
        rotation: i % 2 === 0 ? 70 : -70,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
      });
    });

    /* --- Easter egg: click en una flor = vuelta completa -------------
       Gira la marca interna, no el contenedor, para no pelear con el
       scrub de arriba.                                               */
    document.querySelectorAll('.flor-mark').forEach(function (mark) {
      mark.addEventListener('click', function () {
        if (gsap.isTweening(mark)) return;          // ignora el doble click
        gsap.fromTo(mark,
          { rotation: 0, scale: 1 },
          { rotation: 360, scale: 1.12, duration: 0.5, ease: 'power2.in',
            onComplete: function () {
              gsap.to(mark, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' });
              gsap.set(mark, { rotation: 0 });
            }
          });
      });
    });

    /* --- Tilt con parallax de mouse en las imágenes ------------------
       Excluye el carrusel a propósito: ahí el movimiento compite con
       el scroll horizontal.                                          */
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (finePointer) {
      document.querySelectorAll('[data-tilt]').forEach(function (img) {
        var zone = img.parentElement;
        var MAX = 9;      // grados
        var LIFT = 10;    // px que "flota"

        var rx = gsap.quickTo(img, 'rotationX', { duration: 0.5, ease: 'power2.out' });
        var ry = gsap.quickTo(img, 'rotationY', { duration: 0.5, ease: 'power2.out' });
        var ty = gsap.quickTo(img, 'y',         { duration: 0.5, ease: 'power2.out' });
        var sc = gsap.quickTo(img, 'scale',     { duration: 0.5, ease: 'power2.out' });

        zone.addEventListener('mousemove', function (e) {
          var b = zone.getBoundingClientRect();
          var px = (e.clientX - b.left) / b.width  - 0.5;   // -0.5 .. 0.5
          var py = (e.clientY - b.top)  / b.height - 0.5;
          rx(-py * MAX * 2);
          ry(px * MAX * 2);
          ty(-LIFT);
          sc(1.03);
        });

        zone.addEventListener('mouseleave', function () {
          rx(0); ry(0); ty(0); sc(1);
        });
      });
    }
  }
})();
