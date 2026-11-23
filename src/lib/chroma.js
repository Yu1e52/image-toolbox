export const VARIANCE_THRESHOLD = 900;

// 证件照的肩膀几乎必然占满底部两角，只有顶部边缘一定是背景
export function sampleBackground(data, w, h) {
  const patch = Math.max(2, Math.min(16, Math.floor(Math.min(w, h) / 10)));
  const origins = [
    [0, 0],
    [w - patch, 0],
    [Math.floor((w - patch) / 2), 0]
  ];
  let sr = 0, sg = 0, sb = 0, n = 0;
  const samples = [];
  for (const [ox, oy] of origins) {
    for (let y = oy; y < oy + patch; y++) {
      for (let x = ox; x < ox + patch; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        sr += r; sg += g; sb += b; n++;
        samples.push([r, g, b]);
      }
    }
  }
  const mean = [sr / n, sg / n, sb / n];
  let variance = 0;
  for (const [r, g, b] of samples) {
    variance += (r - mean[0]) ** 2 + (g - mean[1]) ** 2 + (b - mean[2]) ** 2;
  }
  variance /= n;
  return {
    color: mean.map(Math.round),
    variance,
    isSolid: variance <= VARIANCE_THRESHOLD
  };
}

export function chromaKey(data, w, h, bg, tolerance = 60, feather = 50) {
  const out = new Uint8ClampedArray(data.length);
  const [br, bgc, bb] = bg;
  const outer = tolerance + feather;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.sqrt((r - br) ** 2 + (g - bgc) ** 2 + (b - bb) ** 2);
    let a;
    if (d <= tolerance) a = 0;
    else if (d >= outer) a = 255;
    else a = Math.round(255 * (d - tolerance) / feather);

    if (a > 0 && a < 255) {
      // 半透明边缘像素是前景与背景的混合：C = a*F + (1-a)*bg，反解 F 去掉背景色污染
      const af = a / 255;
      out[i] = (r - (1 - af) * br) / af;
      out[i + 1] = (g - (1 - af) * bgc) / af;
      out[i + 2] = (b - (1 - af) * bb) / af;
    } else {
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
    }
    out[i + 3] = a;
  }
  return out;
}

export function compositeOverColor(data, target) {
  const out = new Uint8ClampedArray(data.length);
  const [tr, tg, tb] = target;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    out[i] = data[i] * a + tr * (1 - a);
    out[i + 1] = data[i + 1] * a + tg * (1 - a);
    out[i + 2] = data[i + 2] * a + tb * (1 - a);
    out[i + 3] = 255;
  }
  return out;
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}