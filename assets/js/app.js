/* =========================================================================
   অ্যাপ — UI, লোকাল স্টোরেজ, ফলাফল ও পিডিএফ
   ========================================================================= */
(function () {
  'use strict';
  const STORE_KEY = 'jsi2026_calc_v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------- স্টেট ---------------- */
  const DEFAULTS = {
    name: '', baNo: '', unit: '', rank: '', dob: '', joinDate: '',
    oldBasic: '',
    marital: 'MARRIED', children: 0, disabledChildren: 0,
    skill: 'NONE', appointment: 'NONE', badges: 0, serviceWardenship: '', specials: [],
    otherNew: '',
        retireDate: '', promotions: [], commutePct: '', rationAdults: 2, rationChildren: 0,
  };
  let S = load();
  let lastTL = null, lastRT = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }, 250);
  }

  /* ---------------- ইউটিলিটি ---------------- */
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function countUp(el, to, dur = 900) {
    const from = 0, start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = tk(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const num = v => { const n = toNum(v); return isNaN(n) ? 0 : n; };
  const optNum = v => { const n = toNum(v); return isNaN(n) ? undefined : n; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const signed = n => (n > 0 ? '+' : n < 0 ? '' : '') + tk(n);
  const deltaCls = n => n > 0 ? 'up' : n < 0 ? 'down' : '';

  /* ---------------- ফর্ম সেটআপ ---------------- */
  function initForm() {
    // কনফিগ
    $('#dev-name').textContent = SITE_CONFIG.developer.name;
    $('#dev-role').textContent = SITE_CONFIG.developer.title;
    $('#ad-title').textContent = SITE_CONFIG.ad.title;
    $('#ad-tag').textContent = SITE_CONFIG.ad.tagline;
    $('#ad-cta').textContent = SITE_CONFIG.ad.cta;
    $('#ad').href = SITE_CONFIG.ad.url || '#';

    $('#rank').innerHTML = `<option value=""></option>` + CURRENT_RANK_KEYS.map(k => `<option value="${k}">${RANKS[k].name}</option>`).join('');
    $('#skill').innerHTML = `<option value="NONE">প্রযোজ্য নয়</option><option value="HIGH">উচ্চ দক্ষতা বেতন</option><option value="NORMAL">দক্ষতা বেতন</option>`;
    $('#appointment').innerHTML = Object.entries(APPOINTMENT).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    $('#specials').innerHTML = Object.entries(SPECIAL_PAY).map(([k, v]) =>
      `<label class="chipbox"><input type="checkbox" value="${k}" /><span>${v.label.replace(' বেতন', '')}</span></label>`).join('');


    // স্টেট → ফর্ম
    ['name','baNo','unit','rank','dob','joinDate','oldBasic','skill','appointment','serviceWardenship','otherNew','retireDate','commutePct']
      .forEach(id => { const el = $('#' + id); if (el) el.value = S[id] ?? ''; });
    if (S.rank && !RANKS[S.rank]) S.rank = '';
    if (!S.rank || (RANKS[S.rank].oldScale && !RANKS[S.rank].oldScale.includes(num(S.oldBasic)))) S.oldBasic = '';
    $('#oldBasic').value = S.oldBasic;
    renderOldBasic();
    $$('#specials input').forEach(i => i.checked = S.specials.includes(i.value));
    $$('[data-seg]').forEach(seg => setSeg(seg, S[seg.dataset.seg]));
    $$('[data-step]').forEach(st => st.querySelector('output').textContent = bn(S[st.dataset.step] || 0));
    renderPromos();
    updateOldStartHint();
    refreshPlaceholders();

    // ইভেন্ট
    $('#form').addEventListener('input', onInput);
    $('#form').addEventListener('change', onInput);
    $('#view-pension').addEventListener('input', onInput);
    $('#view-pension').addEventListener('change', onInput);

    $$('[data-seg] button').forEach(b => b.addEventListener('click', () => {
      const seg = b.parentElement; S[seg.dataset.seg] = b.dataset.v; setSeg(seg, b.dataset.v); save(); refreshPlaceholders();
    }));
    $$('[data-step] button').forEach(b => b.addEventListener('click', () => {
      const st = b.parentElement, k = st.dataset.step;
      S[k] = Math.max(0, Math.min(k === 'badges' ? 3 : 10, (S[k] || 0) + Number(b.dataset.d)));
      st.querySelector('output').textContent = bn(S[k]); save(); refreshPlaceholders();
    }));
    $('#btn-calc').addEventListener('click', () => { if (calcSalary(true)) go('salary'); });
    $('#btn-pension').addEventListener('click', () => calcPension(true));
    $('#btn-add-promo').addEventListener('click', () => { S.promotions.push({ rank: '', date: '' }); renderPromos(); save(); });
    $('#btn-reset').addEventListener('click', () => {
      if (!confirm('আপনার দেওয়া সব তথ্য মুছে ফেলতে চান?')) return;
      localStorage.removeItem(STORE_KEY); S = JSON.parse(JSON.stringify(DEFAULTS)); location.reload();
    });
    $$('.nav-btn').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
    $$('[data-report]').forEach(b => b.addEventListener('click', () => makePdf(b.dataset.report)));
  }

  function setSeg(seg, v) { $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); }

  function onInput(e) {
    const el = e.target;
    if (!el.id && !el.closest('#specials') && !el.dataset.promo) return;
    if (el.closest('#specials')) {
      S.specials = $$('#specials input:checked').map(i => i.value);
    } else if (el.dataset.promo !== undefined) {
      const i = Number(el.dataset.idx); S.promotions[i][el.dataset.promo] = el.value;
    } else if (el.id.startsWith('ov_')) {
      S.ov[el.id.slice(3)] = el.value;
    } else if (el.type === 'checkbox') {
      S[el.id] = el.checked;
    } else if (el.id === 'rank') {
      S.rank = el.value;
      const R = RANKS[S.rank];
      if (!R?.oldScale || !R.oldScale.includes(num(S.oldBasic))) S.oldBasic = '';
      $('#oldBasic').value = S.oldBasic;
      renderOldBasic();
      updateOldStartHint();
      refreshPlaceholders();
    } else if (el.id === 'oldBasicSel') {
      S.oldBasic = el.value; $('#oldBasic').value = el.value;
    } else if (el.id in S) {
      S[el.id] = el.value;
    }
    save();
    if (e.type === 'change' || el.id === 'oldBasic' || el.id === 'oldBasicSel') refreshPlaceholders();
  }

  /* পদবি অনুযায়ী পুরোনো স্কেলের ধাপগুলো ড্রপডাউনে দেখানো; স্কেল না থাকলে হাতে লেখার ঘর */
  function renderOldBasic() {
    const R = RANKS[S.rank];
    const sel = $('#oldBasicSel'), inpEl = $('#oldBasic');
    const useSel = !R || !!R.oldScale;
    sel.hidden = !useSel; inpEl.hidden = useSel;
    $('#secBasic').hidden = !R;
    if (R && R.oldScale) {
      sel.innerHTML = '<option value="">মূল বেতন নির্বাচন করুন</option>' +
        R.oldScale.map((v, i) => `<option value="${v}">${bn(v)} টাকা — ${bn(i + 1)} নং ধাপ</option>`).join('');
      sel.value = R.oldScale.includes(num(S.oldBasic)) ? String(num(S.oldBasic)) : '';
    }
  }

  function updateOldStartHint() {
    const R = RANKS[S.rank];
    const h = $('#oldStartHint');
    if (!R) { h.className = 'hint'; h.innerHTML = ''; return; }
    if (R.oldScale) {
      h.className = 'hint';
      h.innerHTML = `জেএসআই ০১/২০১৬ অনুযায়ী ${R.name} পদের স্কেল: ${bn(R.oldScale[0])} – ${bn(R.oldScale[R.oldScale.length - 1])} টাকা।`;
      return;
    }
    h.className = 'hint' + (R.oldNote ? ' warn' : '');
    h.innerHTML = R.oldNote
      ? `⚠ ${R.name} পদের পুরোনো স্কেলের প্রথম ধাপ হিসেবে আপাতত ${bn(R.oldStart)} টাকা <b>অনুমিত</b> মান ধরা হয়েছে।`
      : `জেএসআই ০১/২০১৬ অনুযায়ী ${R.name} পদের স্কেল শুরু হয় ${bn(R.oldStart)} টাকা থেকে।`;
  }

  function collect() {
    /* নির্ধারিত অনুমান: নিজ ব্যবস্থায় বাসা (ফ্যামিলি কোয়ার্টার নয়), সাধারণ হারে বাড়ি ভাড়া,
       কিট/হাওড়/তেজস্ক্রিয়/পাহাড়ি ভাতা নেই, জুন ২০২৬-এর ভাতা মূল বেতন থেকে স্বয়ংক্রিয়, সর্বনিম্ন কর্তন */
    return {
      name: S.name.trim(), baNo: S.baNo.trim(), unit: S.unit.trim(),
      rank: S.rank, dob: parseDate(S.dob), joinDate: parseDate(S.joinDate),
      oldBasic: num(S.oldBasic), oldStart: RANKS[S.rank]?.oldStart ?? 0,
      marital: S.marital, quarter: false, location: 'OTHER',
      children: S.children || 0, disabledChildren: S.disabledChildren || 0,
      skill: S.skill, appointment: S.appointment, badges: S.badges || 0,
      serviceWardenship: num(S.serviceWardenship), specials: S.specials,
      kit: false, haor: false, radiation: false, hill: 'NONE', otherNew: num(S.otherNew),
      oldOverrides: {}, oldOther: 0,
      gpfPercent: 5, otherDeductions: 0,
      retireDate: parseDate(S.retireDate),
      promotions: S.promotions.map(p => ({ rank: p.rank, date: parseDate(p.date) })),
      commutePct: optNum(S.commutePct) ?? 50,
      rationAdults: S.rationAdults || 0, rationChildren: S.rationChildren || 0,
    };
  }

  function refreshPlaceholders() {
    const inp = collect();
    if (!inp.oldBasic || !RANKS[inp.rank]) {
      $$('[id^=ov_]').forEach(el => { if (el.id !== 'ov_other') el.placeholder = 'মূল বেতন দিন'; });
      return;
    }
    const a = autoOldAllowances(inp);
    Object.entries(a).forEach(([k, v]) => { const el = $('#ov_' + k); if (el) el.placeholder = 'স্বয়ংক্রিয়: ' + bn(v, v % 1 ? 2 : 0); });
  }

  /* ---------------- পদোন্নতি তালিকা ---------------- */
  function renderPromos() {
    const opts = Object.entries(RANKS).sort((a, b) => a[1].order - b[1].order)
      .map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('') +
      Object.entries(HONORARY).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    $('#promoList').innerHTML = S.promotions.map((p, i) => `
      <div class="promo-row">
        <div class="field" style="margin:0"><label>পদবি</label><select class="input" data-promo="rank" data-idx="${i}"><option value="">নির্বাচন করুন</option>${opts}</select></div>
        <div class="field" style="margin:0"><label>তারিখ</label><input class="input" type="date" data-promo="date" data-idx="${i}" value="${esc(p.date)}" /></div>
        <button type="button" class="x" data-del="${i}" aria-label="মুছুন">×</button>
      </div>`).join('');
    $$('#promoList select').forEach((s, i) => s.value = S.promotions[i].rank || '');
    $$('#promoList [data-del]').forEach(b => b.addEventListener('click', () => {
      S.promotions.splice(Number(b.dataset.del), 1); renderPromos(); save();
    }));
  }

  /* ---------------- নেভিগেশন ---------------- */
  const VIEWS = ['input', 'salary', 'pension', 'report'];
  function go(v) {
    $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-' + v));
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('#navInd').style.transform = `translateX(${VIEWS.indexOf(v) * 100}%)`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (v === 'salary') calcSalary(false);
    if (v === 'pension' && S.retireDate) calcPension(false);
  }

  /* ---------------- বৈধতা ---------------- */
  function validate(inp, strict) {
    const errs = [];
    if (!RANKS[inp.rank]) return ['বর্তমান পদবি নির্বাচন করুন'];
    if (!inp.oldBasic) errs.push('৩০ জুন ২০২৬-এর মূল বেতন দিন');
    else if (inp.oldBasic < 5000 || inp.oldBasic > 100000) errs.push('মূল বেতনের অঙ্কটি সঠিক কিনা যাচাই করুন');
    if (inp.oldBasic && inp.oldStart && inp.oldBasic < inp.oldStart) errs.push('মূল বেতন পুরোনো স্কেলের প্রথম ধাপের চেয়ে কম হতে পারে না');
    if (strict && !inp.joinDate) errs.push('চাকরিতে যোগদানের তারিখ দিন');
    if (strict && !inp.dob) errs.push('জন্মতারিখ দিন');
    return errs;
  }

  /* ---------------- বেতন ফলাফল ---------------- */
  function calcSalary(fromBtn) {
    const inp = collect();
    const errs = validate(inp, true);
    const out = $('#salary-out');
    if (errs.length) {
      if (fromBtn) { toast(errs[0]); return false; }
      out.innerHTML = `<div class="card empty"><div class="em">📝</div><b>এখনো হিসাব করা হয়নি</b><p>"তথ্য" অংশে প্রয়োজনীয় তথ্য দিয়ে নিচের <b>সাবমিট করুন</b> বাটনে চাপুন।</p><button class="btn btn-primary" onclick="document.querySelector('[data-view=input]').click()">তথ্য দিন</button></div>`;
      return false;
    }
    const tl = computeTimeline(inp);
    lastTL = tl;
    out.innerHTML = salaryHTML(tl);
    countUp($('#hero-big'), tl.periods[3].net);
    $$('.details-btn', out).forEach(b => b.addEventListener('click', () => {
      const d = b.nextElementSibling; d.classList.toggle('open');
      b.querySelector('span').textContent = d.classList.contains('open') ? 'বিস্তারিত লুকান' : 'বিস্তারিত হিসাব দেখুন';
    }));
    const hit = $('.scale-strip .hit2', out);
    if (hit) setTimeout(() => hit.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }), 400);
    return true;
  }

  function salaryHTML(tl) {
    const inp = tl.input, R = tl.rank, [p1, p2, p3, p4] = tl.periods;
    const fx = tl.fix;
    const pctTxt = `${bn(tl.tr.p1 * 100)}% → ${bn(tl.tr.p2 * 100)}% → ১০০%`;
    const strip = R.newScale.map((s, i) =>
      `<span class="${i === fx.idx ? 'hit' : ''}${i === tl.inc27.idx ? ' hit2' : ''}">${bn(s)}</span>`).join('');

    const allowRows = (items) => items.map(i =>
      `<tr><td>${esc(i.label)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</td><td class="n">${tk(i.amt, i.amt % 1 ? 2 : 0)}</td></tr>`).join('');

    const periodCard = (p, idx) => {
      const meta = PERIODS[idx];
      const prevLabel = idx === 0 ? 'জুন ২০২৬' : PERIODS[idx - 1].label;
      const isFinal = idx === 3;
      const m3 = isFinal ? 'সব ভাতাসহ মোট বেতন (কর্তনের পর)' : 'পূর্বের ভাতাসহ হাতে পাওয়া বেতন (কর্তনের পর)';
      const basicNote = p.pct < 1
        ? `পুরোনো মূল বেতন + বর্ধিত অংশের ${bn(p.pct * 100)}%`
        : (idx === 2 ? '১০০% নতুন মূল বেতন (ইনক্রিমেন্টসহ)' : 'নতুন মূল বেতন');
      let riseLabel, riseVal;
      if (idx === 0) {
        riseLabel = `প্রণোদনা বাদ দিয়ে জুন ২০২৬-এর তুলনায় বৃদ্ধি`;
        riseVal = p.gross - tl.june.gross;
      } else {
        riseLabel = `${prevLabel}-এর তুলনায় বৃদ্ধি`;
        riseVal = p.gross - p.prev.gross;
      }
      return `
      <div class="tl-item ${isFinal ? 'final' : ''}">
        <div class="card period">
          <div class="ph">
            <div><h4>${meta.label}</h4><small>${meta.range}</small></div>
            <span class="badge ${isFinal ? 'green' : 'gold'}">${isFinal ? 'নতুন ভাতা চালু' : (p.pct < 1 ? `বৃদ্ধির ${bn(p.pct * 100)}%` : '১০০% মূল বেতন')}</span>
          </div>
          <div class="metrics">
            <div class="metric"><div class="ic a">১</div><div class="t"><small>জেএসআই অনুসারে প্রাপ্য মূল বেতন</small><b>${tk(p.basic)}</b><small>${basicNote}</small></div><span class="delta ${deltaCls(p.basicRise)}">${signed(p.basicRise)}</span></div>
            <div class="metric"><div class="ic b">২</div><div class="t"><small>${riseLabel}</small><b class="${deltaCls(riseVal)}">${signed(riseVal)}</b><small>মোট বেতন (কর্তনের আগে) হিসাবে</small></div></div>
            <div class="metric"><div class="ic c">৩</div><div class="t"><small>${m3}</small><b>${tk(p.net)}</b><small>মোট ${tk(p.gross)} − কর্তন ${tk(p.ded.total)}</small></div></div>
          </div>
          <button class="details-btn"><span>বিস্তারিত হিসাব দেখুন</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="details"><div>
            ${p.pct < 1 ? `<div class="formula">মূল বেতন = ${tk(inp.oldBasic)} + (${tk(tl.newBasic26)} − ${tk(inp.oldBasic)}) × ${bn(p.pct * 100)}%<br>= ${tk(inp.oldBasic)} + ${tk(tl.raise * p.pct)} = <b>${tk(p.basic)}</b></div>` : ''}
            <table class="tbl">
              <tr><th>বিবরণ</th><th class="n">টাকা</th></tr>
              <tr><td>মূল বেতন</td><td class="n">${tk(p.basic)}</td></tr>
              ${allowRows(p.allowances)}
              <tr class="sum"><td>মোট বেতন ও ভাতা</td><td class="n">${tk(p.gross)}</td></tr>
              <tr class="minus"><td>জিপিএফ (${bn(Math.max(5, Math.min(25, inp.gpfPercent)))}%)</td><td class="n">− ${tk(p.ded.gpf)}</td></tr>
              ${p.ded.other ? `<tr class="minus"><td>অন্যান্য কর্তন</td><td class="n">− ${tk(p.ded.other)}</td></tr>` : ''}
              <tr class="sum"><td>হাতে পাওয়া বেতন</td><td class="n">${tk(p.net)}</td></tr>
            </table>
            ${idx === 0 ? `<table class="tbl"><tr><th>জুন ২০২৬-এর তুলনা</th><th class="n">টাকা</th></tr>
              <tr><td>মূল বেতন বৃদ্ধি</td><td class="n up">+ ${tk(p.basic - inp.oldBasic)}</td></tr>
              ${tl.june.special.map(s => `<tr class="minus"><td>${s.label} বাদ</td><td class="n">− ${tk(s.amt)}</td></tr>`).join('')}
              <tr class="sum"><td>নিট বৃদ্ধি</td><td class="n">${signed(riseVal)}</td></tr></table>` : ''}
            ${isFinal ? `<p class="hint" style="margin-top:8px">০১ জানুয়ারি ২০২৮ থেকে জেএসআই ০১/২০২৬-এর নির্ধারিত হারে সব ভাতা দেওয়া হবে (অধ্যায়-৪, অনুচ্ছেদ ১)।</p>` : `<p class="hint" style="margin-top:8px">৩১ ডিসেম্বর ২০২৭ পর্যন্ত সব ভাতা ৩০ জুন ২০২৬ তারিখে আহরিত অঙ্কে চলবে।</p>`}
          </div></div>
        </div>
      </div>`;
    };

    return `
    <div class="summary-hero">
      <div class="who"><span><b>${esc(inp.name || 'নাম দেওয়া হয়নি')}</b></span><span>${R.name}</span></div>
      <div class="lbl">জানুয়ারি ২০২৮ থেকে সকল ভাতাসহ মাসিক বেতন পাবেন</div>
      <div class="big" id="hero-big">${tk(0)}</div>
      <div class="kpis">
        <div class="kpi"><small>জুলাই ২০২৬ মূল বেতন (ইনক্রিমেন্টসহ)</small><b>${tk(p1.basic)}</b></div>
        <div class="kpi"><small>জানুয়ারি ২০২৭ মূল বেতন</small><b>${tk(p2.basic)}</b></div>
        <div class="kpi"><small>জুলাই ২০২৭ মূল বেতন (ইনক্রিমেন্টসহ)</small><b>${tk(p3.basic)}</b></div>
      </div>
    </div>

    <div class="card voucher">
      <div class="v-head">
        <div><small>মূল বেতন নির্ধারণ বিবরণী</small><h3>০১ জুলাই ২০২৬-এ মূল বেতন নির্ধারণ</h3></div>
        <span class="v-stamp">জেএসআই<br>০১/২০২৬</span>
      </div>
      <div class="v-meta"><span>${esc(inp.name || '—')}</span><span>${R.name}</span></div>
      ${fx.atStart ? `
      <div class="v-row"><span class="v-no">১</span><div class="v-t"><b>৩০ জুন ২০২৬-এ আহরিত মূল বেতন</b><small>পুরোনো স্কেলের প্রারম্ভিক ধাপে</small></div><span class="v-amt">${tk(inp.oldBasic)}</span></div>
      <div class="v-row"><span class="v-no">২</span><div class="v-t"><b>নতুন স্কেলের প্রারম্ভিক ধাপে নির্ধারণ</b><small>জেএসআই ০১/২০২৬, ক্রোড়পত্র-ক</small></div><span class="v-amt">${tk(fx.fixed)}</span></div>
      ` : `
      <div class="v-row"><span class="v-no">১</span><div class="v-t"><b>৩০ জুন ২০২৬-এ আহরিত মূল বেতন</b><small>পুরোনো স্কেল (জেএসআই ০১/২০১৬)</small></div><span class="v-amt">${tk(inp.oldBasic)}</span></div>
      <div class="v-row"><span class="v-no">২</span><div class="v-t"><b>পুরোনো স্কেলের প্রারম্ভিক ধাপ</b><small>${R.name} পদের স্কেল শুরু</small></div><span class="v-amt minus">− ${tk(inp.oldStart)}</span></div>
      <div class="v-row v-sub"><span class="v-no">৩</span><div class="v-t"><b>পার্থক্য</b><small>(১) থেকে (২) বিয়োগ</small></div><span class="v-amt">${tk(fx.diff)}</span></div>
      <div class="v-row"><span class="v-no">৪</span><div class="v-t"><b>নতুন স্কেলের প্রারম্ভিক ধাপ</b><small>জেএসআই ০১/২০২৬, ক্রোড়পত্র-ক</small></div><span class="v-amt">${tk(R.newScale[0])}</span></div>
      <div class="v-row"><span class="v-no">৫</span><div class="v-t"><b>পার্থক্য যোগ</b><small>(৩)-এর অঙ্ক</small></div><span class="v-amt plus">+ ${tk(fx.diff)}</span></div>
      <div class="v-row v-sub"><span class="v-no">৬</span><div class="v-t"><b>নতুন স্কেলে প্রাপ্য অঙ্ক</b><small>(৪) + (৫)</small></div><span class="v-amt">${tk(fx.target)}</span></div>
      <div class="v-row"><span class="v-no">৭</span><div class="v-t"><b>নতুন স্কেলে নির্ধারিত মূল বেতন</b><small>${fx.personal ? 'স্কেলের সর্বোচ্চ ধাপ; বাকি অংশ ব্যক্তিগত বেতন হিসেবে' : fx.exact ? 'অঙ্কটি স্কেলের একটি ধাপের সমান, তাই এই ধাপেই নির্ধারণ' : 'স্কেলে সমান ধাপ না থাকায় পরবর্তী উচ্চতর ধাপে নির্ধারণ'}</small></div><span class="v-amt">${tk(fx.fixed)}</span></div>
      ${fx.personal ? `<div class="v-row"><span class="v-no">৮</span><div class="v-t"><b>ব্যক্তিগত বেতন (Personal Pay)</b><small>সর্বোচ্চ ধাপের অতিরিক্ত অংশ</small></div><span class="v-amt plus">+ ${tk(fx.personal)}</span></div>` : ''}
      `}
      <div class="v-row"><span class="v-no">${bn(fx.atStart ? 3 : fx.personal ? 9 : 8)}</span><div class="v-t"><b>০১ জুলাই ২০২৬-এর বার্ষিক ইনক্রিমেন্ট</b><small>পরবর্তী ধাপে উন্নীত</small></div><span class="v-amt plus">+ ${tk(tl.newBasic26 - fx.fixed - fx.personal)}</span></div>
      <div class="v-total"><span>০১ জুলাই ২০২৬ থেকে নতুন মূল বেতন (ইনক্রিমেন্টসহ)</span><b>${tk(tl.newBasic26)}</b></div>
      <p class="hint" style="margin:12px 0 2px">${R.name} পদের নতুন স্কেল (হলুদ = নির্ধারিত ধাপ, সবুজ = জুলাই ২০২৭-এর ধাপ):</p>
      <div class="scale-strip">${strip}</div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>ধাপে ধাপে বেতন বৃদ্ধির হিসাব</h3><span class="line"></span></div>
      <div class="formula">মোট বৃদ্ধি = নতুন মূল বেতন − পুরোনো মূল বেতন<br>= ${tk(tl.newBasic26)} − ${tk(inp.oldBasic)} = <b>${tk(tl.raise)}</b></div>
      <table class="tbl step-tbl">
        <tr><th>সময়কাল</th><th class="n">বৃদ্ধির হার</th><th class="n">বৃদ্ধির পরিমাণ</th><th class="n">প্রাপ্য মূল বেতন</th></tr>
        <tr><td>জুলাই ২০২৬<small>প্রথম ধাপ</small></td><td class="n">${bn(tl.tr.p1 * 100)}%</td><td class="n up">+ ${tk(p1.basic - inp.oldBasic)}</td><td class="n"><b>${tk(p1.basic)}</b></td></tr>
        <tr><td>জানুয়ারি ২০২৭</td><td class="n">${bn(tl.tr.p2 * 100)}%</td><td class="n up">+ ${tk(p2.basic - inp.oldBasic)}</td><td class="n"><b>${tk(p2.basic)}</b></td></tr>
        <tr><td>জুলাই ২০২৭<small>পূর্ণ বেতন + ইনক্রিমেন্ট</small></td><td class="n">১০০%</td><td class="n up">+ ${tk(p3.basic - inp.oldBasic)}</td><td class="n"><b>${tk(p3.basic)}</b></td></tr>
      </table>
      <p class="hint" style="margin:8px 0 0">বৃদ্ধির পরিমাণ = মোট বৃদ্ধির নির্ধারিত হার, যা ৩০ জুন ২০২৬-এর মূল বেতনের সাথে যোগ হয়।</p>
      <div class="notice info" style="margin:12px 0 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>${R.group === 'JCO' ? 'জেসিও' : 'সার্জেন্ট ও তদনিম্ন'} পদের জন্য বর্ধিত মূল বেতন ধাপে ধাপে দেওয়া হবে: ${pctTxt}। "বিশেষ সুবিধা" ০১ জুলাই ২০২৬ থেকে বিলুপ্ত।</div>
      </div>
    </div>

    <div class="section-title"><h3>প্রতিটি ধাপের বেতন ও ভাতা</h3><span class="line"></span></div>
    <div class="timeline">${tl.periods.map(periodCard).join('')}</div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>বছরে একবার যা পাবেন (২০২৮)</h3><span class="line"></span></div>
      <table class="tbl">
        <tr><td>উৎসব ভাতা (২টি, প্রতিটি মূল বেতনের সমান)</td><td class="n">${tk(tl.yearlyExtras.festival)}</td></tr>
        <tr><td>বাংলা নববর্ষ ভাতা (মূল বেতনের ১৫%)</td><td class="n">${tk(tl.yearlyExtras.noboborsho)}</td></tr>
        <tr><td>শ্রান্তি ও বিনোদন ভাতা</td><td class="n">প্রচলিত বিধি অনুযায়ী</td></tr>
      </table>
    </div>

    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-primary" onclick="window.__jsiPdf('salary')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>পিডিএফ</button>
      <button class="btn btn-green" onclick="document.querySelector('[data-view=pension]').click()">অবসরের হিসাব →</button>
    </div>`;
  }

  /* ---------------- পেনশন ফলাফল ---------------- */
  function calcPension(fromBtn) {
    const inp = collect();
    const errs = validate(inp, true);
    if (errs.length) { if (fromBtn) toast(errs[0]); return false; }
    const tl = computeTimeline(inp);
    const rt = computeRetirement(inp, tl);
    if (!rt.ok) { if (fromBtn) toast(rt.errors[0]); return false; }
    lastTL = tl; lastRT = rt;
    $('#pension-out').innerHTML = pensionHTML(rt, inp);
    countUp($('#pen-big'), rt.net);
    if (fromBtn) setTimeout(() => $('#pension-out').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return true;
  }

  function pensionHTML(rt, inp) {
    const ev = rt.events.map(e => `<li class="${e.type === 'promo' ? 'promo' : ''}"><span>${bnDate(e.date)}</span><b>${tk(e.basic)}</b><small>${esc(e.text)} · ${esc(e.rank)}</small></li>`).join('');
    return `
    <div class="summary-hero" style="margin-top:6px">
      <div class="who"><span><b>${esc(inp.name || 'নাম দেওয়া হয়নি')}</b></span><span>${esc(rt.finalRank)}</span></div>
      <div class="lbl">মাসিক নিট পেনশন (${bn(rt.cPct * 100)}% কম্যুটেশনের পর)</div>
      <div class="big" id="pen-big">${tk(0)}</div>
      <div class="sub">অবসর: ${bnDate(rt.retire)} · চাকরিকাল ${bn(rt.years)} বছর ${bn(rt.months)} মাস</div>
      <div class="kpis">
        <div class="kpi"><small>শেষ মূল বেতন</small><b>${tk(rt.lastBasic)}</b></div>
        <div class="kpi"><small>গ্রস পেনশন</small><b>${tk(rt.gross)}</b></div>
        <div class="kpi"><small>এককালীন কম্যুটেশন</small><b>${tk(rt.lump)}</b></div>
      </div>
    </div>
    ${!rt.eligible ? `<div class="notice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg><div>পেনশনের কর্ম উপাদানের জন্য কমপক্ষে ১০ বছরের যোগ্য চাকরি প্রয়োজন (অধ্যায়-৬, অনুচ্ছেদ ১৫)।</div></div>` : ''}

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>অবসর পর্যন্ত মূল বেতনের যাত্রা</h3><span class="line"></span></div>
      <ul class="events">${ev}</ul>
      <p class="hint" style="margin-top:8px">এলপিআর শুরু (আনুমানিক): ${bnDate(rt.lprStart)}। এলপিআর চলাকালীন ইনক্রিমেন্টও শেষ গৃহীত বেতনে যোগ হয় (অধ্যায়-৬, টীকা-ঘ)।</p>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>পেনশনের হিসাব</h3><span class="line"></span></div>
      <div class="formula">
        গ্রস পেনশন = (শেষ গৃহীত বেতন + ৬০৮) × চাকরির বছর ÷ ৩১<br>
        = (${tk(rt.pensionable)} + ৬০৮) × ${bn(rt.years)} ÷ ৩১ = ${tk(rt.formula, 2)}<br>
        সর্বোচ্চ সীমা = ${tk(rt.L)}-এর ৯০% = ${tk(rt.cap, 2)}<br>
        ${rt.capped ? 'সূত্রের ফল সীমার বেশি, তাই সর্বোচ্চ সীমাই প্রযোজ্য।' : 'সূত্রের ফল সীমার মধ্যে।'} গ্রস পেনশন = <b>${tk(rt.gross)}</b>
      </div>
      <table class="tbl">
        <tr><td>শেষ গৃহীত মূল বেতন</td><td class="n">${tk(rt.lastBasic)}</td></tr>
        ${rt.swPension ? `<tr><td>সার্ভিস ওয়ার্ডিনেস বেতন</td><td class="n">${tk(rt.swPension)}</td></tr>` : ''}
        <tr><td>গ্রস পেনশন</td><td class="n">${tk(rt.gross)}</td></tr>
        <tr class="minus"><td>কম্যুটেশন (${bn(rt.cPct * 100)}%)</td><td class="n">− ${tk(rt.commuted)}</td></tr>
        <tr class="sum"><td>মাসিক নিট পেনশন</td><td class="n">${tk(rt.net)}</td></tr>
      </table>
      <div class="formula">এককালীন কম্যুটেশন = ${tk(rt.commuted)} × ১২ × ${bn(rt.factor, 3)}<br><small>পরবর্তী জন্মদিনে বয়স ${bn(rt.ageNext)} বছর, জেএসআই অনুচ্ছেদ ২৮-এর গুণক</small><br>= <b>${tk(rt.lump)}</b></div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>অবসরকালীন অন্যান্য সুবিধা</h3><span class="line"></span></div>
      <table class="tbl">
        <tr><td>অবসর প্রস্তুতিমূলক ছুটি (এলপিআর)<small>১২ মাস পূর্ণ গড় বেতনে</small></td><td class="n">১২ মাস</td></tr>
        <tr><td>ছুটি নগদায়ন (১৮ মাসের মূল বেতন)<small>ছুটি পাওনা সাপেক্ষে</small></td><td class="n">${tk(rt.leaveEncash)}</td></tr>
        <tr><td>চিকিৎসা ভাতা (মাসিক)<small>অবসরের সময় বয়স ${bn(rt.ageAtRetire)} বছর</small></td><td class="n">${tk(rt.med)}</td></tr>
        <tr><td>রেশনের পরিবর্তে রেশন ভাতা (মাসিক)<small>${bn(inp.rationAdults)} প্রাপ্তবয়স্ক × ৳১,০০০ + ${bn(inp.rationChildren)} শিশু × ৳৫০০</small></td><td class="n">${tk(rt.ration)}</td></tr>
        <tr class="sum"><td>মাসে হাতে আসবে (পেনশন + চিকিৎসা + রেশন)</td><td class="n">${tk(rt.monthlyInHand)}</td></tr>
        <tr><td>উৎসব ভাতা (বছরে ২টি)</td><td class="n">${tk(rt.festivalYearly)}</td></tr>
        <tr><td>বাংলা নববর্ষ ভাতা (নিট পেনশনের ১৫%)</td><td class="n">${tk(rt.noboborsho)}</td></tr>
        <tr class="sum"><td>এককালীন মোট (কম্যুটেশন + ছুটি নগদায়ন)</td><td class="n">${tk(rt.lump + rt.leaveEncash)}</td></tr>
      </table>
      <h4 style="margin:16px 0 4px;font-size:14.5px">প্রতি বছর ৫% বৃদ্ধিতে নিট পেনশন</h4>
      <table class="tbl">${rt.growth.map((g, i) => `<tr><td>${i === 0 ? 'অবসরের বছর' : bn(i) + ' বছর পর'} (${bnPlain(g.year)})</td><td class="n">${tk(g.net)}</td></tr>`).join('')}</table>
    </div>

    <div class="btn-row">
      <button class="btn btn-green" onclick="window.__jsiPdf('pension')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>পেনশন পিডিএফ</button>
      <button class="btn btn-ghost" onclick="window.__jsiPdf('all')">সম্পূর্ণ রিপোর্ট</button>
    </div>`;
  }

  /* ---------------- পিডিএফ ---------------- */
  function rptHeader(inp, title) {
    const today = new Date();
    return `
    <div class="rh">
      <div><h1>${title}</h1><p>জেএসআই ০১/২০২৬ (বাংলাদেশ গেজেট, অতিরিক্ত, ১৫ নভেম্বর ২০২৬) অনুযায়ী · প্রস্তুতের তারিখ: ${bnDate(today)}</p></div>
      <div class="devbox">ডেভেলপ করেছেন<b>${SITE_CONFIG.developer.name}</b>${SITE_CONFIG.developer.title}</div>
    </div>
    <div class="info">
      <div><b>নাম:</b> ${esc(inp.name || '—')}</div>
      <div><b>পদবি:</b> ${RANKS[inp.rank].name}</div>
      <div><b>সেনা নং:</b> ${esc(inp.baNo || '—')}</div>
      <div><b>ইউনিট:</b> ${esc(inp.unit || '—')}</div>
      <div><b>জন্মতারিখ:</b> ${bnDate(inp.dob)}</div>
      <div><b>যোগদান:</b> ${bnDate(inp.joinDate)}</div>
      <div><b>বৈবাহিক অবস্থা:</b> ${inp.marital === 'MARRIED' ? 'বিবাহিত' : 'অবিবাহিত'}</div>
    </div>`;
  }
  const rptFooter = () => `<div class="rf"><span>এটি একটি আনুমানিক হিসাব। চূড়ান্ত অঙ্ক পে-অফিস (iBAS++) কর্তৃক নির্ধারিত হবে।</span><span>ডেভেলপার: <b>${SITE_CONFIG.developer.name}</b></span></div>`;

  function rptSalary(tl) {
    const inp = tl.input, R = tl.rank, fx = tl.fix;
    const rows = items => items.map(i => `<tr><td>${esc(i.label)}${i.note ? ` <span style="color:#6b7772">(${esc(i.note)})</span>` : ''}</td><td class="n">${tk(i.amt, i.amt % 1 ? 2 : 0)}</td></tr>`).join('');
    const per = (p, i) => {
      const m = PERIODS[i];
      const rise = i === 0 ? p.gross - tl.june.gross : p.gross - p.prev.gross;
      return `<div class="avoid">
        <h3>${m.label} (${m.range})</h3>
        <div class="kv">
          <div><small>১. জেএসআই অনুসারে মূল বেতন</small><b>${tk(p.basic)}</b></div>
          <div><small>২. ${i === 0 ? 'জুন ২০২৬-এর তুলনায় বৃদ্ধি (বিশেষ সুবিধা বাদে)' : PERIODS[i - 1].label + '-এর তুলনায় বৃদ্ধি'}</small><b>${signed(rise)}</b></div>
          <div><small>মোট বেতন ও ভাতা</small><b>${tk(p.gross)}</b></div>
          <div><small>৩. কর্তনের পর ${i === 3 ? 'সব ভাতাসহ' : 'পূর্বের ভাতাসহ'} মোট</small><b>${tk(p.net)}</b></div>
        </div>
        ${p.pct < 1 ? `<div class="formula">মূল বেতন = ${tk(inp.oldBasic)} + (${tk(tl.newBasic26)} − ${tk(inp.oldBasic)}) × ${bn(p.pct * 100)}% = ${tk(p.basic)}</div>` : ''}
        <table><tr><th>বিবরণ</th><th class="n">টাকা</th></tr>
          <tr><td>মূল বেতন</td><td class="n">${tk(p.basic)}</td></tr>${rows(p.allowances)}
          <tr class="sum"><td>মোট বেতন ও ভাতা</td><td class="n">${tk(p.gross)}</td></tr>
          <tr class="minus"><td>জিপিএফ</td><td class="n">− ${tk(p.ded.gpf)}</td></tr>
          ${p.ded.other ? `<tr class="minus"><td>অন্যান্য কর্তন</td><td class="n">− ${tk(p.ded.other)}</td></tr>` : ''}
          <tr class="sum"><td>হাতে পাওয়া বেতন</td><td class="n">${tk(p.net)}</td></tr>
        </table></div>`;
    };
    return `
      <h2>১. নতুন স্কেলে মূল বেতন নির্ধারণ</h2>
      <table class="fixed">
        <tr><th style="width:42%">বিষয়</th><th>বিবরণ</th></tr>
        <tr><td>৩০ জুন ২০২৬-এর মূল বেতন</td><td>${tk(inp.oldBasic)}</td></tr>
        <tr><td>পুরোনো স্কেলের প্রথম ধাপ${R.oldNote ? ' (অনুমিত)' : ''}</td><td>${tk(inp.oldStart)}</td></tr>
        <tr><td>নতুন স্কেল (${R.name})</td><td style="font-size:10.5px">${R.newScale.map(x => bn(x)).join(' – ')}</td></tr>
        <tr><td>পার্থক্য</td><td>${tk(inp.oldBasic)} − ${tk(inp.oldStart)} = ${tk(fx.diff)}</td></tr>
        <tr><td>নতুন প্রথম ধাপ + পার্থক্য</td><td>${tk(R.newScale[0])} + ${tk(fx.diff)} = ${tk(fx.target)}</td></tr>
        <tr><td>নির্ধারিত মূল বেতন</td><td><b>${tk(fx.fixed)}</b> (${fx.exact ? 'সমান ধাপ' : 'পরবর্তী উচ্চতর ধাপ'})</td></tr>
        <tr><td>০১ জুলাই ২০২৬ ইনক্রিমেন্টসহ</td><td><b>${tk(tl.newBasic26)}</b></td></tr>
        <tr><td>০১ জুলাই ২০২৭ ইনক্রিমেন্টসহ</td><td><b>${tk(tl.periods[2].basic)}</b></td></tr>
        <tr><td>ধাপে ধাপে প্রাপ্যতা</td><td>${R.group === 'JCO' ? 'জেসিও' : 'সার্জেন্ট ও তদনিম্ন'}: জুলাই–ডিসেম্বর ২০২৬ ${bn(tl.tr.p1 * 100)}%, জানুয়ারি–জুন ২০২৭ ${bn(tl.tr.p2 * 100)}%, জুলাই ২০২৭ থেকে ১০০%</td></tr>
      </table>
      <h3>জুন ২০২৬ (পূর্বের বেতন)</h3>
      <table><tr><th>বিবরণ</th><th class="n">টাকা</th></tr>
        <tr><td>মূল বেতন</td><td class="n">${tk(inp.oldBasic)}</td></tr>${rows(tl.june.allowances)}
        ${tl.june.special.map(s => `<tr><td>${s.label}</td><td class="n">${tk(s.amt)}</td></tr>`).join('')}
        <tr class="sum"><td>মোট</td><td class="n">${tk(tl.june.gross)}</td></tr>
        <tr class="minus"><td>জিপিএফ ও অন্যান্য কর্তন</td><td class="n">− ${tk(tl.june.ded.total)}</td></tr>
        <tr class="sum"><td>হাতে পাওয়া বেতন</td><td class="n">${tk(tl.june.net)}</td></tr>
      </table>
      <h2>২. ধাপে ধাপে বেতন (জুলাই ২০২৬ – জানুয়ারি ২০২৮)</h2>
      <table class="avoid"><tr><th>সময়কাল</th><th class="n">মূল বেতন</th><th class="n">মোট বেতন</th><th class="n">বৃদ্ধি</th><th class="n">হাতে পাওয়া</th></tr>
        <tr><td>জুন ২০২৬</td><td class="n">${tk(inp.oldBasic)}</td><td class="n">${tk(tl.june.gross)}</td><td class="n">—</td><td class="n">${tk(tl.june.net)}</td></tr>
        ${tl.periods.map((p, i) => `<tr><td>${PERIODS[i].label}</td><td class="n">${tk(p.basic)}</td><td class="n">${tk(p.gross)}</td><td class="n">${signed(p.gross - p.prev.gross)}</td><td class="n">${tk(p.net)}</td></tr>`).join('')}
      </table>
      ${tl.periods.map(per).join('')}
      <div class="avoid"><h3>বছরে একবার (২০২৮)</h3>
      <table><tr><td>উৎসব ভাতা (২টি)</td><td class="n">${tk(tl.yearlyExtras.festival)}</td></tr><tr><td>বাংলা নববর্ষ ভাতা (মূল বেতনের ১৫%)</td><td class="n">${tk(tl.yearlyExtras.noboborsho)}</td></tr></table></div>`;
  }

  function rptPension(rt, inp) {
    return `
      <h2>অবসর ও পেনশন</h2>
      <div class="kv">
        <div><small>অবসরের তারিখ</small><b>${bnDate(rt.retire)}</b></div>
        <div><small>অবসরকালীন পদবি</small><b>${esc(rt.finalRank)}</b></div>
        <div><small>চাকরিকাল</small><b>${bn(rt.years)} বছর ${bn(rt.months)} মাস</b></div>
        <div><small>শেষ মূল বেতন</small><b>${tk(rt.lastBasic)}</b></div>
      </div>
      <h3>অবসর পর্যন্ত মূল বেতন</h3>
      <table><tr><th>তারিখ</th><th>ঘটনা</th><th>পদবি</th><th class="n">মূল বেতন</th></tr>
        ${rt.events.map(e => `<tr><td>${bnDate(e.date)}</td><td>${esc(e.text)}</td><td>${esc(e.rank)}</td><td class="n">${tk(e.basic)}</td></tr>`).join('')}
      </table>
      <div class="avoid"><h3>পেনশনের হিসাব</h3>
      <div class="formula">গ্রস পেনশন = (শেষ গৃহীত বেতন + ৬০৮) × চাকরির বছর ÷ ৩১, তবে (শেষ গৃহীত বেতন + ৬০৮)-এর ৯০%-এর বেশি নয়<br>
        = (${tk(rt.pensionable)} + ৬০৮) × ${bn(rt.years)} ÷ ৩১ = ${tk(rt.formula, 2)} · সীমা ${tk(rt.cap, 2)} → <b>${tk(rt.gross)}</b></div>
      <table>
        <tr><td>গ্রস পেনশন</td><td class="n">${tk(rt.gross)}</td></tr>
        <tr class="minus"><td>কম্যুটেশন (${bn(rt.cPct * 100)}%)</td><td class="n">− ${tk(rt.commuted)}</td></tr>
        <tr class="sum"><td>মাসিক নিট পেনশন</td><td class="n">${tk(rt.net)}</td></tr>
        <tr><td>এককালীন কম্যুটেশন = ${tk(rt.commuted)} × ১২ × ${bn(rt.factor, 3)} (পরবর্তী জন্মদিনে বয়স ${bn(rt.ageNext)})</td><td class="n">${tk(rt.lump)}</td></tr>
        <tr><td>ছুটি নগদায়ন (১৮ মাসের মূল বেতন)</td><td class="n">${tk(rt.leaveEncash)}</td></tr>
        <tr class="sum"><td>এককালীন মোট</td><td class="n">${tk(rt.lump + rt.leaveEncash)}</td></tr>
      </table></div>
      <div class="avoid"><h3>মাসিক ও বার্ষিক সুবিধা</h3>
      <table>
        <tr><td>নিট পেনশন</td><td class="n">${tk(rt.net)}</td></tr>
        <tr><td>চিকিৎসা ভাতা (বয়স ${bn(rt.ageAtRetire)})</td><td class="n">${tk(rt.med)}</td></tr>
        <tr><td>রেশন ভাতা (${bn(inp.rationAdults)} প্রাপ্তবয়স্ক, ${bn(inp.rationChildren)} শিশু)</td><td class="n">${tk(rt.ration)}</td></tr>
        <tr class="sum"><td>মাসিক মোট</td><td class="n">${tk(rt.monthlyInHand)}</td></tr>
        <tr><td>উৎসব ভাতা (বছরে ২টি)</td><td class="n">${tk(rt.festivalYearly)}</td></tr>
        <tr><td>বাংলা নববর্ষ ভাতা</td><td class="n">${tk(rt.noboborsho)}</td></tr>
        ${rt.growth.slice(1).map((g, i) => `<tr><td>${bn(i + 1)} বছর পর নিট পেনশন (৫% বৃদ্ধিতে)</td><td class="n">${tk(g.net)}</td></tr>`).join('')}
      </table></div>`;
  }

  function rptNotes(tl) {
    const R = tl.rank;
    return `<div class="avoid"><h3>অনুমান ও সতর্কতা</h3><ul class="note">
      ${R.oldNote ? `<li>${R.name} পদের পুরোনো স্কেলের প্রথম ধাপ নিশ্চিত না হওয়ায় ${tk(R.oldStart)} অনুমিত মান হিসেবে ধরা হয়েছে।</li>` : ''}
      <li>৩১ ডিসেম্বর ২০২৭ পর্যন্ত ভাতাগুলো ৩০ জুন ২০২৬-এর আহরিত অঙ্কে ধরা হয়েছে, যা মূল বেতন থেকে স্বয়ংক্রিয়ভাবে হিসাব করা।</li>
      <li>ফ্যামিলি কোয়ার্টারে বসবাস না করে সাধারণ হারে ("অন্যান্য স্থান") বাড়ি ভাড়া ধরা হয়েছে। কিট রক্ষণাবেক্ষণ, পাহাড়ি, হাওড়/দ্বীপ/চর ও তেজস্ক্রিয় ঝুঁকি ভাতা ধরা হয়নি।</li>
      <li>মাসিক কর্তন সর্বনিম্ন হারে (জিপিএফ মূল বেতনের ৫%) ধরা হয়েছে।</li>
      <li>৫০% কম্যুটেশন প্রচলিত নিয়মে ধরা হয়েছে। জেএসআই অনুযায়ী পেনশন ও কম্যুটেশনের বিদ্যমান হার অপরিবর্তিত।</li>
      <li>উচ্চতর গ্রেড (৮ বছর পূর্তিতে), ব্যক্তিগত বেতন ও বিশেষ পরিস্থিতি এই হিসাবে ধরা হয়নি।</li>
      <li>চূড়ান্ত অঙ্ক সংশ্লিষ্ট পে-অফিস (iBAS++) কর্তৃক নির্ধারিত হবে।</li>
    </ul></div>`;
  }

  async function makePdf(type) {
    const inp = collect();
    const errs = validate(inp, true);
    if (errs.length) { toast(errs[0]); go('input'); return; }
    const tl = computeTimeline(inp);
    let rt = null;
    if (type !== 'salary') {
      rt = computeRetirement(inp, tl);
      if (!rt.ok) { toast(rt.errors[0]); go('pension'); return; }
    }
    if (typeof html2pdf === 'undefined') { toast('পিডিএফ লাইব্রেরি লোড হয়নি, একটু পরে আবার চেষ্টা করুন'); return; }

    const title = type === 'salary' ? 'বেতন রিপোর্ট: জুলাই ২০২৬ – জানুয়ারি ২০২৮'
      : type === 'pension' ? 'অবসর ও পেনশন রিপোর্ট' : 'বেতন ও পেনশনের সম্পূর্ণ রিপোর্ট';
    let body = rptHeader(inp, title);
    if (type !== 'pension') body += rptSalary(tl);
    if (type === 'all') body += '<div class="pb"></div>';
    if (type !== 'salary') body += rptPension(rt, inp);
    body += rptNotes(tl) + rptFooter();

    const stage = $('#pdf-stage');
    stage.innerHTML = `<div class="rpt">${body}</div>`;
    $('#overlay').classList.add('show');
    try {
      await document.fonts.ready;
      const fname = `JSI-2026-${type === 'salary' ? 'Salary' : type === 'pension' ? 'Pension' : 'Full'}-Report${inp.name ? '-' + inp.name.replace(/[^\p{L}\p{N}]+/gu, '_') : ''}.pdf`;
      await html2pdf().set({
        margin: [8, 0, 10, 0],
        filename: fname,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid' },
      }).from(stage.firstElementChild).save();
      toast('পিডিএফ ডাউনলোড হয়েছে');
    } catch (e) {
      console.error(e);
      toast('পিডিএফ তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      $('#overlay').classList.remove('show');
      stage.innerHTML = '';
    }
  }
  window.__jsiPdf = makePdf;

  /* ---------------- শুরু ---------------- */
  initForm();
  if (S.oldBasic && S.joinDate && S.dob) { calcSalary(false); }
  else $('#salary-out').innerHTML = '';
  // বেতন ট্যাবে ফাঁকা অবস্থা
  if (!$('#salary-out').innerHTML) calcSalary(false);
})();
