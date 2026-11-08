/* Brandísimas — rediseño 5
   Todo el contenido es visible sin JS; esto solo agrega interacción. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Navbar: sombra al hacer scroll + menú móvil ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 50); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  document.querySelectorAll('#navLinks a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setMenu(false); });

  /* ---------- Formulario de cotización ----------------------------------
     POST a /api/cotizar (functions/api/cotizar.js) con Turnstile.          */
  var form = document.getElementById('quoteForm');
  var setTipo = function () {};

  if (form) {
    var done       = document.getElementById('quoteDone');
    var doneName   = document.getElementById('doneName');
    var doneTipo   = document.getElementById('doneTipo');
    var captchaBox = document.getElementById('quoteCaptcha');
    var submitBtn  = document.getElementById('quoteSubmit');
    var submitHTML = submitBtn.innerHTML;
    var resetBtn   = document.getElementById('quoteReset');
    var errorBox   = document.getElementById('formError');
    var tipoBtns   = Array.prototype.slice.call(form.querySelectorAll('[data-tipo]'));
    var tipo = 'Celebración';

    setTipo = function (t) {
      tipo = t;
      tipoBtns.forEach(function (b) {
        var on = b.getAttribute('data-tipo') === t;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', String(on));
      });
    };
    tipoBtns.forEach(function (b) {
      b.addEventListener('click', function () { setTipo(b.getAttribute('data-tipo')); });
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

    /* Turnstile: el script se carga cuando el formulario asoma o recibe foco.
       Modo "interaction-only": solo se ve si Cloudflare necesita preguntar. */
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
      submitBtn.innerHTML = on ? 'Enviando…' : submitHTML;
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
        showError('Revisa los campos marcados: tu nombre, un teléfono y un correo válidos.');
        invalid[0].focus();
        return;
      }

      var f = new FormData(form);
      var nombre = String(f.get('nombre') || '').trim();
      var emp = tipo === 'Empresa';
      f.append('tipo', tipo);

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
          doneName.textContent = nombre.split(/\s+/)[0];
          doneTipo.textContent = emp ? 'evento de empresa' : 'celebración';
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
      setTipo('Celebración');
      clearErrors();
      resetCaptcha();
      done.hidden = true;
      form.hidden = false;
    });
  }

  /* ---------- Carrusel de Instagram ------------------------------------
     Escenario fijo de 1140×740 que se escala al ancho disponible.
     8 láminas (4 publicaciones × 2) para que el giro sea infinito.       */
  var ig = document.getElementById('ig');
  if (ig) {
    var stage  = document.getElementById('igStage');
    var track  = document.getElementById('igTrack');
    var slides = Array.prototype.slice.call(track.querySelectorAll('.ig-slide'));
    var dots   = Array.prototype.slice.call(document.querySelectorAll('#igDots button'));
    var place  = document.getElementById('igPlace');
    var cap    = document.getElementById('igCaption');
    var posts = [
      { place: 'Concepción, Chile', caption: 'Hotgirls love Brandísimas.' },
      { place: 'Barra Creativa',    caption: 'Nuestra flor, estampada en vivo.' },
      { place: 'Concepción, Chile', caption: 'Girly Creative, edición rosa.' },
      { place: 'Evento privado',    caption: 'Tu evento aquí.' }
    ];
    var P = posts.length, N = slides.length;
    var cur = 1, drag = 0, dragging = false, moved = false, paused = false, x0 = 0, scale = 1;

    var mod = function (a, n) { return ((a % n) + n) % n; };

    var layout = function () {
      slides.forEach(function (img, i) {
        var off = mod(i - cur, N);
        if (off >= N / 2) off -= N;
        var a = Math.abs(off), sg = Math.sign(off), s = img.style;
        if (off === 0) {
          s.left = (370 + drag) + 'px'; s.top = '68px'; s.width = '400px'; s.height = '500px';
          s.borderRadius = '12px'; s.opacity = '1';
        } else {
          var cx = 570 + sg * (a === 1 ? 372 : 684);
          s.left = (cx - 150 + drag) + 'px'; s.top = '118px'; s.width = '300px'; s.height = '400px';
          s.borderRadius = '24px'; s.opacity = a <= 2 ? '1' : '0';
        }
        img.setAttribute('aria-hidden', String(off !== 0));
      });
      var act = mod(cur, P);
      place.textContent = posts[act].place;
      cap.textContent = posts[act].caption;
      dots.forEach(function (d, k) {
        d.classList.toggle('is-on', k === act);
        if (k === act) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    };

    var go = function (steps) { cur += steps; layout(); };

    // En móvil el escenario se ve como si midiera 600 px: tarjeta central grande y vecinas asomando.
    var fit = function () {
      var w = ig.clientWidth;
      var base = w < 700 ? 600 : 1140;
      scale = Math.min(1, w / base);
      stage.style.setProperty('--sc', scale);
      ig.style.height = Math.round(740 * scale) + 'px';
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(ig);
    else window.addEventListener('resize', fit);

    document.getElementById('igPrev').addEventListener('click', function () { go(-1); });
    document.getElementById('igNext').addEventListener('click', function () { go(1); });
    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { go(mod(k - mod(cur, P), P)); });
    });
    slides.forEach(function (img, i) {
      img.addEventListener('click', function () {
        if (moved) return;
        var off = mod(i - cur, N);
        if (off >= N / 2) off -= N;
        if (off) go(off);
      });
    });

    track.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      x0 = e.clientX; moved = false; paused = true; dragging = true; drag = 0;
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var d = (e.clientX - x0) / (scale || 1);
      if (Math.abs(d) > 5 && !moved) {
        moved = true;
        track.classList.add('is-drag');
        if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
      }
      if (moved) { drag = d; layout(); }
    });
    var up = function () {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-drag');
      var d = drag;
      var steps = Math.abs(d) > 50 ? -Math.sign(d) * Math.max(1, Math.round(Math.abs(d) / 372)) : 0;
      drag = 0; paused = false;
      go(steps);
      setTimeout(function () { moved = false; }, 0);
    };
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);

    stage.addEventListener('mouseenter', function () { paused = true; });
    stage.addEventListener('mouseleave', function () { paused = false; });

    layout();
    if (!reduceMotion) {
      setInterval(function () {
        if (!paused && !document.hidden) go(1);
      }, 4500);
    }
  }
})();
