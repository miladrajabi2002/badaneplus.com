'use client';

/* ============================================================
   BadanePlus — تعاملات و انیمیشن‌ها (پورت وفادار main.js)
   reveal، شمارنده‌ها، lazy images، فیلترها، شیت محصول،
   tilt، parallax، scrollspy، آکاردئون FAQ، بیکون آمار، PWA
   ============================================================ */
import { useEffect } from 'react';

export default function Interactions() {
  useEffect(() => {
    const d = document;
    const w = window;
    const reduceMotion = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = w.matchMedia('(hover: none)').matches;

    /* ---------- بیکون بازدید (آمار خودمیزبان) ---------- */
    try {
      const vPath = w.location.pathname;
      const vKey = 'bp_seen_' + vPath;
      if (!w.sessionStorage.getItem(vKey)) {
        w.sessionStorage.setItem(vKey, '1');
        const vUrl = '/t?p=' + encodeURIComponent(vPath);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(vUrl);
        } else {
          new Image().src = vUrl;
        }
      }
    } catch (e) { /* حالت خصوصی و… */ }

    /* ---------- هدر + نوار پیشرفت ---------- */
    const header = d.getElementById('header');
    const progressBar = d.getElementById('progressBar');
    const bnItems = d.querySelectorAll('.bn-item[data-bn]');
    const spySections = [
      { id: 'home', el: d.getElementById('home') },
      { id: 'products', el: d.getElementById('products') },
      { id: 'blog', el: null },
      { id: 'contact', el: d.getElementById('contact') },
    ];

    function scrollSpy(y) {
      if (!bnItems.length) return;
      let current = 'home';
      spySections.forEach((s) => {
        if (s.el && s.el.getBoundingClientRect().top <= 140) current = s.id;
      });
      if (w.location.pathname.indexOf('/blog') === 0) current = 'blog';
      bnItems.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-bn') === current);
      });
    }

    let ticking = false;
    function onScroll() {
      const y = w.scrollY || d.documentElement.scrollTop;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (progressBar) {
        const h = d.documentElement.scrollHeight - w.innerHeight;
        const p = h > 0 ? y / h : 0;
        progressBar.style.transform = 'scaleX(' + Math.min(p, 1) + ')';
      }
      scrollSpy(y);
    }
    const scrollListener = () => {
      if (!ticking) {
        w.requestAnimationFrame(() => { onScroll(); ticking = false; });
        ticking = true;
      }
    };
    w.addEventListener('scroll', scrollListener, { passive: true });

    /* ---------- نمایش تدریجی هنگام اسکرول ---------- */
    const revealEls = d.querySelectorAll('[data-reveal]');
    let revealObserver = null;
    if ('IntersectionObserver' in w && !reduceMotion) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach((el) => revealObserver.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('in-view'));
    }

    /* سکشن‌های ویژه (کمان ضمانت + تایم‌لاین سفارش) */
    const watchSections = d.querySelectorAll('.warranty-band, .steps-grid');
    let secObserver = null;
    if ('IntersectionObserver' in w) {
      secObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in-view'); secObserver.unobserve(e.target); }
        });
      }, { threshold: 0.3 });
      watchSections.forEach((s) => secObserver.observe(s));
    } else {
      watchSections.forEach((s) => s.classList.add('in-view'));
    }

    /* ---------- شمارنده‌ها ---------- */
    const FA = { 0: '۰', 1: '۱', 2: '۲', 3: '۳', 4: '۴', 5: '۵', 6: '۶', 7: '۷', 8: '۸', 9: '۹' };
    function toFa(n) { return String(n).replace(/[0-9]/g, (c) => FA[c]); }

    const counters = d.querySelectorAll('.counter');
    function animateCounter(el) {
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduceMotion) { el.textContent = toFa(target); return; }
      const dur = 1600;
      let start = null;
      function step(ts) {
        if (!start) start = ts;
        const t = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
        el.textContent = toFa(Math.round(target * eased));
        if (t < 1) w.requestAnimationFrame(step);
      }
      w.requestAnimationFrame(step);
    }
    let cObserver = null;
    if ('IntersectionObserver' in w) {
      cObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { animateCounter(e.target); cObserver.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach((c) => cObserver.observe(c));
    } else {
      counters.forEach(animateCounter);
    }

    /* ---------- تصاویر تنبل (LQIP blur-up) ---------- */
    const lazyImgs = d.querySelectorAll('img.lazy-img');
    let imgObserver = null;
    if ('IntersectionObserver' in w) {
      imgObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const img = e.target;
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
            }
            imgObserver.unobserve(img);
          }
        });
      }, { rootMargin: '300px 0px' });
      lazyImgs.forEach((i) => imgObserver.observe(i));
    } else {
      lazyImgs.forEach((img) => {
        const src = img.getAttribute('data-src');
        if (src) { img.src = src; img.classList.add('loaded'); }
      });
    }

    /* ---------- منوی موبایل ---------- */
    const menuToggle = d.getElementById('menuToggle');
    const mobileMenu = d.getElementById('mobileMenu');
    const menuCloseBtn = d.getElementById('mobileMenuClose');
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
    let menuToggleListener = null;
    if (menuToggle && mobileMenu) {
      menuToggleListener = () => {
        const open = mobileMenu.classList.toggle('open');
        mobileMenu.setAttribute('aria-hidden', String(!open));
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
        d.body.style.overflow = open ? 'hidden' : '';
      };
      menuToggle.addEventListener('click', menuToggleListener);
      mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
      if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeMenu);
    }

    /* ---------- فیلتر محصولات ---------- */
    const carChips = d.querySelectorAll('.filter-cars .fchip');
    const catChips = d.querySelectorAll('.filter-cats .fchip');
    const productCards = d.querySelectorAll('.p-card[data-car]');
    let activeCar = 'all';
    let activeCat = 'all';

    function applyFilters() {
      productCards.forEach((card) => {
        const ok = (activeCar === 'all' || card.getAttribute('data-car') === activeCar) &&
          (activeCat === 'all' || card.getAttribute('data-cat') === activeCat);
        card.classList.toggle('is-hidden', !ok);
        if (ok && !reduceMotion) {
          card.classList.remove('in-view');
          card.style.opacity = '0';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.style.opacity = '';
              card.classList.add('in-view');
            });
          });
        }
      });
    }
    const carChipListeners = [];
    carChips.forEach((chip) => {
      const fn = () => {
        carChips.forEach((c) => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
        chip.classList.add('is-active');
        chip.setAttribute('aria-selected', 'true');
        activeCar = chip.getAttribute('data-car');
        applyFilters();
      };
      chip.addEventListener('click', fn);
      carChipListeners.push([chip, fn]);
    });
    const catChipListeners = [];
    catChips.forEach((chip) => {
      const fn = () => {
        catChips.forEach((c) => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
        chip.classList.add('is-active');
        chip.setAttribute('aria-selected', 'true');
        activeCat = chip.getAttribute('data-cat');
        applyFilters();
      };
      chip.addEventListener('click', fn);
      catChipListeners.push([chip, fn]);
    });

    /* ---------- شیت نمایش سریع ---------- */
    const sheet = d.getElementById('productSheet');
    const sheetBody = d.getElementById('sheetBody');
    const backdrop = d.getElementById('sheetBackdrop');
    const sheetClose = d.getElementById('sheetClose');
    let lastFocus = null;

    function openSheet(data) {
      if (!sheet || !sheetBody) return;
      let priceHtml;
      if (data.price_on_call || !data.price) {
        priceHtml = '<b>استعلام تلفنی</b><span>برای قیمت روز تماس بگیرید</span>';
      } else {
        priceHtml = '<b>' + toFa(data.price.toLocaleString('en-US').replace(/,/g, '،')) + ' تومان</b><span>قیمت روز · مشاوره رایگان</span>';
      }
      const badges = (data.badges || []).map((b) => '<span class="sbadge">' + b + '</span>').join('');
      const colors = (data.colors && data.colors.length) ? '<span class="sbadge">' + data.colors.join('</span><span class="sbadge">') + '</span>' : '';
      const phoneEl = d.querySelector('.footer-tel');
      const tel = phoneEl ? phoneEl.getAttribute('href').replace('tel:', '') : '';
      sheetBody.innerHTML =
        '<div class="sheet-img">' + (data.img ? '<img src="' + data.img + '" alt="' + data.name + '">' : '') + '</div>' +
        '<div class="sheet-detail">' +
        '<div class="sheet-cat"><span>' + data.car + '</span><span>·</span><span>' + data.cat + '</span>' + (data.in_stock === false ? '<span>·</span><span style="color:#C64B42;font-weight:700">ناموجود</span>' : '') + '</div>' +
        '<h3 class="sheet-title">' + data.name + '</h3>' +
        (badges ? '<div class="sheet-badges">' + badges + '</div>' : '') +
        (colors ? '<div class="sheet-badges">' + colors + '</div>' : '') +
        '<p class="sheet-desc">' + (data.desc || '') + '</p>' +
        '<div class="sheet-price">' + priceHtml + '</div>' +
        '<ul class="sheet-usps"><li>۵ سال ضمانت رنگ</li><li>رنگ کوره‌ای شرکتی + قطعه فابریک</li><li>ارسال به سراسر کشور</li></ul>' +
        '<div class="sheet-cta"><a class="btn btn-primary btn-lg" href="tel:' + tel + '">تماس برای سفارش</a></div>' +
        '</div>';
      lastFocus = d.activeElement;
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('show');
      d.body.style.overflow = 'hidden';
      if (sheetClose) sheetClose.focus();
    }
    function closeSheet() {
      if (!sheet) return;
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('show');
      d.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    const quickViewListeners = [];
    d.querySelectorAll('[data-quickview]').forEach((btn) => {
      const fn = () => {
        const card = btn.closest('.p-card');
        if (!card) return;
        try { openSheet(JSON.parse(card.getAttribute('data-product'))); } catch (err) { /* noop */ }
      };
      btn.addEventListener('click', fn);
      quickViewListeners.push([btn, fn]);
    });
    const sheetCloseListener = () => closeSheet();
    const backdropListener = () => closeSheet();
    if (sheetClose) sheetClose.addEventListener('click', sheetCloseListener);
    if (backdrop) backdrop.addEventListener('click', backdropListener);

    /* ---------- Tilt (فقط دسکتاپ با اشاره‌گر) ---------- */
    const tiltCleanups = [];
    if (!isTouch && !reduceMotion && w.matchMedia('(min-width: 861px)').matches) {
      d.querySelectorAll('.p-card').forEach((card) => {
        let raf = null;
        const move = (e) => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = 'translateY(-6px) rotateX(' + (-y * 3.5).toFixed(2) + 'deg) rotateY(' + (x * 3.5).toFixed(2) + 'deg)';
            raf = null;
          });
        };
        const leave = () => { card.style.transform = ''; };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        tiltCleanups.push(() => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        });
      });
    }

    /* ---------- پارالاکس هیرو (دسکتاپ) ---------- */
    const heroFrame = d.querySelector('.hero-frame');
    const hero = d.querySelector('.hero');
    const heroCleanups = [];
    if (heroFrame && hero && !isTouch && !reduceMotion) {
      const move = (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        heroFrame.style.transform = 'perspective(1100px) rotateX(' + (y * -2.4).toFixed(2) + 'deg) rotateY(' + (x * 2.4).toFixed(2) + 'deg)';
      };
      const leave = () => { heroFrame.style.transform = ''; };
      hero.addEventListener('pointermove', move);
      hero.addEventListener('pointerleave', leave);
      heroFrame.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
      heroCleanups.push(() => {
        hero.removeEventListener('pointermove', move);
        hero.removeEventListener('pointerleave', leave);
      });
    }

    /* ---------- FAQ: آکاردئون تک‌باز ---------- */
    const faqItems = d.querySelectorAll('.faq-item');
    const faqListeners = [];
    faqItems.forEach((item) => {
      const fn = () => {
        if (item.open) {
          faqItems.forEach((other) => {
            if (other !== item) other.open = false;
          });
        }
      };
      item.addEventListener('toggle', fn);
      faqListeners.push([item, fn]);
    });

    /* ---------- اسکرول نرم لنگرها ---------- */
    const anchorListeners = [];
    d.querySelectorAll('a[href^="#"]').forEach((a) => {
      const fn = (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = d.getElementById(id);
        if (target) {
          e.preventDefault();
          const top = target.getBoundingClientRect().top + w.scrollY - 84;
          w.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
          history.replaceState(null, '', '#' + id);
        }
      };
      a.addEventListener('click', fn);
      anchorListeners.push([a, fn]);
    });

    /* ---------- کلید Escape ---------- */
    const keyListener = (e) => {
      if (e.key === 'Escape') { closeSheet(); closeMenu(); }
    };
    d.addEventListener('keydown', keyListener);

    /* ---------- PWA ---------- */
    if ('serviceWorker' in navigator && w.location.protocol === 'https:') {
      w.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    // وضعیت اولیه
    onScroll();

    /* ---------- پاکسازی ---------- */
    return () => {
      w.removeEventListener('scroll', scrollListener);
      d.removeEventListener('keydown', keyListener);
      if (revealObserver) revealObserver.disconnect();
      if (secObserver) secObserver.disconnect();
      if (cObserver) cObserver.disconnect();
      if (imgObserver) imgObserver.disconnect();
      if (menuToggle && menuToggleListener) menuToggle.removeEventListener('click', menuToggleListener);
      carChipListeners.forEach(([el, fn]) => el.removeEventListener('click', fn));
      catChipListeners.forEach(([el, fn]) => el.removeEventListener('click', fn));
      quickViewListeners.forEach(([el, fn]) => el.removeEventListener('click', fn));
      faqListeners.forEach(([el, fn]) => el.removeEventListener('toggle', fn));
      anchorListeners.forEach(([el, fn]) => el.removeEventListener('click', fn));
      tiltCleanups.forEach((fn) => fn());
      heroCleanups.forEach((fn) => fn());
      if (sheetClose) sheetClose.removeEventListener('click', sheetCloseListener);
      if (backdrop) backdrop.removeEventListener('click', backdropListener);
    };
  }, []);

  return null;
}
