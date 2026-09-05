#!/usr/bin/env python3
"""梗档案馆构建脚本：合并分类数据 -> data/memes.json，并打印馆藏统计。

用法: python3 scripts/build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MEMES_DIR = DATA / "memes"

VALID_STATUS = {"active", "longevity", "revival", "fading", "fossil"}
STATUS_CN = {
    "active": "现役",
    "longevity": "长寿",
    "revival": "复活",
    "fading": "退烧",
    "fossil": "化石",
}

REQUIRED_FIELDS = {"id", "name", "year", "origin", "meaning", "status"}


def main():
    categories = json.loads((DATA / "categories.json").read_text("utf-8"))["categories"]
    cat_names = {c["id"]: c["name"] for c in categories}

    all_memes, errors = [], []
    per_cat, per_status, per_era = {}, {}, {}

    for path in sorted(MEMES_DIR.glob("*.json")):
        payload = json.loads(path.read_text("utf-8"))
        cat = payload["category"]
        if cat not in cat_names:
            errors.append(f"{path.name}: 未知分类 {cat}")
            continue
        count = 0
        seen = set()
        for m in payload["memes"]:
            missing = REQUIRED_FIELDS - m.keys()
            if missing:
                errors.append(f"{path.name}:{m.get('id')} 缺字段 {missing}")
            if m.get("status") not in VALID_STATUS:
                errors.append(f"{path.name}:{m.get('id')} 非法状态 {m.get('status')}")
            if m["id"] in seen:
                errors.append(f"{path.name}: 重复 id {m['id']}")
            seen.add(m["id"])
            m = {"category": cat, **m}
            all_memes.append(m)
            count += 1
            per_status[m["status"]] = per_status.get(m["status"], 0) + 1
            era = f"{(m['year'] // 5) * 5}s"  # 每5年一档
            per_era[era] = per_era.get(era, 0) + 1
        per_cat[cat] = count

    if errors:
        print("!! 校验失败:")
        for e in errors:
            print("  -", e)
        raise SystemExit(1)

    all_memes.sort(key=lambda m: (m["year"], m["category"], m["id"]))
    (DATA / "memes.json").write_text(
        json.dumps({"schema": "meme-archive/1.0", "generated": "2026-08-30",
                    "count": len(all_memes), "memes": all_memes}, ensure_ascii=False, indent=2),
        "utf-8")

    # 同步站点数据（site/index.html 通过 <script src="data.js"> 读取）
    site = ROOT / "site"
    site.mkdir(exist_ok=True)
    payload = {"generated": "2026-08-30", "categories": categories, "memes": all_memes}
    (site / "data.js").write_text(
        "// 由 scripts/build.py 生成，请勿手改\nwindow.MEME_DATA = "
        + json.dumps(payload, ensure_ascii=False) + ";\n", "utf-8")

    print(f"✓ 校验通过，共 {len(all_memes)} 件藏品 -> data/memes.json\n")
    print("按分类:")
    for c in categories:
        print(f"  {c['name']:<14} {per_cat.get(c['id'], 0):>4}")
    print("\n按生命周期:")
    for s in ["active", "longevity", "revival", "fading", "fossil"]:
        print(f"  {STATUS_CN[s]}({s}): {per_status.get(s, 0)}")
    print("\n按年代(5年一档):")
    for era in sorted(per_era):
        print(f"  {era}: {per_era[era]}")


if __name__ == "__main__":
    main()
