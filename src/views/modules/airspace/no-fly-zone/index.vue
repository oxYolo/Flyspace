<template>
  <NoFlyZoneManagement />
  <!-- 底部菜单已由容器组件统一渲染，这里不再重复 -->
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NoFlyZoneManagement from './NoFlyZoneManagement.vue'
const activeBottom = ref<string>('no-fly')

console.debug('[NFZ] index.vue setup mounted - loading NoFlyZoneManagement')
</script>
