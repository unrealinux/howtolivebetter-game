// 原型：第 1 关（22 岁 · 第一间房）的「场景 + 人物 + 动效」，三版可切。
//
// 要回答的问题：程序化画出来的 2D 场景、人物和动效，够不够「生动」？
//   够  → 铺到 10 关，仍然 0 张图片（原方案的 A）
//   不够 → 再评估要不要上 25~30 张立绘（原方案的 B）
//
// 三版结构上不同，不是换配色：
//   A 舞台：整屏场景 + 人物立绘 + 底部对话框。人物是主角。
//   B 分镜：顶部一条电影带（带缓慢横移）+ 下面保持现在的卡片式。场景是氛围。
//   C 桌前：整屏场景，但不画人物。靠光斑移动、浮尘、排版说话。房间自己讲故事。
//
// 一次性代码：不参与发布，index.html 和微信小游戏都不引用它。双击本文件旁边
// 的 prototype-scene.html 就能跑。没有存档、没有音效、只有第 1 关。
(function () {
  const E = globalThis.Engine;
  const LEVEL = globalThis.LEVELS[0];
  const LINE = LEVEL.npc.line;

  const C = {
    bg: "#14140f", card: "#1e1e18", box: "#191912", line: "#33332a",
    fg: "#ece9e0", dim: "#9d9a8e", good: "#7fb069", bad: "#d16666",
    accent: "#d9a441", ink: "#1a1a12",
  };
  const F = {
    h1: "bold 25px sans-serif", h2: "bold 19px sans-serif", age: "bold 13px sans-serif",
    body: "15px sans-serif", small: "13px sans-serif", sub: "14px sans-serif", btn: "bold 17px sans-serif",
  };
  const ZHANG = { hair: "#1f1a16", skin: "#e6c6a4", top: "#8f5f42", bottom: "#423c2f", seed: 0.4 };
  const SWITCH_H = 54;
  const bandTop = () => (MOBILE ? H * 0.22 : H * 0.32);

  // —— 引擎无关的部分 ────────────────────────────────────────────────
  const canvas = document.getElementById("c");
  const g = canvas.getContext("2d");
  let W = 0, H = 0;
  const MOBILE = innerWidth < 640;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.textBaseline = "top";
    g.textAlign = "left";
  }
  addEventListener("resize", resize);

  const params = new URLSearchParams(location.search);
  let variant = (params.get("variant") || "A").toUpperCase();
  if (!"ABC".includes(variant)) variant = "A";

  const S = { chosen: null, state: E.createState(), floats: [], bornAt: 0, fade: 1, scroll: 0 };
  const now = () => performance.now();
  const TYPE_MS = 45;
  const typed = (t) => (S.chosen == null ? Math.min(LINE.length, Math.floor((t - S.bornAt) / TYPE_MS)) : LINE.length);
  const doneTyping = (t) => typed(t) >= LINE.length;
  const shownAt = (t) => S.bornAt + LINE.length * TYPE_MS + 240;
  const talking = (t) => S.chosen == null && !doneTyping(t);
  const ease01 = (v) => Math.max(0, Math.min(1, v));

  let hits = [];
  const addHit = (x, y, w, h, act) => hits.push({ x, y, w, h, act });

  function rr(x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  const NO_START = "。，、；：！？）」』】…》";
  function wrap(text, font, maxW) {
    g.font = font;
    const out = [];
    let cur = "";
    for (const ch of text) {
      if (ch === "\n") { out.push(cur); cur = ""; continue; }
      if (cur && g.measureText(cur + ch).width > maxW && NO_START.indexOf(ch) < 0) { out.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur || !out.length) out.push(cur);
    return out;
  }

  function quad(pts, fill) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }

  const rand = (s) => { const v = Math.sin(s * 127.1) * 43758.5453; return v - Math.floor(v); };

  // —— 场景：城西一间要出租的房 ──────────────────────────────────────
  function room(x, y, w, h, t) {
    const vx = x + w * 0.5, vy = y + h * 0.68;
    const bx = x + w * 0.15, by = y + h * 0.20;
    const ex = x + w * 0.85;

    quad([x, y, x + w, y, ex, by, bx, by], "#0f0e09");                       // 天花板
    quad([x, y, bx, by, bx, vy, x, y + h], "#191812");                        // 左墙
    quad([x + w, y, ex, by, ex, vy, x + w, y + h], "#171610");                // 右墙
    g.fillStyle = "#22211a"; g.fillRect(bx, by, ex - bx, vy - by);            // 后墙
    quad([x, y + h, x + w, y + h, ex, vy, bx, vy], "#2a2822");                // 地面

    // 后墙上的窗：院子里那点黄光就靠它
    const wx = bx + (ex - bx) * 0.10, wy = by + (vy - by) * 0.20;
    const ww = (ex - bx) * 0.24, wh = (vy - by) * 0.36;
    g.fillStyle = "#3a3020"; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
    g.fillStyle = "#d9a441";
    g.globalAlpha = 0.22 + Math.sin(t / 2600) * 0.02;
    g.fillRect(wx, wy, ww, wh);
    g.globalAlpha = 1;
    g.fillStyle = "#1b1a14";
    g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
    g.fillRect(wx, wy + wh / 2 - 1, ww, 2);

    // 后墙上的门
    const dx = bx + (ex - bx) * 0.56, dw = (ex - bx) * 0.20;
    const dTop = vy - (vy - by) * 0.72;
    g.fillStyle = "#1c1a14"; g.fillRect(dx, dTop, dw, vy - dTop);
    g.strokeStyle = "#3d3c31"; g.lineWidth = 1;
    g.strokeRect(dx + 0.5, dTop + 0.5, dw - 1, vy - dTop - 1);
    g.fillStyle = "#5b5646"; g.fillRect(dx + dw - 6, dTop + (vy - dTop) * 0.46, 3, 3);

    // 地上那道光斑：慢慢挪，就是在说这个下午还没过去
    const drift = Math.sin(t / 9000) * w * 0.035;
    g.globalAlpha = 0.09 + Math.sin(t / 3400) * 0.015;
    quad([wx + drift, vy, wx + ww + drift, vy, wx + ww + w * 0.16 + drift, y + h, wx - w * 0.10 + drift, y + h], C.accent);
    g.globalAlpha = 1;

    // 几个还没拆的箱子
    const boxes = [[-0.26, 0.30, 0.13], [-0.10, 0.62, 0.10], [0.22, 0.44, 0.11]];
    for (const [ox, oy, s] of boxes) {
      const cz = x + w * (0.5 + ox), cs = w * s, cy = y + h * (0.72 + oy * 0.28);
      g.fillStyle = "#3a3226";
      g.fillRect(cz - cs / 2, cy - cs * 0.62, cs, cs * 0.62);
      g.fillStyle = "#4a4030"; g.fillRect(cz - cs / 2, cy - cs * 0.62, cs, cs * 0.12);
      g.strokeStyle = "rgba(20,20,15,0.6)"; g.lineWidth = 1;
      g.strokeRect(cz - cs / 2 + 0.5, cy - cs * 0.62 + 0.5, cs, cs * 0.62);
    }

    // 灰：只在光斑里看得见，慢慢飘向镜头
    for (let i = 0; i < 26; i++) {
      const sx = rand(i * 3.1), sy = rand(i * 7.7);
      const px = wx - w * 0.06 + sx * (ww + w * 0.22) + drift * (0.4 + sy);
      const k = ((sy - (t / 9000 + i * 0.02)) % 1 + 1) % 1;
      const py = vy + (y + h - vy) * k;
      g.globalAlpha = (1 - k) * 0.45;
      g.fillStyle = C.accent;
      g.fillRect(px, py, 1.4, 1.4);
    }
    g.globalAlpha = 1;
  }

  // —— 人物：站着呼吸，说话时嘴动、手摆，偶尔眨眼 ────────────────────
  function person(cx, footY, h, t, say, pal) {
    const bob = Math.sin(t / 640) * h * 0.014;
    const headR = h * 0.115;
    const hipY = footY - h * 0.47;
    const shoulderY = footY - h * 0.80 + bob;
    const headY = footY - h + bob + headR;
    const bodyW = h * 0.30;

    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath(); g.ellipse(cx, footY, h * 0.20, h * 0.035, 0, 0, 7); g.fill();

    g.strokeStyle = pal.bottom; g.lineWidth = h * 0.095; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx, hipY); g.lineTo(cx - h * 0.055, footY); g.stroke();
    g.beginPath(); g.moveTo(cx, hipY); g.lineTo(cx + h * 0.055, footY); g.stroke();

    g.fillStyle = pal.top;
    rr(cx - bodyW / 2, shoulderY, bodyW, hipY - shoulderY + h * 0.07, h * 0.05); g.fill();
    g.strokeStyle = "rgba(217,164,65,0.35)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx - bodyW / 2 + 1, shoulderY + 4); g.lineTo(cx - bodyW / 2 + 1, hipY); g.stroke();

    // 手画在身体之后，不然两条手被躯干盖住，人就像一个保龄球瓶
    const swing = say ? Math.sin(t / 150) * 0.30 : Math.sin(t / 900) * 0.05;
    g.strokeStyle = pal.top; g.lineWidth = h * 0.075;
    for (const dir of [-1, 1]) {
      const a = Math.PI / 2 - dir * (0.17 + swing * dir);
      g.beginPath();
      g.moveTo(cx + dir * bodyW * 0.42, shoulderY + h * 0.05);
      g.lineTo(cx + dir * bodyW * 0.42 + Math.cos(a) * h * 0.28, shoulderY + h * 0.05 + Math.sin(a) * h * 0.28);
      g.stroke();
    }

    g.fillStyle = pal.skin;
    g.beginPath(); g.arc(cx, headY, headR, 0, 7); g.fill();
    g.fillStyle = pal.hair;
    g.beginPath(); g.arc(cx, headY - headR * 0.10, headR * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.fill();

    const blink = ((t / 1000 + pal.seed) % 3.6) < 0.13;
    g.fillStyle = "#141410";
    if (blink) {
      g.fillRect(cx - headR * 0.45, headY + headR * 0.05, headR * 0.28, 1.4);
      g.fillRect(cx + headR * 0.17, headY + headR * 0.05, headR * 0.28, 1.4);
    } else {
      g.beginPath(); g.arc(cx - headR * 0.30, headY + headR * 0.08, headR * 0.10, 0, 7); g.fill();
      g.beginPath(); g.arc(cx + headR * 0.30, headY + headR * 0.08, headR * 0.10, 0, 7); g.fill();
    }
    const open = say ? 0.6 + Math.abs(Math.sin(t / 110)) * 0.9 : 0.25;
    g.fillStyle = "#6b3a36";
    g.beginPath(); g.ellipse(cx, headY + headR * 0.50, headR * 0.22, headR * 0.08 * open + 0.6, 0, 0, 7); g.fill();
  }

  // —— 小部件 ────────────────────────────────────────────────────────
  function flowText(text, font, color, x, y, w, lh) {
    const ls = wrap(text, font, w);
    g.font = font; g.fillStyle = color;
    for (let i = 0; i < ls.length; i++) g.fillText(ls[i], x, y + i * lh);
    return y + ls.length * lh;
  }

  function cardText(text, font, color, x, y, w, lh) {
    const pad = 14;
    const ls = wrap(text, font, w - pad * 2);
    const h = ls.length * lh + pad * 2;
    rr(x, y, w, h, 10); g.fillStyle = C.card; g.fill();
    g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
    g.font = font; g.fillStyle = color;
    for (let i = 0; i < ls.length; i++) g.fillText(ls[i], x + pad, y + pad + i * lh);
    return y + h;
  }

  function nameChipW(name) {
    g.font = F.age;
    return g.measureText(name).width + 20;
  }

  function nameChip(name, x, y) {
    const w = nameChipW(name);
    rr(x, y, w, 24, 12);
    g.fillStyle = "rgba(217,164,65,0.14)"; g.fill();
    g.strokeStyle = "rgba(217,164,65,0.5)"; g.lineWidth = 1; g.stroke();
    g.fillStyle = C.accent;
    g.fillText(name, x + 10, y + 5);
    return y + 24;
  }

  // 说话声波：C 版用来代替人物
  function waveform(x, y, t, n) {
    g.fillStyle = C.accent;
    for (let i = 0; i < n; i++) {
      const h = 3 + Math.abs(Math.sin(t / 120 + i * 0.7)) * 10;
      g.fillRect(x + i * 4, y - h / 2, 2, h);
    }
  }

  function optionRow(i, text, x, y, w, t) {
    const enter = ease01((t - shownAt(t)) / 280 - i * 0.12);
    if (enter <= 0) return y;
    const pad = 12, lh = 22;
    const ls = wrap(i + 1 + ". " + text, F.body, w - pad * 2);
    const h = ls.length * lh + pad * 2;
    const yy = y + (1 - enter) * 16;
    g.globalAlpha = enter;
    rr(x, yy, w, h, 10); g.fillStyle = C.card; g.fill();
    g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
    g.font = F.body; g.fillStyle = C.fg;
    for (let k = 0; k < ls.length; k++) g.fillText(ls[k], x + pad, yy + pad + k * lh);
    g.globalAlpha = 1;
    addHit(x, yy, w, h, { type: "option", i });
    return y + h + 10;
  }

  function citeBox(x, y, w) {
    const op = LEVEL.options[S.chosen];
    const pad = 12, lh = 20;
    const ls = wrap(op.cite, F.sub, w - pad * 2);
    const h = pad * 2 + 22 + ls.length * lh + 24;
    rr(x, y, w, h, 10); g.fillStyle = C.box; g.fill();
    g.setLineDash([4, 4]); g.strokeStyle = C.line; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
    let yy = y + pad;
    g.font = F.small; g.fillStyle = C.accent; g.fillText("书里怎么说", x + pad, yy);
    yy += 22;
    g.font = F.sub; g.fillStyle = C.fg;
    for (let i = 0; i < ls.length; i++) g.fillText(ls[i], x + pad, yy + i * lh);
    yy += ls.length * lh + 6;
    g.font = F.small; g.fillStyle = C.accent; g.fillText("翻原文 →", x + pad, yy);
    addHit(x + pad, yy - 4, 96, 22, { type: "book", url: E.bookURL(LEVEL.file) });
    return y + h;
  }

  function resultFlow(x, y, w) {
    const op = LEVEL.options[S.chosen];
    const d = E.deltaText(op.effects);
    g.font = F.h2; g.fillStyle = op.ok ? C.good : C.bad;
    g.fillText((op.ok ? "选对了。" : "这一下记住了。") + (d.length ? "　" + d.join("　") : ""), x, y);
    y += 30;
    y = flowText(op.result, F.body, C.fg, x, y, w, 26) + 14;
    y = citeBox(x, y, w) + 12;
    const h = 44;
    rr(x, y, w, h, 10); g.fillStyle = C.accent; g.fill();
    g.font = F.btn; g.fillStyle = C.ink; g.textAlign = "center";
    g.fillText("再走一次这个路口", x + w / 2, y + 12);
    g.textAlign = "left";
    addHit(x, y, w, h, { type: "restart" });
    return y + h;
  }

  function introFlow(x, y, w, t) {
    y = nameChip(LEVEL.npc.name, x, y) + 10;
    y = flowText(LINE.slice(0, typed(t)), F.body, C.fg, x, y + 6, w, 26) + 14;
    if (!doneTyping(t)) {
      g.font = F.small; g.fillStyle = C.dim;
      g.fillText("点一下看完整句 ·", x, y + 2);
      return y + 24;
    }
    for (let i = 0; i < LEVEL.options.length; i++) y = optionRow(i, LEVEL.options[i].text, x, y, w, t);
    return y;
  }

  // —— A 舞台：整屏场景 + 人物 + 底部对话框 ──────────────────────────
  let stageP = 0.47;
  function variantA(t) {
    const sceneH = H * stageP;
    room(0, 0, W, sceneH, t);
    const ph = Math.min(sceneH * 0.70, W * 0.52);
    person(W * 0.64, sceneH - 6, ph, t, talking(t), ZHANG);

    const boxY = sceneH, boxH = H - boxY - SWITCH_H;
    g.fillStyle = C.card; g.fillRect(0, boxY, W, boxH);
    g.fillStyle = C.line; g.fillRect(0, boxY, W, 1);
    g.save();
    g.beginPath(); g.rect(0, boxY, W, boxH); g.clip();
    g.translate(0, -S.scroll);
    const x = 16, w = W - 32;
    let y = boxY + 16;
    if (S.chosen == null) y = introFlow(x, y, w, t);
    else y = resultFlow(x, y, w);
    g.restore();
    return y - boxY + 16;
  }

  // —— B 分镜：顶部电影带 + 下面还是卡片 ──────────────────────────────
  function variantB(t) {
    const bandH = bandTop();
    g.save();
    g.beginPath(); g.rect(0, 0, W, bandH); g.clip();
    const pan = Math.sin(t / 7000) * W * 0.03;
    g.translate(pan, 0);
    room(-W * 0.06, -bandH * 0.10, W * 1.12, bandH * 1.35, t);
    person(W * 0.40 - pan * 0.4, bandH * 0.97, bandH * 0.62, t, talking(t),
      { hair: "#161310", skin: "#332c22", top: "#2a241c", bottom: "#211d17", seed: 0.4 });
    g.restore();
    const grad = g.createLinearGradient(0, 0, 0, bandH);
    grad.addColorStop(0.55, "rgba(20,20,15,0)");
    grad.addColorStop(1, "rgba(20,20,15,1)");
    g.fillStyle = grad; g.fillRect(0, 0, W, bandH);
    g.fillStyle = C.line; g.fillRect(0, bandH - 1, W, 1);

    g.save();
    g.beginPath(); g.rect(0, bandH, W, H - bandH - SWITCH_H); g.clip();
    g.translate(0, -S.scroll);
    const x = 16, w = W - 32;
    let y = bandH + 10;
    g.font = F.age; g.fillStyle = C.accent; g.fillText(LEVEL.age + " 岁", x, y); y += 22;
    y = flowText(LEVEL.title, F.h2, C.fg, x, y, w, 28) + 8;
    if (S.chosen == null) {
      y = cardText(LEVEL.scene, F.body, C.fg, x, y, w, 26) + 12;
      y = nameChip(LEVEL.npc.name, x, y) + 8;
      y = flowText(LINE.slice(0, typed(t)), F.body, C.fg, x, y, w, 26) + 14;
      if (!doneTyping(t)) {
        g.font = F.small; g.fillStyle = C.dim; g.fillText("点一下看完整句 ·", x, y);
        y += 24;
      } else {
        for (let i = 0; i < LEVEL.options.length; i++) y = optionRow(i, LEVEL.options[i].text, x, y, w, t);
      }
    } else {
      y = resultFlow(x, y, w);
    }
    g.restore();
    return y - bandH + 24;
  }

  // —— C 桌前：整屏场景，不画人物，靠光和排版说话 ────────────────────
  // C 版的「主角」：一块还没封完的石膏板隔断——这一关讲的就是它
  function partition() {
    const x = W * 0.06, w = W * 0.56, top = H * 0.78, bot = H * 0.99;
    g.fillStyle = "#2b2921"; g.fillRect(x, top, w, bot - top);
    g.fillStyle = "#453f31";
    for (let i = 0; i < 5; i++) g.fillRect(x + 10 + i * ((w - 20) / 5), top + 12, 5, bot - top - 16);
    g.fillStyle = "rgba(217,164,65,0.20)"; g.fillRect(x, top, w, 2);
    g.strokeStyle = "rgba(20,20,15,0.9)"; g.lineWidth = 1;
    g.strokeRect(x + 0.5, top + 0.5, w - 1, bot - top - 1);
  }

  function variantC(t) {
    room(0, -H * 0.06, W, H * 1.02, t);
    partition();
    const veil = g.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, "rgba(20,20,15,0.20)");
    veil.addColorStop(0.55, "rgba(20,20,15,0.60)");
    veil.addColorStop(0.86, "rgba(20,20,15,0.30)");
    veil.addColorStop(1, "rgba(20,20,15,0.55)");
    g.fillStyle = veil; g.fillRect(0, 0, W, H);

    g.save();
    g.beginPath(); g.rect(0, 0, W, H - SWITCH_H); g.clip();
    g.translate(0, -S.scroll);
    const x = 18, w = W - 36;
    let y = H * 0.30;
    g.font = F.age; g.fillStyle = C.accent; g.fillText(LEVEL.age + " 岁 · " + LEVEL.title, x, y); y += 30;
    const chipY = y;
    y = nameChip(LEVEL.npc.name, x, y) + 6;
    if (talking(t)) waveform(x + nameChipW(LEVEL.npc.name) + 12, chipY + 12, t, 7);
    y += 4;
    y = flowText(LINE.slice(0, typed(t)), F.body, C.fg, x, y, w, 26) + 20;

    if (S.chosen == null) {
      if (!doneTyping(t)) {
        g.font = F.small; g.fillStyle = C.dim; g.fillText("点一下看完整句 ·", x, y);
        y += 24;
      } else {
        for (let i = 0; i < LEVEL.options.length; i++) {
          const enter = ease01((t - shownAt(t)) / 280 - i * 0.12);
          if (enter <= 0) continue;
          const pad = 16, lh = 24;
          const ls = wrap(i + 1 + ". " + LEVEL.options[i].text, F.body, w - pad * 2);
          const h = ls.length * lh + pad * 2;
          const yy = y + (1 - enter) * 16;
          g.globalAlpha = 0.18 + enter * 0.42;
          g.fillStyle = "#000";
          rr(x, yy, w, h, 10); g.fill();
          g.globalAlpha = enter;
          g.strokeStyle = "rgba(236,233,224,0.22)"; g.lineWidth = 1;
          rr(x + 0.5, yy + 0.5, w - 1, h - 1, 10); g.stroke();
          g.font = F.body; g.fillStyle = C.fg;
          for (let k = 0; k < ls.length; k++) g.fillText(ls[k], x + pad, yy + pad + k * lh);
          g.globalAlpha = 1;
          addHit(x, yy, w, h, { type: "option", i });
          y = yy + h + 12;
        }
      }
    } else {
      g.globalAlpha = 0.82;
      g.fillStyle = "#14140f";
      g.fillRect(-x, -H, W + x * 2, H * 3);
      g.globalAlpha = 1;
      y = resultFlow(x, y, w);
    }
    g.restore();
    return y + 24;
  }

  // —— 数值飘字 + 底部切换条 ─────────────────────────────────────────
  function drawFloats(t) {
    S.floats = S.floats.filter((f) => t - f.bornAt < 1400);
    g.textAlign = "center";
    for (const f of S.floats) {
      const p = (t - f.bornAt) / 1400;
      if (p < 0) continue;
      g.globalAlpha = 1 - p * p;
      g.font = F.h2;
      g.fillStyle = f.color;
      g.fillText(f.text, W / 2 + f.ox, H * 0.34 - p * 66);
    }
    g.globalAlpha = 1;
    g.textAlign = "left";
  }

  function switcher() {
    g.fillStyle = "rgba(20,20,15,0.85)";
    g.fillRect(0, H - SWITCH_H, W, SWITCH_H);
    g.font = F.small; g.fillStyle = C.dim;
    g.fillText("原型 · 只有第 1 关", 12, 10);
    const labels = [["A", "舞台"], ["B", "分镜"], ["C", "桌前"]];
    const bw = 76, bh = 32, gap = 8;
    let x = (W - (labels.length * bw + (labels.length - 1) * gap)) / 2;
    const y = H - SWITCH_H + 12;
    g.font = "bold 13px sans-serif";
    for (const [k, label] of labels) {
      const on = k === variant;
      rr(x, y, bw, bh, 16);
      g.fillStyle = on ? C.accent : C.card; g.fill();
      g.strokeStyle = on ? C.accent : C.line; g.lineWidth = 1; g.stroke();
      g.fillStyle = on ? C.ink : C.dim;
      g.textAlign = "center";
      g.fillText(k + " " + label, x + bw / 2, y + 9);
      g.textAlign = "left";
      addHit(x, y, bw, bh, { type: "variant", k });
      x += bw + gap;
    }
  }

  // —— 输入 ──────────────────────────────────────────────────────────
  function pick(i) {
    if (S.chosen != null || !LEVEL.options[i]) return;
    S.chosen = i;
    const op = LEVEL.options[i];
    S.state = E.applyChoice(S.state, LEVEL, op);
    E.deltaText(op.effects).forEach((text, k) => {
      S.floats.push({ text, color: op.ok ? C.good : C.bad, bornAt: now() + k * 150, ox: (k - 1) * 92 });
    });
    S.scroll = 0;
  }

  function setVariant(k) {
    variant = k;
    S.bornAt = now();
    S.fade = 1;
    S.scroll = 0;
    history.replaceState(null, "", "?variant=" + k);
  }

  function restart() {
    S.chosen = null;
    S.state = E.createState();
    S.floats = [];
    S.scroll = 0;
    S.bornAt = now();
    S.fade = 1;
  }

  // 先按下、再抬起来算一次点击；中途拖了就只当滚动
  let down = null;
  const dragClamp = (v) => Math.max(0, Math.min(v, S.maxScroll || 0));

  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    down = { x: e.clientX - r.left, y: e.clientY - r.top, scroll: S.scroll, moved: false };
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    if (Math.abs(e.clientY - down.y) > 8) down.moved = true;
    if (down.moved) S.scroll = dragClamp(down.scroll - (e.clientY - down.y));
  });

  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = down.moved;
    down = null;
    if (moved) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = hits.slice().reverse().find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) {
      if (S.chosen == null && !doneTyping(now())) S.bornAt = now() - LINE.length * TYPE_MS;
      return;
    }
    if (hit.act.type === "option") pick(hit.act.i);
    else if (hit.act.type === "variant") setVariant(hit.act.k);
    else if (hit.act.type === "restart") restart();
    else if (hit.act.type === "book") window.open(hit.act.url, "_blank", "noopener");
  });

  canvas.addEventListener("pointercancel", () => { down = null; });

  // —— 循环 ──────────────────────────────────────────────────────────
  let last = 0;
  function frame(t) {
    const dt = Math.min(64, t - last || 16);
    last = t;
    const target = S.chosen == null ? 0.47 : 0.32;
    stageP += (target - stageP) * Math.min(1, dt / 180);

    g.clearRect(0, 0, W, H);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    hits = [];

    let contentH = 0;
    if (variant === "A") {
      contentH = variantA(t);
      const panelH = H - H * stageP - SWITCH_H;
      S.maxScroll = Math.max(0, contentH - panelH);
      S.scroll = Math.max(0, Math.min(S.scroll, S.maxScroll));
    } else {
      contentH = variant === "B" ? variantB(t) : variantC(t);
      const viewH = variant === "B" ? H - bandTop() - SWITCH_H : H - SWITCH_H;
      S.maxScroll = Math.max(0, contentH - viewH);
      S.scroll = Math.max(0, Math.min(S.scroll, S.maxScroll));
    }

    drawFloats(t);
    switcher();

    if (S.fade > 0) {
      S.fade = Math.max(0, S.fade - dt / 320);
      g.fillStyle = "rgba(20,20,15," + S.fade + ")";
      g.fillRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  resize();
  S.bornAt = now();
  requestAnimationFrame(frame);
  // 给无头浏览器和调试用
  globalThis.__proto = () => ({ variant, S, hits, W, H });
})();
