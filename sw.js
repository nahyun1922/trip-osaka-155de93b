// 오프라인용: 처음 열 때 화면과 사진을 폰에 저장해 두고, 인터넷이 되면 항상 최신을 먼저 받는다.
const C = 'osaka-trip-v5';
const ASSETS = ["./", "index.html", "style.css", "app.js", "data.js", "img/arashiyama.jpg", "img/castle.jpg", "img/dotonbori.jpg", "img/fushimi.jpg", "img/hozenji.jpg", "img/kinkaku.jpg", "img/kix.jpg", "img/kiyomizu.jpg", "img/kuromon.jpg", "img/kushikatsu.jpg", "img/limousine.jpg", "img/map_d0.jpg", "img/map_d1.jpg", "img/map_d2.jpg", "img/map_d3.jpg", "img/namba.jpg", "img/narapark.jpg", "img/obp.jpg", "img/okonomiyaki.jpg", "img/shabu.jpg", "img/shinsaibashi.jpg", "img/shinsekai.jpg", "img/sukiyaki.jpg", "img/tempura.jpg", "img/todaiji.jpg", "img/tonkatsu.jpg", "img/tsutenkaku.jpg", "img/udon.jpg", "img/wagashi.jpg"];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true})));
});
