<template>
  <div ref="layer" class="crop-layer" @pointerdown="onLayerDown">
    <div class="crop-rect" :style="rectStyle" @pointerdown.stop="startDrag($event, 'move')">
      <div class="grid-line v" style="left: 33.33%"></div>
      <div class="grid-line v" style="left: 66.66%"></div>
      <div class="grid-line h" style="top: 33.33%"></div>
      <div class="grid-line h" style="top: 66.66%"></div>
      <div
        v-for="d in DIRS"
        :key="d"
        class="crop-handle"
        :class="d"
        @pointerdown.stop="startDrag($event, d)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { clampRect, fitRectToRatio } from '../lib/geometry.js';

const props = defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  ratio: { type: Number, default: null },
  modelValue: { type: Object, required: true }
});
const emit = defineEmits(['update:modelValue']);

const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN = 24;
const layer = ref(null);
let drag = null;

const rectStyle = computed(() => ({
  left: `${props.modelValue.x}px`,
  top: `${props.modelValue.y}px`,
  width: `${props.modelValue.w}px`,
  height: `${props.modelValue.h}px`
}));

watch(
  () => [props.ratio, props.width, props.height],
  () => {
    const rect = props.ratio
      ? fitRectToRatio(props.width, props.height, props.ratio)
      : { x: props.width * 0.1, y: props.height * 0.1, w: props.width * 0.8, h: props.height * 0.8 };
    emit('update:modelValue', clampRect(rect, props.width, props.height));
  },
  { immediate: true }
);

function pointerPos(e) {
  const box = layer.value.getBoundingClientRect();
  return { x: e.clientX - box.left, y: e.clientY - box.top };
}

function onLayerDown(e) {
  const p = pointerPos(e);
  emit('update:modelValue', { x: p.x, y: p.y, w: 1, h: 1 });
  beginDrag(e, 'se', { x: p.x, y: p.y, w: 0, h: 0 });
}

function startDrag(e, mode) {
  beginDrag(e, mode, { ...props.modelValue });
}

function beginDrag(e, mode, startRect) {
  const p = pointerPos(e);
  drag = { mode, startRect, startX: p.x, startY: p.y };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', endDrag);
  e.preventDefault();
}

function endDrag() {
  drag = null;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', endDrag);
}

function onMove(e) {
  if (!drag) return;
  const p = pointerPos(e);
  const { mode, startRect: r } = drag;
  const W = props.width;
  const H = props.height;
  const ratio = props.ratio;

  if (mode === 'move') {
    emit('update:modelValue', clampRect(
      { x: r.x + p.x - drag.startX, y: r.y + p.y - drag.startY, w: r.w, h: r.h },
      W, H
    ));
    return;
  }

  const east = mode.includes('e');
  const west = mode.includes('w');
  const south = mode.includes('s');
  const north = mode.includes('n');
  const horiz = east || west;
  const vert = south || north;

  const anchorX = west ? r.x + r.w : r.x;
  const anchorY = north ? r.y + r.h : r.y;
  const availW = west ? anchorX : W - anchorX;
  const availH = north ? anchorY : H - anchorY;

  let w = r.w;
  let h = r.h;
  if (east) w = clamp(p.x - anchorX, MIN, availW);
  if (west) w = clamp(anchorX - p.x, MIN, availW);
  if (south) h = clamp(p.y - anchorY, MIN, availH);
  if (north) h = clamp(anchorY - p.y, MIN, availH);

  if (ratio) {
    if (horiz && vert) {
      const maxW = Math.min(availW, availH * ratio);
      w = clamp(Math.max(w, h * ratio), Math.min(MIN, maxW), maxW);
      h = w / ratio;
    } else if (horiz) {
      h = w / ratio;
      if (h > H) { h = H; w = h * ratio; }
    } else if (vert) {
      w = h * ratio;
      if (w > W) { w = W; h = w / ratio; }
    }
  }

  let x = west ? anchorX - w : anchorX;
  let y = north ? anchorY - h : anchorY;
  if (ratio && horiz && !vert) {
    y = clamp(r.y + r.h / 2 - h / 2, 0, H - h);
  }
  if (ratio && vert && !horiz) {
    x = clamp(r.x + r.w / 2 - w / 2, 0, W - w);
  }
  emit('update:modelValue', clampRect({ x, y, w, h }, W, H));
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
</script>