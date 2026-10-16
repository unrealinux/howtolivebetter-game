// 网页版渲染层：只负责 DOM。逻辑全在 engine.js。
(function () {
  const E = globalThis.Engine;
  const LEVELS = globalThis.LEVELS;
  const P = globalThis.Platform;

  let state = E.createState();
  let chosen = null;
  let endFlags = {};

  const $ = (id) => document.getElementById(id);

  // 结局页一行：正文 + 出处，都链回原书
  function endRow(title, cite, file) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = E.bookURL(file);
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = title;
    const span = document.createElement("span");
    span.textContent = cite;
    li.appendChild(a);
    li.appendChild(span);
    return li;
  }

  function show(id) {
    for (const s of document.querySelectorAll(".screen")) s.classList.add("hidden");
    $(id).classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  function renderHud() {
    $("v-life").textContent = state.life;
    $("v-money").textContent = state.money;
    $("v-freedom").textContent = state.freedom;
    $("v-progress").textContent = Math.min(state.idx + 1, LEVELS.length) + "/" + LEVELS.length;
  }

  const chosenIndex = () => (chosen ? LEVELS[state.idx].options.indexOf(chosen) : null);
  const save = () => P.save(E.saveString(state, chosenIndex()));

  function renderLevel() {
    const lv = LEVELS[state.idx];
    chosen = null;
    renderHud();
    $("s-age").textContent = lv.age + " 岁";
    $("s-title").textContent = lv.title;
    $("s-scene").textContent = lv.scene;
    $("s-npc-name").textContent = lv.npc.name;
    $("s-npc-line").textContent = "「" + lv.npc.line + "」";
    $("result").classList.add("hidden");

    const box = $("options");
    box.innerHTML = "";
    box.classList.remove("hidden");
    lv.options.forEach((op, i) => {
      const b = document.createElement("button");
      b.textContent = i + 1 + ". " + op.text;
      b.addEventListener("click", () => choose(op));
      box.appendChild(b);
    });
    save();
  }

  function renderResult(op) {
    const lv = LEVELS[state.idx];
    $("options").classList.add("hidden");
    $("result").classList.remove("hidden");

    const d = E.deltaText(op.effects);
    $("s-delta").innerHTML =
      (op.ok ? "<span class='up'>选对了。</span>" : "<span class='down'>这一下记住了。</span>") +
      (d.length ? "　<span class='up'>" + d.join("　") + "</span>" : "");
    $("s-outcome").textContent = op.result;
    $("s-cite").textContent = op.cite;
    $("s-link").href = E.bookURL(lv.file);
    $("btn-next").textContent = E.badFlag(state) ? "看看结局" : state.idx === LEVELS.length - 1 ? "走完这一生" : "下一关";
  }

  function choose(op) {
    state = E.applyChoice(state, LEVELS[state.idx], op);
    chosen = op;
    renderHud();
    save();
    renderResult(op);
  }

  function next() {
    const r = E.advance(state);
    state = r.state;
    if (!r.done) return renderLevel();
    end(r.flags);
  }

  function end(flags) {
    P.clear();
    endFlags = flags;
    show("screen-end");
    const { rank, desc } = E.endingFor(state, flags);
    $("e-rank").textContent = rank;
    $("e-desc").textContent = desc;
    $("e-stats").innerHTML = [
      ["❤️ 命", state.life],
      ["💰 钱", state.money],
      ["🧭 自由", state.freedom],
      ["总分", E.total(state)],
      ["选对了", state.right + "/" + LEVELS.length],
    ]
      .map(([k, v]) => "<div><b>" + k + "</b><span>" + v + "</span></div>")
      .join("");

    const ul = $("e-missed");
    ul.textContent = "";
    if (!state.missed.length) {
      const li = document.createElement("li");
      li.textContent = "没有。这一局你一条都没漏。";
      const span = document.createElement("span");
      span.textContent = "去书里挑一条你还没做到的，这个月做掉。";
      li.appendChild(span);
      ul.appendChild(li);
    }
    for (const m of state.missed) ul.appendChild(endRow(m.title, m.cite, m.file));

    const ulp = $("e-picks");
    ulp.textContent = "";
    for (const p of state.picks) {
      const li = endRow((p.ok ? "✓ " : "✗ ") + p.age + " 岁 · " + p.title, p.cite, p.file);
      if (p.ok) li.className = "ok";
      ulp.appendChild(li);
    }
  }

  $("btn-start").addEventListener("click", () => {
    show("screen-play");
    renderLevel();
  });
  $("btn-next").addEventListener("click", next);
  $("btn-share").addEventListener("click", () => {
    const btn = $("btn-share");
    P.share(E.shareText(state, endFlags)).then((ok) => {
      if (ok) btn.textContent = "已复制 ✓";
    });
  });
  $("btn-restart").addEventListener("click", () => {
    state = E.createState();
    show("screen-play");
    renderLevel();
  });

  // 调试用：无头浏览器里跑一遍全对路径
  globalThis.__webDebug = () => ({ state, chosen, LEVELS });

  // 有存档就直接回到那一关，没有就停在开始页
  const saved = E.parseSave(P.load());
  if (saved) {
    state = saved.state;
    show("screen-play");
    renderLevel();
    if (saved.chosenIndex != null) {
      chosen = LEVELS[state.idx].options[saved.chosenIndex];
      save();
      renderResult(chosen);
    }
  }
})();
