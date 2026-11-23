<template>
  <h1 class="page-title">图片工具箱</h1>
  <div class="tool-grid">
    <router-link to="/editor" class="panel tool-card">
      <div class="icon">🖼️</div>
      <h3>通用图片编辑</h3>
      <p>裁剪（比例预设）、等比缩放、质量压缩、压缩到目标体积、PNG / JPEG / WebP 格式转换、文字水印（平铺 / 右下角）。</p>
    </router-link>
    <router-link to="/id-photo" class="panel tool-card">
      <div class="icon">🪪</div>
      <h3>证件照工具</h3>
      <p>纯色背景抠图换底色（红 / 蓝 / 白 / 自定义）、一寸 / 二寸 / 小二寸标准裁切、六寸相纸排版打印导出。</p>
    </router-link>
  </div>
  <div class="banner info privacy-note">
    🔒 所有处理均在你的浏览器内通过 Canvas 完成，图片不会上传到任何服务器，关闭页面数据即消失。无需注册、无需 API key、离线可用。
  </div>
</template>