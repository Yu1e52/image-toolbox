<template>
  <h1 class="page-title">通用图片编辑</h1>
  <div v-if="error" class="banner error">{{ error }}</div>

  <ImageDrop v-if="!work" @loaded="onLoaded" @error="error = $event" />

  <div v-else class="editor-grid">
    <div class="panel preview-panel">
      <div class="info-bar">
        <span>文件：<b>{{ info.name }}</b></span>
        <span>原始尺寸：<b>{{ info.origWidth }} × {{ info.origHeight }}</b></span>
        <span>当前尺寸：<b>{{ work.width }} × {{ work.height }}</b></span>
        <span>原体积：<b>{{ formatBytes(info.size) }}</b></span>
      </div>
      <div v-if="info.scaled" class="banner warn">原图过大，已缩至最长边 4096 的工作副本，后续处理与导出均按工作副本尺寸。</div>
      <div class="preview-wrap" :style="{ width: displayW + 'px', height: displayH + 'px' }">
        <img :src="previewUrl" alt="预览" />
        <CropOverlay
          v-if="tab === 'crop'"
          v-model="cropRect"
          :width="displayW"
          :height="displayH"
          :ratio="cropRatio"
        />
      </div>
      <div class="actions">
        <button class="ghost small" @click="resetWork">重置为载入图</button>
        <button class="ghost small" @click="clearAll">重新载入图片</button>
      </div>
    </div>

    <div class="stack">
      <div class="panel side-panel">
        <div class="tabs">
          <button :class="{ active: tab === 'crop' }" @click="tab = 'crop'">裁剪</button>
          <button :class="{ active: tab === 'resize' }" @click="tab = 'resize'">缩放</button>
          <button :class="{ active: tab === 'watermark' }" @click="tab = 'watermark'">水印</button>
        </div>

        <template v-if="tab === 'crop'">
          <label>比例预设</label>
          <div class="ratio-btns">
            <button
              v-for="p in RATIO_PRESETS"
              :key="p.label"
              :class="{ active: cropRatio === p.value }"
              @click="cropRatio = p.value"
            >{{ p.label }}</button>
          </div>
          <p class="hint">在左侧预览上拖动选区或控制点，确认后仅保留选区内容。</p>
          <div class="actions">
            <button @click="applyCrop">确认裁剪</button>
          </div>
        </template>

        <template v-else-if="tab === 'resize'">
          <div class="row2">
            <div>
              <label>目标宽度 (px)</label>
              <input v-model.number="targetW" type="number" min="1" @input="onWidthInput" />
            </div>
            <div>
              <label>目标高度 (px)</label>
              <input v-model.number="targetH" type="number" min="1" @input="onHeightInput" />
            </div>
          </div>
          <div class="check-line">
            <input id="lock" v-model="lockAspect" type="checkbox" />
            <label for="lock" style="margin: 0">保持纵横比</label>
          </div>
          <div class="actions">
            <button :disabled="!validSize" @click="applyResize">应用缩放</button>
          </div>
        </template>

        <template v-else>
          <label>水印文字</label>
          <input v-model="wm.text" placeholder="例如：仅供报名使用" />
          <div class="row2">
            <div>
              <label>字号 (px)</label>
              <input v-model.number="wm.fontSize" type="number" min="8" />
            </div>
            <div>
              <label>颜色</label>
              <input v-model="wm.color" type="color" />
            </div>
          </div>
          <label>透明度：{{ Math.round(wm.opacity * 100) }}%</label>
          <input v-model.number="wm.opacity" type="range" min="0.05" max="1" step="0.05" />
          <label>位置</label>
          <select v-model="wm.position">
            <option value="tile">平铺</option>
            <option value="corner">右下角</option>
          </select>
          <div class="actions">
            <button :disabled="!wm.text" @click="applyWatermark">应用水印</button>
          </div>
          <p class="hint">水印会合成进当前工作图，导出结果即包含水印。</p>
        </template>
      </div>

      <div class="panel side-panel">
        <h3>压缩 / 格式转换 / 下载</h3>
        <label>输出格式</label>
        <select v-model="outType">
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG（无损）</option>
          <option value="image/webp">WebP</option>
        </select>
        <label>输出质量：{{ Math.round(quality * 100) }}%<span v-if="outType === 'image/png'">（PNG 无损，质量参数无效）</span></label>
        <input v-model.number="quality" type="range" min="0.1" max="1" step="0.05" :disabled="outType === 'image/png'" />
        <div class="actions">
          <button :disabled="busy" @click="exportDirect">{{ busy ? '处理中…' : '导出并下载' }}</button>
        </div>
        <label>目标体积 (KB)</label>
        <input v-model.number="targetKB" type="number" min="1" :disabled="outType === 'image/png'" />
        <div class="actions">
          <button class="ghost" :disabled="busy || outType === 'image/png' || !(targetKB > 0)" @click="exportToTarget">
            二分压缩到目标体积
          </button>
        </div>
        <p v-if="outType === 'image/png'" class="hint">PNG 为无损格式，无法按目标体积压缩，请改用 JPEG / WebP。</p>

        <template v-if="result">
          <div class="compare">
            原体积 {{ formatBytes(info.size) }} → 输出 <b>{{ formatBytes(result.size) }}</b>
            <span :class="result.size <= info.size ? 'down' : 'up'">
              （{{ result.size <= info.size ? '减小' : '增大' }} {{ Math.abs(100 - result.size / info.size * 100).toFixed(1) }}%）
            </span>
            <div class="hint">格式 {{ extForType(result.type).toUpperCase() }} · 质量 {{ Math.round(result.quality * 100) }}%<template v-if="result.rounds"> · 二分 {{ result.rounds }} 次编码</template></div>
          </div>
          <div v-if="result.met === false" class="banner warn" style="margin-top: 10px">
            最低质量下仍超过目标体积，未能达标。可先缩小尺寸再压缩。以下为能达到的最小结果：
          </div>
          <div class="actions">
            <button class="small" @click="downloadResult">下载该结果</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, shallowRef } from 'vue';
import ImageDrop from '../components/ImageDrop.vue';
import CropOverlay from '../components/CropOverlay.vue';
import { cloneCanvas, cropCanvas, resizeCanvas, canvasToBlob, downloadBlob, extForType, baseName } from '../lib/imageio.js';
import { formatBytes, lockedHeight, lockedWidth } from '../lib/geometry.js';
import { binarySearchQuality } from '../lib/search.js';
import { drawWatermark } from '../lib/watermark.js';

const RATIO_PRESETS = [
  { label: '自由', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 }
];

const error = ref('');
const info = ref(null);
const original = shallowRef(null);
const work = shallowRef(null);
const previewUrl = ref('');
const tab = ref('crop');

const cropRatio = ref(null);
const cropRect = ref({ x: 0, y: 0, w: 10, h: 10 });

const targetW = ref(0);
const targetH = ref(0);
const lockAspect = ref(true);

const wm = reactive({ text: '', fontSize: 32, color: '#888888', opacity: 0.3, position: 'tile' });

const outType = ref('image/jpeg');
const quality = ref(0.9);
const targetKB = ref(200);
const busy = ref(false);
const result = ref(null);

const displayScale = computed(() => {
  if (!work.value) return 1;
  return Math.min(1, 720 / work.value.width, 520 / work.value.height);
});
const displayW = computed(() => Math.round(work.value.width * displayScale.value));
const displayH = computed(() => Math.round(work.value.height * displayScale.value));
const validSize = computed(() => targetW.value >= 1 && targetH.value >= 1);

function refreshPreview() {
  previewUrl.value = work.value.toDataURL('image/png');
  targetW.value = work.value.width;
  targetH.value = work.value.height;
  result.value = null;
}

function onLoaded(loaded) {
  error.value = '';
  info.value = loaded;
  original.value = loaded.canvas;
  work.value = cloneCanvas(loaded.canvas);
  outType.value = loaded.type;
  refreshPreview();
}

function clearAll() {
  work.value = null;
  original.value = null;
  info.value = null;
  result.value = null;
}

function resetWork() {
  work.value = cloneCanvas(original.value);
  refreshPreview();
}

function applyCrop() {
  const s = displayScale.value;
  work.value = cropCanvas(work.value, {
    x: cropRect.value.x / s,
    y: cropRect.value.y / s,
    w: cropRect.value.w / s,
    h: cropRect.value.h / s
  });
  refreshPreview();
}

function onWidthInput() {
  if (lockAspect.value && targetW.value >= 1) {
    targetH.value = lockedHeight(work.value.width, work.value.height, targetW.value);
  }
}

function onHeightInput() {
  if (lockAspect.value && targetH.value >= 1) {
    targetW.value = lockedWidth(work.value.width, work.value.height, targetH.value);
  }
}

function applyResize() {
  work.value = resizeCanvas(work.value, targetW.value, targetH.value);
  refreshPreview();
}

function applyWatermark() {
  const canvas = cloneCanvas(work.value);
  drawWatermark(canvas, { ...wm });
  work.value = canvas;
  refreshPreview();
}

async function exportDirect() {
  busy.value = true;
  error.value = '';
  try {
    const blob = await canvasToBlob(work.value, outType.value, quality.value);
    result.value = { blob, size: blob.size, quality: quality.value, type: outType.value, met: null };
    downloadResult();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function exportToTarget() {
  busy.value = true;
  error.value = '';
  try {
    const type = outType.value;
    const r = await binarySearchQuality(
      targetKB.value * 1024,
      q => canvasToBlob(work.value, type, q)
    );
    result.value = { blob: r.blob, size: r.blob.size, quality: r.quality, type, met: r.met, rounds: r.rounds };
    if (r.met) downloadResult();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function downloadResult() {
  if (!result.value) return;
  downloadBlob(result.value.blob, `${baseName(info.value.name)}-edited.${extForType(result.value.type)}`);
}
</script>