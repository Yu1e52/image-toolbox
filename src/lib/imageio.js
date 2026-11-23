import { fitWithin, clampRect } from './geometry.js';

export const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_WORK_EDGE = 4096;

export function validateFile(file) {
  if (!file) return '未选择文件';
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return `不支持的格式（${file.type || '未知类型'}），仅支持 JPG / PNG / WebP`;
  }
  return null;
}

export async function loadImageFile(file) {
  const err = validateFile(file);
  if (err) throw new Error(err);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('图片解码失败，文件可能已损坏或格式不受浏览器支持'));
      el.src = url;
    });
    const origWidth = img.naturalWidth;
    const origHeight = img.naturalHeight;
    const { width, height, scaled } = fitWithin(origWidth, origHeight, MAX_WORK_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return { canvas, name: file.name, size: file.size, type: file.type, origWidth, origHeight, scaled };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function cloneCanvas(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}

export function cropCanvas(source, rect) {
  const r = clampRect(
    { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) },
    source.width,
    source.height
  );
  const canvas = document.createElement('canvas');
  canvas.width = r.w;
  canvas.height = r.h;
  canvas.getContext('2d').drawImage(source, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return canvas;
}

export function resizeCanvas(source, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('图片编码失败'))),
      type,
      quality
    );
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function extForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export function baseName(name) {
  return (name || 'image').replace(/\.[^.]+$/, '');
}