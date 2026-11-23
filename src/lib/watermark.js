import { tileGrid } from './geometry.js';

export function drawWatermark(canvas, { text, fontSize, color, opacity, position }) {
  if (!text) return canvas;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  if (position === 'corner') {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, w - fontSize * 0.5, h - fontSize * 0.5);
  } else {
    const textW = ctx.measureText(text).width;
    const stepX = textW + fontSize * 3;
    const stepY = fontSize * 4;
    const diag = Math.ceil(Math.sqrt(w * w + h * h));
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-25 * Math.PI / 180);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const p of tileGrid(diag, diag, stepX, stepY)) {
      ctx.fillText(text, p.x - diag / 2, p.y - diag / 2);
    }
  }
  ctx.restore();
  return canvas;
}