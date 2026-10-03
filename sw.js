/* ぽんぽんあそび service worker: オフライン対応。index.html 以外のプリキャッシュ対象を変えたら CACHE を上げる。 */
var CACHE = 'ponpon-v2';
var FONTS = 'ponpon-fonts-v1';
var PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'].concat([
  './assets/ani/buta.webp',
  './assets/ani/hiyoko.webp',
  './assets/ani/inu.webp',
  './assets/ani/kaeru.webp',
  './assets/ani/kuma.webp',
  './assets/ani/neko.webp',
  './assets/ani/pengin.webp',
  './assets/ani/raion.webp',
  './assets/ani/saru.webp',
  './assets/ani/usagi.webp',
  './assets/ani/ushi.webp',
  './assets/ani/zou.webp',
  './assets/ico/abc.webp',
  './assets/ico/aiueo.webp',
  './assets/ico/baa.webp',
  './assets/ico/clock.webp',
  './assets/ico/count.webp',
  './assets/ico/find.webp',
  './assets/ico/koro.webp',
  './assets/ico/num.webp',
  './assets/ico/nurie.webp',
  './assets/ico/paint.webp',
  './assets/ico/pg-asobu.webp',
  './assets/ico/pg-manabu.webp',
  './assets/ico/pg-ugokasu.webp',
  './assets/ico/phone.webp',
  './assets/ico/shape.webp',
  './assets/ico/shop.webp',
  './assets/ico/sky.webp',
  './assets/ico/sticker.webp',
  './assets/ico/touch.webp',
  './assets/ico/train.webp',
  './assets/ico/yubi.webp',
  './assets/ico/zoo.webp'
]);

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).catch(function () {}).then(function () { return self.clients.claim(); }));
});

function put(name, req, res) {
  try { var copy = res.clone(); caches.open(name).then(function (c) { return c.put(req, copy); }).catch(function () {}); } catch (err) {}
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) put(FONTS, req, res); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }).catch(function () { return fetch(req); }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  var isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (isPage) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) put(CACHE, './index.html', res);
      return res;
    }).catch(function () {
      return caches.match('./index.html').then(function (hit) { return hit || caches.match('./'); }).then(function (hit) { return hit || Response.error(); });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) { if (res && res.ok) put(CACHE, req, res); return res; });
  }));
});
