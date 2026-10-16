// engine.js 的逻辑测试：node --test
// check.mjs 只验关卡数据字段，这里验逻辑本身（加减分、坏结局、段位、读档）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("./levels.js");
const E = require("./engine.js");
const LEVELS = globalThis.LEVELS;

const GOOD = { text: "对", effects: { life: 1, money: 2, freedom: 3 }, ok: true, result: "r", cite: "第 1 节第 1 条" };
const BAD = { text: "错", effects: { life: -4, money: 0, freedom: 0 }, ok: false, result: "r", cite: "第 1 节第 2 条" };
const lv = { age: 30, title: "测试关", file: "x.md", options: [GOOD, BAD] };

const at = (patch) => ({ ...E.createState(), ...patch });

test("applyChoice 不改传进来的 state", () => {
  const s = E.createState();
  const before = JSON.stringify(s);
  E.applyChoice(s, lv, BAD);
  assert.equal(JSON.stringify(s), before);
});

test("选对：right +1，missed 不变，picks 记一条", () => {
  const s = E.applyChoice(E.createState(), lv, GOOD);
  assert.equal(s.right, 1);
  assert.equal(s.missed.length, 0);
  assert.deepEqual(s.picks, [{ age: 30, title: "测试关", ok: true, cite: GOOD.cite, file: "x.md" }]);
});

test("选错：right 不变，missed 和 picks 各记一条", () => {
  const s = E.applyChoice(E.createState(), lv, BAD);
  assert.equal(s.right, 0);
  assert.deepEqual(s.missed, [{ title: "30 岁 · 测试关", cite: BAD.cite, file: "x.md" }]);
  assert.deepEqual(s.picks, [{ age: 30, title: "测试关", ok: false, cite: BAD.cite, file: "x.md" }]);
});

test("三条命脉归零的边界", () => {
  assert.equal(E.badFlag(at({ life: 0 })), "dead");
  assert.equal(E.badFlag(at({ life: 1 })), null);
  assert.equal(E.badFlag(at({ life: -0.5 })), "dead");
  assert.equal(E.badFlag(at({ freedom: 0 })), "jailed");
  assert.equal(E.badFlag(at({ money: E.BANKRUPT })), "broke");
  assert.equal(E.badFlag(at({ money: E.BANKRUPT + 1 })), null);
});

test("三条命脉同时归零时，命优先", () => {
  assert.equal(E.badFlag(at({ life: 0, money: -99, freedom: 0 })), "dead");
});

test("advance：闯关中进下一关，最后一关收尾", () => {
  const mid = E.advance(at({ idx: 0 }));
  assert.deepEqual(mid, { state: at({ idx: 1 }), done: false, flags: null });

  const last = at({ idx: LEVELS.length - 1 });
  assert.deepEqual(E.advance(last), { state: last, done: true, flags: {} });
});

test("advance：最后一关死掉，报坏结局而不是正常收尾", () => {
  const r = E.advance(at({ idx: LEVELS.length - 1, life: 0 }));
  assert.equal(r.done, true);
  assert.deepEqual(r.flags, { dead: true });
});

test("endingFor：坏结局压过段位，哪怕全选对", () => {
  assert.equal(E.endingFor(at({ right: LEVELS.length }), { dead: true }).rank, "早死结局");
  assert.equal(E.endingFor(at({ right: 0 }), { jailed: true }).rank, "被告席结局");
  assert.equal(E.endingFor(at({ right: 0 }), { broke: true }).rank, "破产结局");
});

test("endingFor：段位分档边界", () => {
  const n = LEVELS.length;
  const rank = (r) => E.endingFor(at({ right: r }), {}).rank;
  assert.equal(rank(n), "高性价比人生");
  assert.equal(rank(Math.ceil(n * 0.7)), "活得还不错");
  assert.equal(rank(Math.ceil(n * 0.7) - 1), "及格线上下");
  assert.equal(rank(Math.ceil(n * 0.4) - 1), "踩着坑走完一生");
});

test("deltaText：0 不显示，正数带 +", () => {
  assert.deepEqual(E.deltaText({ life: 0, money: 3, freedom: -2 }), ["💰 +3", "🧭 -2"]);
  assert.deepEqual(E.deltaText({ life: 0, money: 0, freedom: 0 }), []);
  assert.equal(E.total(at({ life: 1, money: 2, freedom: 3 })), 6);
});

test("真实数据：全选对走得完且不触发坏结局", () => {
  const good = run(() => (l) => l.options.find((o) => o.ok));
  assert.deepEqual(good.flags, {});
  assert.equal(good.s.right, LEVELS.length);
  assert.equal(good.s.missed.length, 0);
  assert.equal(good.s.picks.length, LEVELS.length);
});

test("真实数据：全选错走不完，中途触发坏结局", () => {
  const bad = run(() => (l) => l.options.find((o) => !o.ok));
  assert.ok(Object.keys(bad.flags).length > 0);
  assert.ok(bad.s.picks.length < LEVELS.length, "应该没走完全部关卡");
});

// 走到底；advance 卡住不返回 done 的话这里会挂住，等于测出死循环
function run(makePick) {
  const pick = makePick();
  let s = E.createState();
  for (;;) {
    const level = LEVELS[s.idx];
    s = E.applyChoice(s, level, pick(level));
    const r = E.advance(s);
    s = r.state;
    if (r.done) return { s, flags: r.flags };
  }
}

test("存档：写进去读出来是同一份", () => {
  const s = E.applyChoice(E.createState(), lv, BAD);
  const back = E.parseSave(E.saveString(s, 1));
  assert.deepEqual(back.state, s);
  assert.equal(back.chosenIndex, 1);
  assert.equal(E.parseSave(E.saveString(s, null)).chosenIndex, null);
});

test("存档：坏数据一律当没有存档", () => {
  const s = E.applyChoice(E.createState(), lv, BAD);
  const bad = [
    "{{{",
    "",
    null,
    "{}",
    JSON.stringify({ state: { ...s, idx: LEVELS.length } }),
    JSON.stringify({ state: { ...s, idx: -1 } }),
    JSON.stringify({ state: { ...s, idx: 1.5 } }),
    JSON.stringify({ state: { ...s, life: "x" } }),
    JSON.stringify({ state: { ...s, life: NaN } }),
    JSON.stringify({ state: { ...s, missed: "x" } }),
    JSON.stringify({ state: { ...s, picks: [{ age: 1, title: "t", ok: "yes", cite: "c", file: "f" }] } }),
    JSON.stringify({ state: { ...s, missed: [{ title: "t" }] } }),
    JSON.stringify({ state: s, chosenIndex: 9 }),
    JSON.stringify({ state: s, chosenIndex: 1.5 }),
  ];
  for (const raw of bad) assert.equal(E.parseSave(raw), null, "应判为无效：" + raw);
});

test("存档：正文当字符串原样收下，不是对象", () => {
  const s = E.createState();
  s.missed = [{ title: "<img src=x onerror=1>", cite: "c", file: "f" }];
  const back = E.parseSave(E.saveString(s, null));
  assert.equal(typeof back.state.missed[0].title, "string");
  assert.equal(back.state.missed[0].title, "<img src=x onerror=1>");
});

test("shareText：带段位、三项数值、总分和选对条数", () => {
  const t = E.shareText(at({ right: LEVELS.length, life: 10, money: 20, freedom: 30 }), {});
  assert.match(t, /高性价比人生/);
  assert.match(t, /10 命 \/ 20 钱 \/ 30 自由/);
  assert.match(t, /总分 60/);
  assert.match(t, new RegExp("选对 " + LEVELS.length + "/" + LEVELS.length));
});

test("shareText：坏结局时报坏结局的名字", () => {
  assert.match(E.shareText(E.createState(), { dead: true }), /早死结局/);
});
