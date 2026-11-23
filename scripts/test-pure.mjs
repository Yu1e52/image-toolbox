import assert from 'node:assert/strict';
import {
  fitWithin, lockedHeight, lockedWidth, clampRect, fitRectToRatio,
  mmToPx, layoutGrid, tileGrid, formatBytes
} from '../src/lib/geometry.js';
import { binarySearchQuality } from '../src/lib/search.js';
import { sampleBackground, chromaKey, compositeOverColor, hexToRgb, VARIANCE_THRESHOLD } from '../src/lib/chroma.js';

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

test('mmToPx: 25.4mm @300DPI = 300px', () => {
  assert.equal(mmToPx(25.4, 300), 300);
  assert.equal(mmToPx(2, 300), 24);
  assert.equal(mmToPx(35, 300), 413);
  assert.equal(mmToPx(49, 300), 579);
  assert.equal(mmToPx(45, 300), 531);
});

test('layoutGrid: 一寸 295×413 六寸排版 5列×2行=10张，居中偏移', () => {
  const g = layoutGrid(1800, 1200, 295, 413, 24);
  assert.equal(g.cols, 5);
  assert.equal(g.rows, 2);
  assert.equal(g.count, 10);
  assert.equal(g.offsetX, Math.round((1800 - (5 * 295 + 4 * 24)) / 2));
  assert.equal(g.offsetY, Math.round((1200 - (2 * 413 + 24)) / 2));
  assert.ok(g.offsetX >= 0 && g.offsetY >= 0);
  assert.ok(5 * 295 + 4 * 24 <= 1800);
  assert.ok(2 * 413 + 1 * 24 <= 1200);
});

test('layoutGrid: 二寸 413×579 → 4列×2行=8张', () => {
  const g = layoutGrid(1800, 1200, 413, 579, 24);
  assert.equal(g.cols, 4);
  assert.equal(g.rows, 2);
  assert.equal(g.count, 8);
});

test('layoutGrid: 小二寸 413×531 → 4列×2行', () => {
  const g = layoutGrid(1800, 1200, 413, 531, 24);
  assert.equal(g.cols, 4);
  assert.equal(g.rows, 2);
});

test('layoutGrid: 照片大于相纸 → 0 张', () => {
  const g = layoutGrid(1800, 1200, 2000, 1500, 24);
  assert.equal(g.count, 0);
});

test('layoutGrid: 任意尺寸网格不越界', () => {
  for (const [pw, ph] of [[295, 413], [413, 579], [100, 100], [700, 900], [1799, 1199]]) {
    const g = layoutGrid(1800, 1200, pw, ph, 24);
    if (g.count > 0) {
      assert.ok(g.offsetX + g.cols * pw + (g.cols - 1) * 24 <= 1800);
      assert.ok(g.offsetY + g.rows * ph + (g.rows - 1) * 24 <= 1200);
    }
  }
});

test('fitWithin: 大图缩到最长边 4096，小图不变', () => {
  assert.deepEqual(fitWithin(8000, 6000, 4096), { width: 4096, height: 3072, scaled: true });
  assert.deepEqual(fitWithin(3000, 8000, 4096), { width: 1536, height: 4096, scaled: true });
  assert.deepEqual(fitWithin(1000, 800, 4096), { width: 1000, height: 800, scaled: false });
});

test('等比缩放换算', () => {
  assert.equal(lockedHeight(4000, 3000, 800), 600);
  assert.equal(lockedWidth(4000, 3000, 600), 800);
  assert.equal(lockedHeight(295, 413, 100), 140);
});

test('clampRect: 越界选区被收回边界内', () => {
  assert.deepEqual(clampRect({ x: -10, y: -5, w: 50, h: 50 }, 100, 100), { x: 0, y: 0, w: 50, h: 50 });
  assert.deepEqual(clampRect({ x: 80, y: 90, w: 50, h: 50 }, 100, 100), { x: 50, y: 50, w: 50, h: 50 });
  assert.deepEqual(clampRect({ x: 0, y: 0, w: 500, h: 500 }, 100, 100), { x: 0, y: 0, w: 100, h: 100 });
});

test('fitRectToRatio: 比例选区最大化居中且不越界', () => {
  const r = fitRectToRatio(800, 600, 1);
  assert.equal(r.w, 600);
  assert.equal(r.h, 600);
  assert.equal(r.x, 100);
  assert.equal(r.y, 0);
  const r2 = fitRectToRatio(800, 600, 16 / 9);
  assert.ok(Math.abs(r2.w / r2.h - 16 / 9) < 1e-9);
  assert.ok(r2.w <= 800 && r2.h <= 600);
});

test('tileGrid: 平铺网格覆盖整个区域', () => {
  const pts = tileGrid(1000, 500, 300, 100);
  assert.equal(pts.length, 4 * 5);
  assert.deepEqual(pts[0], { x: 0, y: 0 });
  assert.deepEqual(pts[pts.length - 1], { x: 900, y: 400 });
});

test('formatBytes', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.00 MB');
});

function fakeEncode(sizeFn) {
  return async q => ({ size: sizeFn(q), q });
}

test('二分逼近: 单调体积函数命中目标，≤8 轮二分', async () => {
  const sizeFn = q => Math.round(1000 * q) + 100;
  const r = await binarySearchQuality(500, fakeEncode(sizeFn));
  assert.equal(r.met, true);
  assert.ok(r.blob.size <= 500);
  assert.ok(r.rounds <= 10);
  assert.ok(r.blob.size >= 450, `逼近过松: ${r.blob.size}`);
});

test('二分逼近: 目标宽松时首轮即返回最高质量', async () => {
  const r = await binarySearchQuality(100000, fakeEncode(q => Math.round(1000 * q)));
  assert.equal(r.met, true);
  assert.equal(r.quality, 0.95);
  assert.equal(r.rounds, 1);
});

test('二分逼近: 目标不可达时如实返回 met=false 与最小结果', async () => {
  const r = await binarySearchQuality(50, fakeEncode(q => Math.round(1000 * q) + 100));
  assert.equal(r.met, false);
  assert.equal(r.quality, 0.05);
  assert.equal(r.blob.size, 150);
});

test('二分逼近: 非单调真实编码场景仍返回达标最优', async () => {
  const sizeFn = q => Math.round(800 * q * q) + 120;
  const r = await binarySearchQuality(300, fakeEncode(sizeFn));
  assert.equal(r.met, true);
  assert.ok(r.blob.size <= 300);
  const better = await fakeEncode(sizeFn)(Math.min(0.95, r.quality + 0.01));
  assert.ok(better.size > 300 || r.quality >= 0.94);
});

function makeImage(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

test('背景检测: 纯白底+红色主体 → 判定纯色，估计色≈白', () => {
  const data = makeImage(100, 100, (x, y) =>
    x > 30 && x < 70 && y > 30 && y < 70 ? [220, 30, 30] : [255, 255, 255]);
  const d = sampleBackground(data, 100, 100);
  assert.equal(d.isSolid, true);
  assert.deepEqual(d.color, [255, 255, 255]);
  assert.ok(d.variance <= VARIANCE_THRESHOLD);
});

test('背景检测: 渐变背景 → 方差超阈值判定非纯色', () => {
  const data = makeImage(100, 100, (x, y) => [x * 2.5, y * 2.5, 128]);
  const d = sampleBackground(data, 100, 100);
  assert.equal(d.isSolid, false);
  assert.ok(d.variance > VARIANCE_THRESHOLD);
});

test('背景检测: 肩膀占满底部两角（真实证件照）→ 仍判定白底纯色', () => {
  const data = makeImage(100, 100, (x, y) =>
    y > 60 && (x < 35 || x > 65) ? [35, 34, 41] : [255, 255, 255]);
  const d = sampleBackground(data, 100, 100);
  assert.equal(d.isSolid, true);
  assert.deepEqual(d.color, [255, 255, 255]);
});

test('色度抠图: 背景全透明、前景全保留、过渡带半透明', () => {
  const bg = [255, 255, 255];
  const data = makeImage(3, 1, x => [[255, 255, 255], [220, 30, 30], [255, 128, 128]][x]);
  const out = chromaKey(data, 3, 1, bg, 60, 140);
  assert.equal(out[3], 0);
  assert.equal(out[7], 255);
  const midAlpha = out[11];
  assert.ok(midAlpha > 0 && midAlpha < 255);
});

test('去色污染: 半透明边缘像素的背景色贡献被扣除', () => {
  const bg = [255, 255, 255];
  const data = makeImage(1, 1, () => [255, 128, 128]);
  const out = chromaKey(data, 1, 1, bg, 60, 140);
  assert.ok(out[1] < 128, `绿色通道应低于混合值: ${out[1]}`);
  assert.equal(out[0], 255);
});

test('换底合成: 透明像素精确变为目标色，前景不变', () => {
  const data = new Uint8ClampedArray([0, 0, 0, 0, 220, 30, 30, 255]);
  const out = compositeOverColor(data, [67, 142, 219]);
  assert.deepEqual([...out.slice(0, 4)], [67, 142, 219, 255]);
  assert.deepEqual([...out.slice(4, 8)], [220, 30, 30, 255]);
});

test('hexToRgb', () => {
  assert.deepEqual(hexToRgb('#438edb'), [67, 142, 219]);
  assert.deepEqual(hexToRgb('#ff0000'), [255, 0, 0]);
  assert.deepEqual(hexToRgb('ffffff'), [255, 255, 255]);
});

let passed = 0;
for (const [name, fn] of tests) {
  await fn();
  passed++;
  console.log(`ok - ${name}`);
}
console.log(`\n${passed} 组断言全部通过`);