/* =========================================================================
   ফুটার: মোট ভিজিটর ও শেষ আপডেট
   ভিজিটর: প্রথমে api.counterapi.dev (একই ব্রাউজার একবারই গোনা হয়);
   সেটা কাজ না করলে hits.sh-এর ছবি-কাউন্টার দেখানো হয়।
   শেষ আপডেট: ডিপ্লয়ের সময় GitHub Actions __UPDATED__ বদলে আসল সময় বসায়।
   ========================================================================= */
(function () {
  'use strict';
  var BN = '০১২৩৪৫৬৭৮৯';
  var toBn = function (s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); };
  var fmt = function (n) { return typeof bn === 'function' ? bn(n) : toBn(n.toLocaleString('en-IN')); };

  /* ---------- শেষ আপডেট ---------- */
  (function () {
    var box = document.getElementById('lastUpdated');
    if (!box) return;
    var raw = box.getAttribute('data-updated');
    var d = new Date(raw);
    if (!raw || raw.indexOf('__') === 0 || isNaN(d)) return; // লোকাল কপিতে লুকানো থাকবে
    var M = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    // বাংলাদেশ সময় (UTC+৬)
    var bd = new Date(d.getTime() + 6 * 3600 * 1000);
    var h = bd.getUTCHours(), m = bd.getUTCMinutes();
    var part = h < 5 ? 'রাত' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
    var h12 = h % 12 || 12;
    document.getElementById('lastUpdatedText').textContent =
      toBn(bd.getUTCDate()) + ' ' + M[bd.getUTCMonth()] + ' ' + toBn(bd.getUTCFullYear()) +
      ', ' + part + ' ' + toBn(h12) + ':' + toBn(String(m).padStart(2, '0'));
    box.hidden = false;
  })();

  /* ---------- মোট ভিজিটর ---------- */
  var NS = 'anamul-h444-jsi-2026', KEY = 'visitors', SEEN = 'jsi2026_seen_v1';
  var numEl = document.getElementById('visitNum');
  if (!numEl) return;

  function badgeFallback() {
    // ছবি-কাউন্টার: কোনো স্ক্রিপ্ট/CORS লাগে না
    var img = new Image();
    img.alt = 'ভিজিটর সংখ্যা';
    img.className = 'visit-badge';
    img.src = 'https://hits.sh/anamul-h444.github.io/jsi-2026.svg?view=total&style=flat-square&label=%20&color=1c2a25&labelColor=1c2a25';
    img.onload = function () { numEl.textContent = ''; numEl.appendChild(img); };
    img.onerror = function () { numEl.textContent = '—'; };
  }

  var seen = false;
  try { seen = localStorage.getItem(SEEN) === '1'; } catch (e) {}
  var base = 'https://api.counterapi.dev/v1/' + NS + '/' + KEY;
  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);

  fetch(seen ? base + '/' : base + '/up', { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      clearTimeout(timer);
      var n = Number(d && d.count);
      if (!isFinite(n) || n <= 0) throw new Error('bad');
      if (!seen) { try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
      numEl.textContent = fmt(n);
    })
    .catch(function () { clearTimeout(timer); badgeFallback(); });
})();
