
<script setup lang="ts">
import { defineAsyncComponent, shallowRef } from 'vue'
import SideTabs from "@/components/common/side-tabs/SideTabs.vue";
import { useChatbotStore } from '@/stores/chatbot';

const LayerManage = shallowRef(
  import.meta.env.MODE === 'wd'
    ? defineAsyncComponent(() => import('@/components/common/3d/layerManage-old.vue'))
    : defineAsyncComponent(() => import('@/components/common/3d/layerManage.vue'))
);

const Header = defineAsyncComponent(() => import('@/layouts/Header.vue'))
const ChatbotPanel = defineAsyncComponent(() => import('@/components/chatbot/ChatbotPanel.vue'))

const chatbot = useChatbotStore();
</script>

<template>
  <div class="main-container">
    <Header />
    <layer-manage />
    <side-tabs />
    <div
      class="content-wrap"
      :style="{ paddingRight: chatbot.visible ? `${chatbot.panelWidth}vw` : '0px' }">
      <router-view />
    </div>
    <ChatbotPanel />
  </div>
</template>
<style lang="less" scoped>
.main-container {
  width: 100%;
  height: 100%;
}

.content-wrap {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transition: padding-right 0.28s ease;
}
</style>
