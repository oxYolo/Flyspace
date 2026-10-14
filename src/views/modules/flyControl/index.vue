<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
const Menu = defineAsyncComponent(() => import('@/views/modules/flyControl/menu.vue'));
</script>
<template>
  <div class="fly-control-contain">
    <!-- <Menu /> -->
    <router-view />
  </div>
</template>
<style scoped lang="less">
.fly-control-contain {
  width: 100%;
  height: 100%;
  position: absolute;
  bottom: 0;
  pointer-events: none !important;
  &>* {
    pointer-events: all;
  }
}
</style>
