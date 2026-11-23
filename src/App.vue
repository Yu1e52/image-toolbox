<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">图片<span>工具箱</span></div>
      <router-link to="/">🏠 首页</router-link>
      <router-link to="/editor">🖼️ 通用编辑</router-link>
      <router-link to="/id-photo">🪪 证件照</router-link>
      <div class="foot">纯浏览器本地处理<br />图片绝不上传</div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>