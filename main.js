// Canvas 入口：网页 canvas 预览 和 微信小游戏 共用。
(function () {
  const G = typeof GameGlobal !== "undefined" ? GameGlobal : globalThis;
  const P = G.Platform, E = G.Engine, UI = G.UI, LEVELS = G.LEVELS;

  const s = P.sys();
  const geom = { w: s.w, h: s.h, dpr: s.dpr, safeTop: s.safeTop, safeBottom: s.safeBottom, top: 0, bottom: 0 };

  const canvas = P.canvas();
  canvas.width = geom.w * geom.dpr;
  canvas.height = geom.h * geom.dpr;
  if (canvas.style) {
    canvas.style.width = geom.w + "px";
    canvas.style.height = geom.h + "px";
  }
  const ctx = canvas.getContext("2d");
  ctx.scale(geom.dpr, geom.dpr);

  const view = { screen: "start", state: E.createState(), chosen: null, flags: {}, dock: "开始这一生", scroll: 0 };
  let layout = null;

  function bands() {
    geom.top = (view.screen === "play" ? 62 : 12) + geom.safeTop;
    geom.bottom = 64 + geom.safeBottom;
  }

  const maxScroll = () => Math.max(0, layout.height - (geom.h - geom.top - geom.bottom));

  function clampScroll() {
    view.scroll = Math.max(0, Math.min(view.scroll, maxScroll()));
  }

  function draw() {
    bands();
    layout = UI.build(ctx, view, geom);
    clampScroll();
    UI.render(ctx, view, geom, layout, view.scroll);
  }

  const chosenIndex = () => (view.chosen ? LEVELS[view.state.idx].options.indexOf(view.chosen) : null);
  const save = () => P.save(E.saveString(view.state, chosenIndex()));

  function gotoStart() {
    view.screen = "start";
    view.state = E.createState();
    view.chosen = null;
    view.flags = {};
    view.dock = "开始这一生";
    view.scroll = 0;
    P.clear();
    draw();
  }

  function gotoLevel() {
    view.screen = "play";
    view.chosen = null;
    view.scroll = 0;
    view.dock = E.badFlag(view.state) ? "看看结局" : view.state.idx === LEVELS.length - 1 ? "走完这一生" : "下一关";
    save();
    draw();
  }

  function gotoEnd(flags) {
    view.screen = "end";
    view.flags = flags;
    view.dock = "再来一次";
    view.scroll = 0;
    P.clear();
    draw();
  }

  function pickOption(i) {
    if (view.chosen) return;
    const lv = LEVELS[view.state.idx];
    if (!lv.options[i]) return;
    view.chosen = lv.options[i];
    view.state = E.applyChoice(view.state, lv, view.chosen);
    save();
    draw();
  }

  function onAction() {
    if (view.screen === "start") return gotoLevel();
    if (view.screen === "play") {
      if (!view.chosen) return;
      const r = E.advance(view.state);
      view.state = r.state;
      return r.done ? gotoEnd(r.flags) : gotoLevel();
    }
    gotoStart();
  }

  let down = null;
  P.bind({
    start(x, y) {
      down = { x, y, scroll: view.scroll, moved: false };
    },
    move(x, y) {
      if (!down) return;
      const dy = y - down.y;
      if (Math.abs(dy) > 6) down.moved = true;
      if (!down.moved) return;
      view.scroll = down.scroll - dy;
      clampScroll();
      UI.render(ctx, view, geom, layout, view.scroll);
    },
    end(x, y) {
      if (!down) return;
      const moved = down.moved;
      down = null;
      if (moved) return;
      const act = UI.hit(layout, view.scroll, x, y, geom);
      if (!act) return;
      if (act.type === "action") onAction();
      else if (act.type === "option") pickOption(act.index);
      else if (act.type === "copy") P.openURL(act.url);
      else if (act.type === "share") P.share(act.text);
    },
    // 键盘走这里，和点击共用同一套动作
    key(type, index) {
      if (type !== "pick") return onAction();
      if (view.screen === "play") pickOption(index);
    },
  });

  G.__view = () => ({ view, layout, geom });

  // 有存档就直接回到那一关，没有就从头开始
  const saved = E.parseSave(P.load());
  if (saved) {
    view.state = saved.state;
    gotoLevel();
    if (saved.chosenIndex != null) {
      view.chosen = LEVELS[view.state.idx].options[saved.chosenIndex];
      save();
      draw();
    }
  } else {
    gotoStart();
  }
})();
