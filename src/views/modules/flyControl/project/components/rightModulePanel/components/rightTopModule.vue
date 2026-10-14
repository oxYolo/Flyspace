<template>
  <div class="right-top-panel">
    <ModuleTitle :text="'气象信息'" icon="icon-气象信息" />
    <div
      class="warning-toggle"
      @click="emit('toggleWarning')"
      title="天气预警开关">
      <el-icon :size="20"><Bell /></el-icon>
    </div>

    <div class="card-body">
      <!-- 左侧数据区 -->
      <div class="left-panel">
        <div class="weather-item">
          <div class="value">
            {{ weatherData.precipitation }} <span>mm</span>
          </div>
          <div class="label">
            <img src="@/assets/images/weather/njd.png" alt="" />
            <span>降雨量</span>
          </div>
        </div>
        <div class="weather-item">
          <div class="value">{{ weatherData.windSpeed }} <span>m/s</span></div>
          <div class="label">
            <img src="@/assets/images/weather/fs.png" alt="" />
            <span>风速</span>
          </div>
        </div>
        <div class="weather-item">
          <div class="value">{{ weatherData.pressure }} <span>兆帕</span></div>
          <div class="label">
            <img src="@/assets/images/weather/qy.png" alt="" />
            <span>气压</span>
          </div>
        </div>
      </div>

      <!-- 中间核心环形区 -->
      <div class="core-content">
        <div class="temp">{{ weatherData.temperature }}℃</div>
        <div class="altitude">
          <span>{{ weatherData.text }}</span>
        </div>
      </div>

      <!-- 右侧数据区 -->
      <div class="right-panel">
        <div class="weather-item">
          <div class="value">{{ weatherData.windDirection }}</div>
          <div class="label">
            <img src="@/assets/images/weather/fx.png" alt="" />
            <span>风向</span>
          </div>
        </div>
        <div class="weather-item">
          <div class="value">{{ weatherData.windPower }} <span>级</span></div>
          <div class="label">
            <img src="@/assets/images/weather/fl.png" alt="" />
            <span>风力</span>
          </div>
        </div>
        <div class="weather-item">
          <div class="value">{{ weatherData.humidity }} <span>%</span></div>
          <div class="label">
            <img src="@/assets/images/weather/xdsd.png" alt="" />
            <span>相对湿度</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRightTopModule } from "../composables/useRightTopModule";
import ModuleTitle from "@/components/common/Title.vue";
import { Bell } from "@element-plus/icons-vue";

const emit = defineEmits(["toggleWarning"]);
const { weatherData } = useRightTopModule();
</script>

<style lang="less" scoped>
.right-top-panel {
  height: 100%;
  pointer-events: auto;
  position: relative;

  .warning-toggle {
    position: absolute;
    top: 12px;
    right: 20px;
    cursor: pointer;
    color: #04d9ff;
    transition: all 0.3s;
    z-index: 10;
    &:hover {
      color: #fff;
      transform: scale(1.1);
    }
  }

  .card-body {
    width: calc(100% - 3px);
    display: grid;
    grid-template-columns: 1fr 132px 1fr;
    align-items: center;

    background: url("@/assets/images/weather/xq_bg.png") no-repeat;
    background-size: 100% 100%;
    color: #fff;
    margin: 0 2px;
    .left-panel,
    .right-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
    }

    .weather-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 5px;
      .label {
        font-size: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
      }
      .value {
        font-size: 20px;
        color: #06fff8;
        span {
          font-size: 14px;
        }
      }
    }

    .core-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: url("@/assets/images/weather/yuan_02.png") no-repeat;
      background-size: 100% 100%;
      height: 124px;
      padding-top: 35px;

      .temp {
        font-size: 24px;
        font-weight: bold;
        color: #04d9ff;
        margin-left: 10px;
      }

      .altitude {
        font-size: 18px;
        color: #fff;
        margin-left: 15px;
      }
    }
  }
}
</style>
