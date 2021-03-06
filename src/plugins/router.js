import Vue from 'vue';
import VueRouter from 'vue-router'
// import MobjectLabContainer from '../components/MobjectLabContainer.vue'
// import Info from '../components/Info.vue'
// import Gallery from '../components/Gallery.vue'
// import Documentation from '../components/Documentation.vue'
import ThreeTest from '../components/ThreeTest.vue';
import Config from '../components/Config.vue';
import * as consts from '../constants';
// import * as path from 'path'

Vue.use(VueRouter);

export default new VueRouter({
  base: '/',
  routes: [
    { path: '', component: ThreeTest },
    { path: consts.CONFIG_URL, component: Config },
    // { path: '', component: Gallery },
    // { path: consts.BASE_GALLERY_URL, component: Gallery },
    // { path: consts.BASE_INFO_URL, component: Info },
    // { path: consts.BASE_DOCUMENTATION_URL, component: Documentation },
    { path: '*', redirect: '' },
  ],
});
