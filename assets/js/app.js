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
    firstNewPay: '', mode: 'SERVING', penName: '', penType: 'SELF', penNet: '', penDob: '', penAdults: 2, penChildren: 0,
  };
  let S = load();
  let lastTL = null, lastRT = null, lastRet = null;

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
  /* ---------------- তারিখ: দিন-মাস-বছর (শুধু টাইপ করে) ----------------
     ঘরে দেখায় ২৫-০৩-১৯৮৬ বা 25-03-1986; ভেতরে সংরক্ষণ হয় 1986-03-25 (হিসাবের জন্য) */
  const EN = s => String(s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
  function isoToDmy(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }
  function dmyToIso(v) {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(EN(v));
    if (!m) return '';
    const d = +m[1], mo = +m[2], y = +m[3];
    const dt = new Date(y, mo - 1, d);
    if (y < 1940 || y > 2100 || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  /** টাইপ করার সময় নিজে থেকে "-" বসায়; ভুল তারিখ হলে লাল দাগ */
  function maskDate(el) {
    const digits = EN(el.value).replace(/\D/g, '').slice(0, 8);
    let out = digits.slice(0, 2);
    if (digits.length > 2) out += '-' + digits.slice(2, 4);
    if (digits.length > 4) out += '-' + digits.slice(4);
    if (out !== el.value) el.value = out;
    const iso = digits.length === 8 ? dmyToIso(out) : '';
    el.dataset.iso = iso;
    el.classList.toggle('bad', digits.length === 8 && !iso);
    el.title = digits.length === 8 && !iso ? 'সঠিক তারিখ লিখুন (দিন-মাস-বছর)' : '';
  }


  /** তারিখের ঘরকে OTP/কোডের মতো ৮টি আলাদা খোপে রূপান্তর: [দি][ন] - [মা][স] - [ব][ছ][র][  ]
      আসল ইনপুটটি লুকানো থাকে এবং আগের মতোই মান সংরক্ষণ ও হিসাবের কাজ করে। */
  function enhanceDate(input) {
    if (input.dataset.otp) return;
    input.dataset.otp = '1';
    input.classList.add('otp-src');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    const wrap = document.createElement('div');
    wrap.className = 'otp-date';
    const groups = [['দিন', 2], ['মাস', 2], ['বছর', 4]];
    const boxes = [];
    groups.forEach(([label, n], gi) => {
      const g = document.createElement('div');
      g.className = 'otp-group g' + gi;
      const row = document.createElement('div');
      row.className = 'otp-row';
      for (let k = 0; k < n; k++) {
        const b = document.createElement('input');
        b.className = 'otp-box';
        b.type = 'text';
        b.inputMode = 'numeric';
        b.autocomplete = 'off';
        b.maxLength = 1;
        b.size = 1;
        b.setAttribute('aria-label', label + ' ' + (k + 1));
        boxes.push(b); row.appendChild(b);
      }
      const cap = document.createElement('small');
      cap.textContent = label;
      g.append(row, cap);
      wrap.appendChild(g);
      if (gi < 2) { const sep = document.createElement('span'); sep.className = 'otp-sep'; sep.textContent = '-'; wrap.appendChild(sep); }
    });
    input.after(wrap);

    const digitsOf = v => EN(v || '').replace(/\D/g, '');
    const fill = (load) => {
      const d = digitsOf(input.value);
      if (load) boxes.forEach((b, i) => { b.value = d[i] || ''; });
      boxes.forEach(b => b.classList.toggle('on', !!b.value));
      wrap.classList.toggle('bad', input.classList.contains('bad'));
      wrap.classList.toggle('done', d.length === 8 && boxes.every(b => b.value) && !input.classList.contains('bad'));
    };
    const commit = () => {
      input.value = boxes.map(b => b.value).join('');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      fill();
    };
    const put = (start, text) => {
      const d = digitsOf(text);
      let i = start;
      for (const ch of d) { if (i >= 8) break; boxes[i++].value = ch; }
      commit();
      boxes[Math.min(i, 7)].focus();
    };

    boxes.forEach((b, i) => {
      b.addEventListener('focus', () => { setTimeout(() => b.select(), 0); });
      b.addEventListener('input', () => {
        const d = digitsOf(b.value);
        if (!d) { b.value = ''; commit(); return; }
        if (d.length > 1) { b.value = ''; put(i, d); return; }   // একসাথে কয়েকটি অঙ্ক (অটোফিল)
        b.value = d; commit();
        if (i < 7) boxes[i + 1].focus(); else b.blur();
      });
      b.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !b.value && i > 0) { e.preventDefault(); boxes[i - 1].value = ''; commit(); boxes[i - 1].focus(); }
        else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); boxes[i - 1].focus(); }
        else if (e.key === 'ArrowRight' && i < 7) { e.preventDefault(); boxes[i + 1].focus(); }
      });
      b.addEventListener('paste', e => {
        e.preventDefault();
        put(i, (e.clipboardData || window.clipboardData).getData('text'));
      });
    });
    // খালি জায়গায় চাপ দিলে প্রথম ফাঁকা খোপে যাবে
    wrap.addEventListener('click', e => {
      if (e.target.classList.contains('otp-box')) return;
      (boxes.find(b => !b.value) || boxes[7]).focus();
    });
    fill(true);
  }

  function initForm() {
    // কনফিগ
    $('#dev-name').innerHTML = devNameHTML();
    $('#dev-role').textContent = SITE_CONFIG.developer.title;
    if (SITE_CONFIG.developer.whatsapp) {
      $('#devWa').href = $('#footWa').href = waLink();
      $('#footWaNum').textContent = waText();
    } else { $('#devWa').hidden = true; $('#footWa').hidden = true; }
    if (SITE_CONFIG.facebook) { $('#devFb').href = $('#footFb').href = SITE_CONFIG.facebook.url; }
    else { $('#devFb').hidden = true; $('#footFb').hidden = true; }
    $('#ad-title').textContent = SITE_CONFIG.ad.title;
    $('#ad-tag').textContent = SITE_CONFIG.ad.tagline;
    $('#ad-feats').innerHTML = (SITE_CONFIG.ad.features || []).map(f => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(f)}</li>`).join('');
    $('#ad-cta').textContent = SITE_CONFIG.ad.cta;
    $('#ad').href = SITE_CONFIG.ad.url || '#';
    if (SITE_CONFIG.ad2) {
      $('#ad2-title').textContent = SITE_CONFIG.ad2.title;
      $('#ad2-sub').textContent = SITE_CONFIG.ad2.subtitle;
      $('#ad2-tag').textContent = SITE_CONFIG.ad2.tagline;
      $('#ad2-feats').innerHTML = (SITE_CONFIG.ad2.features || []).map(f => `<li>${esc(f)}</li>`).join('');
      $('#ad2').href = SITE_CONFIG.ad2.url;
    } else { $('#ad2').hidden = true; }
    setupInstall();
    setupShare();
    setupPicker();

    $('#rank').innerHTML = `<option value=""></option>` + CURRENT_RANK_KEYS.map(k => `<option value="${k}">${RANKS[k].name}</option>`).join('');
    $('#skill').innerHTML = `<option value="NONE">প্রযোজ্য নয়</option><option value="HIGH">উচ্চ দক্ষতা বেতন</option><option value="NORMAL">দক্ষতা বেতন</option>`;
    $('#appointment').innerHTML = Object.entries(APPOINTMENT).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    $('#specials').innerHTML = Object.entries(SPECIAL_PAY).map(([k, v]) =>
      `<label class="chipbox"><input type="checkbox" value="${k}" /><span>${v.label.replace(' বেতন', '')}</span></label>`).join('');


    // স্টেট → ফর্ম
    ['name','baNo','unit','rank','dob','joinDate','oldBasic','skill','appointment','serviceWardenship','otherNew','retireDate','penName','penNet','penDob']
      .forEach(id => { const el = $('#' + id); if (el) el.value = el.classList.contains('date-in') ? isoToDmy(S[id]) : (S[id] ?? ''); });
    if (S.rank && !RANKS[S.rank]) S.rank = '';
    if (!S.rank || (RANKS[S.rank].oldScale && !RANKS[S.rank].oldScale.includes(num(S.oldBasic)))) S.oldBasic = '';
    $('#oldBasic').value = S.oldBasic;
    renderOldBasic();
    $$('#specials input').forEach(i => i.checked = S.specials.includes(i.value));
    $$('[data-seg]').forEach(seg => setSeg(seg, S[seg.dataset.seg]));
    $$('[data-step]').forEach(st => st.querySelector('output').textContent = bn(S[st.dataset.step] || 0));
    renderPromos();
    $$('#form select.input').forEach(enhanceSelect);
    $$('#dob, #joinDate, #retireDate, #penDob').forEach(enhanceDate);
    updateOldStartHint();
    refreshPlaceholders();

    // ইভেন্ট
    $('#form').addEventListener('input', onInput);
    $('#form').addEventListener('change', onInput);
    $('#view-pension').addEventListener('input', onInput);
    $('#view-pension').addEventListener('change', onInput);
    $('#penForm').addEventListener('input', onInput);
    $('#penForm').addEventListener('change', onInput);

    $$('[data-seg] button').forEach(b => b.addEventListener('click', () => {
      const seg = b.parentElement; S[seg.dataset.seg] = b.dataset.v; setSeg(seg, b.dataset.v); save(); refreshPlaceholders();
      if (seg.dataset.seg === 'mode') applyMode(true);
    }));
    $$('[data-step] button').forEach(b => b.addEventListener('click', () => {
      const st = b.parentElement, k = st.dataset.step;
      S[k] = Math.max(0, Math.min(k === 'badges' ? 3 : 10, (S[k] || 0) + Number(b.dataset.d)));
      st.querySelector('output').textContent = bn(S[k]); save(); refreshPlaceholders();
    }));
    $('#btn-calc').addEventListener('click', () => { if (calcSalary(true)) { go('salary'); adAfterCalc(); } });
    $('#btn-pen-calc').addEventListener('click', () => { if (calcRetired(true)) { go('salary'); adAfterCalc(); } });
    applyMode(false);
    $('#btn-pension').addEventListener('click', () => { if (calcPension(true) !== false) adAfterCalc(); });
    $('#btn-add-promo').addEventListener('click', () => { S.promotions.push({ rank: '', date: '' }); renderPromos(); save(); });
    $('#btn-reset').addEventListener('click', () => {
      askConfirm({
        title: 'সব তথ্য মুছে ফেলবেন?',
        text: 'আপনার দেওয়া নাম, পদবি, মূল বেতন, তারিখসহ সব তথ্য মুছে যাবে। এটি আর ফেরত আনা যাবে না।',
        ok: 'হ্যাঁ, মুছে ফেলুন',
      }).then(yes => {
        if (!yes) return;
        localStorage.removeItem(STORE_KEY); S = JSON.parse(JSON.stringify(DEFAULTS)); location.reload();
      });
    });
    $$('.nav-btn').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
    $$('[data-report]').forEach(b => b.addEventListener('click', () => makePdf(b.dataset.report)));
  }

  /* হোয়াটসঅ্যাপ: 01735547549 → wa.me/8801735547549, দেখায় ০১৭৩৫-৫৪৭৫৪৯ */
  const waNum = () => String(SITE_CONFIG.developer.whatsapp || '').replace(/\D/g, '');
  const waLink = () => 'https://wa.me/' + (waNum().startsWith('880') ? waNum() : '88' + waNum());
  const waText = () => { const n = waNum().replace(/^88/, ''); return bnDigits(n.slice(0, 5) + '-' + n.slice(5)); };
  const bnDigits = t => String(t).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const devWaPDF = () => SITE_CONFIG.developer.whatsapp ? `<span class="wa">হোয়াটসঅ্যাপ: ${waText()}</span>` : '';
  const devNameHTML = () => esc(SITE_CONFIG.developer.name) + (SITE_CONFIG.developer.corps ? ` <small class="corps">${esc(SITE_CONFIG.developer.corps)}</small>` : '');

  /* ---------------- তালিকা থেকে বাছাই: ব্রাউজারের সাদা ড্রপডাউনের বদলে ডার্ক থিমের তালিকা ----------------
     আসল <select> লুকানো থাকে (হিসাবের সব কোড আগের মতোই এর মান পড়ে), তার জায়গায় একটি বাটন দেখায় */
  function enhanceSelect(sel) {
    if (!sel._trig) {
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'input select-trigger'; t.setAttribute('aria-haspopup', 'listbox');
      sel.after(t); sel.classList.add('native-hidden'); sel.tabIndex = -1; sel._trig = t;
      t.addEventListener('click', () => openPicker(sel));
    }
    syncSelect(sel);
  }
  function syncSelect(sel) {
    const t = sel._trig; if (!t) return;
    const o = sel.selectedOptions[0];
    t.innerHTML = `<span>${esc(o ? o.textContent : '')}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
    t.classList.toggle('empty', !sel.value);
    t.hidden = sel.hidden;
  }
  let pickFor = null;
  function openPicker(sel) {
    pickFor = sel;
    const lab = sel.closest('.field')?.querySelector('label');
    $('#psTitle').textContent = lab ? lab.childNodes[0].textContent.trim() : 'নির্বাচন করুন';
    $('#psList').innerHTML = [...sel.options].filter(o => o.value !== '').map(o =>
      `<button type="button" role="option" class="ps-opt${o.value === sel.value ? ' on' : ''}" aria-selected="${o.value === sel.value}" data-v="${esc(o.value)}"><span class="ps-radio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span><span class="ps-txt">${esc(o.textContent)}</span></button>`).join('');
    $('#pickSheet').hidden = false; document.body.classList.add('no-scroll');
    const on = $('#psList .on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  function closePicker() { $('#pickSheet').hidden = true; document.body.classList.remove('no-scroll'); if (pickFor && pickFor._trig) pickFor._trig.focus(); pickFor = null; }
  function setupPicker() {
    $('#psList').addEventListener('click', e => {
      const b = e.target.closest('.ps-opt'); if (!b || !pickFor) return;
      const sel = pickFor;
      sel.value = b.dataset.v; syncSelect(sel);
      closePicker();
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    $('#psClose').addEventListener('click', closePicker);
    $('#pickSheet').addEventListener('click', e => { if (e.target.id === 'pickSheet') closePicker(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#pickSheet').hidden) closePicker(); });
  }

  /* ---------------- নিশ্চিতকরণ বাক্স ---------------- */
  function askConfirm({ title, text, ok = 'হ্যাঁ', cancel = 'বাতিল' }) {
    return new Promise(resolve => {
      const box = $('#confirmBox');
      $('#cfTitle').textContent = title; $('#cfText').textContent = text;
      $('#cfOk').textContent = ok; $('#cfCancel').textContent = cancel;
      box.hidden = false; document.body.classList.add('no-scroll');
      setTimeout(() => $('#cfCancel').focus(), 50);
      const done = v => {
        box.hidden = true; document.body.classList.remove('no-scroll');
        $('#cfOk').onclick = $('#cfCancel').onclick = box.onclick = document.onkeydown = null;
        resolve(v);
      };
      $('#cfOk').onclick = () => done(true);
      $('#cfCancel').onclick = () => done(false);
      box.onclick = e => { if (e.target === box) done(false); };
      document.onkeydown = e => { if (e.key === 'Escape') done(false); };
    });
  }

  /* ---------------- শেয়ার ---------------- */
  const SHARE_TEXT = 'জেএসআই ০১/২০২৬ অনুযায়ী নতুন বেতন স্কেলে আপনার মূল বেতন, ভাতা ও পেনশন কত হবে — এক মিনিটে জেনে নিন, পিডিএফসহ, সম্পূর্ণ ফ্রি।';
  const shareUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
  async function doShare() {
    const url = shareUrl();
    if (navigator.share) {
      try { await navigator.share({ title: 'JSI-2026 বেতন ও পেনশন ক্যালকুলেটর', text: SHARE_TEXT, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const u = encodeURIComponent(url), t = encodeURIComponent(SHARE_TEXT + ' ' + url);
    $('#sh-wa').href = `https://wa.me/?text=${t}`;
    $('#sh-fb').href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    $('#sh-ms').href = `fb-messenger://share/?link=${u}`;
    $('#sh-tg').href = `https://t.me/share/url?url=${u}&text=${encodeURIComponent(SHARE_TEXT)}`;
    $('#shareSheet').hidden = false;
  }
  function setupShare() {
    ['#btn-share', '#btn-share2'].forEach(id => $(id).addEventListener('click', doShare));
    $('#shareClose').addEventListener('click', () => { $('#shareSheet').hidden = true; });
    $('#shareSheet').addEventListener('click', e => { if (e.target.id === 'shareSheet') $('#shareSheet').hidden = true; });
    $('#sh-copy').addEventListener('click', async () => {
      const txt = SHARE_TEXT + ' ' + shareUrl();
      try { await navigator.clipboard.writeText(txt); }
      catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      $('#shareSheet').hidden = true; toast('লিংক কপি হয়েছে');
    });
  }

  /* ---------------- অ্যাপ হিসেবে ইনস্টল (PWA) ---------------- */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; showInstall(); });
  window.addEventListener('appinstalled', () => { $('#installCard').hidden = true; toast('অ্যাপ ইনস্টল হয়েছে'); });
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inAppBrowser = () => /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|MicroMessenger|; wv\)/i.test(navigator.userAgent);
  const isAndroid = () => /Android/i.test(navigator.userAgent);
  /** উপরের ডাউনলোড বাটন: যেকোনো সময় অ্যাপ ইনস্টলের উপায় দেখায় */
  async function openInstall() {
    if (isStandalone()) { toast('অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে'); return; }
    if (installEvt) {
      installEvt.prompt();
      const r = await installEvt.userChoice.catch(() => null);
      installEvt = null;
      if (r && r.outcome === 'accepted') { $('#installCard').hidden = true; return; }
    }
    const url = location.href.split('#')[0];
    let html;
    if (inAppBrowser()) {
      const intent = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
      html = `<p class="inst-warn">আপনি ফেসবুক/মেসেঞ্জারের ভেতরের ব্রাউজারে আছেন। এখান থেকে অ্যাপ ইনস্টল করা যায় না।</p>
        ${isAndroid() ? `<a class="fb-btn inst-go" href="${intent}">Chrome-এ খুলুন</a><p class="inst-or">তারপর আবার উপরের ⬇ ডাউনলোড বাটনে চাপুন।</p>` : ''}
        <ol class="inst-steps">
          <li>উপরে ডান কোণের <b>⋯</b> বা <b>⋮</b> মেনুতে চাপুন</li>
          <li><b>${isIOS() ? 'Open in Safari' : 'Open in Chrome / Open in browser'}</b> বাছাই করুন</li>
          <li>ব্রাউজারে খোলার পর উপরের <b>⬇</b> বাটনে আবার চাপুন</li>
        </ol>
        <button type="button" class="fb-later inst-copy" id="instCopy">লিংক কপি করুন</button>`;
    } else if (isIOS()) {
      html = `<ol class="inst-steps">
          <li>Safari-র নিচের <b>শেয়ার</b> বাটনে চাপুন (⬆ চিহ্ন)</li>
          <li>নিচে স্ক্রল করে <b>Add to Home Screen</b> বাছাই করুন</li>
          <li>উপরে ডানে <b>Add</b> চাপুন</li>
        </ol><p class="inst-or">iPhone-এ শুধু Safari থেকেই ইনস্টল করা যায়।</p>`;
    } else {
      html = `<ol class="inst-steps">
          <li>Chrome-এর উপরে ডান কোণের <b>মেনু (⋮)</b>-তে চাপুন</li>
          <li><b>Install app</b> অথবা <b>Add to Home screen</b> বাছাই করুন</li>
          <li><b>Install</b> চাপুন, হোম স্ক্রিনে JSI-2026 আইকন চলে আসবে</li>
        </ol><p class="inst-or">অপশনটি না দেখালে পেজটি একবার রিফ্রেশ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।</p>`;
    }
    $('#instBody').innerHTML = html;
    const sh = $('#installSheet');
    const close = () => { sh.classList.remove('show'); setTimeout(() => { sh.hidden = true; }, 250); };
    $('#instX').onclick = close; sh.onclick = e => { if (e.target === sh) close(); };
    const cp = $('#instCopy');
    if (cp) cp.onclick = async () => {
      try { await navigator.clipboard.writeText(url); } catch (e) { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      toast('লিংক কপি হয়েছে, ব্রাউজারে পেস্ট করুন');
    };
    sh.hidden = false; requestAnimationFrame(() => sh.classList.add('show'));
  }
  function installDismissed() { try { return localStorage.getItem('jsi2026_install_x') === '1'; } catch (e) { return false; } }
  function showInstall() {
    if (isStandalone() || installDismissed() || !isMobile()) return;
    $('#installCard').hidden = false;
  }
  function setupInstall() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    showInstall();
    const top = $('#btn-install-top');
    if (top) { if (isStandalone()) top.hidden = true; top.addEventListener('click', openInstall); }
    $('#installBtn').addEventListener('click', async () => {
      if (installEvt) {
        installEvt.prompt();
        const r = await installEvt.userChoice.catch(() => null);
        installEvt = null;
        if (r && r.outcome === 'accepted') $('#installCard').hidden = true;
        return;
      }
      const st = $('#installSteps');
      st.innerHTML = isIOS()
        ? 'Safari-র নিচের <b>শেয়ার</b> বাটনে (⬆) চাপুন, তারপর <b>Add to Home Screen</b> বাছাই করুন।'
        : 'ব্রাউজারের উপরের <b>মেনু (⋮)</b>-তে চাপুন, তারপর <b>Install app</b> বা <b>Add to Home screen</b> বাছাই করুন।';
      st.hidden = false;
    });
    $('#installClose').addEventListener('click', () => {
      $('#installCard').hidden = true;
      try { localStorage.setItem('jsi2026_install_x', '1'); } catch (e) { /* ignore */ }
    });
  }

  function setSeg(seg, v) { $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); }

  function onInput(e) {
    const el = e.target;
    if (el.classList && el.classList.contains('date-in')) maskDate(el);
    const val = el.classList && el.classList.contains('date-in') ? (el.dataset.iso || '') : el.value;
    if (!el.id && !el.closest('#specials') && !el.dataset.promo) return;
    if (el.closest('#specials')) {
      S.specials = $$('#specials input:checked').map(i => i.value);
    } else if (el.dataset.promo !== undefined) {
      const i = Number(el.dataset.idx); S.promotions[i][el.dataset.promo] = val;
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
      S[el.id] = val;
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
    syncSelect(sel);
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
      commutePct: 50, // সবার জন্য অর্ধেক পেনশন এককালীন (প্রচলিত নিয়ম)
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
        <button type="button" class="x" data-del="${i}" aria-label="মুছুন">×</button>
        <div class="field promo-date" style="margin:0"><label>তারিখ</label><input class="input date-in" type="text" inputmode="numeric" maxlength="10" placeholder="দিন-মাস-বছর" autocomplete="off" data-promo="date" data-idx="${i}" value="${esc(isoToDmy(p.date))}" /></div>
      </div>`).join('');
    $$('#promoList select').forEach((s, i) => { s.value = S.promotions[i].rank || ''; enhanceSelect(s); });
    $$('#promoList .date-in').forEach(enhanceDate);
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
    if (S.mode === 'RETIRED') return calcRetired(fromBtn);
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
    mountArrears(out, fnp => computeArrearsServing(tl, new Date(), fnp), 'serving');
    countUp($('#hero-big'), tl.periods[3].net);
    $$('.details-btn', out).filter(b => !b.closest('#arrearsHost')).forEach(b => b.addEventListener('click', () => {
      const d = b.nextElementSibling; d.classList.toggle('open');
      b.querySelector('span').textContent = d.classList.contains('open') ? 'বিস্তারিত লুকান' : 'বিস্তারিত হিসাব দেখুন';
    }));
    return true;
  }

  function salaryHTML(tl) {
    const inp = tl.input, R = tl.rank, [p1, p2, p3, p4] = tl.periods;
    const fx = tl.fix;
    const pctTxt = `${bn(tl.tr.p1 * 100)}% → ${bn(tl.tr.p2 * 100)}% → ১০০%`;

    const allowRows = (items) => items.map(i =>
      `<tr><td>${esc(i.label)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</td><td class="n">${tk(i.amt, i.amt % 1 ? 2 : 0)}</td></tr>`).join('');

    const periodCard = (p, idx) => {
      const meta = PERIODS[idx];
      const prevLabel = idx === 0 ? 'জুন ২০২৬' : PERIODS[idx - 1].label;
      const isFinal = idx === 3;
      const m3 = isFinal ? 'সব ভাতাসহ মোট বেতন (কর্তনের পর)' : 'পূর্বের ভাতাসহ এখন মোট বেতন পাবেন (কর্তনের পর)';
      const basicNote = p.pct < 1
        ? `পুরোনো মূল বেতন + বৃদ্ধি ${bn(p.pct * 100)}%`
        : (idx === 2 ? '১০০% নতুন মূল বেতন (ইনক্রিমেন্টসহ)' : 'নতুন মূল বেতন');
      let riseLabel, riseVal;
      if (idx === 0) {
        riseLabel = `প্রণোদনা বাদ দিয়ে জুন ২০২৬-এর তুলনায় আপনার বেতন বৃদ্ধি পেয়েছে`;
        riseVal = p.gross - tl.june.gross;
      } else {
        riseLabel = `${prevLabel}-এর তুলনায় আপনার বেতন বৃদ্ধি পেয়েছে`;
        riseVal = p.gross - p.prev.gross;
      }
      return `
      <div class="tl-item ${isFinal ? 'final' : ''}">
        <div class="card period">
          <div class="ph">
            <div><h4>${meta.label}</h4><small>${meta.range}</small></div>
            <span class="badge ${isFinal ? 'green' : 'gold'}">${isFinal ? 'নতুন ভাতা চালু' : (p.pct < 1 ? `বৃদ্ধি ${bn(p.pct * 100)}%` : '১০০% মূল বেতন')}</span>
          </div>
          <div class="metrics">
            <div class="metric"><div class="ic a">১</div><div class="t"><small>জেএসআই অনুসারে প্রাপ্য মূল বেতন</small><b>${tk(p.basic)}</b><small>${basicNote}</small></div><span class="delta ${deltaCls(p.basicRise)}">${signed(p.basicRise)}</span></div>
            <div class="metric"><div class="ic b">২</div><div class="t"><small>${riseLabel}</small><b class="${deltaCls(riseVal)}">${signed(riseVal)}</b>${idx === 0 ? tl.june.special.map(s => `<small>${s.label} ${tk(s.amt)} বাদ (${s.note})</small>`).join('') : ''}</div></div>
            <div class="metric"><div class="ic c">৩</div><div class="t"><small>${m3}</small><b>${tk(p.net)}</b></div></div>
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
              <tr class="sum"><td>সর্বমোট বেতন</td><td class="n">${tk(p.net)}</td></tr>
            </table>
            ${idx === 0 ? `<table class="tbl"><tr><th>জুন ২০২৬-এর তুলনা</th><th class="n">টাকা</th></tr>
              <tr><td>মূল বেতন বৃদ্ধি</td><td class="n up">+ ${tk(p.basic - inp.oldBasic)}</td></tr>
              ${tl.june.special.map(s => `<tr class="minus"><td>${s.label} বাদ<small>${s.note}</small></td><td class="n">− ${tk(s.amt)}</td></tr>`).join('')}
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

    <div id="arrearsHost"></div>

    ${inlineAd()}
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
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>ধাপে ধাপে বেতন বৃদ্ধির হিসাব</h3><span class="line"></span></div>
      <div class="formula">আপনার মোট মূল বেতন বৃদ্ধি = নতুন মূল বেতন − পুরোনো মূল বেতন<br>= ${tk(tl.newBasic26)} − ${tk(inp.oldBasic)} = <b>${tk(tl.raise)}</b></div>
      <table class="tbl step-tbl">
        <tr><th>সময়কাল</th><th class="n">বৃদ্ধির হার</th><th class="n">বৃদ্ধির পরিমাণ</th><th class="n">প্রাপ্য মূল বেতন</th></tr>
        <tr><td>জুলাই ২০২৬<small>প্রথম ধাপ</small></td><td class="n">${bn(tl.tr.p1 * 100)}%</td><td class="n up">+ ${tk(p1.basic - inp.oldBasic)}</td><td class="n"><b>${tk(p1.basic)}</b></td></tr>
        <tr><td>জানুয়ারি ২০২৭</td><td class="n">${bn(tl.tr.p2 * 100)}%</td><td class="n up">+ ${tk(p2.basic - inp.oldBasic)}</td><td class="n"><b>${tk(p2.basic)}</b></td></tr>
        <tr><td>জুলাই ২০২৭<small>পূর্ণ বেতন + ইনক্রিমেন্ট</small></td><td class="n">১০০%</td><td class="n up">+ ${tk(p3.basic - inp.oldBasic)}</td><td class="n"><b>${tk(p3.basic)}</b></td></tr>
      </table>
      <p class="hint" style="margin:8px 0 0">বৃদ্ধির পরিমাণ = মোট মূল বেতন বৃদ্ধির নির্ধারিত হার, যা ৩০ জুন ২০২৬-এর মূল বেতনের সাথে যোগ হয়।</p>
      <div class="notice info" style="margin:12px 0 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>${R.group === 'JCO' ? 'জেসিও' : 'সার্জেন্ট ও তদনিম্ন'} পদের জন্য বর্ধিত মূল বেতন ধাপে ধাপে দেওয়া হবে: ${pctTxt}। বিশেষ প্রণোদনা ০১ জুলাই ২০২৬ থেকে বাদ যাবে।</div>
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

    ${fbCard()}
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
    countUp($('#pen-big'), rt.monthlyInHand);
    if (fromBtn) setTimeout(() => $('#pension-out').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return true;
  }

  function pensionHTML(rt, inp) {
    const ev = rt.events.map(e => `<li class="${e.type === 'promo' ? 'promo' : ''}"><span>${bnDate(e.date)}</span><b>${tk(e.basic)}</b><small>${esc(e.text)} · ${esc(e.rank)}</small></li>`).join('');
    return `
    <div class="summary-hero" style="margin-top:6px">
      <div class="who"><span><b>${esc(inp.name || 'নাম দেওয়া হয়নি')}</b></span><span>${esc(rt.finalRank)}</span></div>
      <div class="lbl">প্রতি মাসে পেনশন পাবেন <b class="incl">(রেশন ভাতা ও মেডিকেল ভাতা সহ)</b></div>
      <div class="big" id="pen-big">${tk(0)}</div>
      <div class="sub">অবসর: ${bnDate(rt.retire)} · চাকরিকাল ${bn(rt.years)} বছর ${bn(rt.months)} মাস</div>
      <div class="kpis">
        <div class="kpi"><small>শেষ মূল বেতন</small><b>${tk(rt.lastBasic)}</b></div>
        <div class="kpi"><small>পূর্ণ পেনশন</small><b>${tk(rt.gross)}</b></div>
        <div class="kpi"><small>অবসরের সময় এককালীন (আনুতোষিক)</small><b>${tk(rt.lump)}</b></div>
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>মাসিক পেনশনের বিস্তারিত হিসাব</h3><span class="line"></span></div>
      <table class="tbl">
        <tr><th>বিবরণ</th><th class="n">টাকা</th></tr>
        <tr><td>নিট পেনশন<small>পূর্ণ পেনশন ${tk(rt.gross)}-এর ${bn(100 - rt.cPct * 100)}%; বাকি ${bn(rt.cPct * 100)}% এককালীন আনুতোষিক হিসেবে পাবেন</small></td><td class="n">${tk(rt.net)}</td></tr>
        <tr><td>মেডিকেল ভাতা<small>অবসরের সময় বয়স ${bn(rt.ageAtRetire)} বছর; বয়স অনুযায়ী ৩,০০০ / ৪,০০০ / ৫,০০০ / ৬,০০০ টাকা</small></td><td class="n">${tk(rt.med)}</td></tr>
        <tr><td>রেশন ভাতা<small>${bn(inp.rationAdults)} প্রাপ্তবয়স্ক × ৳১,০০০ + ${bn(inp.rationChildren)} শিশু (১২ বছরের নিচে) × ৳৫০০</small></td><td class="n">${tk(rt.ration)}</td></tr>
        <tr class="sum"><td>প্রতি মাসে মোট পেনশন (রেশন ভাতা ও মেডিকেল ভাতা সহ)</td><td class="n">${tk(rt.monthlyInHand)}</td></tr>
      </table>
      <p class="hint" style="margin:8px 0 0">রেশনের সদস্যসংখ্যা উপরের ঘর থেকে বদলাতে পারবেন। বছরে ২টি উৎসব ভাতা ও বাংলা নববর্ষ ভাতা আলাদাভাবে পাবেন (নিচে দেখুন)।</p>
    </div>
    <div class="notice info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <div><b>সহজ কথায়:</b> শেষ মূল বেতন আর চাকরির বছর থেকে আপনার <b>পূর্ণ পেনশন</b> বের হয়। তার <b>অর্ধেক</b> অবসরের সময় একবারে মোটা অঙ্কে পান, যাকে <b>আনুতোষিক</b> বলে। বাকি <b>অর্ধেক</b> সারাজীবন প্রতি মাসে <b>মাসিক পেনশন</b> হিসেবে পান।</div>
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
        পূর্ণ পেনশন = (শেষ মূল বেতন + ৬০৮) × চাকরির বছর ÷ ৩১<br>
        = (${tk(rt.pensionable)} + ৬০৮) × ${bn(rt.years)} ÷ ৩১ = ${tk(rt.formula, 2)}<br>
        সর্বোচ্চ সীমা = ${tk(rt.L)}-এর ৯০% = ${tk(rt.cap, 2)}<br>
        ${rt.capped ? 'সূত্রের ফল সীমার বেশি, তাই সর্বোচ্চ সীমাই প্রযোজ্য।' : 'সূত্রের ফল সীমার মধ্যে।'} পূর্ণ পেনশন = <b>${tk(rt.gross)}</b>
      </div>
      <table class="tbl">
        <tr><td>শেষ মূল বেতন</td><td class="n">${tk(rt.lastBasic)}</td></tr>
        ${rt.swPension ? `<tr><td>সার্ভিস ওয়ার্ডিনেস বেতন</td><td class="n">${tk(rt.swPension)}</td></tr>` : ''}
        <tr><td>পূর্ণ পেনশন</td><td class="n">${tk(rt.gross)}</td></tr>
        <tr class="minus"><td>অর্ধেক এককালীন নেওয়া হলো<small>এর বদলে আনুতোষিক পাবেন</small></td><td class="n">− ${tk(rt.commuted)}</td></tr>
        <tr class="sum"><td>প্রতি মাসে পেনশন</td><td class="n">${tk(rt.net)}</td></tr>
      </table>
      <div class="formula">এককালীন আনুতোষিক = ছেড়ে দেওয়া অর্ধেক পেনশন × ১২ × বয়সের গুণক<br>= ${tk(rt.commuted)} × ১২ × ${bn(rt.factor, 3)} = <b>${tk(rt.lump)}</b><br><small>অবসরের পরের জন্মদিনে বয়স ${bn(rt.ageNext)} বছর; বয়স যত কম, গুণক তত বেশি (জেএসআই অনুচ্ছেদ ২৮)</small></div>
    </div>

    ${inlineAd()}

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>অবসরকালীন অন্যান্য সুবিধা</h3><span class="line"></span></div>
      <table class="tbl">
        <tr><td>অবসর প্রস্তুতিমূলক ছুটি (এলপিআর)<small>১২ মাস পূর্ণ গড় বেতনে</small></td><td class="n">১২ মাস</td></tr>
        <tr><td>ছুটি নগদায়ন (১৮ মাসের মূল বেতন)<small>ছুটি পাওনা সাপেক্ষে</small></td><td class="n">${tk(rt.leaveEncash)}</td></tr>
        <tr><td>চিকিৎসা ভাতা (মাসিক)<small>অবসরের সময় বয়স ${bn(rt.ageAtRetire)} বছর</small></td><td class="n">${tk(rt.med)}</td></tr>
        <tr><td>রেশনের পরিবর্তে রেশন ভাতা (মাসিক)<small>${bn(inp.rationAdults)} প্রাপ্তবয়স্ক × ৳১,০০০ + ${bn(inp.rationChildren)} শিশু × ৳৫০০</small></td><td class="n">${tk(rt.ration)}</td></tr>
        <tr class="sum"><td>মাসে হাতে আসবে (পেনশন + চিকিৎসা + রেশন)</td><td class="n">${tk(rt.monthlyInHand)}</td></tr>
        <tr><td>উৎসব ভাতা (বছরে ২টি)</td><td class="n">${tk(rt.festivalYearly)}</td></tr>
        <tr><td>বাংলা নববর্ষ ভাতা (মাসিক পেনশনের ১৫%)</td><td class="n">${tk(rt.noboborsho)}</td></tr>
        <tr class="sum"><td>অবসরের সময় এককালীন মোট (আনুতোষিক + ছুটি নগদায়ন)</td><td class="n">${tk(rt.lump + rt.leaveEncash)}</td></tr>
      </table>
      <h4 style="margin:16px 0 4px;font-size:14.5px">প্রতি বছর ৫% বৃদ্ধিতে মাসিক পেনশন</h4>
      <table class="tbl">${rt.growth.map((g, i) => `<tr><td>${i === 0 ? 'অবসরের বছর' : bn(i) + ' বছর পর'} (${bnPlain(g.year)})</td><td class="n">${tk(g.net)}</td></tr>`).join('')}</table>
    </div>

    ${fbCard()}
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
      <div class="devbox"><img src="assets/img/developer-full.jpg" alt="" /><div>ডেভেলপ করেছেন<b>${devNameHTML()}</b>${SITE_CONFIG.developer.title}${devWaPDF()}</div></div>
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




  /* ---------------- এআই সহায়কের জন্য ব্যবহারকারীর হিসাবের সারাংশ ---------------- */
  window.__jsiSummary = function () {
    const n = v => Math.round(v);
    if (S.mode === 'RETIRED') {
      const r = lastRet || computeExistingPension(collectPen());
      if (!r || !r.ok) return '';
      const a = computeArrearsRetired(r, new Date(), S.firstNewPay || '');
      return [`ধরন: পেনশনভোগী (১ জুলাই ২০২৬-এর আগে অবসরপ্রাপ্ত), ${S.penType === 'FAMILY' ? 'পারিবারিক পেনশন' : 'নিজের পেনশন'}`,
        `৩০ জুন ২০২৬ নিট পেনশন ${r.net30}; স্ল্যাব বৃদ্ধি ${n(r.slab.rate * 100)}%; নতুন নির্ধারিত নিট পেনশন ${r.target}`,
        ...r.periods.map(p => `${p.label}: নিট পেনশন ${p.net}, চিকিৎসা ${p.med}, রেশন ${p.ration}, মোট ${p.total}`),
        `আজ পর্যন্ত সম্ভাব্য বকেয়া ${a.total}`].join('\n');
    }
    const inp = collect();
    if (!inp.oldBasic || !inp.joinDate || !inp.dob) return '';
    const tl = computeTimeline(inp);
    const R = tl.rank, ar = computeArrearsServing(tl, new Date(), S.firstNewPay || '');
    const L = [`পদবি: ${R.name}; চাকরির বয়স (আজ) ${diffYM(inp.joinDate, new Date()).y} বছর; বয়স ${ageOn(inp.dob, new Date())} বছর; কর্মস্থল: ${LOCATIONS[inp.location]}; ${inp.marital === 'MARRIED' ? 'বিবাহিত' : 'অবিবাহিত'}${inp.quarter ? ', সরকারি বাসা' : ''}; সন্তান ${inp.children}`,
      `৩০ জুন ২০২৬ মূল বেতন ${inp.oldBasic}; পুরোনো স্কেলের প্রারম্ভিক ধাপ ${inp.oldStart}`,
      `নতুন স্কেলে নির্ধারণ: পার্থক্য ${tl.fix.diff}, লক্ষ্য ${tl.fix.target}, নির্ধারিত ${tl.fix.fixed}; ১ জুলাই ২০২৬ ইনক্রিমেন্টসহ ${tl.newBasic26}`,
      ...tl.periods.map((p, i) => `${PERIODS[i].label}: মূল বেতন ${p.basic}, ভাতা ${n(p.allowTotal)}, মোট ${n(p.gross)}, কর্তন ${n(p.ded.total)}, হাতে ${n(p.net)}`),
      `জুন ২০২৬ মোট ${n(tl.june.gross)} (বিশেষ সুবিধা ${n(tl.june.specialTotal)} সহ)`,
      `আজ পর্যন্ত বকেয়া: মূল বেতন বৃদ্ধি ${ar.basicTotal} − প্রণোদনা সমন্বয় ${ar.specialAdj} = ${ar.total}`];
    if (S.retireDate) {
      const rt = lastRT || computeRetirement(inp, tl);
      if (rt && rt.ok) L.push(`অবসর ${S.retireDate.slice(0, 7)}: শেষ মূল বেতন ${rt.lastBasic}, চাকরি ${rt.years} বছর, গ্রস পেনশন ${n(rt.gross)}, নিট ${n(rt.net)}, এককালীন ${n(rt.lump)}, চিকিৎসা ${rt.med}, রেশন ${rt.ration}, মাসে মোট ${n(rt.monthlyInHand)}`);
    }
    return L.join('\n');
  };

  /* ======================= বকেয়া ======================= */
  function arrearsOptions() {
    const today = new Date(), opts = [`<option value="">এখনো পাইনি (আজ পর্যন্ত হিসাব)</option>`];
    for (let d = new Date(2026, 10, 1); d <= today; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
      opts.push(`<option value="${ymKey(d)}">${bnMonthYear(d)}</option>`);
    return opts.join('');
  }
  function arrearsCardHTML(a, kind) {
    const ret = kind === 'retired';
    const lastRow = a.rows[a.rows.length - 1];
    const until = a.firstNewPay
      ? (lastRow ? `${bnMonthYear(lastRow.date)} পর্যন্ত` : '—')
      : `আজ ${bnDate(a.today)} পর্যন্ত`;
    const neg = a.total < 0;
    return `
    <div class="card arrears">
      <div class="ar-top">
        <span class="ar-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/></svg></span>
        <div><b>বকেয়া হিসাব</b><small>০১ জুলাই ২০২৬ থেকে ${until}</small></div>
      </div>
      <div class="ar-amt ${neg ? 'neg' : ''}">${neg ? '−' : ''}${tk(Math.abs(a.total))}</div>
      <div class="ar-sub">${neg ? 'অতিরিক্ত উত্তোলিত অংশ (বকেয়া থেকে সমন্বয় হবে)' : `মোট ${bn(a.rows.length)} মাসের সম্ভাব্য বকেয়া${lastRow && lastRow.partial ? ` (চলতি মাসের ${bn(lastRow.days)} দিনসহ)` : ''}`}</div>
      ${!ret ? `<div class="ar-break">
        <div class="ab-row"><span>মূল বেতন বৃদ্ধির বকেয়া<small>নতুন মূল বেতন − পুরোনো মূল বেতন, প্রতি মাসে</small></span><b class="up">+ ${tk(a.basicTotal)}</b></div>
        ${a.rows.some(r => r.date >= new Date(2028, 0, 1)) && a.allowDiff ? `<div class="ab-row"><span>ভাতার পার্থক্য<small>০১ জানুয়ারি ২০২৮ থেকে নতুন হারের ভাতা</small></span><b class="${deltaCls(a.allowDiff)}">${signed(a.allowDiff)}</b></div>` : ''}
        ${a.specialAdj ? `<div class="ab-row"><span>বিশেষ সুবিধা (প্রণোদনা) সমন্বয়<small>বিলুপ্ত হলেও জুলাই ২০২৬ থেকে তোলা হয়েছে (${tk(a.specialMonthly)}/মাস), তাই বকেয়া থেকে কাটা যাবে</small></span><b class="down">− ${tk(a.specialAdj)}</b></div>` : ''}
        <div class="ab-row ab-sum"><span>মোট বকেয়া</span><b>${tk(a.total)}</b></div>
        <div class="ab-row ab-note"><span>সম্ভাব্য জিপিএফ কর্তন<small>মূল বেতন বৃদ্ধির বকেয়ার ৫%; এটি আপনার জিপিএফ হিসাবে জমা থাকবে</small></span><b>− ${tk(a.gpf)}</b></div>
      </div>` : ''}
      <div class="field" style="margin-top:14px"><label>নতুন হারে প্রথম ${ret ? 'পেনশন' : 'বেতন'} কোন মাসে পেয়েছেন?</label>
        <select class="input" id="firstNewPay">${arrearsOptions()}</select>
        <span class="hint">নতুন হারে ${ret ? 'পেনশন' : 'বেতন'} পাওয়া শুরু হলে মাসটি বাছাই করুন; সেই মাস থেকে আর বকেয়া ধরা হবে না।</span>
      </div>
      <button class="details-btn"><span>মাসভিত্তিক বকেয়া দেখুন</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="details"><div>
        <table class="tbl">
          <tr><th>মাস</th><th class="n">প্রাপ্য</th><th class="n">তোলা হয়েছে</th><th class="n">বকেয়া</th></tr>
          ${a.rows.map(r => `<tr><td>${r.label}${r.partial ? `<small>${bn(r.days)} দিন</small>` : ''}</td><td class="n">${tk(r.due)}</td><td class="n">${tk(r.got)}</td><td class="n ${deltaCls(r.diff)}">${signed(r.diff)}</td></tr>`).join('')}
          <tr class="sum"><td>মোট</td><td class="n"></td><td class="n"></td><td class="n">${signed(a.total)}</td></tr>
        </table>
        <p class="hint" style="margin-top:8px">${ret
          ? '"তোলা হয়েছে" ধরা হয়েছে ৩০ জুন ২০২৬-এর নিট পেনশন, পুরোনো হারের চিকিৎসা ভাতা ও রেশন ভাতা।'
          : `"তোলা হয়েছে" ধরা হয়েছে জুন ২০২৬-এর মোট বেতন (${tk(a.drawnMonthly)}/মাস)${a.specialMonthly ? `, যার মধ্যে বিলুপ্ত বিশেষ সুবিধা ${tk(a.specialMonthly)}/মাস বকেয়া থেকে সমন্বয় হয়ে গেছে` : ''}।`}
          উৎসব ভাতার পার্থক্য এই হিসাবে ধরা হয়নি। চূড়ান্ত বকেয়া ${ret ? 'হিসাবরক্ষণ অফিস' : 'পে-অফিস'} নির্ধারণ করবে।</p>
      </div></div>
    </div>`;
  }
  function mountArrears(out, compute, kind) {
    const host = $('#arrearsHost', out);
    if (!host) return;
    const draw = () => {
      host.innerHTML = arrearsCardHTML(compute(S.firstNewPay || ''), kind);
      const sel = $('#firstNewPay', host);
      sel.value = S.firstNewPay || '';
      if (sel.value !== (S.firstNewPay || '')) { S.firstNewPay = ''; sel.value = ''; }
      sel.addEventListener('change', () => { S.firstNewPay = sel.value; save(); draw(); });
      const b = $('.details-btn', host);
      b.addEventListener('click', () => {
        const d = b.nextElementSibling; d.classList.toggle('open');
        b.querySelector('span').textContent = d.classList.contains('open') ? 'মাসভিত্তিক বকেয়া লুকান' : 'মাসভিত্তিক বকেয়া দেখুন';
      });
    };
    draw();
  }
  function arrearsRpt(a, kind) {
    const ret = kind === 'retired';
    const lastRow = a.rows[a.rows.length - 1];
    return `<div class="avoid"><h2>বকেয়া হিসাব (০১ জুলাই ২০২৬ থেকে ${a.firstNewPay ? (lastRow ? bnMonthYear(lastRow.date) : '—') : bnDate(a.today)} পর্যন্ত)</h2>
      <table><tr><th>মাস</th><th class="n">প্রাপ্য</th><th class="n">তোলা হয়েছে</th><th class="n">বকেয়া</th></tr>
      ${a.rows.map(r => `<tr><td>${r.label}${r.partial ? ` (${bn(r.days)} দিন)` : ''}</td><td class="n">${tk(r.due)}</td><td class="n">${tk(r.got)}</td><td class="n">${signed(r.diff)}</td></tr>`).join('')}
      <tr class="sum"><td>মোট সম্ভাব্য বকেয়া</td><td class="n"></td><td class="n"></td><td class="n">${signed(a.total)}</td></tr>
      ${!ret ? `<tr><td colspan="3">মূল বেতন বৃদ্ধির বকেয়া</td><td class="n">+ ${tk(a.basicTotal)}</td></tr>${a.rows.some(r => r.date >= new Date(2028, 0, 1)) && a.allowDiff ? `<tr><td colspan="3">ভাতার পার্থক্য (০১ জানুয়ারি ২০২৮ থেকে)</td><td class="n">${signed(a.allowDiff)}</td></tr>` : ''}${a.specialAdj ? `<tr class="minus"><td colspan="3">বিশেষ সুবিধা (প্রণোদনা) সমন্বয় (${tk(a.specialMonthly)}/মাস)</td><td class="n">− ${tk(a.specialAdj)}</td></tr>` : ''}<tr class="minus"><td colspan="3">সম্ভাব্য জিপিএফ কর্তন (মূল বেতন বৃদ্ধির ৫%, জিপিএফে জমা)</td><td class="n">− ${tk(a.gpf)}</td></tr>` : ''}
      </table>
      <p class="note">"তোলা হয়েছে" ধরা হয়েছে ${ret ? '৩০ জুন ২০২৬-এর হারে পেনশন, চিকিৎসা ও রেশন ভাতা' : 'জুন ২০২৬-এর হারে মোট বেতন (বিলুপ্ত বিশেষ সুবিধাসহ, যা বকেয়া থেকে সমন্বয় হয়)'}। চলতি মাস দিনের হিসাবে আনুপাতিক। উৎসব ভাতার পার্থক্য ধরা হয়নি।</p></div>`;
  }

  /* ======================= পেনশনভোগী মোড ======================= */
  function applyMode(animate) {
    const ret = S.mode === 'RETIRED';
    document.body.classList.toggle('retired', ret);
    $('#form').hidden = ret;
    $('#penForm').hidden = !ret;
    $$('.serv-only').forEach(x => { x.hidden = ret; });
    $$('.pen-only').forEach(x => { x.hidden = !ret; });
    const lbl = $('.nav-btn[data-view=salary]');
    if (lbl && lbl.lastChild) lbl.lastChild.textContent = ret ? 'পেনশন' : 'বেতন';
    if (animate) { const t = ret ? $('#penForm') : $('#form'); t.classList.remove('fade-in'); void t.offsetWidth; t.classList.add('fade-in'); }
  }
  function collectPen() {
    return {
      name: (S.penName || '').trim(), type: S.penType, net30: num(S.penNet),
      dob: parseDate(S.penDob), adults: S.penAdults || 0, children: S.penChildren || 0,
    };
  }
  function calcRetired(fromBtn) {
    const out = $('#salary-out');
    const r = computeExistingPension(collectPen());
    if (r.ok) lastRet = r;
    if (!r.ok) {
      if (fromBtn) { toast(r.errors[0]); return false; }
      out.innerHTML = `<div class="card empty"><div class="em">📝</div><b>এখনো হিসাব করা হয়নি</b><p>"তথ্য" অংশে পেনশনের তথ্য দিয়ে <b>পেনশন হিসাব করুন</b> বাটনে চাপুন।</p><button class="btn btn-primary" onclick="document.querySelector('[data-view=input]').click()">তথ্য দিন</button></div>`;
      return false;
    }
    out.innerHTML = retiredHTML(r);
    mountArrears(out, fnp => computeArrearsRetired(r, new Date(), fnp), 'retired');
    countUp($('#hero-big'), r.periods[3].total);
    $$('.details-btn', out).filter(b => !b.closest('#arrearsHost')).forEach(b => b.addEventListener('click', () => {
      const d = b.nextElementSibling; d.classList.toggle('open');
      b.querySelector('span').textContent = d.classList.contains('open') ? 'বিস্তারিত লুকান' : 'বিস্তারিত হিসাব দেখুন';
    }));
    return true;
  }
  function retiredHTML(r) {
    const inp = r.input, p4 = r.periods[3];
    const typeTxt = inp.type === 'FAMILY' ? 'পারিবারিক পেনশন' : 'নিজের পেনশন';
    const pctTxt = `${bn(r.pA * 100)}% → ${bn(r.pB * 100)}% → ১০০%`;
    const card = (p, i) => {
      const fin = i === 3;
      return `
      <div class="tl-item ${fin ? 'final' : ''}">
        <div class="card period">
          <div class="ph">
            <div><h4>${p.label}</h4><small>${p.range}</small></div>
            <span class="badge ${fin ? 'green' : 'gold'}">${fin ? 'নতুন চিকিৎসা ভাতা' : i === 2 ? '১০০% + ৫%' : `বৃদ্ধির ${bn((i === 0 ? r.pA : r.pB) * 100)}%`}</span>
          </div>
          <div class="metrics">
            <div class="metric"><div class="ic a">১</div><div class="t"><small>মাসিক নিট পেনশন</small><b>${tk(p.net)}</b><small>${esc(p.note)}</small></div><span class="delta ${deltaCls(p.netRise)}">${signed(p.netRise)}</span></div>
            <div class="metric"><div class="ic b">২</div><div class="t"><small>${i === 0 ? 'জুন ২০২৬-এর তুলনায় মোট বৃদ্ধি' : p.prev.label + '-এর তুলনায় মোট বৃদ্ধি'}</small><b class="${deltaCls(p.totalRise)}">${signed(p.totalRise)}</b><small>পেনশন, চিকিৎসা ও রেশন ভাতা মিলিয়ে</small></div></div>
            <div class="metric"><div class="ic c">৩</div><div class="t"><small>মাসে মোট হাতে পাবেন</small><b>${tk(p.total)}</b><small>পেনশন ${tk(p.net)} + চিকিৎসা ${tk(p.med)} + রেশন ${tk(p.ration)}</small></div></div>
          </div>
          <button class="details-btn"><span>বিস্তারিত হিসাব দেখুন</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="details"><div>
            ${i < 2 && !r.aboveCap ? `<div class="formula">নিট পেনশন = ${tk(r.net30)} + (${tk(r.target)} − ${tk(r.net30)}) × ${bn((i === 0 ? r.pA : r.pB) * 100)}%<br>= ${tk(r.net30)} + ${tk(r.inc * (i === 0 ? r.pA : r.pB))} = <b>${tk(p.net)}</b></div>` : ''}
            ${i === 2 ? `<div class="formula">নিট পেনশন = ${tk(r.target)} + ৫% বার্ষিক বৃদ্ধি = <b>${tk(p.net)}</b></div>` : ''}
            <table class="tbl">
              <tr><th>বিবরণ</th><th class="n">টাকা</th></tr>
              <tr><td>মাসিক নিট পেনশন</td><td class="n">${tk(p.net)}</td></tr>
              <tr><td>চিকিৎসা ভাতা<small>বয়স ${bn(p.age)} বছর · ${p.medNew ? 'জেএসআই ০১/২০২৬-এর নতুন হার' : 'জেএসআই ০১/২০১৬-এর হার (৩১ ডিসেম্বর ২০২৭ পর্যন্ত)'}</small></td><td class="n">${tk(p.med)}</td></tr>
              ${p.ration ? `<tr><td>রেশন ভাতা<small>${bn(inp.adults)} প্রাপ্তবয়স্ক × ৳১,০০০ + ${bn(inp.children)} শিশু × ৳৫০০</small></td><td class="n">${tk(p.ration)}</td></tr>` : ''}
              <tr class="sum"><td>মাসে মোট</td><td class="n">${tk(p.total)}</td></tr>
            </table>
          </div></div>
        </div>
      </div>`;
    };
    return `
    <div class="summary-hero">
      <div class="who"><span><b>${esc(inp.name || 'নাম দেওয়া হয়নি')}</b></span><span>${typeTxt}</span></div>
      <div class="lbl">জানুয়ারি ২০২৮ থেকে মাসে মোট হাতে পাবেন</div>
      <div class="big" id="hero-big">${tk(0)}</div>
      <div class="sub">পেনশন, চিকিৎসা ও রেশন ভাতাসহ · জুন ২০২৬-এর তুলনায় ${signed(p4.total - r.p0.total)}</div>
      <div class="kpis">
        <div class="kpi"><small>৩০ জুন ২০২৬ নিট পেনশন</small><b>${tk(r.net30)}</b></div>
        <div class="kpi"><small>নতুন নির্ধারিত নিট পেনশন</small><b>${tk(r.target)}</b></div>
        <div class="kpi"><small>জুলাই ২০২৭ থেকে (+৫%)</small><b>${tk(r.periods[2].net)}</b></div>
      </div>
    </div>

    <div id="arrearsHost"></div>

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>নতুন নিট পেনশন নির্ধারণ</h3><span class="line"></span></div>
      ${r.aboveCap ? `<div class="formula">আপনার নিট পেনশন ${tk(EXISTING_PENSION_CAP)}-এর বেশি। জেএসআই অনুযায়ী ১ জুলাই ২০২৭-এর বার্ষিক বৃদ্ধির আগ পর্যন্ত বিদ্যমান পেনশনই পাবেন।</div>` : `
      <div class="formula">
        ৩০ জুন ২০২৬-এর নিট পেনশন: <b>${tk(r.net30)}</b> (স্ল্যাব: ${r.slab.label})<br>
        বৃদ্ধির হার: <b>${bn(r.slab.rate * 100)}%</b> → ${tk(r.net30)} × ${bn(1 + r.slab.rate, 2)} = ${tk(r.raw)}<br>
        এই স্ল্যাবে নতুন পেনশনের সীমা: ${tk(r.slab.min)} – ${tk(r.slab.max)}<br>
        ${r.clampedMin ? 'হিসাবের অঙ্ক ন্যূনতম সীমার কম, তাই ন্যূনতম সীমা প্রযোজ্য।<br>' : r.clampedMax ? 'হিসাবের অঙ্ক সর্বোচ্চ সীমার বেশি, তাই সর্বোচ্চ সীমা প্রযোজ্য।<br>' : ''}
        নতুন নির্ধারিত নিট পেনশন: <b>${tk(r.target)}</b> (মোট বৃদ্ধি ${tk(r.inc)})
      </div>`}
      <div class="notice info" style="margin:10px 0 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>${r.big ? '২০,০০১ টাকা ও তদূর্ধ্ব' : '২০,০০০ টাকা ও তদনিম্ন'} স্ল্যাবের জন্য বাড়তি অংশ ধাপে ধাপে দেওয়া হবে: ${pctTxt}। ১ জুলাই ২০২৭ থেকে ৫% বার্ষিক বৃদ্ধিসহ পূর্ণ পেনশন (অনুচ্ছেদ ২৭)।</div>
      </div>
    </div>

    <div class="section-title"><h3>প্রতিটি ধাপে পেনশন ও ভাতা</h3><span class="line"></span></div>
    <div class="timeline">${r.periods.map(card).join('')}</div>

    ${inlineAd()}

    <div class="card">
      <div class="section-title" style="margin-top:0"><h3>বছরে একবার যা পাবেন (২০২৮)</h3><span class="line"></span></div>
      <table class="tbl">
        <tr><td>উৎসব ভাতা (২টি, প্রতিটি নিট পেনশনের সমান)</td><td class="n">${tk(r.festivalYearly)}</td></tr>
        <tr><td>বাংলা নববর্ষ ভাতা (নিট পেনশনের ১৫%)</td><td class="n">${tk(r.noboborsho)}</td></tr>
      </table>
      <h4 style="margin:16px 0 4px;font-size:14.5px">প্রতি বছর ১ জুলাই ৫% বৃদ্ধিতে নিট পেনশন</h4>
      <table class="tbl">${r.growth.map(g => `<tr><td>০১ জুলাই ${bnPlain(g.year)}</td><td class="n">${tk(g.net)}</td></tr>`).join('')}</table>
    </div>

    ${fbCard()}
    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-primary" onclick="window.__jsiPdf('retired')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>পিডিএফ ডাউনলোড</button>
    </div>`;
  }
  function rptRetired(r) {
    const inp = r.input, today = new Date();
    return `
    <div class="rh">
      <div><h1>পেনশনভোগীর হিসাব: জুলাই ২০২৬ – জানুয়ারি ২০২৮</h1><p>জেএসআই ০১/২০২৬ (বাংলাদেশ গেজেট, অতিরিক্ত, ১৫ নভেম্বর ২০২৬), চতুর্থ অংশ অনুযায়ী · প্রস্তুতের তারিখ: ${bnDate(today)}</p></div>
      <div class="devbox"><img src="assets/img/developer-full.jpg" alt="" /><div>ডেভেলপ করেছেন<b>${devNameHTML()}</b>${SITE_CONFIG.developer.title}${devWaPDF()}</div></div>
    </div>
    <div class="info">
      <div><b>নাম:</b> ${esc(inp.name || '—')}</div>
      <div><b>পেনশনের ধরন:</b> ${inp.type === 'FAMILY' ? 'পারিবারিক পেনশন' : 'নিজের পেনশন'}</div>
      <div><b>জন্মতারিখ:</b> ${bnDate(inp.dob)}</div>
      <div><b>৩০ জুন ২০২৬ নিট পেনশন:</b> ${tk(r.net30)}</div>
    </div>
    <h2>১. নতুন নিট পেনশন নির্ধারণ (অনুচ্ছেদ ২৭)</h2>
    <table class="fixed">
      <tr><th style="width:44%">বিষয়</th><th>বিবরণ</th></tr>
      <tr><td>৩০ জুন ২০২৬-এর নিট পেনশন</td><td>${tk(r.net30)}</td></tr>
      ${r.aboveCap ? `<tr><td>নির্ধারণ</td><td>${tk(EXISTING_PENSION_CAP)}-এর বেশি হওয়ায় ১ জুলাই ২০২৭-এর আগ পর্যন্ত বিদ্যমান পেনশন</td></tr>` : `
      <tr><td>স্ল্যাব ও বৃদ্ধির হার</td><td>${r.slab.label} · ${bn(r.slab.rate * 100)}%</td></tr>
      <tr><td>হিসাব</td><td>${tk(r.net30)} × ${bn(1 + r.slab.rate, 2)} = ${tk(r.raw)}</td></tr>
      <tr><td>স্ল্যাবের সীমা</td><td>${tk(r.slab.min)} – ${tk(r.slab.max)}</td></tr>`}
      <tr><td>নতুন নির্ধারিত নিট পেনশন</td><td><b>${tk(r.target)}</b> (বৃদ্ধি ${tk(r.inc)})</td></tr>
      <tr><td>ধাপে ধাপে প্রাপ্যতা</td><td>জুলাই–ডিসেম্বর ২০২৬ ${bn(r.pA * 100)}%, জানুয়ারি–জুন ২০২৭ ${bn(r.pB * 100)}%, জুলাই ২০২৭ থেকে ১০০% + ৫% বার্ষিক বৃদ্ধি</td></tr>
    </table>
    <h2>২. প্রতিটি ধাপে মাসিক প্রাপ্যতা</h2>
    <table class="avoid"><tr><th>সময়কাল</th><th class="n">নিট পেনশন</th><th class="n">চিকিৎসা ভাতা</th><th class="n">রেশন ভাতা</th><th class="n">মাসে মোট</th><th class="n">বৃদ্ধি</th></tr>
      <tr><td>জুন ২০২৬</td><td class="n">${tk(r.p0.net)}</td><td class="n">${tk(r.p0.med)}</td><td class="n">${tk(r.p0.ration)}</td><td class="n">${tk(r.p0.total)}</td><td class="n">—</td></tr>
      ${r.periods.map(p => `<tr><td>${p.label}<br><span style="color:#6b7772;font-size:10.5px">${p.range}</span></td><td class="n">${tk(p.net)}</td><td class="n">${tk(p.med)}</td><td class="n">${tk(p.ration)}</td><td class="n"><b>${tk(p.total)}</b></td><td class="n">${signed(p.totalRise)}</td></tr>`).join('')}
    </table>
    ${arrearsRpt(computeArrearsRetired(r, new Date(), S.firstNewPay || ''), 'retired')}
    <div class="avoid"><h3>বছরে একবার (২০২৮)</h3>
    <table><tr><td>উৎসব ভাতা (২টি, প্রতিটি নিট পেনশনের সমান)</td><td class="n">${tk(r.festivalYearly)}</td></tr><tr><td>বাংলা নববর্ষ ভাতা (নিট পেনশনের ১৫%)</td><td class="n">${tk(r.noboborsho)}</td></tr></table></div>
    <div class="avoid"><h3>প্রতি বছর ৫% বৃদ্ধিতে নিট পেনশন</h3>
    <table>${r.growth.map(g => `<tr><td>০১ জুলাই ${bnPlain(g.year)}</td><td class="n">${tk(g.net)}</td></tr>`).join('')}</table></div>
    <div class="avoid"><h3>অনুমান ও সতর্কতা</h3><ul class="note">
      <li>চিকিৎসা ভাতা ৩১ ডিসেম্বর ২০২৭ পর্যন্ত জেএসআই ০১/২০১৬-এর হারে এবং ০১ জানুয়ারি ২০২৮ থেকে নতুন হারে ধরা হয়েছে (অনুচ্ছেদ ২৩)।</li>
      <li>রেশন ভাতা অনুচ্ছেদ ২৪-এর হারে (প্রাপ্তবয়স্ক ১,০০০, শিশু ৫০০ টাকা) সব ধাপে ধরা হয়েছে।</li>
      <li>একাধিক পারিবারিক পেনশনভোগী থাকলে চিকিৎসা ভাতা আনুপাতিক হারে ভাগ হবে।</li>
      <li>এটি একটি আনুমানিক হিসাব; চূড়ান্ত অঙ্ক সংশ্লিষ্ট হিসাবরক্ষণ অফিস কর্তৃক নির্ধারিত হবে।</li>
    </ul></div>`;
  }

  /* ---------------- ফেসবুক ফলো ---------------- */
  const FB_SEEN = 'jsi2026_fb_prompted';
  const fbCard = () => SITE_CONFIG.facebook ? `
    <div class="fb-card">
      <div class="fb-row">
        <span class="fb-ic"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V22h3.4Z"/></svg></span>
        <div><b>হিসাবটি কাজে লাগলো?</b><small>জেএসআই সংশোধনী ও বকেয়ার নতুন আপডেট পেতে ফেসবুকে ফলো করুন</small></div>
      </div>
      <a class="fb-btn" href="${SITE_CONFIG.facebook.url}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
        ফেসবুকে ফলো করুন</a>
    </div>` : '';
  /** পিডিএফ ডাউনলোডের সময় একবারই পপআপ; "পরে" বা "ফলো" চাপলে আর দেখাবে না */
  function maybeFbPopup() {
    if (!SITE_CONFIG.facebook) return;
    try { if (localStorage.getItem(FB_SEEN)) return; localStorage.setItem(FB_SEEN, '1'); } catch (e) { return; }
    const pop = $('#fbPop');
    $('#fbPopGo').href = SITE_CONFIG.facebook.url;
    const close = () => { pop.classList.remove('show'); setTimeout(() => { pop.hidden = true; }, 250); };
    $('#fbPopX').onclick = close; $('#fbPopLater').onclick = close; $('#fbPopGo').onclick = close;
    pop.onclick = e => { if (e.target === pop) close(); };
    pop.hidden = false; requestAnimationFrame(() => pop.classList.add('show'));
  }
  /* ফেসবুকের যেকোনো ফলো বোতাম চাপলে মনে রাখা হয় — এআই চ্যাটে আর ফলো কার্ড আসবে না */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a');
    if (a && SITE_CONFIG.facebook && a.href === SITE_CONFIG.facebook.url) { try { localStorage.setItem('jsi2026_fb_followed', '1'); } catch (er) {} }
  });

  /* ---------------- হিসাবের ফলাফলের ভেতরে "ভাড়া হবে" কার্ড ----------------
     প্রতিবার হিসাবে ৬০% সম্ভাবনায় দেখায়; × চাপলে ৩ ঘণ্টা আর দেখাবে না। */
  const INL_AD_KEY = 'jsi2026_inlad_closed';
  function inlineAd() {
    if (!SITE_CONFIG.ad) return '';
    try { if (Date.now() - Number(localStorage.getItem(INL_AD_KEY) || 0) < 3 * 3600 * 1000) return ''; } catch (e) {}
    if (Math.random() > 0.6) return '';
    const A = SITE_CONFIG.ad;
    return `
    <div class="inl-ad">
      <button type="button" class="inl-ad-x" aria-label="বিজ্ঞাপন বন্ধ করুন">×</button>
      <a href="${A.url}" target="_blank" rel="noopener">
        <span class="inl-ad-tag">বিজ্ঞাপন</span>
        <div class="inl-ad-row">
          <img src="assets/img/varahobey-logo.png" alt="ভাড়া হবে লোগো" width="46" height="46" loading="lazy" />
          <div><b>${A.title}</b><small>${A.tagline}</small></div>
        </div>
        <span class="inl-ad-go">${A.cta || 'ওয়েবসাইট দেখুন'} →</span>
      </a>
    </div>`;
  }
  document.addEventListener('click', e => {
    const x = e.target.closest && e.target.closest('.inl-ad-x');
    if (!x) return;
    e.preventDefault();
    try { localStorage.setItem(INL_AD_KEY, String(Date.now())); } catch (er) {}
    document.querySelectorAll('.inl-ad').forEach(el => { el.classList.add('bye'); setTimeout(() => el.remove(), 260); });
  });

  /* ---------------- "ভাড়া হবে" পপআপ (মাঝে মাঝে) ----------------
     হিসাব বোতাম চাপার কয়েক সেকেন্ড পর, অথবা সাইটে কিছুক্ষণ থাকার পর।
     ৬ ঘণ্টায় সর্বোচ্চ একবার; অন্য কোনো শিট/পপআপ খোলা থাকলে দেখাবে না। */
  const AD_POP_KEY = 'jsi2026_adpop_at';
  const AD_POP_GAP = 6 * 3600 * 1000;
  function busyScreen() {
    return !!document.querySelector('.fb-pop-wrap:not([hidden]), .ai-sheet.show, .ai-sheet.open, #overlay.show') ||
      ['#pickSheet', '#shareSheet', '#aiSheet'].some(sel => { const el = $(sel); return el && !el.hidden && el.offsetParent !== null; });
  }
  function maybeAdPop() {
    if (!SITE_CONFIG.ad || document.hidden || busyScreen()) return;
    try {
      const last = Number(localStorage.getItem(AD_POP_KEY) || 0);
      if (Date.now() - last < AD_POP_GAP) return;
      localStorage.setItem(AD_POP_KEY, String(Date.now()));
    } catch (e) { return; }
    const pop = $('#adPop'); if (!pop) return;
    $('#adPopTitle').textContent = SITE_CONFIG.ad.title;
    $('#adPopTag').textContent = SITE_CONFIG.ad.tagline;
    $('#adPopGo').href = SITE_CONFIG.ad.url;
    $('#adPopGo').textContent = SITE_CONFIG.ad.cta || 'ওয়েবসাইট দেখুন';
    const close = () => { pop.classList.remove('show'); setTimeout(() => { pop.hidden = true; }, 250); };
    $('#adPopX').onclick = close; $('#adPopLater').onclick = close; $('#adPopGo').onclick = close;
    pop.onclick = e => { if (e.target === pop) close(); };
    pop.hidden = false; requestAnimationFrame(() => pop.classList.add('show'));
  }
  const adAfterCalc = () => setTimeout(maybeAdPop, 4000);
  setTimeout(maybeAdPop, 60000 + Math.floor(Math.random() * 45000));

  /** পিডিএফের জন্য QR কোড (SVG) */
  function fbQr() {
    if (!SITE_CONFIG.facebook || typeof qrcode === 'undefined') return '';
    try { const q = qrcode(0, 'M'); q.addData(SITE_CONFIG.facebook.url); q.make(); return `<img src="${q.createDataURL(4, 2)}" alt="QR" />`; }
    catch (e) { return ''; }
  }

  const rptFooter = () => `<div class="rf"><span>এটি একটি আনুমানিক হিসাব। চূড়ান্ত অঙ্ক পে-অফিস (iBAS++) কর্তৃক নির্ধারিত হবে।</span><span>ইঞ্জিনিয়ার: <b>${devNameHTML()}</b></span></div>${SITE_CONFIG.facebook ? `<div class="rfb avoid"><div>নতুন আপডেট পেতে ফেসবুকে ফলো করুন:<br><b>${SITE_CONFIG.facebook.display}</b></div>${fbQr() ? `<div class="rqr">${fbQr()}</div>` : ''}</div>` : ''}`;

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
          <div><small>২. ${i === 0 ? 'প্রণোদনা বাদ দিয়ে জুন ২০২৬-এর তুলনায় আপনার বেতন বৃদ্ধি পেয়েছে' : PERIODS[i - 1].label + '-এর তুলনায় আপনার বেতন বৃদ্ধি পেয়েছে'}</small><b>${signed(rise)}</b>${i === 0 ? tl.june.special.map(s => `<small>${s.label} ${tk(s.amt)} বাদ (${s.note})</small>`).join('') : ''}</div>
          <div><small>৩. ${i === 3 ? 'সব ভাতাসহ মোট বেতন (কর্তনের পর)' : 'পূর্বের ভাতাসহ এখন মোট বেতন পাবেন (কর্তনের পর)'}</small><b>${tk(p.net)}</b></div>
        </div>
        ${p.pct < 1 ? `<div class="formula">মূল বেতন = ${tk(inp.oldBasic)} + (${tk(tl.newBasic26)} − ${tk(inp.oldBasic)}) × ${bn(p.pct * 100)}% = ${tk(p.basic)}</div>` : ''}
        <table><tr><th>বিবরণ</th><th class="n">টাকা</th></tr>
          <tr><td>মূল বেতন</td><td class="n">${tk(p.basic)}</td></tr>${rows(p.allowances)}
          <tr class="sum"><td>মোট বেতন ও ভাতা</td><td class="n">${tk(p.gross)}</td></tr>
          <tr class="minus"><td>জিপিএফ</td><td class="n">− ${tk(p.ded.gpf)}</td></tr>
          ${p.ded.other ? `<tr class="minus"><td>অন্যান্য কর্তন</td><td class="n">− ${tk(p.ded.other)}</td></tr>` : ''}
          <tr class="sum"><td>সর্বমোট বেতন</td><td class="n">${tk(p.net)}</td></tr>
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
        ${tl.june.special.map(s => `<tr><td>${s.label} <span style="color:#777;font-size:11px">(${s.note}; ০১ জুলাই ২০২৬ থেকে বাদ)</span></td><td class="n">${tk(s.amt)}</td></tr>`).join('')}
        <tr class="sum"><td>মোট</td><td class="n">${tk(tl.june.gross)}</td></tr>
        <tr class="minus"><td>জিপিএফ ও অন্যান্য কর্তন</td><td class="n">− ${tk(tl.june.ded.total)}</td></tr>
        <tr class="sum"><td>সর্বমোট বেতন</td><td class="n">${tk(tl.june.net)}</td></tr>
      </table>
      <h2>২. ধাপে ধাপে বেতন (জুলাই ২০২৬ – জানুয়ারি ২০২৮)</h2>
      <table class="avoid"><tr><th>সময়কাল</th><th class="n">মূল বেতন</th><th class="n">মোট বেতন</th><th class="n">বৃদ্ধি</th><th class="n">সর্বমোট বেতন</th></tr>
        <tr><td>জুন ২০২৬</td><td class="n">${tk(inp.oldBasic)}</td><td class="n">${tk(tl.june.gross)}</td><td class="n">—</td><td class="n">${tk(tl.june.net)}</td></tr>
        ${tl.periods.map((p, i) => `<tr><td>${PERIODS[i].label}</td><td class="n">${tk(p.basic)}</td><td class="n">${tk(p.gross)}</td><td class="n">${signed(p.gross - p.prev.gross)}</td><td class="n">${tk(p.net)}</td></tr>`).join('')}
      </table>
      ${tl.periods.map(per).join('')}
      ${arrearsRpt(computeArrearsServing(tl, new Date(), S.firstNewPay || ''), 'serving')}
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
      <div class="avoid"><h3>প্রতি মাসে পেনশন (রেশন ভাতা ও মেডিকেল ভাতা সহ)</h3>
      <table>
        <tr><td>নিট পেনশন (পূর্ণ পেনশন ${tk(rt.gross)}-এর ${bn(100 - rt.cPct * 100)}%)</td><td class="n">${tk(rt.net)}</td></tr>
        <tr><td>মেডিকেল ভাতা (অবসরের সময় বয়স ${bn(rt.ageAtRetire)} বছর)</td><td class="n">${tk(rt.med)}</td></tr>
        <tr><td>রেশন ভাতা (${bn(inp.rationAdults)} প্রাপ্তবয়স্ক × ৳১,০০০ + ${bn(inp.rationChildren)} শিশু × ৳৫০০)</td><td class="n">${tk(rt.ration)}</td></tr>
        <tr class="sum"><td>প্রতি মাসে মোট পেনশন</td><td class="n">${tk(rt.monthlyInHand)}</td></tr>
      </table></div>
      <h3>অবসর পর্যন্ত মূল বেতন</h3>
      <table><tr><th>তারিখ</th><th>ঘটনা</th><th>পদবি</th><th class="n">মূল বেতন</th></tr>
        ${rt.events.map(e => `<tr><td>${bnDate(e.date)}</td><td>${esc(e.text)}</td><td>${esc(e.rank)}</td><td class="n">${tk(e.basic)}</td></tr>`).join('')}
      </table>
      <div class="avoid"><h3>পেনশনের হিসাব</h3>
      <div class="formula">পূর্ণ পেনশন = (শেষ মূল বেতন + ৬০৮) × চাকরির বছর ÷ ৩১, তবে (শেষ মূল বেতন + ৬০৮)-এর ৯০%-এর বেশি নয়<br>
        = (${tk(rt.pensionable)} + ৬০৮) × ${bn(rt.years)} ÷ ৩১ = ${tk(rt.formula, 2)} · সীমা ${tk(rt.cap, 2)} → <b>${tk(rt.gross)}</b></div>
      <table>
        <tr><td>পূর্ণ পেনশন</td><td class="n">${tk(rt.gross)}</td></tr>
        <tr class="minus"><td>অর্ধেক এককালীন নেওয়া হলো</td><td class="n">− ${tk(rt.commuted)}</td></tr>
        <tr class="sum"><td>প্রতি মাসে পেনশন</td><td class="n">${tk(rt.net)}</td></tr>
        <tr><td>এককালীন আনুতোষিক = ${tk(rt.commuted)} × ১২ × ${bn(rt.factor, 3)} (অবসরের পরের জন্মদিনে বয়স ${bn(rt.ageNext)})</td><td class="n">${tk(rt.lump)}</td></tr>
        <tr><td>ছুটি নগদায়ন (১৮ মাসের মূল বেতন)</td><td class="n">${tk(rt.leaveEncash)}</td></tr>
        <tr class="sum"><td>অবসরের সময় এককালীন মোট</td><td class="n">${tk(rt.lump + rt.leaveEncash)}</td></tr>
      </table></div>
      <div class="avoid"><h3>মাসিক ও বার্ষিক সুবিধা</h3>
      <table>
        <tr><td>মাসিক পেনশন</td><td class="n">${tk(rt.net)}</td></tr>
        <tr><td>চিকিৎসা ভাতা (বয়স ${bn(rt.ageAtRetire)})</td><td class="n">${tk(rt.med)}</td></tr>
        <tr><td>রেশন ভাতা (${bn(inp.rationAdults)} প্রাপ্তবয়স্ক, ${bn(inp.rationChildren)} শিশু)</td><td class="n">${tk(rt.ration)}</td></tr>
        <tr class="sum"><td>মাসিক মোট</td><td class="n">${tk(rt.monthlyInHand)}</td></tr>
        <tr><td>উৎসব ভাতা (বছরে ২টি)</td><td class="n">${tk(rt.festivalYearly)}</td></tr>
        <tr><td>বাংলা নববর্ষ ভাতা</td><td class="n">${tk(rt.noboborsho)}</td></tr>
        ${rt.growth.slice(1).map((g, i) => `<tr><td>${bn(i + 1)} বছর পর মাসিক পেনশন (৫% বৃদ্ধিতে)</td><td class="n">${tk(g.net)}</td></tr>`).join('')}
      </table></div>`;
  }

  function rptNotes(tl) {
    const R = tl.rank;
    return `<div class="avoid"><h3>অনুমান ও সতর্কতা</h3><ul class="note">
      ${R.oldNote ? `<li>${R.name} পদের পুরোনো স্কেলের প্রথম ধাপ নিশ্চিত না হওয়ায় ${tk(R.oldStart)} অনুমিত মান হিসেবে ধরা হয়েছে।</li>` : ''}
      <li>৩১ ডিসেম্বর ২০২৭ পর্যন্ত ভাতাগুলো ৩০ জুন ২০২৬-এর আহরিত অঙ্কে ধরা হয়েছে, যা মূল বেতন থেকে স্বয়ংক্রিয়ভাবে হিসাব করা।</li>
      <li>ফ্যামিলি কোয়ার্টারে বসবাস না করে সাধারণ হারে ("অন্যান্য স্থান") বাড়ি ভাড়া ধরা হয়েছে। কিট রক্ষণাবেক্ষণ, পাহাড়ি, হাওড়/দ্বীপ/চর ও তেজস্ক্রিয় ঝুঁকি ভাতা ধরা হয়নি।</li>
      <li>মাসিক কর্তন সর্বনিম্ন হারে (জিপিএফ মূল বেতনের ৫%) ধরা হয়েছে।</li>
      <li>প্রচলিত নিয়মে পূর্ণ পেনশনের অর্ধেক এককালীন (আনুতোষিক) ও অর্ধেক মাসিক পেনশন ধরা হয়েছে।</li>
      <li>উচ্চতর গ্রেড (৮ বছর পূর্তিতে), ব্যক্তিগত বেতন ও বিশেষ পরিস্থিতি এই হিসাবে ধরা হয়নি।</li>
      <li>চূড়ান্ত অঙ্ক সংশ্লিষ্ট পে-অফিস (iBAS++) কর্তৃক নির্ধারিত হবে।</li>
    </ul></div>`;
  }

  async function makePdf(type) {
    let inp, body;
    if (S.mode === 'RETIRED') {
      type = 'retired';
      const r = computeExistingPension(collectPen());
      if (!r.ok) { toast(r.errors[0]); go('input'); return; }
      if (typeof html2pdf === 'undefined') { toast('পিডিএফ লাইব্রেরি লোড হয়নি, একটু পরে আবার চেষ্টা করুন'); return; }
      inp = r.input;
      body = rptRetired(r) + rptFooter();
    } else {
      inp = collect();
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
      body = rptHeader(inp, title);
      if (type !== 'pension') body += rptSalary(tl);
      if (type === 'all') body += '<div class="pb"></div>';
      if (type !== 'salary') body += rptPension(rt, inp);
      body += rptNotes(tl) + rptFooter();
    }

    const stage = $('#pdf-stage');
    stage.innerHTML = `<div class="rpt">${body}</div>`;
    $('#overlay').classList.add('show');
    // পাতা নিচে স্ক্রল করা থাকলে html2canvas ফাঁকা পাতা তৈরি করে, তাই সাময়িকভাবে উপরে নেওয়া হয়
    const keepY = window.scrollY;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    try {
      await document.fonts.ready;
      const fname = `JSI-2026-${type === 'retired' ? 'Pensioner' : type === 'salary' ? 'Salary' : type === 'pension' ? 'Pension' : 'Full'}-Report${inp.name ? '-' + inp.name.replace(/[^\p{L}\p{N}]+/gu, '_') : ''}.pdf`;
      const prevScroll = window.scrollY;
      window.scrollTo(0, 0);
      await html2pdf().set({
        margin: [8, 0, 10, 0],
        filename: fname,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2, useCORS: true, backgroundColor: '#ffffff',
          // বড় স্ক্রিনেও (কম্পিউটার) রিপোর্ট যেন বাঁদিকে কেটে না যায়
          windowWidth: 794, width: 794, x: 0, y: 0, scrollX: 0, scrollY: 0,
          onclone: doc => {
            const st = doc.getElementById('pdf-stage');
            if (st) { st.style.position = 'absolute'; st.style.left = '0'; st.style.top = '0'; st.style.margin = '0'; st.style.transform = 'none'; }
            doc.documentElement.style.overflow = 'visible'; doc.body.style.overflow = 'visible';
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid', 'h2', 'h3', 'tr', '.kv', '.formula'] },
      }).from(stage.firstElementChild).save();
      window.scrollTo(0, prevScroll);
      toast('পিডিএফ ডাউনলোড হয়েছে');
      setTimeout(maybeFbPopup, 600);
    } catch (e) {
      console.error(e);
      toast('পিডিএফ তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      $('#overlay').classList.remove('show');
      stage.innerHTML = '';
      window.scrollTo({ top: keepY, left: 0, behavior: 'instant' });
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
