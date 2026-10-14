<template>
  <div class="compass-outer">
    <div class="compass-degree-top">{{ angle }}°</div>
    <div class="compass-parent">
      <div class="compass-shadow"></div>
      <div class="compass-ring"></div>
      <img class="compass-bg" src="@/assets/images/tool/compass.svg" alt="compass-bg" />
      <img class="compass-center-pointer" :style="{ transform: centerPointTransForm }" src="@/assets/images/tool/指针.svg" alt="center-pointer" />
      <img class="compass-top-img-pointer" src="@/assets/images/tool/导航指针.svg" alt="top-pointer" />
      <div class="compass-green-line"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ angle: number }>();
const centerPointTransForm = computed(() => {
  return `translate(-50%, -50%) rotate(${props.angle - 180}deg)`
})
</script>
<style scoped>
.compass-outer {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.compass-degree-top {
  color: #0ff;
  height: 30px;
  font-weight: bold;
  font-size: 20px;
  margin-bottom: 2px;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px #000,1px -1px #000,-1px 1px #000,1px 1px #000;
  z-index: 20;
  position: relative;
  top: -7px;
}
.compass-parent {
  position: relative;
  width: 100%;
  height: calc(100% - 30px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.compass-shadow {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 0 18px 6px rgba(30,144,255,0.7);
  z-index: 1;
}
.compass-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 26px solid #888;
  opacity: 0.25;
  z-index: 2;
  box-sizing: border-box;
}
.compass-bg {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  z-index: 3;
  transition: transform 0.3s;
}
.compass-center-pointer {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 30%;
  height: 30%;
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}
.compass-top-img-pointer {
  position: absolute;
  left: 48%;
  top: 0px;
  width: 25px;
  height: 20px;
  transform: translateX(-50%) rotate(180deg);
  z-index: 10;
  pointer-events: none;
}
.compass-green-line {
  position: absolute;
  left: 50.5%;
  top: -7px;
  width: 5px;
  height: 20px;
  background: #00ff66;
  border-radius: 1px;
  transform: translateX(-50%);
  z-index: 9;
}
</style>
