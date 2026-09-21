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

  /* ---------- Carrusel de productos ----------------------------------- */
  var track = document.getElementById('prodTrack');
  var prev  = document.getElementById('prodPrev');
  var next  = document.getElementById('prodNext');

  if (track && prev && next) {
    function step() {
      var first = track.querySelector('.product');
      if (!first) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    function syncArrows() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    }

    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left:  step(), behavior: 'smooth' }); });

    track.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    syncArrows();
  }

  /* ---------- GSAP ----------------------------------------------------
     Solo posición y escala. Nunca opacity: si GSAP no carga, todo
     el contenido ya es visible por CSS.                                */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    gsap.from('.product', {
      y: 40, duration: 0.7, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: '.carousel', start: 'top 85%' }
    });

    gsap.from('.cta-copy, .cta-btn', {
      y: 32, duration: 0.75, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '.cta-final', start: 'top 80%' }
    });

    /* Flores: giro lento ligado al scroll */
    document.querySelectorAll('.flor').forEach(function (el, i) {
      gsap.to(el, {
        rotation: i % 2 === 0 ? 70 : -70,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
      });
    });
  }
})();
