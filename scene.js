// 分镜条：像素风。整条带子画在一个 u×u 的格子上，地点、道具、人物全是代码里的像素画，
// 零图片资源（README 的卖点）。动画按 STEP 毫秒一格步进，不搞平滑——像素风的动画片间距。
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

  const INK = "#0f0e09";
  const WALL = "#24231b", FLOOR = "#2b2921", SIDE = "#191812";
  const STEP = 180; // 一格的毫秒数

  const rand = (s) => { const v = Math.sin(s * 127.1) * 43758.5453; return v - Math.floor(v); };

  // 两种纯色按 k 揉一夜。只认 #rrggbb，别的原样退回，拦住 tint 写错时的 NaN
  function mix(c1, c2, k) {
    if (!/^#[0-9a-fA-F]{6}$/.test(c1) || !/^#[0-9a-fA-F]{6}$/.test(c2)) return c2;
    const p = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));
    const a = p(c1), d = p(c2);
    return "#" + a.map((v, i) => Math.round(v + (d[i] - v) * k).toString(16).padStart(2, "0")).join("");
  }

  // 把 canvas 收窄成 u×u 的格子。传进来的全是格子坐标，量化之后整块 fillRect。
  // 像素风的全部秘密就这一行：永不出现半格。
  function painter(c, u, ox, oy) {
    return (cx, cy, cw, ch, color, alpha) => {
      if (alpha != null) c.globalAlpha = alpha;
      c.fillStyle = color;
      c.fillRect(ox + Math.round(cx) * u, oy + Math.round(cy) * u, Math.round(cw) * u, Math.round(ch) * u);
      if (alpha != null) c.globalAlpha = 1;
    };
  }

  // 一束光：从 topRow 往下铺成三角形，slant 控制往哪边斜
  function shaft(b, cx, topRow, rows, tint, a, spread, slant) {
    for (let r = Math.max(0, topRow); r < rows; r++) {
      const k = (r - topRow) / Math.max(1, rows - topRow);
      const g = 2 + Math.round(spread * k);
      b(cx - Math.round(g / 2) + Math.round(slant * k), r, g, 1, tint, a);
    }
  }

  // —— 三种地点，全部按格画 ——
  function indoor(b, cols, rows, tm, st, lc, tint) {
    const y0 = Math.max(2, Math.round(rows * 0.16));
    const fy = Math.round(rows * 0.62);
    // 屋顶：一格一级，越往下开口越宽（房檐透视）
    for (let r = 0; r < y0; r++) {
      const k = Math.round((1 - r / y0) * Math.max(2, cols * 0.14));
      b(-3, r, 3 + k, 1, SIDE);
      b(cols - k, r, 3 + k, 1, SIDE);
    }
    b(-3, y0, cols + 6, fy - y0, WALL);
    // 两侧的暗角
    const sw = 3 + Math.round(cols * 0.07);
    b(-3, y0, sw, fy - y0, SIDE);
    b(cols - sw, y0, sw, fy - y0, SIDE);

    if (st.light === "window") {
      const wx = Math.round(cols * 0.18), wy = Math.round(rows * 0.3);
      const ww = Math.max(6, Math.round(cols * 0.2)), wh = Math.max(4, Math.round((fy - y0) * 0.6));
      b(wx - 1, wy - 1, ww + 2, wh + 2, INK);        // 窗框
      b(wx, wy, ww, wh, tint, 0.9);                  // 玻璃
      b(wx + Math.round(ww / 2), wy, 1, wh, INK);    // 中梃
      b(wx, wy + Math.round(wh / 2), ww, 1, INK);    // 中横
      // 光斑斜着铺进屋
      shaft(b, wx + Math.round(ww / 2), wy + wh, rows, tint, lc.a, Math.round(cols * 0.26), 2 + Math.round(cols * 0.08));
    } else {
      const cx = Math.round(cols * 0.5);
      b(cx - 2, 1, 4, 1, INK);                       // 灯座
      b(cx - 1, 2, 2, 1, tint, 0.9);                 // 灯管亮两格
      shaft(b, cx, 3, rows, lc.color, lc.a, Math.round(cols * 0.4), 0);
    }
    // 地板 + 一条线脚，再打一排浅浅的板缝
    b(-3, fy, cols + 6, rows - fy, FLOOR);
    b(-3, fy, cols + 6, 1, INK, 0.55);
    for (let gx = 2; gx < cols; gx += 4) b(gx, fy + 1, 1, rows - fy - 1, "#1c1a12", 0.3);
  }

  function corridor(b, cols, rows, tm, st, lc, tint) {
    const y0 = Math.max(3, Math.round(rows * 0.22));
    const fy = Math.round(rows * 0.62);
    const backW = Math.max(6, Math.round(cols * 0.26));
    const bx0 = Math.round((cols - backW) / 2);
    // 顶部向走廊深处收进去
    b(-3, 0, cols + 6, y0, "#0e0d09");
    for (let r = 0; r < y0; r++) {
      const k = Math.round((1 - r / y0) * bx0);
      b(-3, r, 3 + k, 1, SIDE);
      b(cols - k, r, 3 + k, 1, SIDE);
    }
    // 两侧的墙往下往里收，尽头一面后墙
    for (let r = y0; r < fy; r++) {
      const k = Math.max(1, Math.round(bx0 * ((r - y0) / Math.max(1, fy - y0))));
      b(-3, r, 3 + k, 1, "#191712");
      b(cols - k, r, 3 + k, 1, "#191712");
    }
    b(bx0, y0, backW, fy - y0, "#15140e");
    // 一扇一扇退过去的门
    for (const side of [-1, 1]) {
      for (let i = 1; i <= 3; i++) {
        const k = i / 3;
        const dw = Math.max(2, 4 - i);
        const dh = Math.max(3, Math.round((fy - y0) * (0.68 - k * 0.2)));
        const yb = fy - Math.max(0, Math.round((fy - y0) * (0.16 - k * 0.08)));
        const dx = side < 0 ? Math.max(0, Math.round(bx0 * k * 0.75)) : cols - Math.round(bx0 * k * 0.75) - dw;
        b(dx - 1, yb - dh, dw + 2, dh + 1, INK);              // 门框
        b(dx, yb - dh + 1, dw, dh - 1, "#1b1a12");            // 门板
        b(dx + dw - 1, yb - Math.round(dh * 0.55), 1, 1, "#5c5646"); // 把手
      }
    }
    // 声控灯：楼道里唯一的光。隔一阵暗一下，光通到地面
    const on = Math.floor(tm / 2600) % 4 !== 0;
    const cx = Math.round(cols / 2);
    b(cx - 3, 1, 6, 1, INK);
    b(cx - 1, 2, 2, 1, tint, 0.9);
    shaft(b, cx, 3, fy, lc.color, on ? lc.a : lc.a * 0.3, Math.round(cols * 0.3), 0);
    // 地面
    b(-3, fy, cols + 6, rows - fy, FLOOR);
    b(-3, fy, cols + 6, 1, INK, 0.5);
  }

  function street(b, cols, rows, tm, st, lc, tint) {
    const fy = Math.round(rows * 0.6);
    // 天：压成 5 条纯色带，像素风不吃渐变
    const bandH = Math.max(1, Math.ceil(fy / 5));
    for (let i = 0; i < 5; i++) b(-3, i * bandH, cols + 6, bandH, mix("#17150f", "#4a402c", i / 4));
    // 对面一排楼
    for (let i = 0; i < cols; i += 4) {
      const bw = 3 + Math.round(rand(i * 4.3) * 2);
      const bh = 2 + Math.round(rand(i * 8.1) * (fy * 0.55));
      const bx = i + Math.round(rand(i * 2.7) * 2);
      b(bx, fy - bh, bw, bh, i % 2 ? "#1c1a15" : "#211f18");
      const lit = 1 + Math.floor(rand(i * 5.5) * 3);
      for (let k = 0; k < lit; k++) {
        b(bx + 1 + (k % 2) * 2, fy - bh + 1 + Math.floor(k / 2) * 2, 1, 1, "#d9a441", 0.5);
      }
    }
    // 路灯两根：杆、帽、亮一格的灯头，地上拖一小片光
    for (const gx of [Math.round(cols * 0.16), Math.round(cols * 0.78)]) {
      const top = Math.max(1, fy - 8);
      b(gx, top, 2, fy - top, "#100f0a");
      b(gx - 1, top - 1, 4, 1, "#100f0a");
      b(gx, top, 1, 2, tint, 0.85);
      for (let k = 0; k < 3; k++) b(gx - 3 + k, fy + 1 + k, 7 - k * 2, 1, tint, lc.a * (1 - k * 0.25));
    }
    // 路面 + 远处车灯那一条 + 一条会动的虚线
    b(-3, fy, cols + 6, rows - fy, FLOOR);
    b(-3, fy, cols + 6, 1, INK, 0.55);
    b(-3, fy, cols + 6, 1, lc.color, 0.3);
    const dash = Math.floor(tm / 450) % 5;
    for (let gx = -3 + dash; gx < cols + 3; gx += 5) b(gx, fy + 2, 2, 1, "#4a4436");
  }

  const WHERE = { indoor, corridor, street };

  // —— 道具的像素图：字符串就是图纸，「.」是空，一个字符一格 ——
  // 道具名单是公开的（check.mjs 靠它校验 levels.js 里有没写错名字）
  const SPRITE = {
    carton: {
      colors: { O: "#4c4130", D: "#2b251d", L: "#5a4f3c" },
      rows: ["..LL..", ".LOOO.", ".OOOO.", ".OOOO.", ".DDDD.", "DDDDDD"],
    },
    box: {
      colors: { O: "#3d3629", D: "#262019", L: "#4a4232" },
      rows: [".LLLL.", ".LOOO.", ".OOOD.", "DDDDDD"],
    },
    door: {
      colors: { F: "#15130d", O: "#221f17", L: "#2b2820", P: "#6b6454" },
      rows: [
        "FFFFFFF", "FOOOOOF", "FOOOOOF", "FOOOOOF",
        "FOLOLOF", "FOOOOOF", "FOOOOOF", "FOLOLOF",
        "FOOOOOF", "FOOOOOF", "FOOOOOF", "FOOOPOF",
      ],
    },
    table: {
      colors: { O: "#403526", D: "#262019" },
      rows: [
        ".OOOOOOOOOOOO.", ".OOOOOOOOOOOO.",
        ".DD........DD.", ".DD........DD.",
        ".DD........DD.", ".DD........DD.",
      ],
    },
    desk: {
      colors: { O: "#403526", D: "#262019", M: "#7fa8d1" },
      rows: [
        "....MMMM......", "....MMMM......",
        ".OOOOOOOOOOOO.", ".OOOOOOOOOOOO.",
        ".DD........DD.",
        ".DD..OOO..DD..",
        ".DD........DD.",
      ],
    },
    chair: {
      colors: { O: "#453d2f", D: "#332d24" },
      rows: ["..DD..", "..OD..", "..OD..", "..DD..", ".DDDD.", ".DDDD.", "D....D"],
    },
    bottle: {
      colors: { O: "#2f3a2c", D: "#1e251c", L: "#4a5443" },
      rows: [".L.", ".L.", ".O.", ".O.", ".O.", ".D."],
    },
    scooter: {
      colors: { T: "#4a463c", O: "#3d3a33", L: "#d9a441", D: "#23211c" },
      rows: [
        "......TT..", ".....TT...",
        "...OOOO...", "..LOOOO...",
        "..OOOO....", "..OOOO....",
        "DD.....DD.", "DDD...DDD.",
      ],
    },
    stall: {
      colors: { A: "#4a4436", B: "#3a342a", D: "#262218", O: "#3b3529", G: "#3f4a33" },
      rows: [
        "AAAAAAAAAAAAAAA", "ABABABABABABABA",
        ".D...........D.", ".D...........D.",
        ".D...........D.",
        ".GG.BB.GG.BB.G.",
        ".OOOOOOOOOOOOO.", ".DD.........DD.",
      ],
    },
    bed: {
      colors: { O: "#332f28", D: "#262218", L: "#4a4436" },
      rows: [
        "D.DDDDDDDDD...",
        "DLOOOOOOOOO...",
        ".OOOOOOOOOO...",
        "LLLLLLLLLLLL..",
        ".DD........DD.",
      ],
    },
    shelf: {
      colors: { O: "#332d24", G: "#463c2d", B: "#39422f", F: "#26231c" },
      rows: [
        "OOOOOO", "OGOBO.", "OOOOOO", "OB..GO",
        "OOOOOO", "OGOBO.", "OOOOOO", "B..GOB",
        "OOOOOO", ".FFFF.",
      ],
    },
    sofa: {
      colors: { A: "#3b3428", O: "#453d2f", F: "#312b21", D: "#26231c" },
      rows: [
        "AAAAAAAAAAAAAAA",
        "AOOOOOOOOOOOOOA",
        "AOOOOOOOOOOOOOA",
        "AFFFFFFFFFFFFFA",
        ".DD.........DD.",
      ],
    },
  };

  function drawSprite(b, spr, cx, yb, alpha) {
    const n = spr.rows.length;
    const w = Math.max.apply(null, spr.rows.map((r) => r.length));
    const x0 = cx - Math.round(w / 2);
    for (let r = 0; r < n; r++) {
      const line = spr.rows[r];
      for (let i = 0; i < line.length; i++) {
        const color = spr.colors[line[i]];
        if (color) b(x0 + i, yb - n + r, 1, 1, color, alpha);
      }
    }
  }

  function drawProps(b, cols, rows, fy, props, vp) {
    if (!props) return;
    const list = props.map((name, i) => ({
      name,
      cx: 2 + Math.floor(rand(i * 5.1 + 2) * Math.max(1, cols - 8)),
      d: 0.2 + rand(i * 9.9) * 0.65,
    })).sort((p, q) => p.d - q.d);
    for (const p of list) {
      const spr = SPRITE[p.name];
      if (!spr) continue;
      // 地脚收到压暗带之上，别让近景的道具沉在暗里看不见
      const yb = Math.max(fy, Math.min(rows - 1 - vp, Math.round(fy + 1 + (rows - 2 - fy) * p.d)));
      drawSprite(b, spr, p.cx, yb, 0.5 + p.d * 0.5);
    }
  }

  // 人物剪影：像素小人，一共 ~14 格高。色调从名字哈希出来，跟旧版一张脸
  function hueOf(name) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
  }

  function person(b, cx, rows, tm, name, talking, feet) {
    const hue = hueOf(name);
    const top = "hsl(" + hue + ",16%,28%)";
    const bottom = "hsl(" + hue + ",12%,17%)";
    const skin = "hsl(" + hue + ",20%,34%)";
    const hair = "hsl(" + hue + ",14%,11%)";
    const bob = Math.floor(tm / 1300) % 2;              // 呼吸：隔一会儿整个下移一格
    const blink = Math.floor(tm / 2600) % 8 === 0;      // 眨眼
    const y0 = feet - 13 + bob;

    // 头（6 格）：发顶、两侧鬓角、脸
    b(cx - 1, y0, 3, 1, hair);
    b(cx - 2, y0 + 1, 5, 1, hair);
    for (let r = 0; r < 3; r++) {
      b(cx - 2, y0 + 2 + r, 1, 1, hair);
      b(cx + 2, y0 + 2 + r, 1, 1, hair);
    }
    b(cx - 1, y0 + 2, 3, 1, skin);
    if (!blink) {
      b(cx - 1, y0 + 3, 1, 1, "#101008");               // 眼
      b(cx + 1, y0 + 3, 1, 1, "#101008");
    }
    b(cx - 1, y0 + 4, 3, 1, skin);
    if (talking) b(cx, y0 + 5, 1, 1, "#60241f");        // 说话：嘴张开一格
    else b(cx - 1, y0 + 5, 3, 1, skin);
    // 身体（4 格高）+ 胳膊：安静就垂着，说话就挥
    b(cx, y0 + 6, 1, 1, skin);                          // 脖子
    b(cx - 2, y0 + 6, 5, 4, top);
    if (talking) {
      b(cx - 3, y0 + 6, 1, 2, top);
      b(cx + 3, y0 + 6, 1, 2, top);
      if (Math.floor(tm / 360) % 2) {
        b(cx - 4, y0 + 5, 1, 1, top);
        b(cx + 4, y0 + 5, 1, 1, top);
      }
    } else {
      b(cx - 3, y0 + 7, 1, 3, top);
      b(cx + 3, y0 + 7, 1, 3, top);
    }
    // 腿（4 格）
    b(cx - 2, y0 + 10, 1, 4, bottom);
    b(cx + 1, y0 + 10, 1, 4, bottom);
    // 影子
    b(cx - 2, Math.min(rows - 1, feet + 1), 6, 1, "#000000", 0.3);
  }

  // 尘：几粒缓慢下沉的小方点，还是整格
  function drawAmbient(b, cols, rows, fy, tm, tint) {
    for (let i = 0; i < 14; i++) {
      const sx = Math.floor(rand(i * 3.1) * cols);
      const k = ((i * 9 + Math.floor(tm / 600)) % 37) / 37;
      b(sx, Math.floor(fy + k * (rows - fy)), 1, 1, tint, (1 - k) * 0.3);
    }
  }

  // 上下压暗：一条一条叠下去。像素风不吃渐变，改吃箍。
  // 深度跟带子高走（约 12% 行数），人站在箍上面而不是箍里。
  function vignette(b, cols, rows, vp) {
    b(-3, 0, cols + 6, 2, "rgba(18,17,12,0.85)");
    b(-3, 2, cols + 6, 2, "rgba(18,17,12,0.4)");
    for (let i = 0; i < vp; i++) {
      b(-3, rows - vp + i, cols + 6, 1, "rgba(20,20,15," + (0.2 + i * (0.65 / Math.max(1, vp - 1))).toFixed(2) + ")");
    }
  }

  function drawScene(c, u, box, tm, stage, lc, tint, npc, talking) {
    const { x, y, w, h } = box;
    const cols = Math.ceil(w / u), rows = Math.ceil(h / u);
    const fy = Math.round(rows * 0.62);
    // 压暗带吃多深：随带子高缩，人物和道具都站在它上面
    const vp = Math.max(2, Math.round(rows * 0.12));
    // 横移：背景整格挪，道具和人挪得少些，凑出前后两层
    const pan = Math.round(Math.sin(tm / 7200) * 2.2);
    const bg = painter(c, u, x + pan * u, y);
    const fg = painter(c, u, x + Math.round(pan * 0.45) * u, y);
    const base = painter(c, u, x, y);

    bg(-3, 0, cols + 6, rows, "#14140f");               // 打底，横移不露底
    (WHERE[stage.where] || indoor)(bg, cols, rows, tm, stage, lc, tint);
    drawProps(fg, cols, rows, fy, stage.props, vp);
    if (npc) person(fg, Math.max(3, Math.min(cols - 4, Math.round(cols * 0.42))), rows, tm, npc, !!talking, rows - 1 - vp);
    drawAmbient(base, cols, rows, fy, tm, tint);
    vignette(base, cols, rows, vp);
  }

  // 画一条分镜。box 是这条带子在画布上的位置；npc 用来决定剪影的色调。
  function draw(c, box, t, stage, npc, talking) {
    const { x, y, w, h } = box;
    if (!stage) stage = {};
    // 所有会动的只在整数格上变化：
    const tm = Math.floor((t || 0) / STEP) * STEP;
    const u = Math.max(3, Math.round(h / 30));
    const lc = LIGHT[stage.light] || LIGHT.lamp;
    const tint = stage.tint || lc.color;

    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    try {
      drawScene(c, u, box, tm, stage, lc, tint, npc, talking);
    } finally {
      // 道具画挂了也不能把 canvas 关在剪裁里
      c.restore();
    }
  }

  const Scene = { draw, LIGHT, PROPS: SPRITE, WHERE };
  G.Scene = Scene;
  if (typeof module === "object" && module.exports) module.exports = Scene;
})();
