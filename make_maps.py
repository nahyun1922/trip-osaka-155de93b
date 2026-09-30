"""일차별 코스 지도 이미지 만들기.

data.js(일정 원본)를 읽어 img/map_d0.jpg ~ map_d3.jpg 를 새로 그린다.
일정·장소가 바뀌면 data.js 를 고친 뒤 이 파일만 다시 실행하면 된다.
    python make_maps.py
지도 바탕은 OpenStreetMap 타일. 받은 타일은 _tiles/ 에 모아 두고 다시 받지 않는다.
"""
import json, math, os, io, time, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
TILE_DIR = os.path.join(HERE, "_tiles")
UA = "osaka-trip-map/1.0 (personal travel itinerary)"
W, H = 1080, 1000          # 결과 이미지 크기 (폰에서 2~3배 선명하게)
PAD = 110                  # 가장자리 여백
SHU, AI, PAPER = (192, 57, 43), (40, 58, 91), (245, 239, 228)
FB = "C:/Windows/Fonts/malgunbd.ttf"
F = lambda s: ImageFont.truetype(FB, s)


def load_data():
    s = open(os.path.join(HERE, "data.js"), encoding="utf-8").read()
    return json.loads(s[s.index("{"): s.rindex("}") + 1])


def world(lat, lng, z):
    n = 256 * 2 ** z
    x = (lng + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def tile(z, x, y):
    p = os.path.join(TILE_DIR, str(z), str(x), f"{y}.png")
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        req = urllib.request.Request(f"https://tile.openstreetmap.org/{z}/{x}/{y}.png", headers={"User-Agent": UA})
        open(p, "wb").write(urllib.request.urlopen(req, timeout=30).read())
        time.sleep(0.15)
    return Image.open(p).convert("RGB")


def base_map(cx, cy, z, w, h):
    """세계좌표 중심(cx,cy)에서 w×h 크기 바탕지도. 종이 느낌으로 색을 바랜다."""
    x0, y0 = cx - w / 2, cy - h / 2
    img = Image.new("RGB", (w, h), PAPER)
    for tx in range(int(x0 // 256), int((x0 + w) // 256) + 1):
        for ty in range(int(y0 // 256), int((y0 + h) // 256) + 1):
            img.paste(tile(z, tx, ty), (int(tx * 256 - x0), int(ty * 256 - y0)))
    img = ImageEnhance.Color(img).enhance(0.45)
    img = Image.blend(img, Image.new("RGB", img.size, PAPER), 0.28)
    return img, x0, y0


def fit_zoom(pts, w, h, pad, zmax):
    for z in range(zmax, 3, -1):
        xs, ys = zip(*[world(a, b, z) for a, b in pts])
        if max(xs) - min(xs) <= w - 2 * pad and max(ys) - min(ys) <= h - 2 * pad:
            return z
    return 4


def dashed(d, pts, color, width, dash=18, gap=12):
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        L = math.hypot(x2 - x1, y2 - y1)
        if L == 0:
            continue
        t = 0
        while t < L:
            e = min(t + dash, L)
            d.line([(x1 + (x2 - x1) * t / L, y1 + (y2 - y1) * t / L), (x1 + (x2 - x1) * e / L, y1 + (y2 - y1) * e / L)], fill=color, width=width)
            t += dash + gap


def pin(img, x, y, text, color, r=26):
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([x - r, y - r + 5, x + r, y + r + 5], fill=(0, 0, 0, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)))
    d = ImageDraw.Draw(img)
    d.ellipse([x - r - 4, y - r - 4, x + r + 4, y + r + 4], fill="white")
    d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    f = F(26 if len(text) <= 2 else 20)
    d.text((x, y + 1), text, font=f, fill="white", anchor="mm")


def label(img, x, y, text, boxes, size=26):
    """핀 옆 이름표. 다른 이름표·가장자리와 겹치지 않는 자리를 고른다."""
    d = ImageDraw.Draw(img)
    f = F(size)
    tw = d.textlength(text, font=f)
    th = size + 14
    cands = [(x + 36, y - th / 2), (x - 36 - tw - 24, y - th / 2), (x - (tw + 24) / 2, y - 40 - th), (x - (tw + 24) / 2, y + 40)]
    for bx, by in cands + [cands[0]]:
        box = (bx, by, bx + tw + 24, by + th)
        inside = box[0] > 6 and box[1] > 6 and box[2] < img.width - 6 and box[3] < img.height - 6
        if inside and not any(not (box[2] < b[0] or box[0] > b[2] or box[3] < b[1] or box[1] > b[3]) for b in boxes):
            break
    boxes.append(box)
    d.rounded_rectangle(box, radius=th / 2, fill=(255, 253, 248), outline=(224, 213, 193), width=2)
    d.text((box[0] + 12, box[1] + th / 2), text, font=f, fill=(31, 26, 23), anchor="lm")


def render(day, data, out):
    PT, PTN, FAR = data["PT"], data["PTNAME"], data["FAR"]
    seq = []
    for it in day["items"]:
        p = it.get("pt")
        if p and (not seq or seq[-1] != p):
            seq.append(p)
    num, c = {}, 0
    for p in seq:
        if p != "hotel" and p not in num:
            c += 1
            num[p] = c
    uniq = list(dict.fromkeys(seq))
    near = [p for p in uniq if p not in FAR]
    far = [p for p in uniq if p in FAR]

    z = fit_zoom([PT[p] for p in near], W, H - 90, PAD, 15)
    xs, ys = zip(*[world(*PT[p], z) for p in near])
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2 + 30
    bg, x0, y0 = base_map(cx, cy, z, W, H)
    img = bg.convert("RGBA")
    P = lambda p: (world(*PT[p], z)[0] - x0, world(*PT[p], z)[1] - y0)

    # 가까이 붙은 핀 묶기
    groups = []
    for p in near:
        for g in groups:
            if any(math.dist(P(p), P(q)) < 58 for q in g):
                g.append(p)
                break
        else:
            groups.append([p])

    d = ImageDraw.Draw(img)
    line = [P(p) for p in seq]
    d.line(line, fill=(255, 255, 255), width=14, joint="curve")
    dashed(d, line, SHU, 7)

    boxes, insets = [], []
    for g in groups:
        gx = sum(P(p)[0] for p in g) / len(g)
        gy = sum(P(p)[1] for p in g) / len(g)
        ns = sorted(num[p] for p in g if p in num)
        home = "hotel" in g
        if len(g) == 1:
            txt = "숙" if home else str(ns[0])
        else:
            txt = (f"{ns[0]}-{ns[-1]}" if len(ns) > 1 else str(ns[0])) if ns else "숙"
        pin(img, gx, gy, txt, AI if (home and not ns) else SHU, r=26 if len(txt) <= 2 else 32)
        boxes.append((gx - 34, gy - 34, gx + 34, gy + 34))
        if len(g) > 1:
            insets.append(g)

    # 먼 곳(공항) 안내
    d = ImageDraw.Draw(img)
    if far:
        fx, fy = world(*PT[far[0]], z)
        ang = math.degrees(math.atan2(-(fy - cy), fx - cx))
        dirs = ["동", "북동", "북", "북서", "서", "남서", "남", "남동"]
        dname = dirs[int(((ang + 22.5) % 360) // 45)]
        (a1, b1), (a2, b2) = PT[far[0]], PT[near[0]]
        km = round(6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(a2 - a1) / 2) ** 2 + math.cos(math.radians(a1)) * math.cos(math.radians(a2)) * math.sin(math.radians(b2 - b1) / 2) ** 2)))
        t = f"{PTN[far[0]]}은 지도 밖 {dname}쪽으로 직선 약 {km}km"
        boxes.append((24, H - 74, 24 + d.textlength(t, font=F(24)) + 28, H - 24))
        d.rounded_rectangle([24, H - 74, 24 + d.textlength(t, font=F(24)) + 28, H - 24], radius=25, fill=AI)
        d.text((38, H - 49), t, font=F(24), fill="white", anchor="lm")
    # 확대 창 (묶인 곳)
    FH = 420 + 56
    corners = [(24, 24), (W - 24 - 432, 24), (24, H - 24 - FH), (W - 24 - 432, H - 24 - FH)]
    used, places = [], []
    for g in insets[:2]:
        gx = sum(P(p)[0] for p in g) / len(g)
        gy = sum(P(p)[1] for p in g) / len(g)
        best = min((cn for cn in corners if cn not in used),
                   key=lambda cn: (sum(1 for b in boxes if not (b[2] < cn[0] - 8 or b[0] > cn[0] + 440 or b[3] < cn[1] - 8 or b[1] > cn[1] + FH + 8)) + sum(3 for q in line if cn[0] < q[0] < cn[0] + 432 and cn[1] < q[1] < cn[1] + FH), math.dist((cn[0] + 210, cn[1] + 240), (gx, gy))))
        boxes.append((best[0], best[1], best[0] + 432, best[1] + FH))
        used.append(best)
        places.append((g, best))
    for g in groups:
        gx = sum(P(p)[0] for p in g) / len(g)
        gy = sum(P(p)[1] for p in g) / len(g)
        names = [PTN[p] for p in sorted(g, key=lambda p: num.get(p, 0)) if p != "hotel"]
        if "hotel" in g:
            names.append("숙소")
        txt = names[0] if len(names) == 1 else f"{names[0]} 외 {len(names) - 1}곳"
        label(img, gx, gy, txt, boxes)
    for g, best in places:
        IW = 420
        zi = fit_zoom([PT[p] for p in g], IW, IW - 50, 70, 17)
        ixs, iys = zip(*[world(*PT[p], zi) for p in g])
        icx, icy = (max(ixs) + min(ixs)) / 2, (max(iys) + min(iys)) / 2 + 18
        ib, ix0, iy0 = base_map(icx, icy, zi, IW, IW)
        ii = ib.convert("RGBA")
        IP = lambda p: (world(*PT[p], zi)[0] - ix0, world(*PT[p], zi)[1] - iy0)
        idr = ImageDraw.Draw(ii)
        iseq = [p for p in seq if p in g]
        il = [IP(p) for p in iseq]
        if len(il) > 1:
            idr.line(il, fill=(255, 255, 255), width=10)
            dashed(idr, il, SHU, 5, 12, 9)
        ib2 = []
        for p in g:
            x, y = IP(p)
            pin(ii, x, y, "숙" if p == "hotel" else str(num[p]), AI if p == "hotel" else SHU, r=19)
            ib2.append((x - 24, y - 24, x + 24, y + 24))
        for p in g:
            x, y = IP(p)
            label(ii, x, y, "숙소" if p == "hotel" else PTN[p], ib2, size=19)
        # 액자
        frame = Image.new("RGBA", (IW + 12, IW + 12 + 44), (0, 0, 0, 0))
        fd = ImageDraw.Draw(frame)
        fd.rounded_rectangle([0, 0, IW + 11, IW + 55], radius=22, fill=(255, 253, 248), outline=(224, 213, 193), width=2)
        mask = Image.new("L", (IW, IW), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, IW - 1, IW - 1], radius=16, fill=255)
        frame.paste(ii, (6, 50), mask)
        ns = sorted(num[p] for p in g if p in num)
        title = "확대 · " + "·".join(map(str, ns)) + ("번" if ns else "") + (" + 숙소" if "hotel" in g else "")
        fd.text((20, 26), title, font=F(22), fill=SHU, anchor="lm")
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([best[0] + 4, best[1] + 8, best[0] + IW + 16, best[1] + IW + 64], radius=22, fill=(0, 0, 0, 70))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
        img.alpha_composite(frame, best)

    at = "© OpenStreetMap contributors"
    d.text((W - 16, H - 14), at, font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 17), fill=(90, 80, 70), anchor="rs")
    img.convert("RGB").save(out, "JPEG", quality=84, optimize=True, progressive=True)
    print("저장", out, "zoom", z, "묶음", [g for g in groups if len(g) > 1])


if __name__ == "__main__":
    data = load_data()
    for i, day in enumerate(data["DAYS"]):
        render(day, data, os.path.join(HERE, "img", f"map_d{i}.jpg"))
