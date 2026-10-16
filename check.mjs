// 关卡数据自检：node check.mjs
// 改完 levels.js 跑一次。查字段、选项数，并算一遍最好和最坏两条路能不能走完。
import { readFileSync } from "node:fs";

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
