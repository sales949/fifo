/* ===========================================================
   FIFO Path — interactions
   =========================================================== */
(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- theme (light by default) ---------- */
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const THEME_KEY = 'fifo_theme';

  const applyTheme = (t) => {
    root.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#0c1018' : '#ffffff');
  };

  let theme = 'light';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (_) {}
  applyTheme(theme);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    });
  }

  /* ---------- header shadow on scroll ---------- */
  const header = document.getElementById('header');
  const mobileCta = document.querySelector('.mobile-cta');
  const hero = document.querySelector('.hero');

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
    // show sticky mobile CTA once the hero CTA scrolls out of view
    if (hero) {
      const past = window.scrollY > hero.offsetHeight - 120;
      mobileCta.classList.toggle('show', past);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- animated stat counters ---------- */
  const counters = document.querySelectorAll('.stat-num[data-count]');
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- scroll reveal + counter trigger ---------- */
  const revealEls = document.querySelectorAll(
    '.section .narrow, .signal-card, .testi, .price-card, .outcome, .callout, .stat, ' +
    '.vs-card, .step-item, .receipt, .steps-result'
  );
  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = Math.min((i % 6) * 60, 300) + 'ms';
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          if (e.target.classList.contains('stat')) {
            const num = e.target.querySelector('.stat-num[data-count]');
            if (num && !num.dataset.done) {
              num.dataset.done = '1';
              runCounter(num);
            }
          }
          io.unobserve(e.target);
        });
      },
      { threshold: 0.18 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
    counters.forEach(runCounter);
  }

  /* ===========================================================
     LIGHTBOX (proof expand / close)
     =========================================================== */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbCap = document.getElementById('lightboxCap');
  const zoomBtns = Array.from(document.querySelectorAll('[data-zoom]'));
  let lbIndex = 0;
  let lbReturnFocus = null;

  const showLb = (i) => {
    lbIndex = (i + zoomBtns.length) % zoomBtns.length;
    const btn = zoomBtns[lbIndex];
    const img = btn.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = btn.dataset.cap || img.alt || '';
  };

  const openLb = (i) => {
    lbReturnFocus = document.activeElement;
    showLb(i);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.querySelector('.lightbox-close').focus();
  };

  const closeLb = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.open')) document.body.classList.remove('modal-open');
    lbImg.src = '';
    if (lbReturnFocus) lbReturnFocus.focus();
  };

  zoomBtns.forEach((btn, i) => btn.addEventListener('click', () => openLb(i)));
  document.querySelectorAll('[data-close-lightbox]').forEach((el) => el.addEventListener('click', closeLb));
  document.querySelector('[data-lb-prev]').addEventListener('click', () => showLb(lbIndex - 1));
  document.querySelector('[data-lb-next]').addEventListener('click', () => showLb(lbIndex + 1));
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    else if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });

  // swipe navigation on touch devices
  let touchX = null;
  lightbox.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  /* ===========================================================
     MODAL + MULTI-STEP FORM
     =========================================================== */
  const modal = document.getElementById('applyModal');
  const form = document.getElementById('applyForm');
  const body = document.getElementById('modalBody');
  const success = document.getElementById('modalSuccess');
  const steps = Array.from(form.querySelectorAll('.step'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressBar = document.getElementById('progressBar');
  const stepNow = document.getElementById('stepNow');
  const planSelect = document.getElementById('f-plan');

  let current = 0;
  let lastFocused = null;

  const openModal = (plan) => {
    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // reset to form view
    body.hidden = false;
    success.hidden = true;
    current = 0;
    showStep(0);
    if (plan && planSelect) planSelect.value = plan;
    setTimeout(() => form.querySelector('#f-name').focus(), 320);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocused) lastFocused.focus();
  };

  document.querySelectorAll('[data-open-form]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.plan));
  });
  // expose for dynamically-created buttons (e.g. quiz result CTA on new.html)
  window.FIFO = window.FIFO || {};
  window.FIFO.openForm = openModal;
  document.querySelectorAll('[data-close-form]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  /* ---------- step navigation ---------- */
  const showStep = (idx) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    progressBar.style.width = ((idx + 1) / steps.length) * 100 + '%';
    stepNow.textContent = idx + 1;
    prevBtn.hidden = idx === 0;
    nextBtn.hidden = idx === steps.length - 1;
    submitBtn.hidden = idx !== steps.length - 1;
    body.scrollTop = 0;
  };

  /* ---------- validation ---------- */
  const setError = (field, msg) => {
    field.classList.toggle('invalid', !!msg);
    const err = field.querySelector('[data-err]');
    if (err) err.textContent = msg || '';
  };

  const validateField = (input) => {
    const field = input.closest('.field');
    if (!field) return true;
    const val = (input.value || '').trim();

    if (input.required && !val) {
      setError(field, 'This field is required.');
      return false;
    }
    if (input.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError(field, 'Enter a valid email address.');
      return false;
    }
    if (input.type === 'tel' && val) {
      const digits = val.replace(/\D/g, '');
      if (digits.length < 8) {
        setError(field, 'Enter a valid phone number.');
        return false;
      }
    }
    setError(field, '');
    return true;
  };

  const validateStep = (idx) => {
    const step = steps[idx];
    let ok = true;

    // text/email/tel/select required inputs
    step.querySelectorAll('input[required], select[required]').forEach((input) => {
      if (input.type === 'radio' || input.type === 'checkbox') return;
      if (!validateField(input)) ok = false;
    });

    // required radio groups
    const radioGroups = new Set();
    step.querySelectorAll('input[type="radio"][required]').forEach((r) => radioGroups.add(r.name));
    radioGroups.forEach((name) => {
      const checked = step.querySelector(`input[name="${name}"]:checked`);
      const field = step.querySelector(`input[name="${name}"]`).closest('.field');
      if (!checked) {
        setError(field, 'Please pick one.');
        ok = false;
      } else {
        setError(field, '');
      }
    });

    // consent checkbox (step 3)
    const consent = step.querySelector('input[name="consent"]');
    if (consent) {
      const errEl = step.querySelector('[data-err-consent]');
      if (!consent.checked) {
        if (errEl) errEl.textContent = 'Please tick to continue.';
        ok = false;
      } else if (errEl) {
        errEl.textContent = '';
      }
    }
    return ok;
  };

  // live-clear errors as the user types/changes
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('input, select, textarea')) {
      const field = t.closest('.field');
      if (field && field.classList.contains('invalid')) validateField(t);
    }
  });

  // validate every step; jump to the first incomplete one
  const validateAll = () => {
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        if (current !== i) {
          current = i;
          showStep(i);
        }
        const firstBad = steps[i].querySelector('.field.invalid input, .field.invalid select, [data-err-consent]');
        if (firstBad && firstBad.focus) firstBad.focus();
        return false;
      }
    }
    return true;
  };

  // route Enter to Continue/Submit instead of a premature implicit submit
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    if (current < steps.length - 1) nextBtn.click();
    else submitBtn.click();
  });

  nextBtn.addEventListener('click', () => {
    if (!validateStep(current)) return;
    if (current < steps.length - 1) {
      current++;
      showStep(current);
    }
  });

  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      current--;
      showStep(current);
    }
  });

  /* ---------- submit ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    // gather data (ready to POST to a backend / form service)
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key]) {
        data[key] = [].concat(data[key], value);
      } else {
        data[key] = value;
      }
    });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    // Simulated async submit. Replace this block with a real fetch():
    //   fetch('/api/apply', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })
    setTimeout(() => {
      console.log('FIFO Path application submitted:', data);
      try { localStorage.setItem('fifo_last_application', JSON.stringify(data)); } catch (_) {}

      const name = (data.name || '').split(' ')[0] || 'mate';
      document.getElementById('successName').textContent = name;
      body.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ block: 'nearest' });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit application';
    }, 850);
  });
})();
