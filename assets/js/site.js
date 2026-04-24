/* ============================================================
   WATPAC — interactions
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = $('#loader');
  const bar = $('#loaderBar');
  const pct = $('#loaderPct');
  let p = 0;
  const tick = () => {
    p += Math.random() * 12 + 4;
    if (p >= 100) p = 100;
    if (bar) bar.style.width = p + '%';
    if (pct) pct.textContent = String(Math.floor(p)).padStart(2, '0');
    if (p < 100) {
      setTimeout(tick, 90 + Math.random() * 120);
    } else {
      setTimeout(() => loader && loader.classList.add('done'), 300);
    }
  };
  window.addEventListener('load', () => setTimeout(tick, 150));

  /* ---------- Nav scrolled state ---------- */
  const nav = $('#nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $('#navBurger');
  const mm = $('#mobileMenu');
  if (burger && mm) {
    burger.addEventListener('click', () => {
      const open = mm.classList.toggle('open');
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('#mobileMenu a').forEach(a =>
      a.addEventListener('click', () => {
        mm.classList.remove('open');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      })
    );
  }

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------- Stat counters ---------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.parentElement.querySelector('.stat-label')?.dataset.suffix || '';
          const dur = 1500;
          const start = performance.now();
          const step = now => {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.floor(eased * target) + suffix;
            if (t < 1) requestAnimationFrame(step);
            else el.textContent = target + suffix;
          };
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(c => cio.observe(c));
  }

  /* ---------- Custom cursor ---------- */
  const cursor = $('#cursor');
  if (cursor && matchMedia('(hover:hover)').matches) {
    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    let mx = window.innerWidth / 2,
      my = window.innerHeight / 2;
    let dx = mx,
      dy = my,
      rx = mx,
      ry = my;
    window.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    });
    const loop = () => {
      dx += (mx - dx) * 0.6;
      dy += (my - dy) * 0.6;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dot) dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();

    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.remove('hover-link', 'hover-button');
        cursor.classList.add('hover-' + el.dataset.cursor);
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('hover-link', 'hover-button');
      });
    });
  }

  /* ---------- Hero carousel (split layout: sync text + image) ---------- */
  (function heroCarousel() {
    const imgRoot    = $('#heroCarousel');
    const textRoot   = $('#heroTextSlides');
    if (!imgRoot || !textRoot) return;

    const imgSlides  = $$('.hero-slide',      imgRoot);
    const txtSlides  = $$('.hero-text-slide', textRoot);
    if (imgSlides.length < 2) return;

    const SLIDE_DUR  = 5500;
    const dotsEl     = $('#heroDots');
    const prevBtn    = $('#heroPrev');
    const nextBtn    = $('#heroNext');
    const fillEl     = $('#heroProgressFill');

    let current = 0;
    let timer   = null;
    let raf     = null;
    let t0      = 0;
    let elapsed = 0;
    let paused  = false;

    /* ── Build pill dots ── */
    imgSlides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'hero-dot' + (i === 0 ? ' is-active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      d.addEventListener('click', () => goTo(i));
      dotsEl && dotsEl.appendChild(d);
    });

    /* ── Sync all panels to index i ── */
    function goTo(i) {
      const prev = current;
      current = (i + imgSlides.length) % imgSlides.length;

      imgSlides[prev].classList.remove('is-active');
      imgSlides[current].classList.add('is-active');

      txtSlides[prev] && txtSlides[prev].classList.remove('is-active');
      txtSlides[current] && txtSlides[current].classList.add('is-active');

      dotsEl && Array.from(dotsEl.children).forEach((d, k) =>
        d.classList.toggle('is-active', k === current));

      elapsed = 0;
      startProgress();
      restartTimer();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    /* ── Animated progress bar ── */
    function startProgress() {
      cancelAnimationFrame(raf);
      if (fillEl) fillEl.style.width = '0%';
      t0 = performance.now();
      step();
    }
    function step(now) {
      if (!now) now = performance.now();
      if (paused) return;
      elapsed = now - t0;
      if (fillEl) fillEl.style.width = Math.min(elapsed / SLIDE_DUR * 100, 100) + '%';
      if (elapsed < SLIDE_DUR) raf = requestAnimationFrame(step);
    }

    /* ── Auto-advance ── */
    function restartTimer() {
      clearInterval(timer);
      timer = setInterval(() => { if (!paused) next(); }, SLIDE_DUR);
    }

    /* ── Controls ── */
    prevBtn && prevBtn.addEventListener('click', prev);
    nextBtn && nextBtn.addEventListener('click', next);

    /* ── Touch swipe (image box area) ── */
    let tx0 = 0;
    const box = document.querySelector('.hero-carousel-box');
    if (box) {
      box.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - tx0;
        if (Math.abs(dx) > 48) dx < 0 ? next() : prev();
      }, { passive: true });
    }

    /* ── Keyboard ── */
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    });

    /* ── Pause on tab hidden ── */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { paused = true; cancelAnimationFrame(raf); clearInterval(timer); }
      else { paused = false; t0 = performance.now() - elapsed; step(); restartTimer(); }
    });

    /* ── Start ── */
    goTo(0);
  })();

  /* ---------- Service gallery subtle float parallax ---------- */
  const sgFigs = $$('.sg');
  if (sgFigs.length && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const rafScroll = () => {
      const vh = window.innerHeight;
      sgFigs.forEach(fig => {
        const r = fig.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const mid = r.top + r.height / 2 - vh / 2;
        const shift = mid * -0.06;
        const base = fig.classList.contains('sg-2') || fig.classList.contains('sg-4') ? 24 : 0;
        fig.style.transform = `translateY(${base + shift}px)`;
      });
    };
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            rafScroll();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
    rafScroll();
  }

  /* ---------- Smooth anchor offset ---------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
