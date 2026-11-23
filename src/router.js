import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import EditorView from './views/EditorView.vue';
import IdPhotoView from './views/IdPhotoView.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomeView, meta: { title: '首页' } },
    { path: '/editor', component: EditorView, meta: { title: '通用编辑' } },
    { path: '/id-photo', component: IdPhotoView, meta: { title: '证件照' } }
  ]
});