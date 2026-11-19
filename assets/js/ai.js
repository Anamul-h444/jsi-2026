/* =========================================================================
   এআই-কে প্রশ্ন করুন — প্রশ্ন যায় Vercel-এর প্রক্সিতে (api/ask.js),
   সেখান থেকে Google Gemini-তে। এপিআই কী শুধু Vercel-এ থাকে।
   ঠিকানা: data.js-এর SITE_CONFIG.ai.endpoint
   ========================================================================= */
(function () {
  'use strict';
  const CFG = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.ai) || {};
  const $ = (s, r = document) => r.querySelector(s);
  const HIST_KEY = 'jsi2026_ai_hist_v1';
  const QUOTA_KEY = 'jsi2026_ai_quota_v1';
  const DAILY = CFG.dailyLimit || 20;
  let history = [];
  let busy = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toBn = s => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

  try { history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]').slice(-20); } catch (e) { history = []; }
  const saveHist = () => { try { localStorage.setItem(HIST_KEY, JSON.stringify(history.slice(-20))); } catch (e) {} };

  function quota() {
    const today = new Date().toISOString().slice(0, 10);
    let q = { d: today, n: 0 };
    try { const s = JSON.parse(localStorage.getItem(QUOTA_KEY) || 'null'); if (s && s.d === today) q = s; } catch (e) {}
    return q;
  }
  const useQuota = () => { const q = quota(); q.n++; try { localStorage.setItem(QUOTA_KEY, JSON.stringify(q)); } catch (e) {} };

  /* খুব সহজ মার্কডাউন → HTML (বোল্ড, তালিকা, লাইন ব্রেক) */
  function md(t) {
    const lines = esc(t).split('\n');
    let html = '', inList = false;
    lines.forEach(l => {
      const b = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      const m = /^\s*(?:[-*•]|\d+[.)]|[০-৯]+[.)।])\s+(.*)$/.exec(b);
      if (m) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${m[1]}</li>`; return; }
      if (inList) { html += '</ul>'; inList = false; }
      if (/^#{1,4}\s/.test(b)) html += `<p class="ai-h">${b.replace(/^#+\s/, '')}</p>`;
      else if (b.trim()) html += `<p>${b}</p>`;
    });
    if (inList) html += '</ul>';
    return html;
  }

  /* ---------------- UI ---------------- */
  function build() {
    const fab = document.createElement('button');
    fab.className = 'ai-fab'; fab.id = 'aiFab'; fab.type = 'button';
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg><span>এআই-কে প্রশ্ন করুন</span>`;
    document.body.appendChild(fab);

    const sheet = document.createElement('div');
    sheet.className = 'ai-sheet'; sheet.id = 'aiSheet'; sheet.hidden = true;
    sheet.innerHTML = `
      <div class="ai-panel" role="dialog" aria-modal="true" aria-labelledby="aiTitle">
        <div class="ai-top">
          <span class="ai-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/></svg></span>
          <div class="ai-tt"><b id="aiTitle">এআই সহায়ক</b><small>জেএসআই ০১/২০২৬ অনুযায়ী বেতন ও পেনশনের প্রশ্ন</small></div>
          <button type="button" class="ai-clear" id="aiClear" title="কথোপকথন মুছুন" aria-label="কথোপকথন মুছুন"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
          <button type="button" class="ai-x" id="aiX" aria-label="বন্ধ করুন">×</button>
        </div>
        <div class="ai-body" id="aiBody"></div>
        <div class="ai-foot">
          <div class="ai-input">
            <textarea id="aiQ" rows="1" maxlength="600" placeholder="যেমন: উচ্চতর গ্রেড কবে পাব?"></textarea>
            <button type="button" id="aiSend" aria-label="পাঠান"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
          </div>
          <div class="ai-note">এআই ভুল করতে পারে। চূড়ান্ত তথ্যের জন্য পে-অফিসে নিশ্চিত হোন। নাম, বিএ নম্বর বা ব্যক্তিগত তথ্য লিখবেন না; প্রশ্ন ও আপনার হিসাবের সারাংশ (নাম ছাড়া) Google-এর সার্ভারে যায়।</div>
        </div>
      </div>`;
    document.body.appendChild(sheet);

    fab.addEventListener('click', open);
    $('#aiX').addEventListener('click', close);
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
    $('#aiClear').addEventListener('click', () => { history = []; saveHist(); render(); });
    $('#aiSend').addEventListener('click', send);
    const q = $('#aiQ');
    q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    q.addEventListener('input', () => { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 120) + 'px'; });
    render();
  }

  function open() {
    const s = $('#aiSheet'); s.hidden = false;
    requestAnimationFrame(() => s.classList.add('show'));
    document.body.classList.add('ai-open');
    setTimeout(() => { const b = $('#aiBody'); b.scrollTop = b.scrollHeight; }, 50);
  }
  function close() {
    const s = $('#aiSheet'); s.classList.remove('show');
    document.body.classList.remove('ai-open');
    setTimeout(() => { s.hidden = true; }, 250);
  }

  const SUGGEST = [
    'উচ্চতর গ্রেড কখন ও কীভাবে পাব?',
    'আমার বকেয়া কীভাবে হিসাব হয়?',
    'প্রণোদনা কেন বকেয়া থেকে কাটা যাবে?',
    'পেনশন কীভাবে হিসাব করা হয়?',
    'বাড়ি ভাড়া ভাতা কত শতাংশ পাব?',
    'এলপিআর-এ থাকলে কী নিয়ম?',
  ];

  function render() {
    const body = $('#aiBody');
    if (!history.length) {
      body.innerHTML = `
        <div class="ai-welcome">
          <b>আসসালামু আলাইকুম! 👋</b>
          <p>জেএসআই ০১/২০২৬ অনুযায়ী বেতন, ভাতা, বকেয়া, উচ্চতর গ্রেড বা পেনশন নিয়ে যেকোনো প্রশ্ন করুন। আপনি অ্যাপে হিসাব করে থাকলে আপনার নিজের হিসাব ধরে উত্তর দেব।</p>
          ${CFG.endpoint ? '' : '<p class="ai-off">এআই সহায়কটি শীঘ্রই চালু হবে।</p>'}
          <div class="ai-sugg">${SUGGEST.map(s => `<button type="button">${esc(s)}</button>`).join('')}</div>
        </div>`;
      body.querySelectorAll('.ai-sugg button').forEach(b => b.addEventListener('click', () => { $('#aiQ').value = b.textContent; send(); }));
    } else {
      body.innerHTML = history.map(m => m.role === 'user'
        ? `<div class="ai-msg me">${esc(m.text)}</div>`
        : `<div class="ai-msg bot${m.err ? ' err' : ''}">${md(m.text)}</div>`).join('') +
        (busy ? '<div class="ai-msg bot typing"><span></span><span></span><span></span></div>' : '');
    }
    body.scrollTop = body.scrollHeight;
  }

  /* ---------------- সার্ভার (Vercel প্রক্সি) ---------------- */
  async function ask(question, prior) {
    let summary = '';
    try { summary = typeof window.__jsiSummary === 'function' ? window.__jsiSummary() : ''; } catch (e) { summary = ''; }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: prior, summary }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.answer) throw { status: res.status };
      return j.answer;
    } catch (e) {
      clearTimeout(t);
      if (e && e.status) throw e;
      throw { status: e && e.name === 'AbortError' ? 'timeout' : 'network' };
    }
  }

  function errText(e) {
    const s = e && e.status;
    if (s === 429) return 'এই মুহূর্তে অনেকে একসাথে প্রশ্ন করছেন, তাই ফ্রি সীমা শেষ হয়ে গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    if (s === 'network') return 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। সংযোগ দেখে আবার চেষ্টা করুন।';
    if (s === 'timeout') return 'উত্তর আসতে অনেক দেরি হচ্ছে। একটু পরে আবার চেষ্টা করুন।';
    if (s === 400 || s === 403 || s === 503) return 'এআই সেবাটি এখন চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    return 'দুঃখিত, এখন উত্তর দেওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।';
  }

  async function send() {
    const box = $('#aiQ');
    const q = box.value.trim();
    if (!q || busy) return;
    if (!CFG.endpoint) {
      history.push({ role: 'user', text: q }, { role: 'model', text: 'এআই সহায়কটি শীঘ্রই চালু হবে। ততক্ষণ অ্যাপের "বেতন" ও "অবসর" অংশে আপনার পূর্ণ হিসাব দেখুন।', err: true });
      box.value = ''; render(); return;
    }
    if (quota().n >= DAILY) {
      history.push({ role: 'user', text: q }, { role: 'model', text: `আজকের ${toBn(DAILY)}টি প্রশ্নের সীমা শেষ। আগামীকাল আবার প্রশ্ন করতে পারবেন।`, err: true });
      box.value = ''; render(); return;
    }
    box.value = ''; box.style.height = 'auto';
    history.push({ role: 'user', text: q });
    busy = true; render();
    const prior = history.filter(m => !m.err).slice(0, -1).slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));
    try {
      const a = await ask(q, prior);
      useQuota();
      history.push({ role: 'model', text: a });
    } catch (e) {
      history.push({ role: 'model', text: errText(e), err: true });
    } finally {
      busy = false; saveHist(); render();
    }
  }

  if (CFG.enabled !== false) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  }
})();
