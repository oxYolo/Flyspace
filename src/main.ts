import './public-path.ts'
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from "./App.vue";
import router from './router'
import './router/permission'
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "@/assets/styles/theme.less";
import "@/assets/styles/common.less";
import "@/assets/styles/main.css";
import 'animate.css';
import ToolTip from './directive/toolTip';
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
const app = createApp(App);
app.use(ToolTip);
app.use(ElementPlus)
app.use(pinia);
app.use(router);
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount("#app");

