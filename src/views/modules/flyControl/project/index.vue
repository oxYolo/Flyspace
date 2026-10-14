<script lang="ts" setup>
import DataStatistics from "./components/leftModulePanel/DataStatistics.vue";
import AirportActivityRank from "./components/leftModulePanel/AirportActivityRank.vue";
import DeviceActivity from "./components/leftModulePanel/DeviceActivity.vue";
import RightModulePanel from "./components/rightModulePanel/index.vue";
import DeviceOverview from "./components/DeviceOverview.vue";
</script>
<template>
  <div class="module-left">
    <!-- 数据统计 -->
    <DataStatistics />
    <!-- 机场活跃度排名 -->
    <AirportActivityRank />
    <!-- 设备活动统计 -->
    <DeviceActivity />
  </div>

  <!-- 设备总览 -->
  <DeviceOverview />

  <div class="module-right">
    <RightModulePanel />
  </div>
</template>
<style scoped lang="less">
.module-left {
  width: 360px;
  height: calc(100% - 110px);
}
</style>
