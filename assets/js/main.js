/* ============================================================
   BadanePlus — Interactions & Animations
   Vanilla JS · RTL · ~12KB
   ============================================================ */
(function () {
  'use strict';

  var d = document, w = window;
  var reduceMotion = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = w.matchMedia('(hover: none)').matches;

  /* ---------- Visit beacon (self-hosted stats) ---------- */
  try {
    var vPath = w.location.pathname;
    var vKey = 'bp_seen_' + vPath;
    if (!w.sessionStorage.getItem(vKey)) {
      w.sessionStorage.setItem(vKey, '1');
      var vUrl = '/t?p=' + encodeURIComponent(vPath);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(vUrl);
      } else {
        new Image().src = vUrl;
      }
    }
  } catch (e) { /* private mode etc. */ }

  /* ---------- Header state + progress ---------- */
  var header = d.getElementById('header');
  var progressBar = d.getElementById('progressBar');
  var ticking = false;

  function onScroll() {
    var y = w.scrollY || d.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (progressBar) {
      var h = d.documentElement.scrollHeight - w.innerHeight;
      var p = h > 0 ? y / h : 0;
      progressBar.style.transform = 'scaleX(' + Math.min(p, 1) + ')';
    }
    scrollSpy(y);
    if (!ticking) { ticking = false; }
  }
  w.addEventListener('scroll', function () {
    if (!ticking) {
      w.requestAnimationFrame(function () { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = d.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in w && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* section in-view (warranty arc + steps timeline) */
  var watchSections = d.querySelectorAll('.warranty-band, .steps-grid');
  if ('IntersectionObserver' in w) {
    var secObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); secObserver.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    watchSections.forEach(function (s) { secObserver.observe(s); });
  } else {
    watchSections.forEach(function (s) { s.classList.add('in-view'); });
  }

  /* ---------- Counters ---------- */
  var FA = { 0: '۰', 1: '۱', 2: '۲', 3: '۳', 4: '۴', 5: '۵', 6: '۶', 7: '۷', 8: '۸', 9: '۹' };
  function toFa(n) { return String(n).replace(/[0-9]/g, function (c) { return FA[c]; }); }

  var counters = d.querySelectorAll('.counter');
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = toFa(target); return; }
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      el.textContent = toFa(Math.round(target * eased));
      if (t < 1) w.requestAnimationFrame(step);
    }
    w.requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in w) {
    var cObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCounter(e.target); cObserver.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cObserver.observe(c); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------- Lazy images (LQIP blur-up) ---------- */
  var lazyImgs = d.querySelectorAll('img.lazy-img');
  if ('IntersectionObserver' in w) {
    var imgObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var img = e.target;
          var src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
          }
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '300px 0px' });
    lazyImgs.forEach(function (i) { imgObserver.observe(i); });
  } else {
    lazyImgs.forEach(function (img) {
      var src = img.getAttribute('data-src');
      if (src) { img.src = src; img.classList.add('loaded'); }
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuToggle = d.getElementById('menuToggle');
  var mobileMenu = d.getElementById('mobileMenu');
  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'باز کردن منو');
    }
    d.body.style.overflow = '';
  }
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      mobileMenu.setAttribute('aria-hidden', String(!open));
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
      d.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    var menuCloseBtn = d.getElementById('mobileMenuClose');
    if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeMenu);
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- Product filters ---------- */
  var carChips = d.querySelectorAll('.filter-cars .fchip');
  var catChips = d.querySelectorAll('.filter-cats .fchip');
  var productCards = d.querySelectorAll('.p-card[data-car]');
  var activeCar = 'all', activeCat = 'all';

  function applyFilters() {
    var shown = 0;
    productCards.forEach(function (card) {
      var ok = (activeCar === 'all' || card.getAttribute('data-car') === activeCar) &&
               (activeCat === 'all' || card.getAttribute('data-cat') === activeCat);
      card.classList.toggle('is-hidden', !ok);
      if (ok) {
        shown++;
        if (!reduceMotion) {
          card.classList.remove('in-view');
          card.style.opacity = '0';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              card.style.opacity = '';
              card.classList.add('in-view');
            });
          });
        }
      }
    });
  }
  carChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      carChips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-selected', 'true');
      activeCar = chip.getAttribute('data-car');
      applyFilters();
    });
  });
  catChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      catChips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-selected', 'true');
      activeCat = chip.getAttribute('data-cat');
      applyFilters();
    });
  });

  /* ---------- Quick view sheet ---------- */
  var sheet = d.getElementById('productSheet');
  var sheetBody = d.getElementById('sheetBody');
  var backdrop = d.getElementById('sheetBackdrop');
  var sheetClose = d.getElementById('sheetClose');
  var lastFocus = null;

  function openSheet(data) {
    if (!sheet || !sheetBody) return;
    var priceHtml;
    if (data.price_on_call || !data.price) {
      priceHtml = '<b>استعلام تلفنی</b><span>برای قیمت روز تماس بگیرید</span>';
    } else {
      priceHtml = '<b>' + toFa(data.price.toLocaleString('en-US').replace(/,/g, '،')) + ' تومان</b><span>قیمت روز · مشاوره رایگان</span>';
    }
    var badges = (data.badges || []).map(function (b) { return '<span class="sbadge">' + b + '</span>'; }).join('');
    var colors = (data.colors && data.colors.length) ? '<span class="sbadge">' + data.colors.join('</span><span class="sbadge">') + '</span>' : '';
    sheetBody.innerHTML =
      '<div class="sheet-img">' + (data.img ? '<img src="' + data.img + '" alt="' + data.name + '">' : '') + '</div>' +
      '<div class="sheet-detail">' +
        '<div class="sheet-cat"><span>' + data.car + '</span><span>·</span><span>' + data.cat + '</span>' + (data.in_stock === false ? '<span>·</span><span style="color:#C64B42;font-weight:700">ناموجود</span>' : '') + '</div>' +
        '<h3 class="sheet-title">' + data.name + '</h3>' +
        (badges ? '<div class="sheet-badges">' + badges + '</div>' : '') +
        (colors ? '<div class="sheet-badges">' + colors + '</div>' : '') +
        '<p class="sheet-desc">' + data.desc + '</p>' +
        '<div class="sheet-price">' + priceHtml + '</div>' +
        '<ul class="sheet-usps"><li>۵ سال ضمانت رنگ</li><li>رنگ کوره‌ای شرکتی + قطعه فابریک</li><li>ارسال به سراسر کشور</li></ul>' +
        '<div class="sheet-cta"><a class="btn btn-primary btn-lg" href="tel:' + (d.querySelector('.footer-tel') ? d.querySelector('.footer-tel').getAttribute('href').replace('tel:', '') : '') + '">تماس برای سفارش</a></div>' +
      '</div>';
    lastFocus = d.activeElement;
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('show');
    d.body.style.overflow = 'hidden';
    if (sheetClose) sheetClose.focus();
  }
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('show');
    d.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  d.querySelectorAll('[data-quickview]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.p-card');
      if (!card) return;
      try { openSheet(JSON.parse(card.getAttribute('data-product'))); }
      catch (err) { /* noop */ }
    });
  });
  if (sheetClose) sheetClose.addEventListener('click', closeSheet);
  if (backdrop) backdrop.addEventListener('click', closeSheet);
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  /* ---------- Tilt (desktop pointer only) ---------- */
  if (!isTouch && !reduceMotion && w.matchMedia('(min-width: 861px)').matches) {
    d.querySelectorAll('.p-card').forEach(function (card) {
      var raf = null;
      card.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'translateY(-6px) rotateX(' + (-y * 3.5).toFixed(2) + 'deg) rotateY(' + (x * 3.5).toFixed(2) + 'deg)';
          raf = null;
        });
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ---------- ScrollSpy (bottom nav) ---------- */
  var bnItems = d.querySelectorAll('.bn-item[data-bn]');
  var spySections = [
    { id: 'home', el: d.getElementById('home') },
    { id: 'products', el: d.getElementById('products') },
    { id: 'blog', el: null },
    { id: 'contact', el: d.getElementById('contact') }
  ];
  function scrollSpy(y) {
    if (!bnItems.length) return;
    var current = 'home';
    spySections.forEach(function (s) {
      if (s.el && s.el.getBoundingClientRect().top <= 140) current = s.id;
    });
    if (w.location.pathname.indexOf('/blog') === 0) current = 'blog';
    bnItems.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-bn') === current);
    });
  }

  /* ---------- Hero parallax (pointer, desktop) ---------- */
  var heroFrame = d.querySelector('.hero-frame');
  if (heroFrame && !isTouch && !reduceMotion) {
    var hero = d.querySelector('.hero');
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      heroFrame.style.transform = 'perspective(1100px) rotateX(' + (y * -2.4).toFixed(2) + 'deg) rotateY(' + (x * 2.4).toFixed(2) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () {
      heroFrame.style.transform = '';
    });
    heroFrame.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
  }

  /* ---------- FAQ: single-open accordion ---------- */
  var faqItems = d.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ---------- Smooth anchor offset (fallback) ---------- */
  d.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = d.getElementById(id);
      if (target) {
        e.preventDefault();
        var top = target.getBoundingClientRect().top + w.scrollY - 84;
        w.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + id);
      }
    });
  });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && w.location.protocol === 'https:') {
    w.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  // initial state (after all declarations)
  onScroll();
})();
