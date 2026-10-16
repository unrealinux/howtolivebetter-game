// scene.js 的测试：node --test
// 分镜条是纯绘图，没法比像素；这里守住三件会静默出事的东西：
//   1. 画的过程中抛异常（某一关的 stage 组合没走过）
//   2. 坐标算出 NaN（canvas 收到 NaN 不报错，只是那一下什么都不画）
//   3. save/restore 不配对、globalAlpha 泄漏（会把后面的绘制一起弄脏）
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("./levels.js");
const Scene = require("./scene.js");
const LEVELS = globalThis.LEVELS;

const NUMERIC = ["moveTo", "lineTo", "rect", "translate", "arc", "ellipse", "fillRect", "strokeRect", "createLinearGradient"];

function stub() {
  const calls = { save: 0, restore: 0, alphaLeak: null };
  const c = { fillStyle: "", strokeStyle: "", lineWidth: 1, globalAlpha: 1 };
  c.save = () => { calls.save++; };
  c.restore = () => { calls.restore++; };
  for (const m of ["beginPath", "closePath", "fill", "stroke", "clip"]) c[m] = () => {};
  for (const m of NUMERIC) {
    c[m] = (...args) => {
      for (const a of args) {
        if (typeof a === "number" && !Number.isFinite(a)) throw new Error(m + " 收到 " + a);
      }
      return m === "createLinearGradient" ? { addColorStop() {} } : undefined;
    };
  }
  return { c, calls };
}

const BOX = { x: 0, y: 0, w: 390, h: 190 };

function paint(stage, npc, t) {
  const { c, calls } = stub();
  Scene.draw(c, BOX, t, stage, npc, true);
  const leftover = c.globalAlpha;
  if (leftover !== 1) calls.alphaLeak = leftover;
  return calls;
}

test("10 关的 stage 都画得出，坐标不出 NaN", () => {
  for (const lv of LEVELS) {
    for (const t of [0, 1234, 9000, 40000]) {
      assert.doesNotThrow(() => paint(lv.stage, lv.npc.name, t), lv.age + " 岁 " + lv.title);
    }
  }
});

test("每一次 draw 的 save / restore 配对，globalAlpha 收得回来", () => {
  for (const lv of LEVELS) {
    const calls = paint(lv.stage, lv.npc.name, 5000);
    assert.equal(calls.save, calls.restore, lv.age + " 岁 save/restore 不对称");
    assert.equal(calls.alphaLeak, null, lv.age + " 岁 globalAlpha 泄漏成 " + calls.alphaLeak);
  }
});

test("三种 where × 四种 light 的组合都不抛", () => {
  for (const where of Object.keys(Scene.WHERE)) {
    for (const light of Object.keys(Scene.LIGHT)) {
      assert.doesNotThrow(() => paint({ where, light, tint: "#d9a441", props: ["carton"] }, "张姐", 3000));
    }
  }
});

test("每个道具单独画一遍都不抛", () => {
  for (const name of Object.keys(Scene.PROPS)) {
    assert.doesNotThrow(() => paint({ where: "indoor", light: "lamp", props: [name] }, "老陈", 2000), name);
  }
});

test("没 stage、没 npc、stage 字段写错，都退化成能画", () => {
  assert.doesNotThrow(() => paint(undefined, undefined, 1000));
  assert.doesNotThrow(() => paint({}, "张姐", 1000));
  assert.doesNotThrow(() => paint({ where: "月球", light: "手电", tint: "红", props: ["飞碟"] }, "张姐", 1000));
});
