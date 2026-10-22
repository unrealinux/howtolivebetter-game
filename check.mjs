// 关卡数据自检：node check.mjs
// 改完 levels.js 跑一次。查字段、选项数，算一遍最好和最坏两条路能不能走完，
// 再打出调参用的数值轨迹，和「错一步救不回来」的口子都落在哪几关。
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PROPS, WHERE, LIGHT } = require("./scene.js");
const Engine = require("./engine.js");

const here = new URL(".", import.meta.url);
const src = readFileSync(new URL("levels.js", here), "utf8");
eval(src + "\nglobalThis.__LEVELS = globalThis.LEVELS;");
const LEVELS = globalThis.__LEVELS;

const problems = [];
const need = ["age", "title", "scene", "npc", "file"];

LEVELS.forEach((lv, i) => {
  for (const k of need) if (!lv[k]) problems.push(`第 ${i + 1} 关缺字段 ${k}`);
  if (lv.options.length !== 3) problems.push(`${lv.age} 岁：选项数 ${lv.options.length}，应为 3`);
  if (lv.options.filter((o) => o.ok).length !== 1) problems.push(`${lv.age} 岁：正确选项不是 1 个`);

  // 分镜条画什么（scene.js）。字段写错只会画出一条空带子，不会报错，所以在这查。
  const st = lv.stage;
  if (!st) problems.push(`${lv.age} 岁：缺 stage（分镜条画什么）`);
  else {
    if (!WHERE[st.where]) problems.push(`${lv.age} 岁：stage.where「${st.where}」没有这个地点`);
    if (!LIGHT[st.light]) problems.push(`${lv.age} 岁：stage.light「${st.light}」没有这种光`);
    if (st.tint && !/^#[0-9a-f]{6}$/i.test(st.tint)) problems.push(`${lv.age} 岁：stage.tint「${st.tint}」不是 #rrggbb`);
    if (!st.props || !st.props.length) problems.push(`${lv.age} 岁：stage.props 是空的`);
    for (const p of st.props || []) if (!PROPS[p]) problems.push(`${lv.age} 岁：stage.props 里的「${p}」没有这个道具`);
  }
  lv.options.forEach((o, j) => {
    for (const k of ["life", "money", "freedom"]) {
      if (typeof o.effects?.[k] !== "number") problems.push(`${lv.age} 岁第 ${j + 1} 项缺 effects.${k}`);
    }
    if (!o.text || !o.result || !o.cite) problems.push(`${lv.age} 岁第 ${j + 1} 项缺正文`);
    if (!/^第 \d+ 节第 \d+ 条/.test(o.cite)) problems.push(`${lv.age} 岁第 ${j + 1} 项 cite 格式不对：${o.cite}`);
  });
});

const best = { life: 100, money: 50, freedom: 40 };
const worst = { life: 100, money: 50, freedom: 40 };
for (const lv of LEVELS) {
  const ok = lv.options.find((o) => o.ok);
  for (const k of Object.keys(best)) {
    best[k] += ok.effects[k];
    worst[k] += Math.min(...lv.options.map((o) => o.effects[k]));
  }
}

if (problems.length) {
  console.error("发现问题：");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

// 数值和坏结局的阈值都出自 engine.js，这里直接调它，免得抄一份常量出来 drift。
const END_NAME = { dead: "早死", broke: "破产", jailed: "被告席" };
const clip = (t) => (t.length > 20 ? t.slice(0, 20) + "…" : t);
const okOf = (lv) => lv.options.find((o) => o.ok);

// —— 单错容错：其它关全对、只在这一关选错这一项，看能不能走完。——
// 错一次就出局如果是故意设计的，这就是那张名单；无意走出来的也会在这暴露。
const fatal = [];
for (let i = 0; i < LEVELS.length; i++) {
  for (const op of LEVELS[i].options) {
    if (op.ok) continue;
    let s = Engine.createState();
    for (let k = 0; k < LEVELS.length; k++) {
      s = Engine.applyChoice(s, LEVELS[k], k === i ? op : okOf(LEVELS[k]));
      const r = Engine.advance(s);
      if (r.done && r.flags) {
        const key = r.flags.dead ? "dead" : r.flags.jailed ? "jailed" : "broke";
        fatal.push(`${LEVELS[i].age} 岁「${LEVELS[i].title}」选「${clip(op.text)}」→ ${END_NAME[key]}`);
        break;
      }
      if (r.done) break;
    }
  }
}

// 配置文件必须是合法 JSON——微信开发者工具因为这个报错，只会说「game.json not found」
for (const f of ["game.json", "project.config.json"]) {
  try {
    JSON.parse(readFileSync(new URL(f, here), "utf8"));
  } catch (e) {
    console.error(`${f} 不是合法 JSON：${e.message}`);
    process.exit(1);
  }
}
console.log(`关卡 ${LEVELS.length} 关，数据完整。`);
console.log(`全选对：${JSON.stringify(best)} 总分 ${best.life + best.money + best.freedom}`);
console.log(`全选错：${JSON.stringify(worst)}（会中途触发坏结局，属正常）`);

// —— 数值轨迹：每关选对之后三值落在哪。调 levels.js 的数值时看这条线陡不陡。——
let track = Engine.createState();
console.log("");
for (const lv of LEVELS) {
  track = Engine.applyChoice(track, lv, okOf(lv));
  console.log(`选对轨迹 ${lv.age} 岁「${lv.title}」：❤ ${track.life} 💰 ${track.money} 🧭 ${track.freedom}`);
}

console.log("");
if (fatal.length) {
  console.log("错一步救不回来的口子（其余全对也会出局）：");
  for (const f of fatal) console.log("  - " + f);
} else {
  console.log("错一步都救得回来：随便在哪关错一次，后面全对仍能走完。");
}
