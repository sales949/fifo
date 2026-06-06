/* ===========================================================
   FIFOFINDER funnel page — extra features
   (loads alongside script.js, which handles theme / header /
    counters / reveal / lightbox / apply modal)
   =========================================================== */
(function () {
  'use strict';

  /* ---------- mobile nav ---------- */
  const navToggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  const navScrim = document.getElementById('navScrim');
  const setNav = (open) => {
    if (!mobileNav) return;
    mobileNav.classList.toggle('open', open);
    navScrim.classList.toggle('open', open);
    document.body.classList.toggle('modal-open', open);
  };
  if (navToggle) navToggle.addEventListener('click', () => setNav(!mobileNav.classList.contains('open')));
  if (navScrim) navScrim.addEventListener('click', () => setNav(false));
  if (mobileNav) mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setNav(false)));

  /* ---------- smooth-scroll for in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ===========================================================
     FAQ ACCORDION
     =========================================================== */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
    });
  });

  /* ===========================================================
     FIFO READINESS QUIZ
     =========================================================== */
  const QUIZ = [
    { q: 'Have you worked FIFO before?', o: [['No, never', 0], ['Some related / site work', 8], ['Yes, experienced FIFO', 15]] },
    { q: 'Do you have any mining-related tickets?', o: [['None yet', 0], ['1–2 tickets', 7], ['3 or more', 13]] },
    { q: 'How long have you been applying?', o: [["Haven't started", 5], ['Under 3 months', 10], ['3–6 months', 7], ['6+ months', 4]] },
    { q: 'How many applications have you submitted?', o: [['None yet', 2], ['1–10', 6], ['10–50', 10], ['50+', 12]] },
    { q: 'Have you received any interviews?', o: [['None', 0], ['1–2', 8], ['3 or more', 14]] },
    { q: 'Do you have a FIFO-specific resume?', o: [['No', 0], ["I'm not sure", 4], ['Yes', 12]] },
    { q: 'What industry experience do you have?', o: [['None relevant', 2], ['Labour / trades / hospitality', 8], ['Direct mining / resources', 14]] },
    { q: 'How soon do you want to start?', o: [['Just exploring', 2], ['Within 3–6 months', 5], ['As soon as possible', 8]] }
  ];
  const MAXP = QUIZ.reduce((s, x) => s + Math.max(...x.o.map((o) => o[1])), 0);

  const quizRoot = document.getElementById('quiz');
  if (quizRoot) {
    const stage = quizRoot.querySelector('#quizStage');
    const bar = quizRoot.querySelector('#quizBar');
    const meta = quizRoot.querySelector('#quizMeta');
    const answers = new Array(QUIZ.length).fill(null);
    let qi = 0;

    const setBar = (pct) => { bar.style.width = pct + '%'; };

    const renderQ = () => {
      const item = QUIZ[qi];
      setBar((qi / (QUIZ.length + 1)) * 100);
      meta.textContent = `Question ${qi + 1} of ${QUIZ.length}`;
      stage.innerHTML =
        `<div class="quiz-q">
           <h3>${item.q}</h3>
           <div class="quiz-opts">${item.o.map((o, i) =>
             `<button type="button" class="quiz-opt${answers[qi] === i ? ' sel' : ''}" data-i="${i}">
                <span class="dotmark"></span><span>${o[0]}</span>
              </button>`).join('')}
           </div>
           <div class="quiz-actions">
             <button type="button" class="quiz-back" id="qBack"${qi === 0 ? ' hidden' : ''}>← Back</button>
             <span></span>
           </div>
         </div>`;
      stage.querySelectorAll('.quiz-opt').forEach((b) => {
        b.addEventListener('click', () => {
          answers[qi] = +b.dataset.i;
          if (qi < QUIZ.length - 1) { qi++; renderQ(); }
          else renderGate();
        });
      });
      const back = stage.querySelector('#qBack');
      if (back) back.addEventListener('click', () => { if (qi > 0) { qi--; renderQ(); } });
    };

    const renderGate = () => {
      setBar((QUIZ.length / (QUIZ.length + 1)) * 100);
      meta.textContent = 'Almost done — see your score';
      stage.innerHTML =
        `<div class="quiz-gate">
           <h3>Where should we send your FIFO Readiness Score?</h3>
           <p>Get your 0–100 score plus custom recommendations for your situation.</p>
           <form id="quizForm" novalidate>
             <div class="field"><label for="qz-name">Full name <span class="req">*</span></label>
               <input id="qz-name" name="name" type="text" placeholder="Jane Smith" required><small class="err" data-err></small></div>
             <div class="field"><label for="qz-email">Email <span class="req">*</span></label>
               <input id="qz-email" name="email" type="email" placeholder="you@email.com" required><small class="err" data-err></small></div>
             <div class="field"><label for="qz-phone">Mobile <span class="req">*</span></label>
               <input id="qz-phone" name="phone" type="tel" inputmode="tel" placeholder="04xx xxx xxx" required><small class="err" data-err></small></div>
             <div class="quiz-actions">
               <button type="button" class="quiz-back" id="qBack2">← Back</button>
               <button type="submit" class="btn btn-apply">Show my score →</button>
             </div>
           </form>
         </div>`;
      stage.querySelector('#qBack2').addEventListener('click', () => { qi = QUIZ.length - 1; renderQ(); });
      const f = stage.querySelector('#quizForm');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateSimple(f)) return;
        const lead = {};
        new FormData(f).forEach((v, k) => (lead[k] = v));
        renderResult(lead);
      });
    };

    const renderResult = (lead) => {
      setBar(100);
      meta.textContent = 'Your result';
      const raw = answers.reduce((s, a, i) => s + (a == null ? 0 : QUIZ[i].o[a][1]), 0);
      const score = Math.min(100, Math.round((raw / MAXP) * 100));
      let cat, cls, reco;
      if (score <= 30) {
        cat = 'Not Ready Yet'; cls = 'c1';
        reco = ['Get the core mining tickets that match your target role', 'Build a FIFO-specific resume (a normal resume gets skipped)', 'Book a strategy call so we can map your fastest path'];
      } else if (score <= 60) {
        cat = 'Some Gaps To Fix'; cls = 'c2';
        reco = ['Rebuild your resume around the signals recruiters scan for', 'Target the right roles & sites instead of applying everywhere', 'A strategy call will pinpoint exactly what to fix first'];
      } else if (score <= 80) {
        cat = 'Close To FIFO Ready'; cls = 'c3';
        reco = ['Tighten your applications and tracking', 'Prepare for recruiter screening calls', 'A short strategy call can get you over the line fast'];
      } else {
        cat = 'FIFO Opportunity Ready'; cls = 'c4';
        reco = ['You’re ready — now it’s about speed and targeting', 'Let us put your application in front of the right recruiters', 'Book a call to fast-track your first offer'];
      }
      const first = (lead.name || '').split(' ')[0] || 'mate';
      stage.innerHTML =
        `<div class="quiz-result">
           <div class="score-ring" id="scoreRing"><div class="inner"><div><span class="num">${score}</span><div class="of">/ 100</div></div></div></div>
           <p class="score-cat ${cls}">${cat}</p>
           <p style="text-align:center;color:var(--muted);margin-bottom:6px">Nice work, ${first}. Here's where you stand.</p>
           <div class="reco"><h4>Your custom next steps</h4><ul>${reco.map((r) => `<li>${r}</li>`).join('')}</ul></div>
           <button type="button" class="btn btn-apply btn-block" data-open-form data-plan="From Readiness Quiz (score ${score})">Book your free FIFO strategy session</button>
         </div>`;
      // animate ring
      const ring = stage.querySelector('#scoreRing');
      requestAnimationFrame(() => ring.style.setProperty('--val', score));
      // re-bind the apply button to the existing modal
      const ab = stage.querySelector('[data-open-form]');
      if (ab && window.FIFO && window.FIFO.openForm) ab.addEventListener('click', () => window.FIFO.openForm(ab.dataset.plan));
      try { localStorage.setItem('fifo_quiz', JSON.stringify({ lead, score, cat })); } catch (_) {}
      console.log('Quiz lead:', lead, 'score', score, cat);
    };

    renderQ();
  }

  /* ===========================================================
     SALARY CALCULATOR
     =========================================================== */
  // rough indicative annual FIFO base by role (AUD), before experience factor
  const ROLES = {
    'Cleaner / Domestic': 95000,
    'Kitchen / Hospitality': 92000,
    'Utility / Trade Assistant': 110000,
    'Truck / HD Operator': 140000,
    'Plant Operator': 135000,
    'Driller / Offsider': 130000,
    'Trades / Maintenance': 160000,
    'Electrical / Instrumentation': 175000,
    'Supervisor / Leading Hand': 185000
  };
  const EXP = { 'Entry level': 0.85, 'Some experience': 1.0, 'Experienced': 1.12 };

  const calc = document.getElementById('calc');
  if (calc) {
    const roleSel = calc.querySelector('#cl-role');
    const expSel = calc.querySelector('#cl-exp');
    Object.keys(ROLES).forEach((r) => roleSel.add(new Option(r, r)));
    Object.keys(EXP).forEach((e) => expSel.add(new Option(e, e)));
    roleSel.value = 'Utility / Trade Assistant';
    expSel.value = 'Some experience';

    const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
    const out = {
      head: calc.querySelector('#cl-headline'), sub: calc.querySelector('#cl-sub'),
      curBar: calc.querySelector('#cl-cur-bar'), fifoBar: calc.querySelector('#cl-fifo-bar'),
      curVal: calc.querySelector('#cl-cur-val'), fifoVal: calc.querySelector('#cl-fifo-val'),
      d1: calc.querySelector('#cl-d1'), d3: calc.querySelector('#cl-d3'), d5: calc.querySelector('#cl-d5')
    };

    const run = () => {
      const cur = Math.max(0, +calc.querySelector('#cl-income').value || 0);
      const fifo = ROLES[roleSel.value] * EXP[expSel.value];
      const diff = fifo - cur;
      const max = Math.max(fifo, cur, 1);
      out.curVal.textContent = fmt(cur);
      out.fifoVal.textContent = fmt(fifo);
      out.curBar.style.width = (cur / max * 100) + '%';
      out.fifoBar.style.width = (fifo / max * 100) + '%';
      out.head.textContent = (diff >= 0 ? '+' : '') + fmt(diff) + ' / year';
      out.sub.textContent = diff >= 0
        ? `Switching to FIFO could lift your income by about ${fmt(diff)} a year.`
        : `This role pays a bit less than your current income — let's find a better-fit role on a call.`;
      out.d1.textContent = (diff >= 0 ? '+' : '') + fmt(diff);
      out.d3.textContent = (diff >= 0 ? '+' : '') + fmt(diff * 3);
      out.d5.textContent = (diff >= 0 ? '+' : '') + fmt(diff * 5);
    };
    calc.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', run));
    calc.querySelector('#cl-income').value = 70000;
    run();
  }

  /* ===========================================================
     RESOURCE LEAD POPUP (and exit-intent reuse)
     =========================================================== */
  const popup = document.getElementById('leadPopup');
  if (popup) {
    const titleEl = popup.querySelector('#popupTitle');
    const subEl = popup.querySelector('#popupSub');
    const eyebrowEl = popup.querySelector('#popupEyebrow');
    const form = popup.querySelector('#popupForm');
    const success = popup.querySelector('#popupSuccess');
    const formWrap = popup.querySelector('#popupFormWrap');
    let returnFocus = null;

    const openPopup = (opts) => {
      returnFocus = document.activeElement;
      eyebrowEl.textContent = opts.eyebrow || 'Free download';
      titleEl.textContent = opts.title || 'Get your free guide';
      subEl.textContent = opts.sub || 'Enter your details and we’ll send it straight to your inbox.';
      popup.dataset.asset = opts.asset || opts.title || 'resource';
      formWrap.hidden = false; success.hidden = true;
      form.reset();
      popup.classList.add('open'); popup.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      setTimeout(() => form.querySelector('input').focus(), 250);
    };
    const closePopup = () => {
      popup.classList.remove('open'); popup.setAttribute('aria-hidden', 'true');
      if (!document.querySelector('.modal.open')) document.body.classList.remove('modal-open');
      if (returnFocus) returnFocus.focus();
    };
    window.FIFO = window.FIFO || {};
    window.FIFO.openPopup = openPopup;

    popup.querySelectorAll('[data-close-popup]').forEach((el) => el.addEventListener('click', closePopup));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popup.classList.contains('open')) closePopup(); });

    document.querySelectorAll('[data-resource]').forEach((btn) => {
      btn.addEventListener('click', () => openPopup({
        eyebrow: btn.dataset.eyebrow || 'Free resource',
        title: btn.dataset.resource,
        sub: btn.dataset.sub,
        asset: btn.dataset.resource
      }));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateSimple(form)) return;
      const data = { asset: popup.dataset.asset };
      new FormData(form).forEach((v, k) => (data[k] = v));
      console.log('Resource lead:', data);
      try { localStorage.setItem('fifo_resource_lead', JSON.stringify(data)); } catch (_) {}
      formWrap.hidden = true; success.hidden = false;
    });

    /* ---------- exit intent ---------- */
    let exitShown = false;
    try { exitShown = sessionStorage.getItem('fifo_exit') === '1'; } catch (_) {}
    const fireExit = () => {
      if (exitShown || document.querySelector('.modal.open, .popup.open')) return;
      exitShown = true;
      try { sessionStorage.setItem('fifo_exit', '1'); } catch (_) {}
      openPopup({
        eyebrow: 'Before you go',
        title: 'Get the free FIFO Starter Guide',
        sub: 'The exact first steps to break into FIFO — tickets, resume and where to apply. Sent straight to your inbox.',
        asset: 'FIFO Starter Guide (exit intent)'
      });
    };
    document.addEventListener('mouseout', (e) => {
      if (e.clientY <= 0 && !e.relatedTarget) fireExit();
    });
  }

  /* ---------- shared simple validator ---------- */
  function validateSimple(form) {
    let ok = true;
    form.querySelectorAll('input[required]').forEach((input) => {
      const field = input.closest('.field');
      const err = field ? field.querySelector('[data-err]') : null;
      const val = (input.value || '').trim();
      let msg = '';
      if (!val) msg = 'This field is required.';
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = 'Enter a valid email.';
      else if (input.type === 'tel' && val.replace(/\D/g, '').length < 8) msg = 'Enter a valid phone number.';
      if (field) field.classList.toggle('invalid', !!msg);
      if (err) err.textContent = msg;
      if (msg) ok = false;
    });
    return ok;
  }
})();
