#!/usr/bin/env python3
"""为分类数据回填 added（入馆时间）字段。已有 added 的条目不覆盖。

批次：2026-08-30 建库首批 → 2026-08-31 三轮扩录 → 2026-09-05 查漏批。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEMES = ROOT / "data" / "memes"

B_0831 = {
    # 2026-08-31 第二批：B站年度弹幕/鬼畜/人物/游戏/小黑盒
    "xi-danmaku", "zhenshi-danmaku", "youya-danmaku", "jie-danmaku", "wanglang",
    "nianshi-zhiwang", "jiege-buyao", "lanlanlu", "fawai-kuangtu-zhangsan",
    "shougonggeng", "zhuyidan", "renleigaozhiliang", "liuxue", "laoliu", "xijiayi",
    "dengdangdang", "yunwanjia", "sidizi-suoxie", "ranbingluan", "dashouzhenhan",
    "huojiahuo", "huabanxie", "dianzi-zhacai", "yuanfu-nu", "heniang", "heyou",
    # 2026-08-31 第三批：梗指南第一轮
    "zhishu-weiya", "xiaozhen-zuotijia", "juewang-de-wenmang", "keji-yu-henhuo",
    "miandian-beibu", "nanfang-xiaotudou", "nongye-damodi", "wan-gengjie",
    "tideng-dingsun", "shanhe-daxue", "jiaoqi-wenxue", "gazi-tougou", "wanyanhuide",
    "foshan-dianhan", "wenhuijun", "ali-mu", "kexue-yeke", "jiakang-ge",
    "jiuzhuan-dachang", "wangbaoquan-waye", "kedaya-yayinhe", "oiia-mao", "jizhualiu",
    "wo-shi-yunnan-de", "shui-wen-nile", "wusuowoi-huishou", "xigou",
    "meishuo-jiushilingka", "shibushi-youbing", "shaweima", "henan-shengge",
    "konglong-kanglang", "liu-shuzi", "ji-le", "zhuyikan", "yimianban-hunningtu",
    "buluofen-xiaohongren", "wuhai-aimaonv", "trump-fight",
    # 2026-08-31 第四批：梗指南第二轮 + 谷子
    "wangxinlin-nanhai", "siguo-tegong", "guangzhi-jiuwo", "liugenghong-nanhai",
    "lian-dou-buyao-le", "dongfeng-kuaidi", "wanliu-shaoye", "bage-ruishijuan",
    "haquan-dayiyou", "chunwan-jiqiren", "gu-zi", "xiedi-shanghaidi", "wumengshan",
    "pingguoxiang", "nishidong-xx", "jianjiao-niugqu", "zhongguo-baobao-tizhi",
    "taihao-le-shixx", "huida-wo", "huaxizi-bi", "yuyu-zheng", "xuan-shatangju",
    "gtx690-hexianka", "nvsheng-ziyong", "yuyueda-yuyuexiao", "shandong-chepai",
    "weiyimin-xiaoying", "nanomachines-son", "my-dog-stepped-on-a-bee",
    "mariah-pension", "noot-noot", "mr-incredible-uncanny", "jet2-holiday",
    "baojuan-sangzi",
}
# 2026-09-05 第五批（查漏考据）
B_0905 = {"mingchao-gongshi", "tangniu-dengbushi"}

counts = {}
for path in sorted(MEMES.glob("*.json")):
    payload = json.loads(path.read_text("utf-8"))
    changed = False
    for m in payload["memes"]:
        if m.get("added"):
            continue
        if m["id"] in B_0905:
            m["added"] = "2026-09-05"
        elif m["id"] in B_0831:
            m["added"] = "2026-08-31"
        else:
            m["added"] = "2026-08-30"
        changed = True
        counts[m["added"]] = counts.get(m["added"], 0) + 1
    if changed:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf-8")

print("回填完成:", dict(sorted(counts.items())))
