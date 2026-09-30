"""구글 지도 「맛집」 공유 목록을 읽어 data.js 의 FOOD(근처 맛집)를 새로 채운다.

GitHub Actions(.github/workflows/food.yml)가 3시간마다 실행하고, 바뀐 게 있을 때만 올린다.
직접 돌릴 때: python update_food.py
"""
import datetime, json, os, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LIST_ID = "lnqWv4qpRAGZiM0-rA45RA"      # 수령님 구글 지도 「맛집」 목록
URL = ("https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=ko&gl=kr"
       f"&pb=!1m4!1s{LIST_ID}!2e1!3m1!1e1!2e2!3e2!4i500!16b1")
BOX = (34.3, 35.2, 135.1, 136.0)        # 간사이(오사카·교토·나라) 밖은 뺀다
SKIP = ["신사", "神社", "호젠지", "DAISO", "다이소", "LIFE ", "chōme", "丁目"]   # 맛집 아닌 것


def fetch():
    raw = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read().decode("utf-8")
    d = json.loads(raw[raw.index("\n") + 1:] if raw.startswith(")]}'") else raw)
    out = []
    for it in d[0][8]:
        p = it[1] or []
        ll = p[5] if len(p) > 5 else None
        if not ll:
            continue
        lat, lng, name = ll[2], ll[3], it[2] or ""
        if not (BOX[0] < lat < BOX[1] and BOX[2] < lng < BOX[3]):
            continue
        if any(w in name for w in SKIP) and "요코초" not in name:
            continue
        fid = p[6] if len(p) > 6 else None
        out.append({"n": name, "m": (it[3] or "").strip(), "p": [round(lat, 6), round(lng, 6)],
                    "cid": str(int(fid[1]) % (1 << 64)) if fid else None})
    return out


def main():
    path = os.path.join(HERE, "data.js")
    s = open(path, encoding="utf-8").read()
    head, body = s[: s.index("{")], s[s.index("{"): s.rindex("}") + 1]
    data = json.loads(body)
    food = fetch()
    if len(food) < 5:                     # 받아오기가 잘못됐으면 기존 것을 지킨다
        raise SystemExit(f"맛집이 {len(food)}곳뿐이라 반영하지 않음")
    if food == data.get("FOOD"):
        print("변경 없음", len(food))
        return
    data["FOOD"] = food
    data["UPDATED"] = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime("%Y-%m-%d")
    open(path, "w", encoding="utf-8").write(head + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    print("갱신", len(food))


if __name__ == "__main__":
    main()
