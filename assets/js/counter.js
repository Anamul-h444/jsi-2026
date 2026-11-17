/* =========================================================================
   ভিজিটর কাউন্টার (ফ্রি, সার্ভার ছাড়া) — api.counterapi.dev
   একই ব্রাউজার থেকে প্রথমবার এলেই কেবল সংখ্যা বাড়ে (ইউনিক ভিজিটর)।
   কোনো কারণে সার্ভিস কাজ না করলে কাউন্টারটি লুকানো থাকবে, সাইটের কিছু আটকাবে না।
   ========================================================================= */
(function () {
  'use strict';
  var NS = 'anamul-h444-jsi-2026';
  var KEY = 'visitors';
  var SEEN = 'jsi2026_seen_v1';
  var base = 'https://api.counterapi.dev/v1/' + NS + '/' + KEY;

  var seen = false;
  try { seen = localStorage.getItem(SEEN) === '1'; } catch (e) {}
  var url = seen ? base + '/' : base + '/up';

  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);

  fetch(url, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      clearTimeout(timer);
      var n = Number(d && d.count);
      if (!isFinite(n) || n <= 0) return;
      if (!seen) { try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
      var el = document.getElementById('visitNum');
      var box = document.getElementById('visitCount');
      if (!el || !box) return;
      el.textContent = typeof bn === 'function' ? bn(n) : n.toLocaleString('bn-BD');
      box.hidden = false;
    })
    .catch(function () { clearTimeout(timer); });
})();
