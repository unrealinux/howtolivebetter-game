// 网页版渲染层：只负责 DOM。逻辑全在 engine.js。
(function () {
  const E = globalThis.Engine;
  const LEVELS = globalThis.LEVELS;

  let state = E.createState();
  let chosen = null;

  const $ = (id) => document.getElementById(id);

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
  }

  function choose(op) {
    const lv = LEVELS[state.idx];
    chosen = op;
    state = E.applyChoice(state, lv, op);
    renderHud();

    $("options").classList.add("hidden");
    $("result").classList.remove("hidden");

    const d = E.deltaText(op.effects);
    $("s-delta").innerHTML =
      (op.ok ? "<span class='up'>选对了。</span>" : "<span class='down'>这一下记住了。</span>") +
      (d.length ? "　<span class='up'>" + d.join("　") + "</span>" : "");
    $("s-outcome").textContent = op.result;
    $("s-cite").textContent = op.cite;
    $("s-link").href = E.bookURL(lv.file);
    $("btn-next").textContent = state.idx === LEVELS.length - 1 ? "走完这一生" : "下一关";
  }

  function next() {
    const r = E.advance(state);
    state = r.state;
    if (!r.done) return renderLevel();
    end(r.flags);
  }

  function end(flags) {
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
    ul.innerHTML = "";
    if (!state.missed.length) {
      ul.innerHTML = "<li>没有。这一局你一条都没漏。<span>去书里挑一条你还没做到的，这个月做掉。</span></li>";
    }
    for (const m of state.missed) {
      const li = document.createElement("li");
      li.innerHTML =
        "<a href='" + E.bookURL(m.file) + "' target='_blank' rel='noopener'>" + m.title + "</a><span>" + m.cite + "</span>";
      ul.appendChild(li);
    }
  }

  $("btn-start").addEventListener("click", () => {
    show("screen-play");
    renderLevel();
  });
  $("btn-next").addEventListener("click", next);
  $("btn-restart").addEventListener("click", () => {
    state = E.createState();
    show("screen-play");
    renderLevel();
  });

  // 调试用：无头浏览器里跑一遍全对路径
  globalThis.__webDebug = () => ({ state, chosen, LEVELS });
})();
