// 共用逻辑层：不碰 DOM，也不碰 canvas。网页版和微信小游戏版都用这一份。
(function () {
  const G = typeof GameGlobal !== "undefined" ? GameGlobal : globalThis;

  const START = { life: 100, money: 50, freedom: 40 };
  const BANKRUPT = -20;
  const REPO_URL = "https://github.com/eternity4719/HowToLiveBetter";
  const BOOK_BASE = REPO_URL + "/blob/main/book/";
  const bookURL = (file) => BOOK_BASE + encodeURIComponent(file);

  const levels = () => G.LEVELS;

  function createState() {
    return { idx: 0, life: START.life, money: START.money, freedom: START.freedom, right: 0, missed: [], picks: [] };
  }

  // 返回新对象，不改传进来的 state
  function applyChoice(state, level, option) {
    const next = {
      ...state,
      life: state.life + option.effects.life,
      money: state.money + option.effects.money,
      freedom: state.freedom + option.effects.freedom,
      right: state.right + (option.ok ? 1 : 0),
      picks: state.picks.concat([
        { age: level.age, title: level.title, ok: !!option.ok, cite: option.cite, file: level.file },
      ]),
    };
    if (option.ok) return next;
    return {
      ...next,
      missed: state.missed.concat([
        { title: level.age + " 岁 · " + level.title, cite: option.cite, file: level.file },
      ]),
    };
  }

  function badFlag(s) {
    if (s.life <= 0) return "dead";
    if (s.freedom <= 0) return "jailed";
    if (s.money <= BANKRUPT) return "broke";
    return null;
  }

  // 点完「下一关」之后走这里
  function advance(state) {
    const flag = badFlag(state);
    if (flag) {
      const flags = {};
      flags[flag] = true;
      return { state, done: true, flags };
    }
    if (state.idx >= levels().length - 1) return { state, done: true, flags: {} };
    return { state: { ...state, idx: state.idx + 1 }, done: false, flags: null };
  }

  const total = (s) => s.life + s.money + s.freedom;

  function endingFor(state, flags) {
    const n = levels().length;
    const ratio = state.right / n;
    if (flags.dead)
      return { rank: "早死结局", desc: "命归零了。这一节排在全书第一位，理由不是它最有用，是它之后的事你都看不见了。" };
    if (flags.jailed)
      return { rank: "被告席结局", desc: "自由归零了。书里第 8 节的标题是「别把自己搭进去」——钱能再挣，这个不能。" };
    if (flags.broke)
      return { rank: "破产结局", desc: "钱跌穿了。书里第 5 节讲的就是这个：攒下的钱怎么才不被利息、费率和骗局吃掉。" };
    if (state.right === n)
      return { rank: "高性价比人生", desc: n + " 个路口全走对了。这种局在现实里不会出现，但选项本身都能做到。" };
    if (ratio >= 0.7) return { rank: "活得还不错", desc: "大部分坑绕开了。剩下的那几条，就是你还来得及补的。" };
    if (ratio >= 0.4) return { rank: "及格线上下", desc: "关键的几件事做对了，剩下的都是要花点毅力、但几乎不花钱的。" };
    return { rank: "踩着坑走完一生", desc: "书里那句话是对的：不用全做，挑走一两条就算数。下面这几条挑一条，这个月做掉。" };
  }

  function shareText(state, flags) {
    const { rank } = endingFor(state, flags);
    return (
      "《高性价比人生》" + rank + "：" +
      state.life + " 命 / " + state.money + " 钱 / " + state.freedom + " 自由，总分 " +
      total(state) + "，选对 " + state.right + "/" + levels().length + "。"
    );
  }

  function deltaText(effects) {
    const sign = (v) => (v > 0 ? "+" : "") + v;
    const out = [];
    if (effects.life) out.push("❤️ " + sign(effects.life));
    if (effects.money) out.push("💰 " + sign(effects.money));
    if (effects.freedom) out.push("🧭 " + sign(effects.freedom));
    return out;
  }

  // 存档里的字符串最后会进 DOM，逐条清洗；storage 是不可信输入
  function cleanEntries(list, isPick) {
    if (!Array.isArray(list)) return null;
    const out = [];
    for (const x of list) {
      if (!x || typeof x !== "object") return null;
      if (typeof x.title !== "string" || typeof x.cite !== "string" || typeof x.file !== "string") return null;
      if (isPick && (typeof x.ok !== "boolean" || !Number.isFinite(x.age))) return null;
      out.push(
        isPick
          ? { age: x.age, title: x.title, ok: x.ok, cite: x.cite, file: x.file }
          : { title: x.title, cite: x.cite, file: x.file }
      );
    }
    return out;
  }

  // 读档：坏了、改过、版本对不上，一律当没有存档
  function parseSave(raw) {
    let o;
    try {
      o = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    const s = o && o.state;
    if (!s || typeof s !== "object") return null;
    for (const k of ["idx", "life", "money", "freedom", "right"]) {
      if (typeof s[k] !== "number" || !Number.isFinite(s[k])) return null;
    }
    if (!Number.isInteger(s.idx) || s.idx < 0 || s.idx >= levels().length) return null;
    const missed = cleanEntries(s.missed, false);
    const picks = cleanEntries(s.picks, true);
    if (!missed || !picks) return null;
    const ci = o.chosenIndex;
    if (ci != null && (!Number.isInteger(ci) || ci < 0 || ci >= levels()[s.idx].options.length)) return null;
    return {
      state: { idx: s.idx, life: s.life, money: s.money, freedom: s.freedom, right: s.right, missed, picks },
      chosenIndex: ci == null ? null : ci,
    };
  }

  const saveString = (state, chosenIndex) =>
    JSON.stringify({ state, chosenIndex: chosenIndex == null ? null : chosenIndex });

  const Engine = {
    START, BANKRUPT, REPO_URL, bookURL,
    createState, applyChoice, advance, total, endingFor, deltaText, badFlag,
    parseSave, saveString, shareText,
  };
  G.Engine = Engine;
  if (typeof module === "object" && module.exports) module.exports = Engine;
})();
