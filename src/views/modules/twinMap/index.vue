<script lang="ts" setup>
import { ref } from 'vue'
const src = ref('http://27.159.92.189:9010/cbzsgTwin/#/')
</script>
<template>
  <div class="twin-map-contain">
    <iframe
      :src="src"
    />
  </div>
</template>
<style scoped lang="less">
.twin-map-contain {
  width: 100%;
  height: calc(100% - 30px);
  margin-top: 30px;
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
}
</style>
