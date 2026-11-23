<template>
  <div
    class="dropzone"
    :class="{ over }"
    @click="pick"
    @dragover.prevent="over = true"
    @dragleave="over = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onPick" />
    <p class="big">点击选择 或 拖拽图片到此处</p>
    <p class="hint">支持 JPG / PNG / WebP · 图片仅在浏览器本地处理，绝不上传</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { loadImageFile } from '../lib/imageio.js';

const emit = defineEmits(['loaded', 'error']);
const fileInput = ref(null);
const over = ref(false);

function pick() {
  fileInput.value.click();
}

async function handle(file) {
  try {
    emit('loaded', await loadImageFile(file));
  } catch (e) {
    emit('error', e.message);
  }
}

function onPick(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) handle(file);
}

function onDrop(e) {
  over.value = false;
  const file = e.dataTransfer.files[0];
  if (file) handle(file);
}
</script>