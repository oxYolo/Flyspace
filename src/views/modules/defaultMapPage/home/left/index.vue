<template>
  <div class="module-left animate__animated"  :class="[{ 'animate__fadeInLeft': sidebarStore.leftOpen, 'animate__fadeOutLeft': !sidebarStore.leftOpen }]">
    <LeftTop />
    <LeftCenter />
    <LeftBottom />
  </div>
</template>

<script setup lang="ts">
import LeftTop from "./LeftTop.vue";
import LeftCenter from "./LeftCenter.vue";
import LeftBottom from "./LeftBottom.vue";
import { useSidebarStore } from "@/stores/sidebar";

const sidebarStore = useSidebarStore();
</script>

