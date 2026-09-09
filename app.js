/* 梗档案馆 · 交互层 */
(() => {
  "use strict";

  const { categories, memes, generated } = window.MEME_DATA;
  const catById = new Map(categories.map(c => [c.id, c]));
  const memeById = new Map(memes.map(m => [m.id, m]));

  const STATUS = {
    active:    { label: "现役",  color: "#3d7a4f" },
    longevity: { label: "长寿",  color: "#2f6f8f" },
    revival:   { label: "复活",  color: "#a2701f" },
    fading:    { label: "退烧",  color: "#8c5a76" },
    fossil:    { label: "化石",  color: "#7a7462" },
  };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const noOf = m => "No." + String(memes.indexOf(m) + 1).padStart(4, "0");
  const catDot = m => { const c = catById.get(m.category); return c ? c.color : "#999"; };

  const storedFavorites = (() => { try { return JSON.parse(localStorage.getItem("meme-archive:favorites") || "[]"); } catch (_) { return []; } })();
  const state = { q: "", cat: null, status: null, view: "gallery", sort: "year-desc", favoritesOnly: false, favorites: new Set(storedFavorites) };

  const countByCat = {};
  const countByStatus = {};
  memes.forEach(m => {
    countByCat[m.category] = (countByCat[m.category] || 0) + 1;
    countByStatus[m.status] = (countByStatus[m.status] || 0) + 1;
  });

  /* ---------- 顶部与门口 ---------- */
  const years = memes.map(m => m.year);
  $("#totalCount").textContent = memes.length;
  $("#statCount").textContent = memes.length;
  $("#statCats").textContent = categories.length;
  $("#statYears").textContent = `${Math.min(...years)} — ${Math.max(...years)}`;
  $("#footerMeta").textContent = `馆藏 ${memes.length} 件 · 数据更新 ${generated}`;

  /* ---------- 筛选条 ---------- */
  function renderChips() {
    $("#categoryChips").innerHTML =
      chipHtml({ id: "", name: "全部", color: "transparent", count: memes.length }, "cat") +
      categories.map(c => chipHtml({ ...c, count: countByCat[c.id] || 0 }, "cat")).join("");
    $("#statusChips").innerHTML =
      Object.entries(STATUS).map(([id, s]) =>
        `<button class="chip ${state.status === id ? "on" : ""}" data-status="${id}">
           <i class="dot" style="background:${s.color}"></i>${s.label}<span class="n">${countByStatus[id] || 0}</span>
         </button>`).join("");
  }
  function chipHtml(c, key) {
    const on = state[key] === c.id || (key === "cat" && !state.cat && !c.id);
    return `<button class="chip ${on ? "on" : ""}" data-${key}="${c.id}">
              ${c.color && c.color !== "transparent" ? `<i class="dot" style="background:${c.color}"></i>` : ""}${esc(c.name)}<span class="n">${c.count}</span>
            </button>`;
  }

  function currentList() {
    const q = state.q.trim().toLowerCase();
    const filtered = memes.filter(m => {
      if (state.favoritesOnly && !state.favorites.has(m.id)) return false;
      if (state.cat && m.category !== state.cat) return false;
      if (state.status && m.status !== state.status) return false;
      if (!q) return true;
      const hay = [m.name, ...(m.aliases || []), m.meaning, m.origin, m.example,
                   ...(m.tags || []), ...(m.platforms || []), String(m.year)].join(" ").toLowerCase();
      return hay.includes(q);
    });
    return filtered.sort((a, b) => {
      if (state.sort === "year-asc") return a.year - b.year || a.name.localeCompare(b.name, "zh");
      if (state.sort === "name") return a.name.localeCompare(b.name, "zh");
      if (state.sort === "added") return String(b.added || "").localeCompare(String(a.added || "")) || b.year - a.year;
      return b.year - a.year || String(b.added || "").localeCompare(String(a.added || ""));
    });
  }

  /* ---------- 展柜视图 ---------- */
  function cardHtml(m) {
    const st = STATUS[m.status];
    const aliases = (m.aliases || []).join(" / ");
    const isFav = state.favorites.has(m.id);
    return `<article class="card ${m.status === "fossil" ? "fossil" : ""}" data-id="${m.id}" tabindex="0" role="button" aria-label="查看 ${esc(m.name)} 卷宗">
      <span class="card-meta"><span>${noOf(m)}</span><span>${m.year}</span></span>
      <span class="card-name">${esc(m.name)}</span>
      ${aliases ? `<span class="card-alias">${esc(aliases)}</span>` : ""}
      <span class="card-meaning">${esc(m.meaning)}</span>
      <span class="card-foot">
        <span class="card-cat"><i class="dot" style="background:${catDot(m)}"></i><span>${esc(catById.get(m.category)?.name || "")}</span></span>
        ${m.status === "fossil"
          ? `<span class="status tag-stamp">已归档</span>`
          : `<span class="status"><i class="dot" style="background:${st.color}"></i>${st.label}</span>`}
      </span>
      <span class="card-favorite ${isFav ? "on" : ""}" role="button" tabindex="0" data-favorite="${m.id}" aria-label="${isFav ? "取消收藏" : "收藏"} ${esc(m.name)}" aria-pressed="${isFav}">${isFav ? "★" : "☆"}</span>
    </article>`;
  }

  function renderGallery() {
    const list = currentList();
    const cat = state.cat ? catById.get(state.cat) : null;
    $("#galleryTitle").textContent = cat ? cat.name : "全部展厅";
    $("#galleryDesc").textContent = cat ? cat.description : "全部馆藏，按入馆年份先后排列。";
    $("#galleryCount").textContent = `${list.length} 件`;
    $("#resultNote").textContent = state.favoritesOnly ? `正在浏览 ${list.length} 件收藏` : `正在浏览 ${list.length} / ${memes.length} 件馆藏`;
    $("#cardGrid").innerHTML = list.map(cardHtml).join("");
    $("#emptyState").hidden = list.length > 0;
  }

  /* ---------- 编年视图 ---------- */
  function renderTimeline() {
    const list = currentList();
    $("#timelineCount").textContent = `${list.length} 件`;
    const byYear = new Map();
    list.forEach(m => {
      if (!byYear.has(m.year)) byYear.set(m.year, []);
      byYear.get(m.year).push(m);
    });
    let html = "", lastDecade = null;
    for (const [year, items] of [...byYear].sort((a, b) => a[0] - b[0])) {
      const decade = Math.floor(year / 10) * 10;
      if (decade !== lastDecade) { lastDecade = decade; html += `<div class="tl-era">${decade}s</div>`; }
      html += `<div class="tl-row"><span class="tl-year">${year}</span><span class="tl-items">` +
        items.map(m => `<button class="tl-chip" data-id="${m.id}">
            <i class="dot" style="background:${STATUS[m.status].color}"></i>${esc(m.name)}
          </button>`).join("") + `</span></div>`;
    }
    $("#timeline").innerHTML = html ||
      `<div class="empty"><p class="empty-title">空空如也</p><p class="empty-hint">没有找到匹配的藏品。</p></div>`;
  }

  /* ---------- 卷宗弹层 ---------- */
  const overlay = $("#overlay");
  function openModal(id) {
    const m = memeById.get(id);
    if (!m) return;
    const st = STATUS[m.status];
    const aliases = (m.aliases || []).join(" / ");
    const related = (m.related || []).map(r => memeById.get(r)).filter(Boolean);
    const stamp = m.status === "fossil" ? `<span class="sheet-stamp">化石 · 已归档</span>`
                : m.status === "revival" ? `<span class="sheet-stamp revival">考古翻红</span>` : "";
    $("#sheet").innerHTML = `
      <button class="close" data-close aria-label="关闭">✕</button>
      <p class="sheet-no">档案 ${noOf(m)} · ${catById.get(m.category)?.name || ""}</p>
      <h3 class="sheet-name">${esc(m.name)}</h3>
      <button class="sheet-favorite ${state.favorites.has(m.id) ? "on" : ""}" data-favorite="${m.id}" aria-label="收藏此藏品" aria-pressed="${state.favorites.has(m.id)}">${state.favorites.has(m.id) ? "★ 已收藏" : "☆ 收藏"}</button>
      ${aliases ? `<p class="sheet-alias">别名 · ${esc(aliases)}</p>` : ""}
      ${stamp}
      <p class="lbl">出处考据</p><p class="sheet-origin">${esc(m.origin)}</p>
      <p class="lbl">释义</p><p class="sheet-meaning">${esc(m.meaning)}</p>
      ${m.example ? `<p class="lbl">用法示例</p><p class="sheet-example">「${esc(m.example)}」</p>` : ""}
      <p class="lbl">档案信息</p>
      <div class="meta-grid">
        <div><p class="k">入馆年份</p><p class="v">${m.year}</p></div>
        <div><p class="k">生命周期</p><p class="v"><i class="dot" style="display:inline-block;background:${st.color}"></i> ${st.label}</p></div>
        <div><p class="k">主要平台</p><p class="v">${esc((m.platforms || []).join(" · ") || "—")}</p></div>
        <div><p class="k">标签</p><p class="v">${esc((m.tags || []).join(" · ") || "—")}</p></div>
      </div>
      ${related.length ? `<p class="lbl">相关梗</p><div class="rel-row">` +
        related.map(r => `<button class="rel" data-id="${r.id}"><i class="dot" style="background:${catDot(r)}"></i>${esc(r.name)}</button>`).join("") +
        `</div>` : ""}
      ${m.source ? `<p class="lbl">来源</p><p style="font-size:12.5px"><a href="${esc(m.source)}" target="_blank" rel="noopener" style="color:var(--accent)">查看考据来源 ↗</a></p>` : ""}`;
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
    $("#sheet").scrollTop = 0;
  }
  function closeModal() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    try { localStorage.setItem("meme-archive:favorites", JSON.stringify([...state.favorites])); } catch (_) { /* 无痕模式下忽略 */ }
    $("#favoriteCount").textContent = state.favorites.size;
    const favBtn = $("#favoritesBtn");
    favBtn.classList.toggle("on", state.favoritesOnly);
    favBtn.setAttribute("aria-pressed", state.favoritesOnly);
    const m = memeById.get(id);
    if (m) showToast(state.favorites.has(id) ? `已收藏「${m.name}」` : `已取消收藏「${m.name}」`);
    if (state.view === "gallery") renderGallery();
    if ($(".sheet")) {
      const sheetFav = $(".sheet-favorite");
      if (sheetFav && sheetFav.dataset.favorite === id) {
        const on = state.favorites.has(id); sheetFav.classList.toggle("on", on); sheetFav.setAttribute("aria-pressed", on); sheetFav.textContent = on ? "★ 已收藏" : "☆ 收藏";
      }
    }
  }

  let toastTimer;
  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function randomMeme() {
    const list = currentList();
    const pool = list.length ? list : memes;
    const m = pool[Math.floor(Math.random() * pool.length)];
    if (m) openModal(m.id);
  }

  /* ---------- 图谱视图 ---------- */
  const graph = { running: false, nodes: [], edges: [], W: 0, H: 0, hover: null, drag: null };

  function buildGraphData(list) {
    const idset = new Set(list.map(m => m.id));
    const nodes = list.map((m, i) => {
      const deg = (m.related || []).filter(r => idset.has(r)).length;
      return { id: m.id, name: m.name, cat: m.category, color: catDot(m), meme: m,
               x: Math.cos(i * 0.61) * (14 * Math.sqrt(i + 1)),
               y: Math.sin(i * 0.61) * (14 * Math.sqrt(i + 1)),
               vx: 0, vy: 0, r: 4 + Math.min(5, deg) };
    });
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const seen = new Set(); const edges = [];
    list.forEach(m => (m.related || []).forEach(r => {
      if (!idx.has(r)) return;
      const a = idx.get(m.id), b = idx.get(r);
      if (a === b) return;
      const key = a < b ? a + "-" + b : b + "-" + a;
      if (!seen.has(key)) { seen.add(key); edges.push([a, b]); }
    }));
    return { nodes, edges };
  }

  function startGraph() {
    const cv = $("#graphCanvas");
    const wrap = cv.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(300, wrap.clientWidth - 2);
    const H = Math.max(420, Math.min(620, Math.round(W * 0.62)));
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.height = H + "px";
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.assign(graph, buildGraphData(currentList()), { W, H, ctx, hover: null, drag: null });
    graph.nodes.forEach(n => { n.x += W / 2; n.y += H / 2; });
    $("#graphCount").textContent = `${graph.nodes.length} 节点 · ${graph.edges.length} 连线`;
    $("#graphLegend").innerHTML = categories.map(c =>
      `<span><i style="background:${c.color}"></i>${esc(c.name)}</span>`).join("");
    if (!graph.running) { graph.running = true; requestAnimationFrame(tickGraph); }
  }

  function tickGraph() {
    if (state.view !== "graph" || !graph.ctx) { graph.running = false; return; }
    const { nodes, edges, W, H, ctx } = graph;
    for (let step = 0; step < 2; step++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy || 0.01;
          const rep = 600 / d2, d = Math.sqrt(d2);
          a.vx -= (dx / d) * rep; a.vy -= (dy / d) * rep;
          b.vx += (dx / d) * rep; b.vy += (dy / d) * rep;
        }
        a.vx -= (a.x - W / 2) * 0.012; a.vy -= (a.y - H / 2) * 0.012;
      }
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 62) * 0.02;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      });
      nodes.forEach(n => {
        if (graph.drag === n) { n.vx = n.vy = 0; return; }
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += Math.max(-9, Math.min(9, n.vx));
        n.y += Math.max(-9, Math.min(9, n.vy));
      });
    }
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(120,110,88,0.16)"; ctx.lineWidth = 0.6;
    edges.forEach(([i, j]) => {
      ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
    });
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color; ctx.fill();
      if (graph.hover === n || graph.drag === n) { ctx.strokeStyle = "#26231d"; ctx.lineWidth = 1.5; ctx.stroke(); }
    });
    ctx.font = "11px 'SF Mono', ui-monospace, monospace";
    ctx.fillStyle = "rgba(62,57,46,0.85)";
    nodes.forEach(n => { if (n.r >= 8 || graph.hover === n) ctx.fillText(n.name, n.x + n.r + 4, n.y + 3); });
    requestAnimationFrame(tickGraph);
  }

  function graphPos(e) {
    const rect = e.target.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function wireGraph() {
    const cv = $("#graphCanvas");
    cv.addEventListener("pointermove", e => {
      if (!graph.nodes.length) return;
      const p = graphPos(e);
      if (graph.drag) {
        graph._moved += Math.abs(p.x - graph._last.x) + Math.abs(p.y - graph._last.y);
        graph.drag.x = p.x; graph.drag.y = p.y; graph._last = p;
        return;
      }
      let hit = null;
      for (const n of graph.nodes) {
        const dx = n.x - p.x, dy = n.y - p.y;
        if (dx * dx + dy * dy <= (n.r + 4) ** 2) { hit = n; break; }
      }
      graph.hover = hit;
      cv.style.cursor = hit ? "pointer" : "default";
      const tip = $("#graphTip");
      if (hit) {
        tip.hidden = false;
        tip.textContent = hit.name;
        tip.style.left = Math.min(p.x + 14, graph.W - 130) + "px";
        tip.style.top = Math.max(4, p.y - 30) + "px";
      } else tip.hidden = true;
    });
    cv.addEventListener("pointerdown", e => {
      const p = graphPos(e);
      for (const n of graph.nodes) {
        const dx = n.x - p.x, dy = n.y - p.y;
        if (dx * dx + dy * dy <= (n.r + 5) ** 2) {
          graph.drag = n; graph._moved = 0; graph._last = p;
          cv.setPointerCapture(e.pointerId);
          break;
        }
      }
    });
    cv.addEventListener("pointerup", () => {
      if (graph.drag && graph._moved < 6) openModal(graph.drag.id);
      graph.drag = null;
    });
    cv.addEventListener("pointerleave", () => { graph.hover = null; $("#graphTip").hidden = true; });
  }

  /* ---------- 上新视图 ---------- */
  function renderFresh() {
    const list = currentList();
    $("#freshCount").textContent = `${list.length} 件`;
    const groups = new Map();
    list.forEach(m => {
      const d = m.added || "早期入库";
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(m);
    });
    const dates = [...groups.keys()].sort().reverse();
    $("#freshList").innerHTML = dates.map(d => {
      const items = groups.get(d);
      return `<div class="fresh-group">
        <div class="tl-era">${esc(d)}<span class="fresh-batch">${items.length} 件入馆</span></div>
        <div class="tl-items">` + items.map(m =>
          `<button class="tl-chip" data-id="${m.id}"><i class="dot" style="background:${catDot(m)}"></i>${esc(m.name)}</button>`).join("") +
        `</div></div>`;
    }).join("") || `<div class="empty"><p class="empty-title">空空如也</p><p class="empty-hint">没有找到匹配的藏品。</p></div>`;
  }

  /* ---------- 状态同步 ---------- */
  function apply() {
    renderChips();
    renderGallery();
    renderTimeline();
    $("#resetBtn").hidden = !(state.q || state.cat || state.status || state.favoritesOnly || state.sort !== "year-desc");
    $("#favoriteCount").textContent = state.favorites.size;
    $("#favoritesBtn").classList.toggle("on", state.favoritesOnly);
    $("#favoritesBtn").setAttribute("aria-pressed", state.favoritesOnly);
    ["galleryView", "timelineView", "graphView", "freshView"].forEach(id => { $("#" + id).hidden = true; });
    if (state.view === "graph") { $("#graphView").hidden = false; startGraph(); }
    else if (state.view === "fresh") { $("#freshView").hidden = false; renderFresh(); }
    else if (state.view === "timeline") { $("#timelineView").hidden = false; }
    else { $("#galleryView").hidden = false; }
  }

  /* ---------- 事件 ---------- */
  let debounce;
  $("#searchInput").addEventListener("input", e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value; apply(); }, 120);
  });

  $("#categoryChips").addEventListener("click", e => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    state.cat = state.cat === btn.dataset.cat || !btn.dataset.cat ? null : btn.dataset.cat;
    apply();
  });
  $("#statusChips").addEventListener("click", e => {
    const btn = e.target.closest("[data-status]");
    if (!btn) return;
    state.status = state.status === btn.dataset.status ? null : btn.dataset.status;
    apply();
  });

  document.querySelectorAll(".seg-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach(b => { b.classList.toggle("on", b === btn); b.setAttribute("aria-selected", b === btn ? "true" : "false"); });
    state.view = btn.dataset.view;
    apply();
  }));

  $("#resetBtn").addEventListener("click", () => {
    state.q = ""; state.cat = null; state.status = null; state.sort = "year-desc"; state.favoritesOnly = false;
    $("#searchInput").value = "";
    $("#sortSelect").value = "year-desc";
    apply();
  });

  $("#sortSelect").addEventListener("change", e => { state.sort = e.target.value; apply(); });
  $("#favoritesBtn").addEventListener("click", () => { state.favoritesOnly = !state.favoritesOnly; apply(); });
  $("#randomBtn").addEventListener("click", randomMeme);
  $("#heroRandomBtn").addEventListener("click", randomMeme);
  $("#exploreBtn").addEventListener("click", () => $("#archive").scrollIntoView({ behavior: "smooth", block: "start" }));
  $("#themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";
    document.documentElement.dataset.theme = dark ? "" : "dark";
    try { localStorage.setItem("meme-archive:theme", dark ? "light" : "dark"); } catch (_) { /* ignore */ }
  });

  wireGraph();

  document.addEventListener("click", e => {
    const fav = e.target.closest("[data-favorite]");
    if (fav) { e.preventDefault(); e.stopPropagation(); toggleFavorite(fav.dataset.favorite); return; }
    const card = e.target.closest("[data-id]");
    if (card && (card.classList.contains("card") || card.classList.contains("tl-chip") || card.classList.contains("rel"))) {
      openModal(card.dataset.id);
      return;
    }
    if (e.target.closest("[data-close]")) closeModal();
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $("#searchInput").focus(); }
    if (e.key.toLowerCase() === "r" && !/input|textarea|select/i.test(document.activeElement.tagName)) randomMeme();
    if ((e.key === "Enter" || e.key === " ") && document.activeElement.matches("[data-favorite]")) { e.preventDefault(); toggleFavorite(document.activeElement.dataset.favorite); }
    if ((e.key === "Enter" || e.key === " ") && document.activeElement.matches(".card")) { e.preventDefault(); openModal(document.activeElement.dataset.id); }
  });

  try { if (localStorage.getItem("meme-archive:theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch (_) { /* ignore */ }
  apply();
})();
