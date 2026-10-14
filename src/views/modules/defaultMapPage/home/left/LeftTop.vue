
<template>
  <div
      class="con"
      v-loading="loading"
      element-loading-text="获取数据中~"
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.2)">
    <ModuleTitle :text="'无人机动态统计'" icon="icon-无人机动态统计" />
    <div class="rbox">
      <div class="top">
        <div class="title">{{ zcz.title }}</div>
        <div class="value">
          <div class="item" v-for="(item,i) in zcz.value" :key="i">{{ item }}</div>
          <span class="com-unit">{{ zcz.unit }}</span>
        </div>
      </div>
      <div class="center">
        <div
            v-for="(item, index) in centerList"
            :key="index"
            class="bottom-item1"
        >
          <span>{{ item.label }}</span>
          <div
              v-for="(item2, index2) in item.child"
              :key="index2"
          >
            <span>{{ item2.label }}</span>
            <span :style="`font-weight: bold; color: ${item2.color}`" class="com-value">{{ item2.value }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ModuleTitle from "@/components/common/Title.vue";

interface ZczData {
  title: string
  value: string[]
  unit: string
}

interface CenterItem {
  label: string
  child: Array<{
    label: string
    value: string
    color: string
  }>
}

interface BottomItem {
  label: string
  value: string
  unit: string
}

const loading = ref(false)

const zcz = ref<ZczData>({
  title: '在线架次统计',
  value: ['0', '0', '0', '3'],
  unit: '架'
})

const centerList = ref<CenterItem[]>([
  {
    label: '无人机状态',
    child: [
      { label: '在线', value: '3', color: '#00c5fe' },
      { label: '在线率', value: '100%', color: '#00fea2' },
    ]
  },
  {
    label: '机场状态',
    child: [
      { label: '在线', value: '3', color: '#00c5fe' },
      { label: '在线率', value: '100%', color: '#00fea2' },
    ]
  }
])
</script>

<style lang="less" scoped>
.con {
  color: #fff;
  .rbox {
    height: calc(100% - 32px);
    margin-top: 15px;
    .top{
      margin: 8px 2px 15px 0;
      display: flex;
      height: 68px;
      background: url('@/assets/qyfw/诉求总量背景.png') no-repeat;
      background-size: 100% 100%;
      line-height: 75px;

      .title{
        width: 50%;
        font-size: 18px;
        padding-left: 8px;
        text-align: right;
      }
      .value{
        margin-top: 5px;
        flex: 1;
        padding-left: 5px;
        display: flex;
        justify-content: center;
        // cursor: pointer;
        .item{
          font-family: com;
          font-weight: 550;
          font-size: 22px;
          padding: 0 5px;
          height: 48px;
          line-height: 48px;
          margin: 8px 1px;
          background: url('@/assets/qyfw/矩形.png') no-repeat;
          background-size: 100% 100%;
        }
      }
    }
    .bottom{
      display: flex;
      flex-wrap: wrap;
      color: #fff;

      .item{
        width: 50%;
        padding: 15px;
        display: flex;
        box-sizing: border-box;
        .block{
          width: 34%;
        }
        .right{
          flex: 1;
          .r-top{
            font-weight: 550;
            font-size: 16px;
            color: #00c6ff;
            // cursor: pointer;
            display: flex;

            .r{

              font-size: 14px;
              color: #ccc;
              display: flex;
              margin-left: 5px;
              .rate{
                margin-left: 2px;
              }

            }
            .color{
              color: #00ffa3;
            }
          }
          .r-bottom{
            font-size: 13px;
          }
        }
      }
    }
    .bottom-item1 {
      font-size: 15px;
      height: 46px;
      margin: 8px 12px;
      padding-left: 45px;
      background: url('@/assets/qyfw/政务办理背景.png') no-repeat;
      background-size: 100% 100%;
      display: grid;
      grid-template-columns: 85px 1fr 1fr;
      text-align: left;
      line-height: 43px;
      .com-value {
        font-size: 18px;
        font-weight: 600;
      }
      & > div {
        display: grid;
        grid-template-columns: 1.5fr 2fr;
      }
      img {
        display: inline-block;
        margin: auto;
        width: 15px;
        height: 15px;
      }
    }
    .bottom {
      font-size: 15px;
      margin: 8px 12px;
      height: 46px;
      padding-left: 45px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      background: url('@/assets/qyfw/政务办理背景.png') no-repeat;
    }
    .bottom-item2 {
      background-size: 100% 100%;
      display: flex;
      justify-content: space-around;
      text-align: center;
      line-height: 45px;
      .blue-text {
        color: #00F5E6;
      }
      .num {
        font-size: 18px;
        font-weight: 600;
      }
    }
  }

}
</style>
