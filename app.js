// 화면 그리기. 일정 내용은 data.js 에 있습니다.
const {TITLE, UPDATED, SOURCE_VERSION, LODGING, FLIGHTS, PT, PTNAME, PTICON, DAYS, TRANSPORT, TODO, INFO, CREDITS, HAS_IMG, FOOD, SHOPLIST} = window.TRIP;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clean = s => esc(String(s || "").replace(/\s*【확인 필요】/g, ""));
const chk = s => /확인 필요/.test(s || "");
const gmap = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q + " 오사카");
const gdir = (from, to) => "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(from) + "&destination=" + encodeURIComponent(to) + "&travelmode=transit";
const gplace = f => f.cid ? `https://www.google.com/maps?cid=${f.cid}` : `https://www.google.com/maps/search/?api=1&query=${f.p[0]},${f.p[1]}`;
const IMG = k => `img/${k}.jpg`;
const short = d => d.date.slice(5).replace("-", "/") + "(" + d.dow + ")";
const hasInfo = k => k && INFO[k] && !INFO[k].missing;

const qs = new URLSearchParams(location.search);
const now = new Date();
const today = qs.get("d") || now.toLocaleDateString("sv-SE");
const nowMin = (() => { const t = qs.get("t") || now.toTimeString().slice(0, 5); const [h, m] = t.split(":").map(Number); return h * 60 + m; })();
const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

// ---------- 거리 ----------
function meters(a, b){
  const R = 6371000, r = x => x * Math.PI / 180;
  const dl = r(b[0] - a[0]), dn = r(b[1] - a[1]);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const distTxt = m => m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
const walkTxt = m => m <= 2500 ? `걸어서 약 ${Math.max(1, Math.round(m * 1.3 / 75))}분` : "교통편 이용";   // 직선거리×1.3, 분당 75m
const nearest = (p, n, maxM = Infinity) => FOOD.map(f => ({...f, dist: meters(p, f.p)})).filter(f => f.dist <= maxM).sort((a, b) => a.dist - b.dist).slice(0, n);

// 하루 방문지 번호 (숙소는 따로, 같은 곳 다시 가면 같은 번호)
// 일러스트/번호는 식사·방문지 위주로. 이동(move)은 숙소·공항교통(kix/ocat)만 남기고 뺀다
const AIRPORT_PT = new Set(["kix", "ocat"]);
const inRoute = it => it.pt && !(it.kind === "move" && it.pt !== "hotel" && !AIRPORT_PT.has(it.pt));
function numbering(d){
  const num = {}; let c = 0;
  d.items.forEach(it => { if (inRoute(it) && it.pt !== "hotel" && !(it.pt in num)) num[it.pt] = ++c; });
  return num;
}

// ---------- 일정 ----------
function nearRow(it){
  const k = it.near || it.pt, p = k ? PT[k] : null; if (!p) return "";
  const list = it.meal ? nearest(p, 8, 1500) : nearest(p, 4, 1000); if (!list.length) return "";
  return `<div class="near"><div class="k">🍴 근처 맛집${it.meal ? ` · ${k === "hotel" ? "숙소" : esc(PTNAME[k])} 기준 가까운 순` : ""}</div><div class="l">${list.map(f =>
    `<a class="nf" href="${gplace(f)}" target="_blank" rel="noopener"><b>${esc(f.n)}</b><span>${distTxt(f.dist)} · ${walkTxt(f.dist)}</span></a>`).join("")}</div></div>`;
}

function entry(it, cls, num){
  const n = it.pt === "hotel" ? '<div class="dot h">🏠</div>' : (it.pt && num[it.pt] ? `<div class="dot n">${num[it.pt]}</div>` : '<div class="dot"></div>');
  const tag = cls === "now" ? '<span class="nowtag">지금</span>' : '';
  const pt = it.pt ? ` data-pt="${it.pt}"` : "";
  let body, type;
  if (it.img && it.kind !== "move"){
    type = "big";
    const pills = `${it.status === "tbd" ? '<span class="pill t">미정</span>' : ''}${it.status === "ok" ? '<span class="pill o">확정</span>' : ''}${chk(it.n) ? '<span class="pill c">확인 필요</span>' : ''}`;
    const keys = [it.info, it.info2].filter(hasInfo).join(",");
    const story = keys ? `<button class="b-story" data-info="${keys}">📖 이야기 읽기</button>` : "";
    const story2 = "";
    const mp = it.map ? `<a class="b-map" href="${gmap(it.map)}" target="_blank" rel="noopener">📍 길찾기</a>` : "";
    body = `<div class="cardx"><div class="ph"${hasInfo(it.info) ? ` data-info="${it.info}"` : ""}><img src="${IMG(it.img)}" alt="" loading="lazy" style="object-position:${it.pos || "50% 50%"}">
      <div class="pl">${pills}</div>${it.eg ? `<span class="eg">${esc(it.eg)}</span>` : ""}</div>
      <div class="tx">${it.loc ? `<div class="loc">${esc(it.loc)}</div>` : ""}<div class="h">${it.meal ? "🍴 " : ""}${esc(it.b)}</div>
      ${it.n ? `<div class="n">${clean(it.n)}</div>` : ""}
      ${story || story2 || mp ? `<div class="acts">${story}${story2}${mp}</div>` : ""}
      ${nearRow(it)}</div></div>`;
  } else {
    type = it.kind === "move" ? "mv" : "cp";
    const chips = (it.status === "tbd" ? ' <span class="chip t">미정</span>' : '') + (chk(it.n) ? ' <span class="chip t">확인 필요</span>' : '');
    body = `<div class="row">${it.img ? `<img src="${IMG(it.img)}" alt="" loading="lazy">` : `<div class="ico">${it.ic || "•"}</div>`}
      <div><div class="h">${esc(it.b)}${chips}</div>${it.n ? `<div class="n">${clean(it.n)}</div>` : ""}</div>
      ${it.map ? `<a class="mini" href="${it.from && it.to ? gdir(it.from, it.to) : gmap(it.map)}" target="_blank" rel="noopener">${it.from && it.to ? "🧭 길찾기" : "지도"}</a>` : ""}</div>${it.meal ? nearRow(it) : ""}`;
  }
  return `<div class="entry ${type} ${cls}"${pt}>${n}<div class="tm">${esc(it.t)}${tag}</div>${body}</div>`;
}

// ---------- 코스 그림 ----------
const REGION = {"오사카": "#ffd6cf", "교토": "#ffe2b3", "나라": "#d4ebcb", "공항": "#d3e3f6"};
function courseMap(d){
  const seq = [];
  d.items.forEach(it => { if (inRoute(it) && (!seq.length || seq[seq.length - 1].p !== it.pt)) seq.push({p: it.pt, t: ((it.t || "").match(/\d{1,2}:\d{2}/) || [""])[0]}); });
  const num = numbering(d), X = [62, 180, 298], RH = 136, TOP = 92;
  const pos = seq.map((_, i) => { const r = Math.floor(i / 3), c = i % 3; return [X[r % 2 ? 2 - c : c], TOP + r * RH]; });
  const H = TOP + (Math.ceil(seq.length / 3) - 1) * RH + 104;
  let path = `M${pos[0][0]} ${pos[0][1]}`;
  for (let i = 1; i < pos.length; i++){
    const [x1, y1] = pos[i - 1], [x2, y2] = pos[i];
    if (y1 === y2) path += ` L${x2} ${y2}`;
    else { const dx = x1 > 180 ? 64 : -64; path += ` C${x1 + dx} ${y1} ${x2 + dx} ${y2} ${x2} ${y2}`; }
  }
  const regions = [...new Set(seq.map(s => (PTICON[s.p] || [])[2]).filter(Boolean))];
  const nodes = seq.map((s, i) => {
    const [x, y] = pos[i], [ic, nm, rg] = PTICON[s.p] || ["📍", PTNAME[s.p], "오사카"], n = num[s.p];
    const tag = i === 0 ? "출발" : i === seq.length - 1 ? "도착" : "";
    return `<g class="cn" data-goto="${s.p}" style="--d:${i * 70}ms">
      <circle cx="${x}" cy="${y + 3}" r="33" fill="rgba(90,60,30,.13)"/>
      <circle cx="${x}" cy="${y}" r="32" fill="${REGION[rg] || "#eee"}" stroke="#fff" stroke-width="4"/>
      <text x="${x}" y="${y + 2}" class="ce">${ic}</text>
      ${n ? `<circle cx="${x + 24}" cy="${y - 24}" r="12" fill="#c0392b" stroke="#fff" stroke-width="2.5"/><text x="${x + 24}" y="${y - 23.5}" class="cnum">${n}</text>` : ""}
      ${tag ? `<rect x="${x - 21}" y="${y - 54}" width="42" height="19" rx="9.5" fill="#283a5b"/><text x="${x}" y="${y - 44}" class="ctag">${tag}</text>` : ""}
      <text x="${x}" y="${y + 52}" class="cname">${esc(nm)}</text>
      <text x="${x}" y="${y + 68}" class="ctime">${esc(s.t)}</text></g>`;
  }).join("");
  const deco = `<g opacity=".9"><path d="M22 40c0-8 10-12 16-6 3-7 16-7 18 2 7-1 10 8 3 11H26c-6 0-8-4-4-7z" fill="#fff"/>
    <path d="M300 ${H - 30}c0-7 9-10 14-5 3-6 14-6 16 2 6-1 9 7 3 10h-29c-5 0-7-4-4-7z" fill="#fff"/></g>
    <g fill="none" stroke="#e7cfa3" stroke-width="1.6" opacity=".7"><path d="M250 30q6-6 12 0t12 0t12 0"/><path d="M40 ${H - 22}q6-6 12 0t12 0t12 0"/></g>`;
  const legend = regions.map((r, i) => `<g transform="translate(${360 - 14 - (regions.length - i) * 58},18)"><rect width="52" height="22" rx="11" fill="${REGION[r]}"/><text x="26" y="11.5" class="clg">${r}</text></g>`).join("");
  return `<svg class="course" viewBox="0 0 360 ${H}" role="img" aria-label="${d.label} 코스">
    <rect width="360" height="${H}" rx="0" fill="#fff8ec"/>${deco}${legend}
    <path d="${path}" fill="none" stroke="#f1dfbd" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${path}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="7 9" stroke-linecap="round"/>
    ${nodes}</svg>`;
}

function dayView(d, di){
  const isToday = d.date === today;
  let cur = -1;
  if (isToday) d.items.forEach((it, i) => { if (it.at && toMin(it.at) <= nowMin) cur = i; });
  const num = numbering(d);
  const tbd = d.items.filter(x => x.status === "tbd").length, ok = d.items.filter(x => x.status === "ok").length;
  return `<div class="mapbox">${courseMap(d)}
      <div class="mapcap"><div class="d">${d.label} · ${short(d)}${isToday ? ' · 오늘' : ''}</div><h2>${esc(d.title)}</h2>
      <div class="m">방문 ${Object.keys(num).length}곳 · 그림을 누르면 그 일정으로 이동해요</div></div></div>
    <div class="sum">${tbd ? `<span class="chip t">미정 ${tbd}건</span>` : ''}${ok ? `<span class="chip o">확정 ${ok}건</span>` : ''}</div>
    ${d.warn ? `<div class="alert"><span>⚠️</span><span>${esc(d.warn)}</span></div>` : ""}
    <div class="sectitle">하루 일정 <span class="jp">${d.kanji}日目</span></div>
    <div class="rail">${d.items.map((it, i) => { let c = ""; if (isToday && cur >= 0){ if (i < cur) c = "past"; if (i === cur) c = "now"; } return entry(it, c, num); }).join("")}</div>`;
}

// ---------- 이야기 창 ----------
function infoBlock(k, first){
  const x = INFO[k], img = HAS_IMG.includes(k);
  const top = first
    ? `<div class="sh-ph ${img ? "" : "none wave"}" ${img ? `style="background-image:url(${IMG(k)})"` : ""}><div class="grab"></div><button class="x" data-close>✕</button></div>`
    : `<div class="sh-next">${img ? `<img src="${IMG(k)}" alt="" loading="lazy">` : ""}</div>`;
  return `${top}<div class="sh-bd${first ? "" : " sh-2"}">
      <div class="jp">${esc(x.local)}</div><h2>${esc(x.name)}</h2>
      ${x.lead ? `<p class="lead">${esc(x.lead)}</p>` : ""}
      ${x.facts && x.facts.length ? `<div class="facts">${x.facts.map(f => `<div class="fact"><div class="k">${esc(f[0])}</div><div class="v">${esc(f[1])}</div></div>`).join("")}</div>` : ""}
      ${x.menu ? `<h3>${esc(x.menu.title)}</h3><div class="menu">${x.menu.items.map(m => `<div class="mi"><div><b>${esc(m[0])}</b><span>${esc(m[1])}</span></div><em>${esc(m[2])}</em></div>`).join("")}</div>${x.menu.note ? `<div class="tip">${esc(x.menu.note)}</div>` : ""}` : ""}
      ${x.story && x.story.length ? `<h3>${x.menu ? "음식 이야기" : "이야기"}</h3><div class="story">${x.story.map(p => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
      ${x.look && x.look.length ? `<h3>놓치지 말 것</h3><ul class="look">${x.look.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      ${x.tips && x.tips.length ? `<h3>알아두면 좋아요</h3>${x.tips.map(p => `<div class="tip">${esc(p)}</div>`).join("")}` : ""}
      <div class="srcs">출처 · ${(x.src || []).map(s => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(" · ")}</div>
    </div>`;
}
function openInfo(keys){
  const ks = keys.split(",").filter(hasInfo); if (!ks.length) return;
  $("#sheetin").innerHTML = ks.map((k, i) => infoBlock(k, i === 0)).join("") + '<div class="wave" style="margin:10px 0 30px"></div>';
  $("#sheetin").scrollTop = 0;
  $("#veil").classList.add("on"); $("#sheet").classList.add("on"); document.body.style.overflow = "hidden";
  history.pushState({sheet: 1}, "");
}
function closeInfo(fromPop){
  if (!$("#sheet").classList.contains("on")) return;
  $("#veil").classList.remove("on"); $("#sheet").classList.remove("on"); document.body.style.overflow = "";
  if (!fromPop) history.back();
}
addEventListener("popstate", () => closeInfo(true));
addEventListener("keydown", e => { if (e.key === "Escape") closeInfo(); });
(() => { let y0 = null; const s = $("#sheet");   // 아래로 끌어내려 닫기
  s.addEventListener("touchstart", e => { y0 = $("#sheetin").scrollTop <= 0 ? e.touches[0].clientY : null; }, {passive: true});
  s.addEventListener("touchmove", e => { if (y0 === null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) s.style.transform = `translateY(${dy}px)`; }, {passive: true});
  s.addEventListener("touchend", e => { if (y0 === null) return; const dy = e.changedTouches[0].clientY - y0; s.style.transform = ""; if (dy > 120) closeInfo(); y0 = null; });
})();

// ---------- 먹거리 ----------
// 기준: 내 위치 / 숙소 / 그날 방문지
let base = "hotel", myPos = null, showN = 8, geoMsg = "";
function bases(){
  const d = DAYS[day], seen = new Set(["hotel"]), out = [];
  d.items.forEach(it => { if (it.pt && !seen.has(it.pt) && !["kix"].includes(it.pt)){ seen.add(it.pt); out.push(it.pt); } });
  return out;
}
function finder(){
  const p = base === "me" ? myPos : PT[base];
  const list = p ? nearest(p, showN) : [];
  const total = FOOD.length;
  return `<div class="finder">
    <div class="bases">
      <button class="base me ${base === "me" ? "on" : ""}" data-base="me">📍 내 위치</button>
      <button class="base ${base === "hotel" ? "on" : ""}" data-base="hotel">🏠 숙소</button>
      ${bases().map(k => `<button class="base ${base === k ? "on" : ""}" data-base="${k}">${esc(PTNAME[k])}</button>`).join("")}
    </div>
    ${geoMsg ? `<div class="fmsg">${esc(geoMsg)}</div>` : ""}
    ${p ? list.map((f, i) => `<a class="fr" href="${gplace(f)}" target="_blank" rel="noopener"><div class="no">${i + 1}</div>
        <div><div class="nm">${esc(f.n)}</div><div class="mm">${f.m ? esc(f.m) + " · " : ""}구글 지도에서 열기 ›</div></div>
        <div class="ds"><b>${distTxt(f.dist)}</b>${walkTxt(f.dist)}</div></a>`).join("") : ""}
    ${p && showN < total ? `<button class="more" data-more>더 보기 (${total}곳 중 ${Math.min(showN, total)}곳)</button>` : ""}
    <div class="fmsg">수령님 구글 지도 「맛집」 목록의 간사이 지역 ${total}곳 · 거리는 직선거리 기준이라 실제 걷는 시간은 조금 더 걸릴 수 있어요</div>
  </div>`;
}
function locate(){
  if (!navigator.geolocation){ geoMsg = "이 폰에서는 위치 기능을 쓸 수 없어요."; render(); return; }
  geoMsg = "현재 위치를 찾는 중…"; base = "me"; render();
  navigator.geolocation.getCurrentPosition(
    p => { myPos = [p.coords.latitude, p.coords.longitude]; geoMsg = ""; const f = nearest(myPos, 1)[0];
           if (f && f.dist > 30000) geoMsg = "지금 위치에서 30km 안에 저장한 맛집이 없어요. 여행지에 도착하면 다시 눌러 보세요."; render(); },
    e => { geoMsg = e.code === 1 ? "위치 권한이 꺼져 있어요. 폰 설정에서 브라우저 위치 권한을 허용해 주세요." : "위치를 찾지 못했어요. 잠시 뒤 다시 눌러 보세요."; base = "hotel"; render(); },
    {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
}

function mealCard(it){
  const pills = `${it.status === "tbd" ? '<span class="pill t">미정</span>' : ''}${it.status === "ok" ? '<span class="pill o">확정</span>' : ''}`;
  return `<div class="mcard">
    ${it.img ? `<div class="ph"${hasInfo(it.info) ? ` data-info="${it.info}"` : ""}><img src="${IMG(it.img)}" alt="" loading="lazy"><div class="pl">${pills}</div>${it.eg ? `<span class="eg">${esc(it.eg)}</span>` : ""}</div>` : ""}
    <div class="tx"><div class="k">${esc(it.meal)} · ${esc(it.t)}</div><div class="h">${esc(it.b)}</div>
    ${it.n ? `<div class="n">${clean(it.n)}</div>` : ""}${it.img ? "" : `<div style="margin-top:6px">${pills}</div>`}${nearRow(it)}</div></div>`;
}
function mealView(){
  const d = DAYS[day];
  return `<div class="sectitle">끼니 계획 <span class="jp">食</span></div>` +
    DAYS.map(d => {
      const meals = d.items.filter(x => x.meal === "점심" || x.meal === "저녁");
      const snacks = d.items.filter(x => x.meal === "간식");
      return `<div class="sectitle" style="font-size:16px;margin-top:22px">${d.label} · ${short(d)}</div>
        <div class="mlist two">${meals.map(mealCard).join("")}</div>
        <div class="snacks">${snacks.length ? snacks.map(it => `<div class="snack"><span class="si">🍡</span><span class="st">간식 · ${esc(it.t)}</span><b>${esc(it.b)}</b>${it.n ? `<span class="sn">${clean(it.n)}</span>` : ""}</div>`).join("")
          : `<div class="snack empty"><span class="si">🍡</span><span class="st">간식</span><span class="sn">아직 계획 없음</span></div>`}</div>`;
    }).join("") + `
    <div class="sectitle" style="margin-top:34px">가까운 맛집 <span class="jp">近所</span></div>
    <div class="small" style="margin:-4px 18px 10px">기준을 고르면 가까운 순으로 보여 줘요. 누르면 구글 지도가 열려요. (방문지 칸은 ${d.label} 기준 · 일정 탭에서 날짜를 바꾸면 따라 바뀜)</div>
    ${finder()}`;
}

// ---------- 쇼핑 ----------
const SHOP_FLAT = SHOPLIST.flatMap(cat => cat.items.map(it => ({...it, cat: cat.cat})));
function shopTile(p, i){
  return `<div class="stile" data-shop="${i}">
    <div class="ph">${p.img ? `<img src="${IMG(p.img)}" alt="" loading="lazy">` : `<div class="noimg">${p.ic || "🛍️"}</div>`}</div>
    <div class="tx"><b>${esc(p.n)}</b><div class="n">${clean(p.d)}</div></div></div>`;
}
function shopView(){
  let i = -1;
  return `<div class="sectitle">쇼핑 리스트 <span class="jp">買物</span></div>
    <div class="small" style="margin:-4px 18px 10px">SNS에서 모은 쇼핑템을 매장별로 정리했어요. 눌러보면 가격·추천 이유를 볼 수 있어요.</div>` +
    SHOPLIST.map(cat => `<div class="sectitle" style="font-size:16px;margin-top:22px">${cat.ic} ${esc(cat.cat)}</div>
      ${cat.note ? `<div class="small" style="margin:-4px 18px 8px">${clean(cat.note)}</div>` : ""}
      <div class="sgrid">${cat.items.map(p => shopTile(p, ++i)).join("")}</div>`).join("");
}
function shopBlock(p){
  return `<div class="sh-ph prod ${p.img ? "" : "none wave"}" ${p.img ? `style="background-image:url(${IMG(p.img)})"` : ""}><div class="grab"></div><button class="x" data-close>✕</button></div>
    <div class="sh-bd">
      ${p.jp ? `<div class="jp">${esc(p.jp)}</div>` : ""}<h2>${esc(p.n)}</h2>
      <div class="facts"><div class="fact"><div class="k">매장</div><div class="v">${esc(p.cat)}</div></div>${p.price ? `<div class="fact"><div class="k">가격</div><div class="v">${esc(p.price)}</div></div>` : ""}</div>
      <h3>왜 좋아요</h3><div class="story"><p>${clean(p.why)}</p></div>
    </div>`;
}
function openShop(i){
  const p = SHOP_FLAT[+i]; if (!p) return;
  $("#sheetin").innerHTML = shopBlock(p) + '<div class="wave" style="margin:10px 0 30px"></div>';
  $("#sheetin").scrollTop = 0;
  $("#veil").classList.add("on"); $("#sheet").classList.add("on"); document.body.style.overflow = "hidden";
  history.pushState({sheet: 1}, "");
}

// ---------- 교통 / 정보 ----------
function transView(){
  const leg = (k, a) => `<div class="leg"><div><div class="k">${k} · ${esc(a[1])}</div><div class="big">${a[0]}</div></div>
      <div class="mid">${esc(a[4])}</div><div style="text-align:right"><div class="k">${esc(a[3])}</div><div class="big">${a[2]}</div></div></div>`;
  return `<div class="sectitle">항공편 <span class="jp">航空</span></div>` +
    FLIGHTS.map(f => `<div class="pass"><div class="hd"><span>${f.who}</span><span>${f.n}</span></div>${leg("가는편 11/15", f.out)}${leg("오는편 11/18", f.back)}</div>`).join("");
}
function infoView(){
  return `<div class="sectitle">숙소 <span class="jp">宿</span></div>
    <div class="box"><div class="small">${esc(LODGING.name)}</div><div style="font-family:var(--serif);font-size:20px;font-weight:700">${esc(LODGING.addr)}</div>
      <div style="margin-top:8px;padding:10px 12px;background:var(--paper);border-radius:12px;font-family:var(--mincho);font-size:17px">${esc(LODGING.jp)}</div>
      <div class="small" style="margin-top:4px">택시 기사님께 위 일본어 주소를 보여 주세요</div>
      <div style="color:var(--sub);font-size:14px;margin-top:8px">${esc(LODGING.note)}</div>
      <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${PT.hotel[0]},${PT.hotel[1]}" target="_blank" rel="noopener">📍 숙소 지도 열기</a></div>
    <div class="sectitle">장소 이야기 모음 <span class="jp">物語</span></div>
    <div class="box" style="display:flex;flex-wrap:wrap;gap:8px">${Object.keys(INFO).filter(hasInfo).map(k => `<button class="stop" data-info="${k}" style="padding:5px 12px">${esc(INFO[k].name)}</button>`).join("")}</div>
    <div class="sectitle">아직 정할 것 <span class="jp">未定</span></div><div class="box"><ul>${TODO.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <div class="sectitle">이 화면 <span class="jp">記</span></div>
    <div class="box"><div>마지막 수정 <b>${UPDATED}</b></div><div class="small">${esc(SOURCE_VERSION)}</div>
      <div class="small" style="margin-top:10px">사진·장소 이야기: 위키백과·위키미디어 공용. 코스 지도: © OpenStreetMap 기여자.</div>
      <div class="small" style="margin-top:4px;line-height:1.9">${CREDITS.map(c => `<a href="${c[1]}" target="_blank" rel="noopener">${esc(c[0])}</a>`).join(" · ")}</div></div>`;
}

// ---------- 화면 ----------
const NAV = [["plan", "🗓️", "일정"], ["meal", "🍜", "먹거리"], ["shop", "🛍️", "쇼핑"], ["trans", "🚆", "교통"], ["info", "📖", "정보"]];
let view = "plan", day = Math.max(0, DAYS.findIndex(d => d.date === today));
const q = qs.get("tab"); if (q){ if (/^d\d$/.test(q)) day = +q[1]; else view = q; }

function render(){
  const head = `<div class="top"><div class="brand"><div class="jp">大阪・京都・奈良</div><h1>${esc(TITLE)}</h1><div class="small">2026.11.15 ~ 11.18 · 3박 4일</div></div></div>`;
  let h;
  if (view === "plan") h = head + `<div class="daybar">${DAYS.map((d, i) => `<button data-day="${i}" class="${i === day ? "on" : ""} ${d.date === today ? "today" : ""}"><b>${d.label}</b><small>${short(d)}</small></button>`).join("")}</div>` + dayView(DAYS[day], day);
  else h = head + `<div class="wave" style="margin:6px 0 0"></div>` + ({meal: mealView, shop: shopView, trans: transView, info: infoView})[view]();
  $("#app").innerHTML = h + `<footer>마지막 수정 ${UPDATED}<div class="wave" style="margin-top:14px"></div></footer>`;
  $("#bot").innerHTML = NAV.map(n => `<button data-view="${n[0]}" class="${n[0] === view ? "on" : ""}"><span>${n[1]}</span>${n[2]}</button>`).join("");
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), {rootMargin: "0px 0px -40px"});
  document.querySelectorAll(".entry").forEach(el => io.observe(el));
  const n = document.querySelector(".entry.now"); if (n && !qs.get("noscroll")) setTimeout(() => n.scrollIntoView({block: "center"}), 300);
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-info],[data-shop],[data-day],[data-view],[data-goto],[data-close],[data-base],[data-more]"); if (!t) return;
  if (t.dataset.info) return openInfo(t.dataset.info);
  if (t.dataset.shop !== undefined) return openShop(t.dataset.shop);
  if (t.dataset.close !== undefined) return closeInfo();
  if (t.dataset.day){ day = +t.dataset.day; render(); scrollTo(0, 0); }
  if (t.dataset.view){ view = t.dataset.view; showN = 8; render(); scrollTo(0, 0); }
  if (t.dataset.base){ showN = 8; if (t.dataset.base === "me") return locate(); base = t.dataset.base; geoMsg = ""; render(); }
  if (t.dataset.more !== undefined){ showN += 10; render(); }
  if (t.dataset.goto){ const el = document.querySelector(`.entry[data-pt="${t.dataset.goto}"]`); if (el){ el.classList.add("in"); el.scrollIntoView({behavior: "smooth", block: "center"}); } }
});
$("#veil").addEventListener("click", () => closeInfo());
// 맨 위로
const topBtn = $("#totop");
addEventListener("scroll", () => topBtn.classList.toggle("on", scrollY > 500), {passive: true});
topBtn.addEventListener("click", () => scrollTo({top: 0, behavior: "smooth"}));
render();
if (qs.get("info")) openInfo(qs.get("info"));
try { navigator.serviceWorker && navigator.serviceWorker.register("sw.js"); } catch (e){}
