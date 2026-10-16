// Canvas 渲染层：先量好版面（build），再画（render），点击时拿同一份版面做命中（hit）。
// 微信小游戏里没有 DOM 和 CSS，所有文字、卡片、按钮都在这里手画。
(function () {
  const G = typeof GameGlobal !== "undefined" ? GameGlobal : globalThis;

  const C = {
    bg: "#14140f", card: "#1e1e18", box: "#191912", line: "#33332a",
    fg: "#ece9e0", dim: "#9d9a8e", good: "#7fb069", bad: "#d16666",
    accent: "#d9a441", ink: "#1a1a12",
  };
  const F = {
    h1: "bold 25px sans-serif",
    h2: "bold 19px sans-serif",
    age: "bold 13px sans-serif",
    body: "15px sans-serif",
    small: "13px sans-serif",
    sub: "14px sans-serif",
    btn: "bold 17px sans-serif",
    statL: "12px sans-serif",
    statV: "bold 16px sans-serif",
  };
  const PAD = 16, CPAD = 14, RAD = 10, LH = 26, LHS = 20, GAP = 12;

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // 中文没有空格，逐字量宽度换行
  const NO_START = "。，、；：！？）」』】…》";
  function wrap(ctx, text, maxW, font) {
    ctx.font = font;
    const out = [];
    let cur = "";
    for (const ch of text) {
      if (ch === "\n") { out.push(cur); cur = ""; continue; }
      if (cur && ctx.measureText(cur + ch).width > maxW && NO_START.indexOf(ch) < 0) {
        out.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }

  function build(ctx, view, geom) {
    const items = [];
    let y = 0;
    let X = PAD;
    let W = geom.w - 2 * PAD;

    function txt(text, font, color, lh, act) {
      const bx = X, bw = W, ty = y;
      const lines = wrap(ctx, text, bw, font);
      const it = {
        x: bx, y: ty, w: bw, h: lines.length * lh,
        draw(c) {
          c.font = font;
          c.fillStyle = color;
          for (let i = 0; i < lines.length; i++) c.fillText(lines[i], bx, ty + i * lh);
        },
      };
      if (act) it.act = act;
      items.push(it);
      y = ty + it.h;
      return it;
    }

    function gap(v) { y += v; }

    function box(bg, border, mark, top, bx, bw) {
      const h = y - top;
      const it = {
        x: bx, y: top, w: bw, h,
        draw(c) {
          rr(c, bx, top, bw, h, RAD);
          if (bg) { c.fillStyle = bg; c.fill(); }
          if (border) { c.strokeStyle = border; c.lineWidth = 1; c.stroke(); }
        },
      };
      items.splice(mark, 0, it);
      return it;
    }

    function card(inner, border) {
      const mark = items.length;
      const top = y;
      const bx = X, bw = W;
      y += CPAD;
      X = bx + CPAD;
      W = bw - CPAD * 2;
      inner();
      X = bx;
      W = bw;
      y += CPAD;
      const it = box(C.card, border || C.line, mark, top, bx, bw);
      y += GAP;
      return it;
    }

    function row(label, value) {
      const top = y, h = 38;
      const bx = X, bw = W, ty = y;
      items.push({
        x: bx, y: ty, w: bw, h,
        draw(c) {
          rr(c, bx, ty, bw, h, 8);
          c.fillStyle = C.card; c.fill();
          c.strokeStyle = C.line; c.stroke();
          c.font = F.sub; c.fillStyle = C.dim; c.fillText(label, bx + 12, ty + 11);
          c.font = F.statV; c.fillStyle = C.fg;
          c.textAlign = "right";
          c.fillText(String(value), bx + bw - 12, ty + 9);
          c.textAlign = "left";
        },
      });
      y = top + h + 8;
    }

    if (view.screen === "start") {
      txt("高性价比人生", F.h1, C.fg, 34); gap(4);
      txt("用最少的钱、时间和精力，换回最多的寿命、金钱和人身自由", F.sub, C.accent, 22); gap(14);
      txt("从 22 岁到 62 岁，十个路口。每个路口三个选项，选完告诉你书里怎么说、出自第几节第几条。书里没有满分答案，这局也没有。", F.body, C.dim, LH); gap(18);
      row("❤️ 命", "归零 = 早死结局");
      row("💰 钱", "跌到 -20 = 破产结局");
      row("🧭 自由", "归零 = 被告席结局");
      gap(16);
      txt("出场的人", F.small, C.dim, LHS); gap(4);
      const cast = [
        ["张姐", "房东。「都这样的。」"],
        ["老周", "主管。「撑到工位再打卡。」"],
        ["二虎", "发小。「保本，稳赚。」"],
        ["老陈", "邻居，抽了三十年烟。「忍忍就好。」"],
        ["老孙", "楼上。「我那偏方三个月根治。」"],
        ["李医生", "同学群里的急诊科大夫。"],
      ];
      for (const [name, desc] of cast) {
        const mark = items.length, top = y, bx = X, bw = W;
        const nl = wrap(ctx, name, bw, F.age)[0];
        const dl = wrap(ctx, desc, bw, F.body);
        const h = 8 + dl.length * LHS + 9;
        items.push({
          x: bx, y: top, w: bw, h,
          draw(c) {
            c.font = F.age; c.fillStyle = C.accent; c.fillText(nl, bx, top + 4);
            const nw = c.measureText(nl).width;
            c.font = F.body; c.fillStyle = C.dim;
            for (let i = 0; i < dl.length; i++) c.fillText(dl[i], bx + nw + 8, top + 4 + i * LHS - 2);
            c.strokeStyle = C.line; c.lineWidth = 1;
            c.beginPath(); c.moveTo(bx, top + h); c.lineTo(bx + bw, top + h); c.stroke();
          },
        });
        y = top + h;
        void mark;
      }
      gap(8);
    }

    if (view.screen === "play") {
      const lv = G.LEVELS[view.state.idx];
      card(() => {
        txt(lv.age + " 岁", F.age, C.accent, 20); gap(4);
        txt(lv.title, F.h2, C.fg, 28); gap(8);
        txt(lv.scene, F.body, C.fg, LH);
      });

      // 说话的人：左边一条竖线
      {
        const mark = items.length, top = y;
        const bx = X + 10, bw = W - 10;
        X = bx; W = bw;
        txt(lv.npc.name, F.small, C.accent, LHS); gap(2);
        txt("「" + lv.npc.line + "」", F.body, C.fg, LH);
        X = PAD; W = geom.w - 2 * PAD;
        const h = y - top, ty = top;
        items.splice(mark, 0, {
          x: PAD, y: ty, w: 3, h,
          draw(c) { c.fillStyle = C.accent; c.fillRect(PAD, ty, 3, h); },
        });
        gap(14);
      }

      if (!view.chosen) {
        lv.options.forEach((op, i) => {
          const it = card(() => txt(i + 1 + ". " + op.text, F.body, C.fg, LH), C.line);
          it.act = { type: "option", index: i };
        });
      } else {
        const op = view.chosen;
        card(() => {
          const d = G.Engine.deltaText(op.effects);
          txt((op.ok ? "选对了。" : "这一下记住了。") + (d.length ? "　" + d.join("　") : ""), F.h2, op.ok ? C.good : C.bad, 26);
          gap(10);
          txt(op.result, F.body, C.fg, LH);
          gap(14);
          const mark = items.length, top = y;
          y += 12;
          const ox = X, ow = W;
          X = ox + 12; W = ow - 24;
          txt("书里怎么说", F.small, C.accent, LHS); gap(4);
          txt(op.cite, F.sub, C.fg, LHS); gap(8);
          txt("翻原文 → 点这里复制链接", F.small, C.accent, LHS, { type: "copy", url: G.Engine.bookURL(lv.file) });
          X = ox; W = ow;
          y += 12;
          box(C.box, C.line, mark, top, ox, ow);
        }, C.accent);
      }
      gap(4);
    }

    if (view.screen === "end") {
      const { rank, desc } = G.Engine.endingFor(view.state, view.flags);
      txt(rank, F.h1, C.fg, 34); gap(6);
      txt(desc, F.body, C.dim, LH); gap(18);
      row("❤️ 命", view.state.life);
      row("💰 钱", view.state.money);
      row("🧭 自由", view.state.freedom);
      row("总分", G.Engine.total(view.state));
      row("选对了", view.state.right + "/" + G.LEVELS.length);
      gap(14);
      txt("这一局你漏掉的条目", F.small, C.dim, LHS); gap(6);
      if (!view.state.missed.length) {
        txt("没有。这一局你一条都没漏。", F.body, C.good, LH);
        txt("去书里挑一条你还没做到的，这个月做掉。", F.body, C.dim, LH);
      }
      for (const m of view.state.missed) {
        txt(m.title, F.sub, C.accent, LHS, { type: "copy", url: G.Engine.bookURL(m.file) });
        txt(m.cite, F.small, C.dim, LHS);
        gap(8);
      }
      gap(10);
      txt("你走过的路", F.small, C.dim, LHS); gap(6);
      for (const p of view.state.picks) {
        txt((p.ok ? "✓ " : "✗ ") + p.age + " 岁 · " + p.title, F.sub, p.ok ? C.good : C.dim, LHS, {
          type: "copy",
          url: G.Engine.bookURL(p.file),
        });
        txt(p.cite, F.small, C.dim, LHS);
        gap(6);
      }
      gap(14);
      txt("分享这一局 → 点这里", F.sub, C.accent, LHS, {
        type: "share",
        text: G.Engine.shareText(view.state, view.flags),
      });
      gap(16);
      txt("原书《高性价比人生指南》，CC BY 4.0 · 代码 MIT", F.small, C.dim, LHS);
      txt("github.com/eternity4719/HowToLiveBetter ← 点这里复制", F.small, C.dim, LHS, { type: "copy", url: G.Engine.REPO_URL });
    }

    // 底部按钮：开始/结局页随时可点，闯关页要先选完选项
    const dockOn = view.screen !== "play" || !!view.chosen;
    return { items, height: y + 20, dockOn };
  }

  // 分镜条：固定在顶部，不跟着滚，HUD 压在它上面
  function drawBand(ctx, view, geom, t) {
    if (view.screen !== "play" || !geom.band || !G.Scene) return;
    const lv = G.LEVELS[view.state.idx];
    // 没选的时候每隔几秒「说一句」，选了就静下来
    const talking = !view.chosen && t % 7000 < 1800;
    G.Scene.draw(ctx, { x: 0, y: 0, w: geom.w, h: geom.band + geom.safeTop }, t, lv.stage, lv.npc.name, talking);
  }

  function drawHud(ctx, view, geom) {
    if (view.screen !== "play") return;
    const s = view.state;
    const w = geom.w;
    const cells = [
      ["❤️ 命", s.life],
      ["💰 钱", s.money],
      ["🧭 自由", s.freedom],
      ["进度", Math.min(s.idx + 1, G.LEVELS.length) + "/" + G.LEVELS.length],
    ];
    const gapX = 6, cw = (w - PAD * 2 - gapX * 3) / 4, cy = geom.safeTop + 6, ch = 48;
    cells.forEach(([k, v], i) => {
      const cx = PAD + i * (cw + gapX);
      rr(ctx, cx, cy, cw, ch, 8);
      ctx.fillStyle = C.card; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = F.statL; ctx.fillStyle = C.dim;
      ctx.fillText(k, cx + cw / 2, cy + 7);
      ctx.font = F.statV; ctx.fillStyle = C.fg;
      ctx.fillText(String(v), cx + cw / 2, cy + 23);
      ctx.textAlign = "left";
    });
  }

  // 帧循环只重画这两样；下面的卡片没变，不用跟着重画一遍
  function frame(ctx, view, geom, t) {
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    drawBand(ctx, view, geom, t);
    drawHud(ctx, view, geom);
  }

  function render(ctx, view, geom, layout, scroll, t) {
    const { w, h } = geom;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const top = geom.top;
    const viewH = h - geom.top - geom.bottom;

    drawBand(ctx, view, geom, t);
    drawHud(ctx, view, geom);

    // 内容区
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, viewH);
    ctx.clip();
    ctx.translate(0, top - scroll);
    for (const it of layout.items) it.draw(ctx);
    ctx.restore();

    // 滚动条
    if (layout.height > viewH) {
      const ratio = viewH / layout.height;
      const barH = Math.max(24, viewH * ratio);
      const barY = top + (viewH - barH) * (scroll / (layout.height - viewH || 1));
      ctx.fillStyle = "#3a3a30";
      rr(ctx, w - 5, barY, 3, barH, 2);
      ctx.fill();
    }

    // 底部按钮，永远在
    const by = h - geom.safeBottom - 56;
    const bh = 46;
    rr(ctx, PAD, by, w - PAD * 2, bh, RAD);
    ctx.fillStyle = layout.dockOn ? C.accent : C.card; ctx.fill();
    if (!layout.dockOn) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.font = F.btn; ctx.fillStyle = layout.dockOn ? C.ink : C.dim;
    ctx.textAlign = "center";
    ctx.fillText(view.dock, w / 2, by + 13);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }

  function hit(layout, scroll, x, y, geom) {
    const by = geom.h - geom.safeBottom - 56;
    if (layout.dockOn && y >= by && y <= by + 46) return { type: "action" };
    const cy = y - geom.top + scroll;
    if (y < geom.top || y > geom.h - geom.bottom) return null;
    for (const it of layout.items) {
      if (!it.act) continue;
      if (x >= it.x && x <= it.x + it.w && cy >= it.y && cy <= it.y + it.h) return it.act;
    }
    return null;
  }

  const UI = { build, render, hit, frame };
  G.UI = UI;
  if (typeof module === "object" && module.exports) module.exports = UI;
})();
