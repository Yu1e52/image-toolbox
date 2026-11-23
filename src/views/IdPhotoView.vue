<template>
  <h1 class="page-title">证件照工具</h1>
  <div v-if="error" class="banner error">{{ error }}</div>

  <ImageDrop v-if="!work" @loaded="onLoaded" @error="error = $event" />

  <div v-else class="id-grid">
    <div class="panel preview-panel">
      <div class="info-bar">
        <span>文件：<b>{{ info.name }}</b></span>
        <span>当前尺寸：<b>{{ work.width }} × {{ work.height }}</b></span>
      </div>
      <div v-if="info.scaled" class="banner warn">原图过大，已缩至最长边 4096 的工作副本。</div>
      <div v-if="detection && !detection.isSolid" class="banner warn">
        ⚠️ 背景非纯色，换底效果可能不佳（顶部背景采样颜色方差 {{ Math.round(detection.variance) }}，超过阈值 900）。仍可继续尝试，或改用纯色背景照片。
      </div>
      <div v-else-if="detection" class="banner ok">
        检测到纯色背景
        <span class="swatch" style="width: 16px; height: 16px; display: inline-block; vertical-align: -3px; cursor: default" :style="{ background: detectionHex }"></span>
        RGB({{ detection.color.join(', ') }})，适合自动换底。
      </div>
      <div class="preview-wrap" :style="{ width: displayW + 'px', height: displayH + 'px' }">
        <img :src="keyedUrl" alt="换底预览" />
        <CropOverlay
          v-model="cropRect"
          :width="displayW"
          :height="displayH"
          :ratio="targetRatio"
        />
      </div>
      <p class="hint">预览为换底后的实时效果；选区按所选证件照比例锁定，可拖动移动取景。</p>
      <div class="actions">
        <button class="ghost small" @click="clearAll">重新载入图片</button>
      </div>

      <template v-if="idPhoto">
        <h3 class="step-title" style="margin-top: 18px"><span class="num">✓</span>裁切结果（{{ idPhoto.width }} × {{ idPhoto.height }} px）</h3>
        <div class="preview-wrap" style="max-width: 220px">
          <img :src="idPhotoUrl" alt="证件照" style="width: 100%; height: auto" />
        </div>
        <div class="actions">
          <button class="small" @click="downloadIdPhoto">下载单张证件照</button>
        </div>
      </template>
    </div>

    <div class="stack">
      <div class="panel side-panel">
        <h3 class="step-title"><span class="num">1</span>换底色</h3>
        <label>目标底色</label>
        <div class="swatches">
          <button
            v-for="c in COLOR_PRESETS"
            :key="c.hex"
            class="swatch"
            :class="{ active: !useOriginal && targetColor === c.hex }"
            :style="{ background: c.hex }"
            :title="c.label"
            @click="chooseColor(c.hex)"
          ></button>
          <input v-model="customColor" type="color" style="width: 46px" title="自定义颜色" @input="chooseColor(customColor)" />
        </div>
        <div class="actions">
          <button class="ghost small" :class="{ active: useOriginal }" @click="useOriginal = true">使用原图（不换底）</button>
        </div>
        <label>抠图容差：{{ tolerance }}</label>
        <input v-model.number="tolerance" type="range" min="20" max="150" step="5" :disabled="useOriginal" />
        <label>边缘羽化：{{ feather }}</label>
        <input v-model.number="feather" type="range" min="10" max="120" step="5" :disabled="useOriginal" />
        <p class="hint">容差越大，越多接近背景色的像素被去除；羽化让边缘过渡自然并去除背景色残留。</p>
      </div>

      <div class="panel side-panel">
        <h3 class="step-title"><span class="num">2</span>尺寸裁切</h3>
        <div class="preset-btns">
          <button
            v-for="p in SIZE_PRESETS"
            :key="p.label"
            :class="{ active: preset === p.label }"
            @click="preset = p.label"
          >{{ p.label }}<br /><span style="font-size: 11px; opacity: 0.75">{{ p.w }}×{{ p.h }}</span></button>
          <button :class="{ active: preset === 'custom' }" @click="preset = 'custom'">自定义</button>
        </div>
        <template v-if="preset === 'custom'">
          <div class="row2">
            <div>
              <label>宽 (mm)</label>
              <input v-model.number="customMmW" type="number" min="5" />
            </div>
            <div>
              <label>高 (mm)</label>
              <input v-model.number="customMmH" type="number" min="5" />
            </div>
          </div>
          <label>DPI</label>
          <input v-model.number="customDpi" type="number" min="72" max="1200" />
        </template>
        <p class="hint">目标输出：{{ targetSize.w }} × {{ targetSize.h }} px。在左侧预览拖动选区调整取景。</p>
        <div class="actions">
          <button @click="applyIdCrop">确认裁切</button>
        </div>
      </div>

      <div class="panel side-panel">
        <h3 class="step-title"><span class="num">3</span>六寸排版导出</h3>
        <template v-if="idPhoto">
          <p v-if="grid.count > 0" style="margin: 4px 0">
            六寸相纸 1800 × 1200 px（300DPI），可排 <b>{{ grid.cols }} 列 × {{ grid.rows }} 行 = {{ grid.count }} 张</b>，间距 2mm 便于裁切。
          </p>
          <div v-else class="banner warn">照片尺寸超过六寸相纸，无法排版，请选更小的尺寸预设。</div>
          <div class="actions">
            <button :disabled="grid.count === 0 || busy" @click="exportSheet">{{ busy ? '生成中…' : '生成排版并下载' }}</button>
          </div>
        </template>
        <p v-else class="hint">先完成第 2 步裁切，再排版打印。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, shallowRef, watch } from 'vue';
import ImageDrop from '../components/ImageDrop.vue';
import CropOverlay from '../components/CropOverlay.vue';
import { cropCanvas, resizeCanvas, canvasToBlob, downloadBlob, baseName } from '../lib/imageio.js';
import { layoutGrid, mmToPx } from '../lib/geometry.js';
import { sampleBackground, chromaKey, compositeOverColor, hexToRgb } from '../lib/chroma.js';

const COLOR_PRESETS = [
  { label: '红底', hex: '#ff0000' },
  { label: '蓝底', hex: '#438edb' },
  { label: '白底', hex: '#ffffff' }
];
const SIZE_PRESETS = [
  { label: '一寸', w: 295, h: 413 },
  { label: '二寸', w: 413, h: 579 },
  { label: '小二寸', w: 413, h: 531 }
];
const SHEET_W = 1800;
const SHEET_H = 1200;
const GAP_PX = mmToPx(2, 300);

const error = ref('');
const info = ref(null);
const work = shallowRef(null);
let sourceData = null;

const detection = ref(null);
const detectionHex = computed(() =>
  detection.value ? `rgb(${detection.value.color.join(',')})` : '#fff'
);

const targetColor = ref('#438edb');
const customColor = ref('#438edb');
const useOriginal = ref(false);
const tolerance = ref(30);
const feather = ref(20);

const keyed = shallowRef(null);
const keyedUrl = ref('');

const preset = ref('一寸');
const customMmW = ref(25);
const customMmH = ref(35);
const customDpi = ref(300);
const cropRect = ref({ x: 0, y: 0, w: 10, h: 10 });

const idPhoto = shallowRef(null);
const idPhotoUrl = ref('');
const busy = ref(false);

const targetSize = computed(() => {
  if (preset.value === 'custom') {
    return { w: mmToPx(customMmW.value || 25, customDpi.value || 300), h: mmToPx(customMmH.value || 35, customDpi.value || 300) };
  }
  const p = SIZE_PRESETS.find(x => x.label === preset.value);
  return { w: p.w, h: p.h };
});
const targetRatio = computed(() => targetSize.value.w / targetSize.value.h);

const displayScale = computed(() => {
  if (!work.value) return 1;
  return Math.min(1, 560 / work.value.width, 480 / work.value.height);
});
const displayW = computed(() => Math.round(work.value.width * displayScale.value));
const displayH = computed(() => Math.round(work.value.height * displayScale.value));

const grid = computed(() => {
  if (!idPhoto.value) return { count: 0, cols: 0, rows: 0 };
  return layoutGrid(SHEET_W, SHEET_H, idPhoto.value.width, idPhoto.value.height, GAP_PX);
});

function onLoaded(loaded) {
  error.value = '';
  info.value = loaded;
  work.value = loaded.canvas;
  idPhoto.value = null;
  idPhotoUrl.value = '';
  const ctx = work.value.getContext('2d');
  sourceData = ctx.getImageData(0, 0, work.value.width, work.value.height);
  detection.value = sampleBackground(sourceData.data, work.value.width, work.value.height);
  useOriginal.value = false;
  renderKeyed();
}

function clearAll() {
  work.value = null;
  keyed.value = null;
  idPhoto.value = null;
  info.value = null;
  detection.value = null;
  sourceData = null;
}

function chooseColor(hex) {
  targetColor.value = hex;
  useOriginal.value = false;
}

function renderKeyed() {
  if (!work.value || !sourceData) return;
  const w = work.value.width;
  const h = work.value.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (useOriginal.value) {
    ctx.drawImage(work.value, 0, 0);
  } else {
    const bg = detection.value ? detection.value.color : [255, 255, 255];
    const keyedData = chromaKey(sourceData.data, w, h, bg, tolerance.value, feather.value);
    const composited = compositeOverColor(keyedData, hexToRgb(targetColor.value));
    ctx.putImageData(new ImageData(composited, w, h), 0, 0);
  }
  keyed.value = canvas;
  keyedUrl.value = canvas.toDataURL('image/png');
}

let debounceTimer = null;
watch([targetColor, tolerance, feather, useOriginal], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderKeyed, 150);
});

function applyIdCrop() {
  if (!keyed.value) return;
  const s = displayScale.value;
  const cropped = cropCanvas(keyed.value, {
    x: cropRect.value.x / s,
    y: cropRect.value.y / s,
    w: cropRect.value.w / s,
    h: cropRect.value.h / s
  });
  idPhoto.value = resizeCanvas(cropped, targetSize.value.w, targetSize.value.h);
  idPhotoUrl.value = idPhoto.value.toDataURL('image/png');
}

function downloadIdPhoto() {
  idPhoto.value.toBlob(blob => {
    if (blob) downloadBlob(blob, `${baseName(info.value.name)}-${preset.value}.png`);
  }, 'image/png');
}

async function exportSheet() {
  busy.value = true;
  error.value = '';
  try {
    const g = grid.value;
    const sheet = document.createElement('canvas');
    sheet.width = SHEET_W;
    sheet.height = SHEET_H;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SHEET_W, SHEET_H);
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        ctx.drawImage(
          idPhoto.value,
          g.offsetX + c * (idPhoto.value.width + GAP_PX),
          g.offsetY + r * (idPhoto.value.height + GAP_PX)
        );
      }
    }
    const blob = await canvasToBlob(sheet, 'image/jpeg', 0.92);
    downloadBlob(blob, `${baseName(info.value.name)}-六寸排版.jpg`);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>