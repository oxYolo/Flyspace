<template>
  <div class="module-right animate__animated"  :class="[{ 'animate__fadeInRight': sidebarStore.rightOpen, 'animate__fadeOutRight': !sidebarStore.rightOpen }]">
    <RightTop />
    <RightCenter />
    <RightBottom />
  </div>
</template>

<script setup lang="ts">
import RightTop from "./RightTop.vue";
import RightCenter from "./RightCenter.vue";
import RightBottom from "./RightBottom.vue";
import { useSidebarStore } from "@/stores/sidebar";

const sidebarStore = useSidebarStore();
</script>
