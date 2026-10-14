<template>
  <div class="zone-stats">
    <div class="stats-background">
      <img :src="borderBg" alt="边框" class="border-bg" />
    </div>
    <div class="stats-title">
      <img :src="titleBg" alt="标题" class="title-bg" />
      <span class="title-text">实时禁飞区统计</span>
    </div>
    <div class="stats-content">
      <div class="digit-display">
        <div v-for="(digit, index) in countDigits" :key="index" class="digit-item">
          <img :src="rectBg" alt="矩形" class="rect-bg" />
          <span class="digit-text">{{ digit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import borderBg from '@/assets/images/common/边框.png'
import titleBg from '@/assets/images/common/tit.png'
import rectBg from '@/assets/qyfw/矩形.png'

interface Props { count: number }
const props = defineProps<Props>()
const countDigits = computed(() => props.count.toString().padStart(4, '0').split(''))
</script>

<style lang="less" scoped>
.zone-stats { 
  position: relative; 
  width: 100%;
  height: 120px;
  color: #cbefff; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  padding: 10px; 
  box-sizing: border-box; 
  pointer-events: auto; /* 确保可以接收点击事件 */
  flex-shrink: 0; /* 防止收缩，保持固定高度 */
}
.stats-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
.border-bg { width: 100%; height: 100%; object-fit: fill; }
.stats-title { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; height: 40px; margin-bottom: 15px; margin-top: -20px; }
.title-bg { position: absolute; top: 0; left: 50%; transform: translateX(-50%); height: 100%; object-fit: contain; }
.title-text { position: relative; z-index: 3; color: #00ffff; font-size: 16px; font-weight: bold; text-shadow: 0 0 10px rgba(0, 255, 255, 0.8); }
.stats-content { position: relative; z-index: 2; flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; }
.digit-display { display: flex; gap: 8px; margin-top: 10px; }
.digit-item { position: relative; width: 40px; height: 50px; display: flex; align-items: center; justify-content: center; }
.rect-bg { position: absolute; width: 100%; height: 100%; object-fit: fill; }
.digit-text { position: relative; z-index: 3; font-size: 32px; font-family: 'Azonix', sans-serif; color: #00ffff; text-shadow: 0 0 15px rgba(0, 255, 255, 0.8); }
</style>

