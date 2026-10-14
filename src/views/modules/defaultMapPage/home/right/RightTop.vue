<template>
  <div
    class="common-border con"
    v-loading="loading"
    element-loading-text="获取数据中~"
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(0, 0, 0, 0.2)">
    <ModuleTitle
      :text="'无人机动态监控'"
      type="right"
      icon="icon-设备活动监控" />
    <div class="rbox">
      <div class="top">
        <div class="title">{{ zcz.title }}</div>
        <div class="value">
          <div class="item" v-for="(item, i) in zcz.value" :key="i">
            {{ item }}
          </div>
          <span class="com-unit">{{ zcz.unit }}</span>
        </div>
      </div>
      <div class="bottom">
        <div class="item" v-for="(item, i) in bottomList" :key="i">
          <div class="right">
            <div class="r-top">
              <div>
                <span class="com-value">{{ item.value }}</span>
                <span class="com-unit">{{ item.unit }}</span>
              </div>
              <div
                class="r com-jz"
                :class="{ color: item.rate < 0 }"
                v-if="item.rate"></div>
            </div>
            <div class="r-bottom">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import ModuleTitle from "@/components/common/Title.vue";

interface ZczData {
  title: string;
  value: string[];
  unit: string;
}

interface BottomItem {
  name: string;
  value: number;
  unit: string;
  rate?: number;
}

const loading = ref(false);

const zcz = ref<ZczData>({
  title: "无人机总数",
  value: ["0", "0", "0", "3"],
  unit: "架",
});

const bottomList = ref<BottomItem[]>([
  { name: "在线飞行", value: 3, unit: "架" },
  { name: "离线待命", value: 0, unit: "架" },
  { name: "维护检修", value: 0, unit: "架" },
  {name:'任务执行', value:3, unit:'架', } ,
  {name:'电量充足', value:3, unit:'架', } ,
  {name:'低电量预警', value:0, unit:'架', } ,
]);
</script>

<style lang="less" scoped>
.con {
  color: #fff;
  .rbox {
    height: calc(100% - 40px);
    margin-top: 15px;
    .top {
      margin-bottom: 5px;
      display: flex;
      background: url("@/assets/qyfw/企业服务背景.png") no-repeat;
      background-size: 100% auto;
      line-height: 68px;
      height: 75px;

      .title {
        width: 44%;
        font-size: 18px;
        padding-left: 8px;
        text-align: right;
      }
      .value {
        margin-top: 5px;
        flex: 1;
        padding-left: 5px;
        display: flex;
        justify-content: center;
        .item {
          font-family: com;
          font-weight: 550;
          font-size: 22px;
          padding: 0 5px;
          line-height: 48px;
          height: 48px;
          margin: 8px 1px;
          background: url("@/assets/qyfw/矩形.png") no-repeat;
          background-size: 100% 100%;
        }
      }
    }
    .bottom {
      height: calc(100% - 100px);
      margin: 0 12px;
      color: #fff;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
      .item {
        flex: 1;
        display: flex;
        box-sizing: border-box;
        .right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          background-size: 100% auto;
          background: url("@/assets/qyfw/03_04底座.png") no-repeat center bottom;

          .r-top {
            font-weight: 550;
            font-size: 22px;
            .com-value {
              font-family: com;
              color: #00c5fe;
              font-size: 20px;
              margin-left: -6px;
            }

            .r {
              font-size: 14px;
              color: red;
              display: flex;
              margin-left: 5px;
              .rate {
                margin-left: 2px;
              }
            }
            .color {
              color: #00ffa3;
            }
          }
          .r-bottom {
            font-size: 15px;
            margin-bottom: -5px;
          }
        }
      }
    }
  }
}
</style>
