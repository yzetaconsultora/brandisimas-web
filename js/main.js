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

  /* ---------- Encuadre de fotos (igual que brandisimas.cl) ----------
     data-frame="escala x y": la foto cubre su marco, se amplía por
     `escala` y su centro se desplaza x/y (en % del marco).          */
  var framed = Array.prototype.slice.call(document.querySelectorAll('img[data-frame]'));

  function applyFrame(img) {
    var box = img.parentElement;
    var fw = box.clientWidth, fh = box.clientHeight;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!fw || !fh || !iw || !ih) return;
    var v = img.getAttribute('data-frame').split(/\s+/).map(parseFloat);
    var s = v[0] || 1, x = v[1] || 0, y = v[2] || 0;
    var k = Math.max(fw / iw, fh / ih) * s;
    var w = iw * k, h = ih * k;
    var mx = Math.max(0, (w / fw - 1) * 50);
    var my = Math.max(0, (h / fh - 1) * 50);
    x = Math.max(-mx, Math.min(mx, x));
    y = Math.max(-my, Math.min(my, y));
    img.style.width  = (w / fw * 100) + '%';
    img.style.height = (h / fh * 100) + '%';
    img.style.left   = (50 + x) + '%';
    img.style.top    = (50 + y) + '%';
  }

  framed.forEach(function (img) {
    if (img.complete && img.naturalWidth) applyFrame(img);
    img.addEventListener('load', function () { applyFrame(img); });
  });
  if (window.ResizeObserver) {
    var fro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        var img = e.target.querySelector('img[data-frame]');
        if (img) applyFrame(img);
      });
    });
    framed.forEach(function (img) { fro.observe(img.parentElement); });
  }

  /* ---------- Onda de marca continua --------------------------------
     Un solo trazo que recorre el fichero y el cierre de punta a punta
     (manual: trazo continuo, grosor uniforme, curvas amplias, sale por
     los bordes). Se genera a la medida, así no hay mosaico ni cortes.
     Es una curva tipo trocoide: avanza hacia abajo y hace bucles.   */
  var mainEl = document.querySelector('main');
  var outroEl = document.querySelector('.outro');
  var ondas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ondas.setAttribute('class', 'ondas-fondo');
  ondas.setAttribute('aria-hidden', 'true');
  mainEl.insertBefore(ondas, mainEl.firstChild);

  function trazo(W, H, o) {
    var d = '', t0 = -2, t1 = H / o.S + 2;
    for (var t = t0; t <= t1; t += 0.035) {
      var x = W / 2 + o.A * Math.sin(o.a * t + o.p) + o.R * Math.sin(t + o.q);
      var y = o.S * t + o.R * 0.92 * Math.cos(t + o.q);
      d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function drawOndas() {
    var top = cabinet.offsetTop;
    var H = outroEl.offsetTop + outroEl.offsetHeight - top;
    var W = mainEl.clientWidth;
    var m = W < 768;
    ondas.style.top = top + 'px';
    ondas.style.height = H + 'px';
    ondas.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var sw = m ? 34 : Math.min(84, W * 0.055);
    var R = m ? W * 0.24 : Math.min(300, W * 0.2);
    var paths = [
      { A: W * 0.42, a: 0.31, p: 0.4, R: R, q: 0, S: m ? 70 : 130, op: 0.1 },
      { A: W * 0.38, a: 0.23, p: 3.4, R: R * 0.82, q: 2.1, S: m ? 95 : 170, op: 0.07 }
    ];
    ondas.innerHTML = paths.map(function (o) {
      return '<path d="' + trazo(W, H, o) + '" stroke-width="' + sw + '" stroke-opacity="' + o.op + '"/>';
    }).join('');
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

  /* En escritorio, una carpeta más alta que la pantalla se escala (zoom)
     hasta caber, así nunca se pega por arriba y las pestañas de las
     carpetas anteriores siguen a la vista.                          */
  var canZoom = window.CSS && CSS.supports && CSS.supports('zoom', '1');
  /* Siempre se mide desde zoom 1: así el resultado depende solo del
     tamaño de pantalla y no del zoom anterior. Si partiera del zoom
     previo, el texto se reacomoda distinto en cada pasada y el zoom
     oscila sin fin (el contenido "rebota" arriba y abajo).          */
  function fitFolder(f, avail) {
    var sheet = f.querySelector('.folder-sheet');
    var kids = Array.prototype.slice.call(sheet.children);
    var setZ = function (z) { kids.forEach(function (k) { k.style.zoom = z === 1 ? '' : z; }); };
    var measure = function () {
      return kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top;
    };
    setZ(1);
    if (!canZoom || window.innerWidth < 1024) { sheet.removeAttribute('data-z'); return; }
    var cs = getComputedStyle(sheet);
    var room = avail - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8;
    var minZ = window.innerHeight < 700 ? 0.58 : 0.62;
    var content = measure();
    if (content <= room) { sheet.removeAttribute('data-z'); return; }
    // Búsqueda binaria del zoom más grande que cabe. Las fotos no se
    // achican en proporción (su alto sale del ancho), por eso se mide.
    var lo = minZ, hi = 1;
    for (var pass = 0; pass < 8; pass++) {
      var mid = (lo + hi) / 2;
      setZ(mid);
      if (measure() <= room) lo = mid; else hi = mid;
    }
    var best = lo;
    setZ(best);
    sheet.setAttribute('data-z', best);
  }

  function layoutStack() {
    var tab = folders[0].querySelector('.folder-tab');
    var tabH = tab.offsetHeight;
    var cs = getComputedStyle(folders[1] || folders[0]);
    gapTop = parseFloat(cs.marginTop) || 0;               // tab-h + tab-gap
    T = Math.round(nav.getBoundingClientRect().bottom + 12 + tabH);
    root.style.setProperty('--T', T + 'px');
    var vh = window.innerHeight;
    var tallBefore = false;
    folders.forEach(function (f) { fitFolder(f, vh - T); });
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
  drawOndas();

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
    var captchaBox  = document.getElementById('quoteCaptcha');
    var submitBtn   = form.querySelector('button[type="submit"]');
    var submitTxt   = submitBtn.querySelectorAll('.btn-label > span');
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

    /* Turnstile: el script de Cloudflare se carga recién cuando el formulario
       asoma o recibe foco. Modo "interaction-only": solo se ve si hace falta. */
    var widgetId = null;
    var token = '';
    var waiters = [];
    var flush = function () { waiters.splice(0).forEach(function (fn) { fn(token); }); };

    var loadCaptcha = function () {
      if (loadCaptcha.done) return;
      loadCaptcha.done = true;
      fetch('/api/cotizar', { headers: { accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cfg) {
          if (!cfg.sitekey) return;
          window.onBrandTurnstile = function () {
            widgetId = window.turnstile.render(captchaBox, {
              sitekey: cfg.sitekey,
              appearance: 'interaction-only',
              'response-field': false,
              callback: function (t) { token = t; flush(); },
              'expired-callback': function () { token = ''; },
              'error-callback': function () { token = ''; flush(); }
            });
          };
          var sc = document.createElement('script');
          sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onBrandTurnstile';
          sc.async = true;
          document.head.appendChild(sc);
        })
        .catch(function () { loadCaptcha.done = false; });
    };

    // Devuelve el token apenas exista; si en 15 s no llega, sigue sin él y el servidor responde el error.
    var getToken = function () {
      return new Promise(function (resolve) {
        if (token) return resolve(token);
        waiters.push(resolve);
        setTimeout(flush, 15000);
      });
    };

    var resetCaptcha = function () {
      token = '';
      if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
    };

    form.addEventListener('focusin', loadCaptcha);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries, io) {
        if (entries.some(function (en) { return en.isIntersecting; })) { loadCaptcha(); io.disconnect(); }
      }, { rootMargin: '400px' }).observe(form);
    } else {
      loadCaptcha();
    }

    var setSending = function (on) {
      submitBtn.disabled = on;
      submitTxt.forEach(function (sp) { sp.textContent = on ? 'Enviando…' : 'Enviar cotización'; });
    };

    var showError = function (msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    };

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

      f.append('tipo', tipo);
      prods.forEach(function (p) { f.append('productos', p); });

      loadCaptcha();
      setSending(true);
      getToken()
        .then(function (t) {
          f.append('cf-turnstile-response', t);
          return fetch('/api/cotizar', { method: 'POST', body: f, headers: { accept: 'application/json' } });
        })
        .then(function (r) {
          return r.json().catch(function () { return { ok: false }; });
        })
        .then(function (res) {
          setSending(false);
          if (!res.ok) {
            resetCaptcha();
            Object.keys(res.errores || {}).forEach(function (k) {
              var el = form.elements[k];
              if (el && el.classList) el.classList.add('is-invalid');
            });
            showError(res.mensaje || 'No pudimos enviar tu cotización. Intenta de nuevo o escríbenos por WhatsApp.');
            return;
          }
          doneName.textContent = val('nombre').split(' ')[0];
          doneSummary.textContent =
            (emp ? 'un evento de empresa' : 'una celebración') +
            ' (' + val('invitados').toLowerCase() + ' invitados' +
            (prods.length ? ', ' + prods.join(', ').toLowerCase() : '') + ')';
          form.hidden = true;
          done.hidden = false;
        })
        .catch(function () {
          setSending(false);
          resetCaptcha();
          showError('Sin conexión. Revisa tu internet e intenta de nuevo.');
        });
    });

    resetBtn.addEventListener('click', function () {
      form.reset();
      prodBtns.forEach(function (b) { setOn(b, false); });
      setTipo('Celebración');
      clearErrors();
      resetCaptcha();
      done.hidden = true;
      form.hidden = false;
    });
  }

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

  if (!reduced) {
    // Entrada (el loader se va a los ~1s)
    var intro = gsap.timeline({ delay: 1.0 });
    intro
      .from('.slogan-in', { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.09 }, 0)
      .fromTo('.slogan-in', { letterSpacing: '0.06em' }, { letterSpacing: '0em', duration: 1.5, ease: 'expo.out', stagger: 0.09 }, 0.05)
      .from('.hero-copy > *', { y: 34, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.5);

    // Scroll: la consigna se comprime
    var heroScroll = gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
    heroScroll
      .to(slogan, { yPercent: 22, scale: 0.92, ease: 'none' }, 0)
      .to('.hero-waves', { yPercent: 8, ease: 'none' }, 0)
      .to('.hero-copy', { y: 70, ease: 'none' }, 0);
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

  /* ---------- Carrusel infinito de productos --------------------------
     El mismo del sitio en producción: se clona el set completo a cada
     lado y se salta el scroll un set entero al llegar a un borde.     */
  var track = document.getElementById('prodTrack');
  var prev  = document.getElementById('prodPrev');
  var next  = document.getElementById('prodNext');

  if (track && prev && next) {
    var originals = Array.prototype.slice.call(track.children);
    var setLen = originals.length;

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

    var measure = function () {
      var items = track.children;
      if (!items.length) return 0;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var w = items[0].getBoundingClientRect().width + gap;
      setWidth = w * setLen;
      return w;
    };

    var jump = function (delta) {
      var prevBehavior = track.style.scrollBehavior;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft += delta;
      void track.offsetWidth;
      track.style.scrollBehavior = prevBehavior;
    };

    var recenter = function () {
      if (!setWidth) return;
      if (track.scrollLeft < setWidth * 0.5) jump(setWidth);
      else if (track.scrollLeft > setWidth * 1.5) jump(-setWidth);
    };

    var resetCarousel = function () {
      measure();
      jump(setWidth - track.scrollLeft);
    };

    var idle;
    track.addEventListener('scroll', function () {
      clearTimeout(idle);
      idle = setTimeout(recenter, 140);
    }, { passive: true });

    var move = function (dir) {
      var itemWidth = measure();
      recenter();
      track.scrollBy({ left: dir * itemWidth, behavior: reduced ? 'auto' : 'smooth' });
    };

    prev.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });

    window.addEventListener('resize', resetCarousel);
    resetCarousel();
    window.addEventListener('load', resetCarousel);
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
  var sizes = function () { return folders.map(function (f) { return f.offsetHeight; }).join(','); };
  var lastSizes = '';
  var relayout = function () { layoutStack(); drawOndas(); ScrollTrigger.refresh(); lastSizes = sizes(); };
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
  if (window.ResizeObserver) {
    // Ignora los cambios que causa el propio relayout (zoom de carpetas).
    var ro = new ResizeObserver(function () {
      if (sizes() === lastSizes) return;
      clearTimeout(rt); rt = setTimeout(relayout, 150);
    });
    folders.forEach(function (f) { ro.observe(f); });
  }
})();
