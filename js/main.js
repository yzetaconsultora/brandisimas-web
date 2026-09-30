/* ============================================================
   BRANDÍSIMAS — main.js
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Datos de contacto -------------------------------------- */
  var WHATSAPP = '56982879392';                       // sin +, sin espacios
  var WA_TEXT  = 'Hola Brandísimas! Quiero cotizar el patch bar para mi evento.';
  var INSTAGRAM = 'https://www.instagram.com/brandisimas.cl';

  function waUrl(text) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
  }

  document.querySelectorAll('[data-wa]').forEach(function (el) {
    el.href = waUrl(WA_TEXT);
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

  /* ---------- Encuadre de fotos ---------------------------------------
     data-frame="escala x y" replica el recorte definido en el diseño:
     la foto cubre su marco, se amplía por `escala` y su centro se
     desplaza x/y (en % del marco). Sin JS queda en cover centrado.    */
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

    // La foto nunca debe dejar un borde del marco al descubierto.
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

  if (framed.length && 'ResizeObserver' in window) {
    // El recorte depende de la proporción del marco, que cambia con el ancho.
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var img = entry.target.querySelector('img[data-frame]');
        if (img) applyFrame(img);
      });
    });
    framed.forEach(function (img) { ro.observe(img.parentElement); });
  } else {
    window.addEventListener('resize', function () { framed.forEach(applyFrame); });
  }

  /* ---------- Ajuste a una pantalla -----------------------------------
     En escritorio cada sección debe caber en la ventana (el imán de
     scroll la remata ahí). Si el contenido [data-fit] es más alto que el
     espacio útil, se reduce con zoom; a la vez se le da más ancho, que
     acorta los textos, así la reducción es la mínima necesaria.
     Sin JS o en móvil queda el alto natural.                           */
  var fitMq = window.matchMedia('(min-width: 1024px) and (min-height: 600px)');
  var fitBoxes = Array.prototype.slice.call(document.querySelectorAll('[data-fit]'));
  var FIT_MIN = 0.55;      // bajo esto se prefiere dejar la sección más alta
  var FIT_WIDE = 1440;     // ancho máximo en pantalla cuando hay zoom

  function fitBox(box) {
    box.style.zoom = '';
    box.style.maxWidth = '';
    if (!fitMq.matches) return;

    var sec = box.closest('section');
    var cs = getComputedStyle(sec);
    var avail = window.innerHeight - (nav ? nav.offsetHeight : 0) -
                parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var r = box.getBoundingClientRect();
    if (r.height <= avail) return;

    var base = r.width;
    var wideMax = Math.max(base, Math.min(sec.clientWidth, FIT_WIDE));

    /* Dos estrategias y gana la que deja el zoom más alto: ensanchar
       ayuda donde manda el texto (Servicios) y perjudica donde mandan
       fotos con proporción fija (Cómo funciona), que crecen en alto. */
    function solve(wide) {
      var z = 1, h = r.height;

      function apply(v) {
        z = Math.max(FIT_MIN, Math.min(1, v));
        box.style.zoom = z;
        // max-width va en px del elemento: el ancho en pantalla es max-width × zoom
        box.style.maxWidth = (Math.min(wide, base / z) / z) + 'px';
        h = box.getBoundingClientRect().height;
      }

      for (var i = 0; i < 10; i++) {
        apply(z * avail / h);
        if (h <= avail && h > avail - 6) break;
      }
      while (h > avail && z > FIT_MIN) apply(z - 0.01);
      // Y lo más grande posible: subir de a poco mientras siga cabiendo.
      while (z < 1) {
        var fits = z;
        apply(z + 0.01);
        if (h > avail) { apply(fits); break; }
      }
      return z;
    }

    var zNarrow = solve(base);
    if (wideMax > base && solve(wideMax) < zNarrow) solve(base);
  }

  function fitAll() { fitBoxes.forEach(fitBox); }

  var fitTimer;
  function fitLater() { clearTimeout(fitTimer); fitTimer = setTimeout(fitAll, 120); }

  if (fitBoxes.length) {
    fitAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
    window.addEventListener('load', fitAll);
    window.addEventListener('resize', fitLater);
  }

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

  /* ---------- Formulario de cotización --------------------------------
     No hay backend: al enviar se arma el mensaje con los datos y se
     abre el chat de WhatsApp de Brandísimas.                          */
  var form = document.getElementById('quoteForm');

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

    function setOn(btn, on) {
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    }

    function setTipo(t) {
      tipo = t;
      tipoBtns.forEach(function (b) { setOn(b, b.getAttribute('data-tipo') === t); });
      var emp = t === 'Empresa';
      orgLabel.textContent = emp ? 'Empresa' : 'Tipo de celebración';
      orgInput.placeholder = emp ? 'Nombre de la empresa' : 'Cumpleaños, matrimonio…';
    }

    tipoBtns.forEach(function (b) {
      b.addEventListener('click', function () { setTipo(b.getAttribute('data-tipo')); });
    });

    prodBtns.forEach(function (b) {
      b.addEventListener('click', function () { setOn(b, !b.classList.contains('is-on')); });
    });

    // Los botones de Servicios dejan el tipo de evento ya elegido.
    document.querySelectorAll('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () { setTipo(a.getAttribute('data-pick')); });
    });

    function clearErrors() {
      errorBox.hidden = true;
      form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    }

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
      if (fecha) fecha = fecha.split('-').reverse().join('-');   // aaaa-mm-dd → dd-mm-aaaa

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

      // Si el navegador bloquea la ventana nueva, queda el botón de respaldo.
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

  /* ---------- GSAP ----------------------------------------------------
     Solo posición, escala y rotación. Nunca opacity: si GSAP no carga,
     todo el contenido ya es visible por CSS.                           */
  if (window.gsap && !reduced) {
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Solo los originales: los clones del carrusel ya entran colocados.
      gsap.from('.product:not([data-clone])', {
        y: 40, duration: 0.7, ease: 'power3.out', stagger: 0.09,
        scrollTrigger: { trigger: '.carousel', start: 'top 85%' }
      });
    }

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
