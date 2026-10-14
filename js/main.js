/* ============================================================
   BRANDÍSIMAS · Rediseño 3 · main.js
   Reglas: todo es visible sin JS. GSAP solo mueve, escala, rota,
   recorta o filtra; nunca toca opacity.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine    = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------- Contacto ----------------------------------------------- */
  var WHATSAPP  = '56982879392';
  var WA_TEXT   = 'Hola Brandísimas! Quiero cotizar el stand de estampado para mi evento.';
  var INSTAGRAM = 'https://www.instagram.com/brandisimas.cl';

  function waUrl(text) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
  }
  document.querySelectorAll('[data-wa]').forEach(function (el) {
    el.href = waUrl(WA_TEXT);
    el.target = '_blank';
    el.rel = 'noopener';
  });
  document.querySelectorAll('[data-ig]').forEach(function (el) { el.href = INSTAGRAM; });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave (Lenis) ----------------------------------- */
  var lenis = null;
  if (!reduced && window.Lenis && hasGsap) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollVelocity() {
    return lenis ? (lenis.velocity || 0) : 0;
  }

  /* ---------- Fichero: carpetas que se apilan ------------------------
     Cada carpeta se pega en --T (bajo la navbar + fila de pestañas).
     Si es más alta que la pantalla, se pega recién cuando su borde
     inferior llega al fondo, así nunca se esconde contenido.        */
  var nav     = document.getElementById('nav');
  var cabinet = document.getElementById('cabinet');
  var folders = Array.prototype.slice.call(document.querySelectorAll('.folder'));
  var anchors = folders.map(function (f) { return f.previousElementSibling; });
  var T = 0, gapTop = 0;

  function layoutStack() {
    var tab = folders[0].querySelector('.folder-tab');
    var tabH = tab.offsetHeight;
    var cs = getComputedStyle(folders[1] || folders[0]);
    gapTop = parseFloat(cs.marginTop) || 0;               // tab-h + tab-gap
    T = Math.round(nav.getBoundingClientRect().bottom + 12 + tabH);
    root.style.setProperty('--T', T + 'px');
    var vh = window.innerHeight;
    var tallBefore = false;
    folders.forEach(function (f) {
      var top = Math.min(T, vh - f.offsetHeight);
      f.style.setProperty('--top', top + 'px');
      // Tras una carpeta más alta que la pantalla, la franja sobre la
      // pestaña mostraría su contenido: se tapa con el color de la mesa.
      f.classList.toggle('has-collar', tallBefore);
      if (top < T) tallBefore = true;
    });
  }

  cabinet.classList.add('js-stack');
  layoutStack();

  /* Posición natural (sin sticky) de la hoja de una carpeta */
  function folderY(i) {
    return anchors[i].getBoundingClientRect().top + window.scrollY + gapTop - T;
  }

  /* ---------- Navegación con anclas ---------------------------------- */
  function goTo(hash) {
    var el = document.querySelector(hash);
    if (!el) return;
    var i = anchors.indexOf(el);
    var y = i > -1 ? folderY(i) : el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var hash = a.getAttribute('href');
      if (hash.length < 2) return;
      e.preventDefault();
      closeMenu();
      goTo(hash);
      history.replaceState(null, '', hash);
    });
  });

  /* ---------- Menú móvil --------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');

  function closeMenu() {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
  }
  toggle.addEventListener('click', function () {
    var open = !links.classList.contains('open');
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', function (e) {
    if (links.classList.contains('open') && !nav.contains(e.target)) closeMenu();
  });

  /* ---------- Indicador de sección activa en la navbar --------------- */
  var navInk = document.querySelector('.nav-ink');
  var navA = Array.prototype.slice.call(links.querySelectorAll('[data-nav]'));

  function setActive(id) {
    var hit = null;
    navA.forEach(function (a) {
      var on = a.getAttribute('data-nav') === id;
      a.classList.toggle('is-active', on);
      if (on) hit = a;
    });
    if (hit) {
      navInk.style.setProperty('--x', (hit.offsetLeft + 14) + 'px');
      navInk.style.setProperty('--w', (hit.offsetWidth - 28) + 'px');
    } else {
      navInk.style.setProperty('--w', '0px');
    }
  }

  /* ---------- Formulario de cotización -------------------------------
     Sin backend: arma el mensaje y abre WhatsApp.                    */
  var form = document.getElementById('quoteForm');
  var setTipo = function () {};

  if (form) {
    var done        = document.getElementById('quoteDone');
    var doneName    = document.getElementById('doneName');
    var doneSummary = document.getElementById('doneSummary');
    var doneWa      = document.getElementById('doneWa');
    var resetBtn    = document.getElementById('quoteReset');
    var errorBox    = document.getElementById('formError');
    var orgLabel    = document.getElementById('orgLabel');
    var orgInput    = document.getElementById('orgInput');
    var tipoBtns    = Array.prototype.slice.call(form.querySelectorAll('[data-tipo]'));
    var prodBtns    = Array.prototype.slice.call(form.querySelectorAll('[data-prod]'));
    var tipo = 'Celebración';

    var setOn = function (btn, on) {
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    };

    setTipo = function (t) {
      tipo = t;
      tipoBtns.forEach(function (b) { setOn(b, b.getAttribute('data-tipo') === t); });
      var emp = t === 'Empresa';
      orgLabel.textContent = emp ? 'Empresa' : 'Tipo de celebración';
      orgInput.placeholder = emp ? 'Nombre de la empresa' : 'Cumpleaños, matrimonio…';
    };

    tipoBtns.forEach(function (b) {
      b.addEventListener('click', function () { setTipo(b.getAttribute('data-tipo')); });
    });
    prodBtns.forEach(function (b) {
      b.addEventListener('click', function () { setOn(b, !b.classList.contains('is-on')); });
    });
    document.querySelectorAll('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () { setTipo(a.getAttribute('data-pick')); });
    });

    var clearErrors = function () {
      errorBox.hidden = true;
      form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    };

    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('is-invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      var invalid = Array.prototype.filter.call(form.elements, function (el) {
        return el.willValidate && !el.checkValidity();
      });
      if (invalid.length) {
        invalid.forEach(function (el) { el.classList.add('is-invalid'); });
        errorBox.textContent = 'Revisa los campos marcados: nombre, un email válido y el número de invitados.';
        errorBox.hidden = false;
        invalid[0].focus();
        return;
      }

      var f = new FormData(form);
      var val = function (k) { return String(f.get(k) || '').trim(); };
      var emp = tipo === 'Empresa';
      var prods = prodBtns
        .filter(function (b) { return b.classList.contains('is-on'); })
        .map(function (b) { return b.getAttribute('data-prod'); });

      var fecha = val('fecha');
      if (fecha) fecha = fecha.split('-').reverse().join('-');

      var lines = [
        'Hola Brandísimas! Quiero cotizar el stand para mi evento.',
        '',
        '*Tipo de evento:* ' + tipo,
        '*Nombre:* ' + val('nombre')
      ];
      if (val('org'))      lines.push('*' + (emp ? 'Empresa' : 'Tipo de celebración') + ':* ' + val('org'));
      lines.push('*Email:* ' + val('email'));
      if (val('telefono')) lines.push('*Teléfono:* ' + val('telefono'));
      if (fecha)           lines.push('*Fecha del evento:* ' + fecha);
      lines.push('*Invitados:* ' + val('invitados'));
      if (prods.length)    lines.push('*Productos:* ' + prods.join(', '));
      if (val('mensaje'))  lines.push('', val('mensaje'));

      var url = waUrl(lines.join('\n'));

      doneName.textContent = val('nombre').split(' ')[0];
      doneSummary.textContent =
        (emp ? 'un evento de empresa' : 'una celebración') +
        ' (' + val('invitados').toLowerCase() + ' invitados' +
        (prods.length ? ', ' + prods.join(', ').toLowerCase() : '') + ')';
      doneWa.href = url;

      form.hidden = true;
      done.hidden = false;
      window.open(url, '_blank', 'noopener');
    });

    resetBtn.addEventListener('click', function () {
      form.reset();
      prodBtns.forEach(function (b) { setOn(b, false); });
      setTipo('Celebración');
      clearErrors();
      done.hidden = true;
      form.hidden = false;
    });
  }

  /* ---------- Resorte (modelo de Apple: damping + response) ----------
     Arranca siempre desde el valor actual y con la velocidad que trae
     el gesto, así no hay salto entre arrastre y animación.           */
  function Spring(opts) {
    this.x = 0; this.v = 0; this.target = 0;
    this.k = Math.pow(2 * Math.PI / opts.response, 2);
    this.c = 4 * Math.PI * opts.damping / opts.response;
  }
  Spring.prototype.step = function (dt) {
    var n = 4, h = dt / n;
    for (var i = 0; i < n; i++) {
      var a = -this.k * (this.x - this.target) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return Math.abs(this.v) > 0.02 || Math.abs(this.x - this.target) > 0.02;
  };

  if (!hasGsap) {
    setActive(null);
    return;
  }

  /* ---------- Navbar: estado con scroll ------------------------------ */
  ScrollTrigger.create({
    start: 50, end: 'max',
    onToggle: function (self) { nav.classList.toggle('scrolled', self.isActive); }
  });

  anchors.forEach(function (a, i) {
    var id = a.id;
    var navId = navA.some(function (n) { return n.getAttribute('data-nav') === id; }) ? id : null;
    ScrollTrigger.create({
      trigger: a,
      start: 'top 55%',
      endTrigger: anchors[i + 1] || cabinet,
      end: anchors[i + 1] ? 'top 55%' : 'bottom 55%',
      onToggle: function (self) { if (self.isActive) setActive(navId); },
      onLeave: function () { if (!anchors[i + 1]) setActive(null); },
      onLeaveBack: function () { if (i === 0) setActive(null); }
    });
  });

  /* ---------- Atenuar la carpeta que queda debajo -------------------- */
  folders.forEach(function (f, i) {
    if (i === folders.length - 1) return;
    gsap.fromTo(f.querySelector('.folder-sheet'), { filter: 'brightness(1)' }, {
      filter: 'brightness(0.62)',
      ease: 'none',
      scrollTrigger: {
        trigger: anchors[i + 1],
        start: 'top bottom',
        end: function () { return 'top ' + (T - gapTop) + 'px'; },
        scrub: true
      }
    });
  });

  /* ---------- Documentos que salen de la carpeta --------------------- */
  if (!reduced) {
    folders.forEach(function (f, i) {
      var docs = f.querySelectorAll('[data-pull]');
      docs.forEach(function (d, k) {
        gsap.fromTo(d, { yPercent: d.classList.contains('doc--step') ? 46 : 34 }, {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: anchors[i],
            start: function () { return 'top ' + (window.innerHeight * (0.92 - k * 0.06)) + 'px'; },
            end: function () { return 'top ' + (T - gapTop - k * 40) + 'px'; },
            scrub: 0.8
          }
        });
      });
    });
  }

  /* ---------- Hero ---------------------------------------------------- */
  var slogan = document.querySelector('.slogan');
  var floats = Array.prototype.slice.call(document.querySelectorAll('.float'));

  if (!reduced) {
    // Entrada (el loader se va a los ~1s)
    var intro = gsap.timeline({ delay: 1.0 });
    intro
      .from('.slogan-in', { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.09 }, 0)
      .fromTo('.slogan-in', { letterSpacing: '0.06em' }, { letterSpacing: '0em', duration: 1.5, ease: 'expo.out', stagger: 0.09 }, 0.05)
      .from('.frame', {
        y: 150, scale: 0.85,
        rotation: function (i) { return [-6, 5, -4][i]; },
        duration: 1.35, ease: 'expo.out', stagger: 0.09
      }, 0.3)
      .from('.seal', { scale: 0, duration: 1, ease: 'back.out(1.6)' }, 0.7)
      .from('.hero-copy > *', { y: 34, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.5);

    // Flote continuo, cada foto a su ritmo
    document.querySelectorAll('.f-bob').forEach(function (b, i) {
      gsap.to(b, {
        y: [12, -14, 10][i], rotation: [1.6, -1.4, 1.2][i],
        duration: [3.4, 4.1, 3.8][i], ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.4
      });
    });

    // Scroll: las fotos se van a distinta velocidad y la consigna se comprime
    var heroScroll = gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
    heroScroll
      .to(slogan, { yPercent: 22, scale: 0.92, ease: 'none' }, 0)
      .to(floats[0], { y: -240, rotation: -5, ease: 'none' }, 0)
      .to(floats[1], { y: -150, rotation: 6, ease: 'none' }, 0)
      .to(floats[2], { y: -320, rotation: -6, ease: 'none' }, 0)
      .to('.hero-waves', { yPercent: 8, ease: 'none' }, 0)
      .to('.hero-copy', { y: 70, ease: 'none' }, 0);

    // Parallax con el mouse (profundidad distinta por foto)
    if (fine) {
      var hero = document.querySelector('.hero');
      var pars = floats.map(function (f) {
        var el = f.querySelector('.f-par');
        return {
          d: parseFloat(f.getAttribute('data-depth')) || 1,
          x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' })
        };
      });
      var sx = gsap.quickTo('.slogan-line', 'x', { duration: 1.1, ease: 'power3.out' });
      hero.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5;
        var ny = e.clientY / window.innerHeight - 0.5;
        pars.forEach(function (p) { p.x(nx * 34 * p.d); p.y(ny * 26 * p.d); });
        sx(nx * -10);
      });
      hero.addEventListener('pointerleave', function () {
        pars.forEach(function (p) { p.x(0); p.y(0); });
        sx(0);
      });
    }
  }

  /* ---------- Arrastrar y lanzar las fotos --------------------------- */
  if (fine && !reduced) {
    document.querySelectorAll('.f-drag').forEach(function (el) {
      var sx = new Spring({ damping: 0.72, response: 0.55 });
      var sy = new Spring({ damping: 0.72, response: 0.55 });
      var sr = new Spring({ damping: 0.6, response: 0.45 });
      var set = gsap.quickSetter(el, 'css');
      var dragging = false, running = false, ox = 0, oy = 0, hist = [];
      var floatEl = el.closest('.float');

      function render() { set({ x: sx.x, y: sy.x, rotation: sr.x }); }

      function tick() {
        var dt = Math.min(gsap.ticker.deltaRatio() / 60, 1 / 30);
        var a = sx.step(dt), b = sy.step(dt), c = sr.step(dt);
        render();
        if (!(a || b || c)) { gsap.ticker.remove(tick); running = false; floatEl.style.zIndex = ''; }
      }

      el.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        dragging = true;
        if (running) { gsap.ticker.remove(tick); running = false; }
        // Respeta el punto de agarre y parte desde donde está
        ox = e.clientX - sx.x; oy = e.clientY - sy.x;
        sx.v = sy.v = sr.v = 0;
        hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
        el.classList.add('is-grab');
        floatEl.style.zIndex = 8;
      });

      el.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var now = performance.now();
        hist.push({ x: e.clientX, y: e.clientY, t: now });
        while (hist.length > 2 && now - hist[0].t > 90) hist.shift();
        var h0 = hist[0], dtv = Math.max(now - h0.t, 1) / 1000;
        var vx = (e.clientX - h0.x) / dtv;
        sx.x = e.clientX - ox;
        sy.x = e.clientY - oy;
        sr.x = Math.max(-18, Math.min(18, vx * 0.012));
        render();
      });

      function release(e) {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('is-grab');
        var now = performance.now();
        var h0 = hist[0] || { x: e.clientX, y: e.clientY, t: now - 16 };
        var dtv = Math.max(now - h0.t, 1) / 1000;
        // Entrega la velocidad del dedo al resorte
        sx.v = (e.clientX - h0.x) / dtv;
        sy.v = (e.clientY - h0.y) / dtv;
        if (now - h0.t > 120) { sx.v = sy.v = 0; }
        if (!running) { gsap.ticker.add(tick); running = true; }
      }
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
    });
  }

  /* ---------- Sello: solo gira el texto; el isotipo queda quieto ---- */
  var ring = document.querySelector('.seal-ring');
  if (ring && !reduced) {
    var spin = gsap.to(ring, { rotation: 360, duration: 24, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
    gsap.ticker.add(function () {
      var target = 1 + Math.min(Math.abs(scrollVelocity()) * 0.25, 8);
      spin.timeScale(spin.timeScale() + (target - spin.timeScale()) * 0.08);
    });
  }

  /* ---------- Imán en botones --------------------------------------- */
  if (fine && !reduced) {
    document.querySelectorAll('[data-magnet]').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      var strength = 0.22;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * strength);
        my((e.clientY - (r.top + r.height / 2)) * strength * 1.3);
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- Ticker con velocidad de scroll ------------------------- */
  var track = document.querySelector('.ticker-track');
  if (track && !reduced) {
    var row = track.querySelector('.ticker-row');
    var rowW = 0, tx = 0, dir = 1;
    var fill = function () {
      while (track.children.length > 1) track.removeChild(track.lastChild);
      rowW = row.getBoundingClientRect().width;
      var copies = Math.ceil((window.innerWidth * 2) / rowW);
      for (var c = 0; c < copies; c++) {
        var clone = row.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }
    };
    fill();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fill);
    gsap.ticker.add(function () {
      if (!rowW) return;
      var dt = gsap.ticker.deltaRatio() / 60;
      var v = scrollVelocity();
      if (v > 0.5) dir = 1; else if (v < -0.5) dir = -1;
      tx -= (60 + Math.min(Math.abs(v) * 40, 900)) * dir * dt;
      tx = ((tx % rowW) - rowW) % rowW;
      track.style.transform = 'translate3d(' + tx + 'px,0,0)';
    });
    window.addEventListener('resize', fill);
  }

  /* ---------- Productos: etiquetas que se balancean ------------------ */
  var tags = Array.prototype.slice.call(document.querySelectorAll('.tag'));
  if (tags.length && !reduced) {
    tags.forEach(function (tag, i) {
      var s = new Spring({ damping: 0.1, response: 1.15 });
      var set = gsap.quickSetter(tag, 'rotation', 'deg');
      var running = false;
      function tick() {
        var dt = Math.min(gsap.ticker.deltaRatio() / 60, 1 / 30);
        var moving = s.step(dt);
        set(s.x);
        if (!moving) { gsap.ticker.remove(tick); running = false; set(0); s.x = 0; s.v = 0; }
      }
      function push(v) {
        s.v += v;
        s.v = Math.max(-260, Math.min(260, s.v));
        if (!running) { gsap.ticker.add(tick); running = true; }
      }
      tag._push = push;
      if (fine) {
        tag.addEventListener('pointermove', function (e) { push(e.movementX * 2.2); });
      } else {
        tag.addEventListener('pointerdown', function () { push((i % 2 ? -1 : 1) * 120); });
      }
    });
    // Llegan balanceándose cuando aparece la carpeta
    ScrollTrigger.create({
      trigger: anchors[3],
      start: 'top 70%',
      onEnter: function () {
        tags.forEach(function (t, i) { setTimeout(function () { t._push((i % 2 ? -1 : 1) * 110); }, i * 90); });
      }
    });
  }
  /* ---------- Cierre: las fotos de Instagram se abren en abanico ----- */
  if (!reduced) {
    gsap.from('.fan-card', {
      x: function (i) { return [140, 0, -140][i]; },
      y: 60,
      rotation: function (i) { return [7, -2, -8][i]; },
      ease: 'none',
      scrollTrigger: { trigger: '.fan', start: 'top 92%', end: 'center 55%', scrub: 0.8 }
    });
    gsap.from('.outro-copy > *', {
      y: 40, duration: 1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.outro', start: 'top 70%' }
    });
  }

  /* ---------- Recalcular al cambiar tamaños -------------------------- */
  var relayout = function () { layoutStack(); ScrollTrigger.refresh(); };
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(relayout, 150); });
    folders.forEach(function (f) { ro.observe(f); });
  }
})();
