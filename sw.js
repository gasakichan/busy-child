/* ぽんぽんあそび service worker: オフライン対応。index.html 以外のプリキャッシュ対象を変えたら CACHE を上げる。 */
var CACHE = 'ponpon-v14';
var FONTS = 'ponpon-fonts-v1';
/* へんしん カメラ（assets/face/ 約 13MB）は PRECACHE に いれない: あそんだ とき（または せっていの ボタン）に ふべつの キャッシュへ。
   なまえを あげるときは ponpon-face-v2 のように（ふるい ponpon-face-* は activate で けす） */
var FACECACHE = 'ponpon-face-v1';
var FACE_FILES = ['./assets/face/vision.js', './assets/face/vision_wasm_internal.js', './assets/face/vision_wasm_internal.wasm', './assets/face/face_landmarker.task'];
var PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'].concat([
  './assets/aiueo/mame.webp',
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
  './assets/ico/drive.webp',
  './assets/ico/piano.webp',
  './assets/ico/pinball.webp',
  './assets/ico/voice.webp',
  './assets/ico/nami.webp',
  './assets/ico/mix.webp',
  './assets/ico/suna.webp',
  './assets/ico/kiru.webp',
  './assets/ico/kaeru.webp',
  './assets/ico/dokoka.webp',
  './assets/dokoka/tokei.webp',
  './assets/dokoka/ringo.webp',
  './assets/dokoka/banana.webp',
  './assets/dokoka/kutsu.webp',
  './assets/dokoka/boushi.webp',
  './assets/dokoka/koppu.webp',
  './assets/dokoka/haburashi.webp',
  './assets/dokoka/kuruma.webp',
  './assets/dokoka/boru.webp',
  './assets/dokoka/onigiri.webp',
  './assets/dokoka/kasa.webp',
  './assets/dokoka/pan.webp',
  './assets/dokoka/ichigo.webp',
  './assets/dokoka/kuma.webp',
  './assets/dokoka/shutter0.webp',
  './assets/dokoka/shutter1.webp',
  './assets/dokoka/shutter2.webp',
  './assets/dokoka/shutter3.webp',
  './assets/dokoka/shutter4.webp',
  './assets/dokoka/shutter5.webp',
  './assets/kaeru/frog-sit.webp',
  './assets/kaeru/frog-jump.webp',
  './assets/kaeru/pad1.webp',
  './assets/kaeru/pad2.webp',
  './assets/kaeru/lotus.webp',
  './assets/kiru/banana.webp',
  './assets/kiru/knife.webp',
  './assets/kiru/kyuri.webp',
  './assets/kiru/ninjin.webp',
  './assets/kiru/plate.webp',
  './assets/kiru/pot.webp',
  './assets/kiru/roll.webp',
  './assets/kiru/sausage.webp',
  './assets/kiru/sec-banana.webp',
  './assets/kiru/sec-kyuri.webp',
  './assets/kiru/sec-ninjin.webp',
  './assets/kiru/sec-roll.webp',
  './assets/kiru/sec-sausage.webp',
  './assets/ico/num.webp',
  './assets/ico/nurie.webp',
  './assets/ico/paint.webp',
  './assets/ico/phone.webp',
  './assets/ico/shape.webp',
  './assets/ico/shop.webp',
  './assets/ico/sky.webp',
  './assets/ico/sticker.webp',
  './assets/ico/touch.webp',
  './assets/ico/train.webp',
  './assets/ico/yubi.webp',
  './assets/ico/zoo.webp',
  './assets/mix/doro.webp',
  './assets/mix/fusen.webp',
  './assets/mix/hana.webp',
  './assets/mix/hi.webp',
  './assets/mix/kaze.webp',
  './assets/mix/ki.webp',
  './assets/mix/kikyu.webp',
  './assets/mix/koori.webp',
  './assets/mix/me.webp',
  './assets/mix/mizu.webp',
  './assets/mix/mizutamari.webp',
  './assets/mix/nami.webp',
  './assets/mix/ohisama.webp',
  './assets/mix/osara.webp',
  './assets/mix/popcorn.webp',
  './assets/mix/suna.webp',
  './assets/mix/tane.webp',
  './assets/mix/tanpopo.webp',
  './assets/mix/tsuchi.webp',
  './assets/mix/umi.webp',
  './assets/mix/yama.webp',
  './assets/mix/yuge.webp',
  './assets/mix/yuki.webp',
  './assets/mix/yukidaruma.webp',
  './assets/mix/yukinohana.webp',
  './assets/mix/yukiusagi.webp',
  './assets/mix/yukiyama.webp',
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

/* インストール: ひとつずつ よみこむ（とちゅうで きれても、おなじ CACHE なら つぎは のこりだけ）。
   1 つでも よめなければ インストールを しっぱいさせる。こうすると ふるい SW と ふるい キャッシュが そのまま のこり、
   オフラインの たんまつで 「あたらしい からっぽの キャッシュに きりかわって ふるいのを けす」ことが おきない。 */
function fill(c, list) {
  var i = 0, miss = [];
  function one(u, n) {
    var timer;
    var to = new Promise(function (_, ng) { timer = setTimeout(function () { ng(new Error('timeout')); }, 30000); });
    /* なかみを さきに ぜんぶ よんでから put する（とちゅうで きれた レスポンスで キャッシュが つまらないように） */
    return Promise.race([to, fetch(new Request(u, { cache: 'reload' })).then(function (res) {
      if (!res || !res.ok) throw new Error('status ' + (res && res.status));
      return res.arrayBuffer().then(function (buf) { return { res: res, buf: buf }; });
    })]).then(function (o) {
      clearTimeout(timer);
      var h = new Headers(o.res.headers);
      return c.put(u, new Response(o.buf, { status: o.res.status, statusText: o.res.statusText, headers: h }));
    }, function (err) { clearTimeout(timer); throw err; }).catch(function (err) { if (n > 0) return one(u, n - 1); miss.push(u); });
  }
  return missing(c, list).then(function (todo) {
    function worker() {
      if (i >= todo.length) return Promise.resolve();
      return one(todo[i++], 2).then(worker);
    }
    var ws = []; for (var k = 0; k < 6; k++) ws.push(worker());
    return Promise.all(ws).then(function () { return miss; });
  });
}
function missing(c, list) {
  return c.keys().then(function (ks) {
    var have = {}; ks.forEach(function (r) { have[r.url] = 1; });
    return (list || PRECACHE).filter(function (u) { return !have[new URL(u, self.location.href).href]; });
  });
}
function status() {
  return caches.open(CACHE).then(function (c) { return missing(c); }).then(function (m) { return { have: PRECACHE.length - m.length, total: PRECACHE.length, version: CACHE }; });
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return fill(c, PRECACHE); }).then(function (miss) {
    if (miss.length) throw new Error('precache: ' + miss.length + ' missing');
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  /* ふるい キャッシュは あたらしい のが そろっている ときだけ けす */
  e.waitUntil(caches.open(CACHE).then(function (c) { return missing(c); }).then(function (m) {
    if (m.length) return;
    return caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== FONTS && k !== FACECACHE; }).map(function (k) { return caches.delete(k); }));
    });
  }).catch(function () {}).then(function () { return self.clients.claim(); }));
});

/* へんしん カメラ: face = そろっているか / face-fetch = たりない ものを ダウンロード（なかみを ぜんぶ よんでから put） */
function faceStatus() {
  return caches.open(FACECACHE).then(function (c) { return missing(c, FACE_FILES); }).then(function (m) { return { have: FACE_FILES.length - m.length, total: FACE_FILES.length, version: FACECACHE }; });
}
function faceFetch() {
  return caches.open(FACECACHE).then(function (c) {
    return missing(c, FACE_FILES).then(function (todo) {
      var i = 0;
      function next() {
        if (i >= todo.length) return Promise.resolve();
        var u = todo[i++];
        return fetch(new Request(u, { cache: 'reload' })).then(function (res) {
          if (!res || !res.ok) return;
          return res.arrayBuffer().then(function (buf) { return c.put(u, new Response(buf, { status: 200, headers: new Headers(res.headers) })); });
        }).catch(function () {}).then(next);
      }
      return next();
    });
  }).catch(function () {}).then(faceStatus);
}

/* ページから: status = そろっているか / heal = たりない ものを よみなおす（オンラインの とき） */
self.addEventListener('message', function (e) {
  var d = e.data || {}, port = e.ports && e.ports[0];
  if (d.type !== 'status' && d.type !== 'heal' && d.type !== 'face' && d.type !== 'face-fetch') return;
  var job = d.type === 'face' ? faceStatus() : d.type === 'face-fetch' ? faceFetch() : d.type === 'heal' ? caches.open(CACHE).then(function (c) { return fill(c, PRECACHE); }).catch(function () {}).then(status) : status();
  e.waitUntil(job.then(function (st) { if (port) port.postMessage(st); }, function () { if (port) port.postMessage(null); }));
});

function put(name, req, res) {
  try { var copy = res.clone(); caches.open(name).then(function (c) { return c.put(req, copy); }).catch(function () {}); } catch (err) {}
}
function fromCache(req) {
  /* ?つき・Vary の ちがいでも みつかるように（Safari は Vary で とりこぼすことがある） */
  return caches.match(req).then(function (hit) { return hit || caches.match(req, { ignoreSearch: true, ignoreVary: true }); });
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

  /* assets/face/: ふべつの キャッシュ（cache-first・200 だけ ためる） */
  if (url.pathname.indexOf('/assets/face/') >= 0) {
    e.respondWith(caches.open(FACECACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.ok && res.status === 200) { try { var cp = res.clone(); c.put(req, cp).catch(function () {}); } catch (err) {} }
          return res;
        });
      });
    }).catch(function () { return fetch(req); }));
    return;
  }

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

  e.respondWith(fromCache(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) { if (res && res.ok) put(CACHE, req, res); return res; });
  }));
});
