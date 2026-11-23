export function fitWithin(w, h, maxEdge) {
  const m = Math.max(w, h);
  if (m <= maxEdge) return { width: w, height: h, scaled: false };
  const s = maxEdge / m;
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)), scaled: true };
}

export function lockedHeight(origW, origH, targetW) {
  return Math.max(1, Math.round(targetW * origH / origW));
}

export function lockedWidth(origW, origH, targetH) {
  return Math.max(1, Math.round(targetH * origW / origH));
}

export function clampRect(rect, boundsW, boundsH) {
  const w = Math.min(Math.max(rect.w, 1), boundsW);
  const h = Math.min(Math.max(rect.h, 1), boundsH);
  const x = Math.min(Math.max(rect.x, 0), boundsW - w);
  const y = Math.min(Math.max(rect.y, 0), boundsH - h);
  return { x, y, w, h };
}

export function fitRectToRatio(boundsW, boundsH, ratio) {
  let w = boundsW;
  let h = w / ratio;
  if (h > boundsH) {
    h = boundsH;
    w = h * ratio;
  }
  return { x: (boundsW - w) / 2, y: (boundsH - h) / 2, w, h };
}

export function mmToPx(mm, dpi) {
  return Math.max(1, Math.round(mm / 25.4 * dpi));
}

export function layoutGrid(sheetW, sheetH, photoW, photoH, gapPx) {
  const cols = Math.floor((sheetW + gapPx) / (photoW + gapPx));
  const rows = Math.floor((sheetH + gapPx) / (photoH + gapPx));
  const gridW = cols * photoW + Math.max(0, cols - 1) * gapPx;
  const gridH = rows * photoH + Math.max(0, rows - 1) * gapPx;
  return {
    cols,
    rows,
    count: cols * rows,
    offsetX: Math.round((sheetW - gridW) / 2),
    offsetY: Math.round((sheetH - gridH) / 2)
  };
}

export function tileGrid(w, h, stepX, stepY) {
  const cols = Math.ceil(w / stepX);
  const rows = Math.ceil(h / stepY);
  const points = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({ x: c * stepX, y: r * stepY });
    }
  }
  return points;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}