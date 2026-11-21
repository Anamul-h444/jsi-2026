/* সার্ভিস ওয়ার্কার — অ্যাপ হিসেবে ইনস্টল ও ইন্টারনেট ছাড়া চালানোর জন্য
   নিয়ম: আগে নেটওয়ার্ক থেকে নতুন ফাইল আনে (যাতে আপডেট সাথে সাথে আসে),
   ইন্টারনেট না থাকলে আগে সংরক্ষিত ফাইল দেখায়। */
const CACHE = 'jsi2026-v3';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/js/data.js',
  './assets/js/calc.js',
  './assets/js/app.js',
  './assets/vendor/html2pdf.bundle.min.js',
  './assets/vendor/qrcode-generator.min.js',
  './assets/icon.svg',
  './assets/img/icon-192.png',
  './assets/img/developer-full.jpg',
  './assets/img/varahobey-logo.png',
  './assets/img/niyontrok-crest.svg',
  './assets/img/og-image-v2.jpg',
  './assets/js/counter.js',
  './assets/js/ai.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        // ?v=... ছাড়া একই ফাইল হিসেবে রাখা, যাতে অফলাইনেও পাওয়া যায়
        const key = new URL(req.url); key.search = '';
        caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : key.href, copy));
      }
      return res;
    }).catch(() => {
      const key = new URL(req.url); key.search = '';
      return caches.match(req.mode === 'navigate' ? './index.html' : key.href, { ignoreSearch: true })
        .then(r => r || caches.match('./index.html'));
    })
  );
});
