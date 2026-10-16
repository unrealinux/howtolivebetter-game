// 分镜条：把每关的地点画成一条会缓慢横移的带子，上面站一个本关人物的剪影。
// 只画 canvas，不碰 DOM，也不碰 wx——网页版和小游戏版共用这一份。
// 画什么全由 levels.js 里每关的 stage 字段决定（where / light / tint / props）。
(function () {
  const G = typeof GameGlobal !== "undefined" ? GameGlobal : globalThis;

  const LIGHT = {
    window: { color: "#d9a441", a: 0.24 },   // 下午从窗子里进来的光
    lamp: { color: "#e6dcc4", a: 0.16 },     // 顶灯
    screen: { color: "#7fa8d1", a: 0.22 },   // 屏幕的冷光
    sky: { color: "#d9a441", a: 0.34 },      // 户外天光
  };
  const WALL = "#22211a", FLOOR = "#2a2822", SIDE = "#181711";

  const rand = (s) => { const v = Math.sin(s * 127.1) * 43758.5453; return v - Math.floor(v); };

  function quad(c, pts, fill) {
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }

  function box(c, x, y, w, h, fill) {
    c.fillStyle = fill;
    c.fillRect(x, y, w, h);
    c.strokeStyle = "rgba(14,13,9,0.7)";
    c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // —— 道具：都站在 baseY 上，s 是「一个身高单位」 ——
  const PROPS = {
    carton(c, cx, y, s) {
      const w = s * 1.5, h = s * 1.1;
      box(c, cx - w / 2, y - h, w, h, "#3a3226");
      c.fillStyle = "#4c4130";
      c.fillRect(cx - w / 2, y - h, w, h * 0.15);
    },
    box(c, cx, y, s) {
      const w = s * 0.85, h = s * 0.6;
      box(c, cx - w / 2, y - h, w, h, "#332c22");
    },
    door(c, cx, y, s) {
      const w = s * 1.15, h = s * 2.5;
      box(c, cx - w / 2, y - h, w, h, "#1c1a14");
      c.fillStyle = "#5b5646";
      c.fillRect(cx + w / 2 - s * 0.16, y - h * 0.5, s * 0.1, s * 0.1);
    },
    table(c, cx, y, s) {
      const w = s * 2.6, h = s * 0.8;
      c.fillStyle = "#3a3126";
      c.fillRect(cx - w * 0.44, y - h, s * 0.16, h);
      c.fillRect(cx + w * 0.44 - s * 0.16, y - h, s * 0.16, h);
      box(c, cx - w / 2, y - h, w, h * 0.2, "#413729");
    },
    desk(c, cx, y, s) {
      PROPS.table(c, cx, y, s);
      const w = s * 1.1, h = s * 0.75;
      box(c, cx - w / 2, y - s * 0.8 - h, w, h, "#1b1d20");
      c.fillStyle = "rgba(127,168,209,0.5)";
      c.fillRect(cx - w / 2 + 1.5, y - s * 0.8 - h + 1.5, w - 3, h - 3);
    },
    chair(c, cx, y, s) {
      const w = s * 0.8, h = s * 0.9;
      box(c, cx - w / 2, y - h * 0.55, w, h * 0.12, "#332d24");
      c.fillStyle = "#2d2820";
      c.fillRect(cx - w / 2, y - h, w * 0.16, h * 0.55);
      c.fillRect(cx + w / 2 - w * 0.16, y - h, w * 0.16, h * 0.55);
      c.fillRect(cx - w / 2, y - h, w, h * 0.14);
      c.fillRect(cx - w / 2 + s * 0.08, y - h * 0.43, s * 0.1, h * 0.43);
      c.fillRect(cx + w / 2 - s * 0.18, y - h * 0.43, s * 0.1, h * 0.43);
    },
    bottle(c, cx, y, s) {
      c.fillStyle = "#2f3a2c";
      c.fillRect(cx - s * 0.14, y - s * 0.75, s * 0.28, s * 0.75);
      c.fillRect(cx - s * 0.06, y - s * 1.05, s * 0.12, s * 0.32);
    },
    scooter(c, cx, y, s) {
      c.strokeStyle = "#2b2b28";
      c.lineWidth = s * 0.16;
      for (const dx of [-s * 0.7, s * 0.7]) {
        c.beginPath(); c.arc(cx + dx, y - s * 0.35, s * 0.35, 0, 7); c.stroke();
      }
      c.fillStyle = "#3d3a33";
      c.fillRect(cx - s * 0.8, y - s * 1.1, s * 1.6, s * 0.5);
      c.fillRect(cx + s * 0.5, y - s * 1.7, s * 0.14, s * 0.65);
      c.fillRect(cx + s * 0.2, y - s * 1.75, s * 0.7, s * 0.14);
      c.fillStyle = "rgba(217,164,65,0.35)";
      c.fillRect(cx - s * 0.5, y - s * 1.02, s * 0.5, s * 0.1);
    },
    stall(c, cx, y, s) {
      const w = s * 3.2;
      c.fillStyle = "#2f3128";
      c.fillRect(cx - w / 2, y - s * 1.5, s * 0.16, s * 1.5);
      c.fillRect(cx + w / 2 - s * 0.16, y - s * 1.5, s * 0.16, s * 1.5);
      quad(c, [cx - w / 2 - s * 0.2, y - s * 1.5, cx + w / 2 + s * 0.2, y - s * 1.5,
        cx + w / 2 + s * 0.5, y - s * 1.85, cx - w / 2 - s * 0.5, y - s * 1.85], "#4a4436");
      c.fillStyle = "#3b3529";
      c.fillRect(cx - w / 2, y - s * 0.85, w, s * 0.2);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? "#3f4a33" : "#4a3b2c";
        c.fillRect(cx - w / 2 + s * 0.2 + i * s * 0.58, y - s * 1.05, s * 0.4, s * 0.2);
      }
    },
    bed(c, cx, y, s) {
      const w = s * 3.0, h = s * 0.62;
      box(c, cx - w / 2, y - h, w, h, "#332f28");
      c.fillStyle = "#413b31";
      c.fillRect(cx - w / 2, y - h - s * 0.14, w * 0.3, s * 0.16);
      c.fillStyle = "#4a4436";
      c.fillRect(cx - w / 2 + s * 0.1, y - h - s * 0.2, w - s * 0.2, s * 0.09);
      box(c, cx - w / 2 - s * 0.14, y - h - s * 0.5, w * 0.12, s * 0.55, "#2b2822");
    },
    shelf(c, cx, y, s) {
      const w = s * 1.5, h = s * 2.2;
      box(c, cx - w / 2, y - h, w, h, "#332d24");
      c.fillStyle = "#221e18";
      for (let i = 1; i <= 3; i++) c.fillRect(cx - w / 2 + 1, y - h + (h / 4) * i, w - 2, s * 0.07);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? "#463c2d" : "#39422f";
        c.fillRect(cx - w / 2 + s * 0.12 + (i % 3) * s * 0.4, y - h + s * 0.24 + Math.floor(i / 3) * (h / 4), s * 0.24, s * 0.42);
      }
    },
    sofa(c, cx, y, s) {
      const w = s * 3.0, h = s * 0.85;
      box(c, cx - w / 2, y - h, w, h, "#3b3428");
      c.fillStyle = "#453d2f";
      c.fillRect(cx - w / 2, y - h * 1.45, w, h * 0.5);
      c.fillStyle = "#312b21";
      c.fillRect(cx - w / 2 + s * 0.15, y - h, s * 0.3, h);
      c.fillRect(cx + w / 2 - s * 0.45, y - h, s * 0.3, h);
    },
  };

  // 每关人物剪影的色调：名字哈希，稳定又不撞色，不用额外维护一张表
  function hueOf(name) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
  }

  function person(c, cx, baseY, h, t, say, name) {
    const hue = hueOf(name);
    const top = "hsl(" + hue + ",16%,28%)";
    const bottom = "hsl(" + hue + ",12%,17%)";
    const skin = "hsl(" + hue + ",20%,34%)";
    const hair = "hsl(" + hue + ",14%,11%)";
    const bob = Math.sin(t / 640) * h * 0.014;
    const headR = h * 0.115;
    const hipY = baseY - h * 0.47;
    const shoulderY = baseY - h * 0.80 + bob;
    const headY = baseY - h + bob + headR;
    const bodyW = h * 0.30;

    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath(); c.ellipse(cx, baseY, h * 0.20, h * 0.035, 0, 0, 7); c.fill();

    c.strokeStyle = bottom; c.lineWidth = h * 0.095; c.lineCap = "round";
    c.beginPath(); c.moveTo(cx, hipY); c.lineTo(cx - h * 0.055, baseY); c.stroke();
    c.beginPath(); c.moveTo(cx, hipY); c.lineTo(cx + h * 0.055, baseY); c.stroke();

    c.fillStyle = top;
    c.beginPath();
    c.moveTo(cx - bodyW / 2, shoulderY + h * 0.06);
    c.lineTo(cx - bodyW / 2, hipY);
    c.lineTo(cx + bodyW / 2, hipY);
    c.lineTo(cx + bodyW / 2, shoulderY + h * 0.06);
    c.closePath(); c.fill();

    const swing = say ? Math.sin(t / 150) * 0.30 : Math.sin(t / 900) * 0.05;
    c.strokeStyle = top; c.lineWidth = h * 0.075;
    for (const dir of [-1, 1]) {
      const a = Math.PI / 2 - dir * (0.17 + swing * dir);
      c.beginPath();
      c.moveTo(cx + dir * bodyW * 0.42, shoulderY + h * 0.05);
      c.lineTo(cx + dir * bodyW * 0.42 + Math.cos(a) * h * 0.28, shoulderY + h * 0.05 + Math.sin(a) * h * 0.28);
      c.stroke();
    }

    c.fillStyle = skin;
    c.beginPath(); c.arc(cx, headY, headR, 0, 7); c.fill();
    c.fillStyle = hair;
    c.beginPath(); c.arc(cx, headY - headR * 0.10, headR * 1.02, Math.PI * 1.02, Math.PI * 1.98); c.fill();

    const blink = ((t / 1000 + rand(hue)) % 3.6) < 0.13;
    c.fillStyle = "rgba(12,12,9,0.9)";
    for (const dx of [-0.30, 0.30]) {
      if (blink) c.fillRect(cx + headR * dx - headR * 0.14, headY + headR * 0.05, headR * 0.28, 1.4);
      else { c.beginPath(); c.arc(cx + headR * dx, headY + headR * 0.08, headR * 0.10, 0, 7); c.fill(); }
    }
    const open = say ? 0.6 + Math.abs(Math.sin(t / 110)) * 0.9 : 0.25;
    c.fillStyle = "rgba(60,34,32,0.9)";
    c.beginPath(); c.ellipse(cx, headY + headR * 0.50, headR * 0.22, headR * 0.08 * open + 0.6, 0, 0, 7); c.fill();
  }

  // —— 三种地点 ——
  function indoor(c, x, y, w, h, t, stage, lc) {
    const vy = y + h * 0.68;
    const bx = x + w * 0.16, by = y + h * 0.18, ex = x + w * 0.84;
    quad(c, [x, y, x + w, y, ex, by, bx, by], "#0f0e09");
    quad(c, [x, y, bx, by, bx, vy, x, y + h], SIDE);
    quad(c, [x + w, y, ex, by, ex, vy, x + w, y + h], "#15140e");
    c.fillStyle = WALL; c.fillRect(bx, by, ex - bx, vy - by);
    quad(c, [x, y + h, x + w, y + h, ex, vy, bx, vy], FLOOR);

    const drift = Math.sin(t / 9000) * w * 0.04;
    if (stage.light === "window") {
      const wx = bx + (ex - bx) * 0.10, wy = by + (vy - by) * 0.22;
      const ww = (ex - bx) * 0.24, wh = (vy - by) * 0.34;
      c.fillStyle = "#3a3020"; c.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
      c.globalAlpha = lc.a + 0.5;
      c.fillStyle = lc.color; c.fillRect(wx, wy, ww, wh);
      c.globalAlpha = 1;
      c.fillStyle = "#1b1a14";
      c.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      c.fillRect(wx, wy + wh / 2 - 1, ww, 2);
      c.globalAlpha = lc.a;
      quad(c, [wx + drift, vy, wx + ww + drift, vy, wx + ww + w * 0.16 + drift, y + h, wx - w * 0.10 + drift, y + h], lc.color);
      c.globalAlpha = 1;
    } else {
      const lx = x + w * 0.50;
      c.fillStyle = "#15140e"; c.fillRect(lx - w * 0.06, y, w * 0.12, h * 0.03);
      c.globalAlpha = lc.a + 0.5;
      c.fillStyle = lc.color; c.fillRect(lx - w * 0.05, y + h * 0.025, w * 0.10, h * 0.008);
      c.globalAlpha = lc.a * 0.9;
      quad(c, [lx - w * 0.06, vy, lx + w * 0.06, vy, lx + w * 0.30 + drift, y + h, lx - w * 0.30 + drift, y + h], lc.color);
      c.globalAlpha = 1;
    }
    return { vy, front: y + h };
  }

  function corridor(c, x, y, w, h, t, stage, lc) {
    const vy = y + h * 0.66;
    const vx = x + w * 0.5, back = w * 0.30;
    quad(c, [x, y, x + w, y, vx + back / 2, vy - h * 0.42, vx - back / 2, vy - h * 0.42], "#0e0d09");
    quad(c, [x, y, vx - back / 2, vy - h * 0.42, vx - back / 2, vy, x, y + h], SIDE);
    quad(c, [x + w, y, vx + back / 2, vy - h * 0.42, vx + back / 2, vy, x + w, y + h], "#15140e");
    c.fillStyle = "#1e1d16";
    c.fillRect(vx - back / 2, vy - h * 0.42, back, h * 0.42);
    quad(c, [x, y + h, x + w, y + h, vx + back / 2, vy, vx - back / 2, vy], FLOOR);

    // 一扇一扇退过去的门
    for (let i = 1; i <= 3; i++) {
      const k = i / 3.6, dw = w * 0.10 * (1 - k * 0.5), dh = h * 0.30 * (1 - k * 0.55);
      const dy = vy - dh * (1 - k * 0.3);
      for (const side of [0, 1]) {
        const dx = side ? vx + back / 2 + (x + w - vx - back / 2) * k : vx - back / 2 - (vx - back / 2 - x) * k;
        c.fillStyle = side ? "#17160f" : "#141309";
        c.fillRect(dx - (side ? 0 : dw), dy, dw, dh);
        c.strokeStyle = "rgba(60,58,46,0.55)"; c.lineWidth = 1;
        c.strokeRect(dx - (side ? 0 : dw) + 0.5, dy + 0.5, dw - 1, dh - 1);
      }
    }
    // 声控灯：楼道里唯一的光
    const drift = Math.sin(t / 7000) * w * 0.03;
    c.globalAlpha = lc.a + 0.45;
    c.fillStyle = lc.color;
    c.fillRect(vx - w * 0.07, y + h * 0.06, w * 0.14, h * 0.012);
    c.globalAlpha = 1;
    c.globalAlpha = lc.a;
    quad(c, [vx - w * 0.09, vy, vx + w * 0.09, vy, vx + w * 0.34 + drift, y + h, vx - w * 0.34 + drift, y + h], lc.color);
    c.globalAlpha = 1;
    return { vy, front: y + h };
  }

  function street(c, x, y, w, h, t, stage, lc) {
    const vy = y + h * 0.60;
    const sky = c.createLinearGradient(0, y, 0, vy);
    sky.addColorStop(0, "#1a1a18");
    sky.addColorStop(1, "#4a402c");
    c.fillStyle = sky;
    c.fillRect(x, y, w, vy - y);
    c.globalAlpha = 0.35;
    c.fillStyle = lc.color;
    c.fillRect(x, vy - h * 0.06, w, h * 0.06);
    c.globalAlpha = 1;

    // 对面一排楼，越远越暗
    for (let i = 0; i < 7; i++) {
      const bw = w * (0.08 + rand(i * 4.3) * 0.10);
      const bh = h * (0.12 + rand(i * 8.1) * 0.22);
      const bx = x - w * 0.04 + i * w * 0.15 + Math.sin(t / 9000 + i) * 2;
      c.fillStyle = i % 2 ? "#1c1a15" : "#201e18";
      c.fillRect(bx, vy - bh, bw, bh);
      c.fillStyle = "rgba(217,164,65,0.10)";
      for (let k = 0; k < 3; k++) c.fillRect(bx + bw * 0.2 + (k % 2) * bw * 0.4, vy - bh + h * 0.05 * (1 + Math.floor(k / 2)), bw * 0.16, h * 0.03);
    }
    c.fillStyle = FLOOR;
    c.fillRect(x, vy, w, y + h - vy);
    c.strokeStyle = "rgba(14,13,9,0.5)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, vy + 0.5); c.lineTo(x + w, vy + 0.5); c.stroke();
    return { vy, front: y + h };
  }

  const WHERE = { indoor, corridor, street };

  // 画一条分镜。box 是这条带子在画布上的位置；npc 用来决定剪影的色调。
  function draw(c, box, t, stage, npc, talking) {
    const { x, y, w, h } = box;
    if (!stage) stage = {};
    const lc = LIGHT[stage.light] || LIGHT.lamp;
    const tint = stage.tint || lc.color;
    const lit = { color: tint, a: lc.a };

    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    try {
      drawInner(c, x, y, w, h, t, stage, lit, npc, talking);
    } finally {
      // 道具画挂了也不能把 canvas 关在剪裁里
      c.restore();
    }
  }

  function drawInner(c, x, y, w, h, t, stage, lit, npc, talking) {
    const pan = Math.sin(t / 9000) * w * 0.035;
    c.save();
    c.translate(pan, 0);
    const bg = (WHERE[stage.where] || indoor)(c, x - w * 0.04, y, w * 1.08, h, t, stage, lit);

    const props = (stage.props || []).map((name, i) => ({
      name,
      x: x + w * (rand(i * 5.1 + 2) < 0.5 ? 0.05 + rand(i * 3.3) * 0.22 : 0.54 + rand(i * 6.7) * 0.40),
      d: 0.20 + rand(i * 9.9) * 0.65,
    })).sort((a, b) => a.d - b.d);
    for (const p of props) {
      const fn = PROPS[p.name];
      if (!fn) continue;
      const py = bg.vy + (bg.front - bg.vy) * p.d;
      const s = h * (0.13 + p.d * 0.16);
      c.globalAlpha = 0.45 + p.d * 0.55;
      fn(c, p.x, py, s);
      c.globalAlpha = 1;
    }
    if (npc) person(c, x + w * 0.40, y + h * 0.99, h * 0.60, t, !!talking, npc);
    c.restore();

    // 灰
    for (let i = 0; i < 20; i++) {
      const sx = rand(i * 3.1), sy = rand(i * 7.7);
      const k = ((sy - (t / 9000 + i * 0.02)) % 1 + 1) % 1;
      c.globalAlpha = (1 - k) * 0.35;
      c.fillStyle = lit.color;
      c.fillRect(x + sx * w + pan * 0.4, bg.vy + (y + h - bg.vy) * k, 1.3, 1.3);
    }
    c.globalAlpha = 1;

    // 上下压暗：上面让 HUD 压得住，下面接回卡片背景
    const grad = c.createLinearGradient(0, y + h * 0.45, 0, y + h);
    grad.addColorStop(0, "rgba(20,20,15,0)");
    grad.addColorStop(1, "rgba(20,20,15,1)");
    c.fillStyle = grad;
    c.fillRect(x, y + h * 0.45, w, h * 0.55);
    const top = c.createLinearGradient(0, y, 0, y + h * 0.4);
    top.addColorStop(0, "rgba(20,20,15,0.9)");
    top.addColorStop(1, "rgba(20,20,15,0)");
    c.fillStyle = top;
    c.fillRect(x, y, w, h * 0.4);
  }

  const Scene = { draw, LIGHT, PROPS, WHERE };
  G.Scene = Scene;
  if (typeof module === "object" && module.exports) module.exports = Scene;
})();
