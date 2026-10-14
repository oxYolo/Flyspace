<template>
  <div class="right-module-panel">
    <!-- 天气预警 (左侧悬浮) -->
    <WeatherWarning
      v-show="showWeatherWarning"
      @close="showWeatherWarning = false" />

    <!-- 气象信息 -->
    <RightTopModule @toggleWarning="showWeatherWarning = !showWeatherWarning" />
    <!-- 飞行机器架次统计 -->
    <FlightMachineRank />
    <!-- 成果统计 -->
    <AchievementStatistics />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RightTopModule from "./components/rightTopModule.vue";
import FlightMachineRank from "./FlightMachineRank.vue";
import AchievementStatistics from "./AchievementStatistics.vue";
import WeatherWarning from "./components/WeatherWarning.vue";
// import RightBottomModule from './components/rightBottomModule.vue'

const showWeatherWarning = ref(false);
</script>

<style lang="less" scoped>
.right-module-panel {
  display: flex;
  height: 100%;
  flex-direction: column;
  position: relative;
}
</style>
