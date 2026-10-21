
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
// 地图机场监控弹框：点击地图上机场 label 弹出直播弹框（胶水组件，自管理监听与显隐）
const MapAirportLiveDialog = defineAsyncComponent(() => import('@/components/business/MapAirportLiveDialog.vue'))

const chatbot = useChatbotStore();
</script>

<template>
  <div class="main-container">
    <Header />
    <layer-manage />
    <map-airport-live-dialog />
    <side-tabs />
    <div
      class="content-wrap"
      :style="{ paddingRight: chatbot.visible ? `max(350px, ${chatbot.panelWidth}vw)` : '0px' }">
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
