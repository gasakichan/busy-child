/* ぽんぽんあそび service worker: オフライン対応。index.html 以外のプリキャッシュ対象を変えたら CACHE を上げる。 */
var CACHE = 'ponpon-v5';
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
  './assets/ico/neko.webp',
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
  './assets/ico/zoo.webp',
  './assets/stk/bus.webp',
  './assets/stk/car.webp',
  './assets/stk/chou.webp',
  './assets/stk/densha.webp',
  './assets/stk/fusen.webp',
  './assets/stk/hana.webp',
  './assets/stk/heart.webp',
  './assets/stk/hikoushi.webp',
  './assets/stk/hoshi.webp',
  './assets/stk/inu.webp',
  './assets/stk/iruka.webp',
  './assets/stk/kaigara.webp',
  './assets/stk/kani.webp',
  './assets/stk/ki.webp',
  './assets/stk/kinoko.webp',
  './assets/stk/kitsune.webp',
  './assets/stk/kujira.webp',
  './assets/stk/kuma.webp',
  './assets/stk/mise.webp',
  './assets/stk/nagare.webp',
  './assets/stk/nettaigyo.webp',
  './assets/stk/niji.webp',
  './assets/stk/patocar.webp',
  './assets/stk/risu.webp',
  './assets/stk/rocket.webp',
  './assets/stk/sakana.webp',
  './assets/stk/shingou.webp',
  './assets/stk/shoubou.webp',
  './assets/stk/tako.webp',
  './assets/stk/tentou.webp',
  './assets/stk/tsuki.webp',
  './assets/stk/uchuujin.webp',
  './assets/stk/ufo.webp',
  './assets/stk/usagi.webp',
  './assets/stk/wakusei.webp',
  './assets/stk/yotto.webp',
  './assets/neko/ball.webp',
  './assets/neko/basket.webp',
  './assets/neko/bear.webp',
  './assets/neko/bench.webp',
  './assets/neko/box.webp',
  './assets/neko/bucket.webp',
  './assets/neko/bush.webp',
  './assets/neko/cat_jump.webp',
  './assets/neko/cat_peek.webp',
  './assets/neko/cat_side.webp',
  './assets/neko/cat_sit.webp',
  './assets/neko/cat_sleep.webp',
  './assets/neko/cat_tail.webp',
  './assets/neko/cat_walk.webp',
  './assets/neko/flowers.webp',
  './assets/neko/mushroom.webp',
  './assets/neko/plant.webp',
  './assets/neko/rock.webp',
  './assets/neko/slide.webp',
  './assets/neko/sofa.webp',
  './assets/neko/table.webp',
  './assets/neko/toybox.webp',
  './assets/neko/tree.webp',
  './assets/mny/m1.webp',
  './assets/mny/m5.webp',
  './assets/mny/m10.webp',
  './assets/mny/m50.webp',
  './assets/mny/m100.webp',
  './assets/mny/m500.webp',
  './assets/mny/m1000.webp'
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
