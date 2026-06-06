/* ===========================================================
   FIFO Path — interactions
   =========================================================== */
(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- theme (dark by default) ---------- */
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const THEME_KEY = 'fifo_theme';

  const applyTheme = (t) => {
    root.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#0c1018' : '#ffffff');
  };

  let theme = 'dark';
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
  const toTop = document.getElementById('toTop');

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
    // show sticky mobile CTA once the hero CTA scrolls out of view
    if (hero) {
      const past = window.scrollY > hero.offsetHeight - 120;
      mobileCta.classList.toggle('show', past);
    }
    // show back-to-top button after scrolling down a screen or so
    if (toTop) toTop.classList.toggle('show', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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

  /* ---------- booking + registration state (each filled only once) ---------- */
  window.FIFO = window.FIFO || {};
  const REG_KEY = 'fifo_last_application';
  const BOOK_KEY = 'fifo_booking';
  const LEAD_KEY = 'fifo_lead';   // shared contact profile (name/email/phone) used by every form
  // Demo: state lives in sessionStorage and is wiped on every page load,
  // so each refresh starts from a clean slate.
  const store = window.sessionStorage;
  try { store.removeItem(REG_KEY); store.removeItem(BOOK_KEY); store.removeItem(LEAD_KEY); } catch (_) {}
  const readJSON = (k) => { try { return JSON.parse(store.getItem(k) || 'null'); } catch (_) { return null; } };
  const writeJSON = (k, v) => { try { store.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const fmtWhen = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) { return ''; } };

  FIFO.getRegistration = () => readJSON(REG_KEY);
  FIFO.isRegistered = () => !!FIFO.getRegistration();
  FIFO.getBooking = () => readJSON(BOOK_KEY);
  FIFO.setBooking = (b) => { const rec = Object.assign({}, b, { at: new Date().toISOString() }); writeJSON(BOOK_KEY, rec); return rec; };
  FIFO.clearBooking = () => { try { store.removeItem(BOOK_KEY); } catch (_) {} };
  FIFO.pendingSlot = null;        // a date/time chosen on a calendar before registering
  FIFO.refreshCals = () => {};    // replaced by new.js once the calendars are built
  FIFO.fmtWhen = fmtWhen;

  /* ---------- shared lead profile (collected once, reused everywhere) ----------
     Whichever form the visitor fills first — apply, readiness quiz or a free-guide
     download — saves their name/email/phone here. Every other form then reads it
     so we never ask the same person for the same details twice. */
  const pickLead = (o) => {
    const out = {};
    ['name', 'email', 'phone'].forEach((k) => {
      const v = o && o[k] != null ? String(o[k]).trim() : '';
      if (v) out[k] = v;
    });
    return out;
  };
  FIFO.getLead = () => {
    const reg = FIFO.getRegistration();
    return Object.assign({}, reg ? pickLead(reg) : {}, readJSON(LEAD_KEY) || {});
  };
  FIFO.saveLead = (o) => {
    const merged = Object.assign({}, FIFO.getLead(), pickLead(o || {}));
    writeJSON(LEAD_KEY, merged);
    return merged;
  };
  // true once we hold every detail the lead forms ask for → safe to skip them
  FIFO.hasLead = () => {
    const l = FIFO.getLead();
    return !!(l.name && l.email && l.phone);
  };
  // prefill any name/email/phone fields in a form from the saved profile
  FIFO.fillLead = (formEl) => {
    if (!formEl) return;
    const l = FIFO.getLead();
    ['name', 'email', 'phone'].forEach((k) => {
      const input = formEl.querySelector(`[name="${k}"]`);
      if (input && !input.value && l[k]) input.value = l[k];
    });
  };

  const successName = document.getElementById('successName');
  const successSub = document.getElementById('successSub');
  const successTitle = document.getElementById('successTitle');

  // Show the post-registration screen, with messaging that reflects current state.
  const showSuccess = () => {
    body.hidden = true;
    success.hidden = false;
    const reg = FIFO.getRegistration();
    const booking = FIFO.getBooking();
    const first = reg && reg.name ? String(reg.name).split(' ')[0] : 'mate';
    if (successName) successName.textContent = first;
    if (successTitle) successTitle.textContent = booking ? "You're all set. 🎉" : "You're in. 🎉";
    if (successSub) {
      if (booking) {
        successSub.textContent = `Thanks, ${first} — your call is locked in below.`;
      } else if (reg && reg._submittedAt) {
        successSub.textContent = `Welcome back, ${first}. Your details are already on file (submitted ${fmtWhen(reg._submittedAt)}). Just pick a time below.`;
      } else {
        successSub.textContent = `Thanks, ${first}. Pick a time below to lock in your free FIFO strategy call.`;
      }
    }
    FIFO.refreshCals();
    success.scrollIntoView({ block: 'nearest' });
  };
  FIFO.showSuccess = showSuccess;

  const openModal = (plan) => {
    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // details already collected once → skip the form, go straight to booking
    if (FIFO.isRegistered()) { showSuccess(); return; }
    // first time → show the qualification form
    body.hidden = false;
    success.hidden = true;
    current = 0;
    showStep(0);
    FIFO.fillLead(form);   // reuse name/email/phone already given elsewhere
    if (plan && planSelect) planSelect.value = plan;
    setTimeout(() => { const n = form.querySelector('#f-name'); if (n) n.focus(); }, 320);
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
  // expose for dynamically-created buttons (e.g. quiz result CTA)
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
      data._submittedAt = new Date().toISOString();
      console.log('FIFO Path application submitted:', data);
      writeJSON(REG_KEY, data);
      FIFO.saveLead(data);   // share contact details with the quiz / guide forms

      // if the user already picked a time on a calendar, finalise that booking now
      // (so they're never asked for a date/time twice)
      if (FIFO.pendingSlot && !FIFO.getBooking()) {
        FIFO.setBooking(FIFO.pendingSlot);
      }
      FIFO.pendingSlot = null;

      showSuccess();

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit & book my call';
    }, 850);
  });
})();
