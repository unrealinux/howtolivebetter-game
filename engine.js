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
    return { idx: 0, life: START.life, money: START.money, freedom: START.freedom, right: 0, missed: [] };
  }

  // 返回新对象，不改传进来的 state
  function applyChoice(state, level, option) {
    const next = {
      ...state,
      life: state.life + option.effects.life,
      money: state.money + option.effects.money,
      freedom: state.freedom + option.effects.freedom,
    };
    if (option.ok) return { ...next, right: state.right + 1 };
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

  function deltaText(effects) {
    const sign = (v) => (v > 0 ? "+" : "") + v;
    const out = [];
    if (effects.life) out.push("❤️ " + sign(effects.life));
    if (effects.money) out.push("💰 " + sign(effects.money));
    if (effects.freedom) out.push("🧭 " + sign(effects.freedom));
    return out;
  }

  const Engine = {
    START, BANKRUPT, REPO_URL, bookURL,
    createState, applyChoice, advance, total, endingFor, deltaText,
  };
  G.Engine = Engine;
  if (typeof module === "object" && module.exports) module.exports = Engine;
})();
