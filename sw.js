// 오프라인용: 처음 열 때 화면과 사진을 폰에 저장해 두고, 인터넷이 되면 항상 최신을 먼저 받는다.
const C = 'osaka-trip-v15';
const ASSETS = ["./", "index.html", "style.css", "app.js", "data.js", "img/arashiyama.jpg", "img/castle.jpg", "img/dotonbori.jpg", "img/fushimi.jpg", "img/hozenji.jpg", "img/kinkaku.jpg", "img/kix.jpg", "img/kiyomizu.jpg", "img/kuromon.jpg", "img/kushikatsu.jpg", "img/limousine.jpg", "img/namba.jpg", "img/narapark.jpg", "img/obp.jpg", "img/okonomiyaki.jpg", "img/shabu.jpg", "img/shinsaibashi.jpg", "img/shinsekai.jpg", "img/sun.jpg", "img/sukiyaki.jpg", "img/tempura.jpg", "img/todaiji.jpg", "img/tonkatsu.jpg", "img/tsutenkaku.jpg", "img/udon.jpg", "img/wagashi.jpg", "img/shopping/DaFpkOGtBpq.jpg", "img/shopping/DdoKEoFSl-V.jpg", "img/shopping/DczdSFJTJb8.jpg", "img/shopping/DcqN0l2Tr97.jpg", "img/shopping/DdQ1QWFowBB.jpg", "img/shopping/Da4hEBrTkF5.jpg", "img/shopping/DcxENCySqXW.jpg", "img/shopping/DdB9Q5MOkQc.jpg", "img/shopping/DdGqhuJuwjv.jpg", "img/shopping/DdBkmZUtuGX.jpg", "img/shopping/DNN0MN9zUdQ.jpg", "img/shopping/DJya3MazVyX.jpg", "img/shopping/DMXh_G_Jx68.jpg", "img/shopping/DK9TZ6wv6kg.jpg"];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true})));
});
