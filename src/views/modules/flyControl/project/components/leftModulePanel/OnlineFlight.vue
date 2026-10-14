<script setup lang="ts">
import { ref, onMounted } from "vue";
import { $getflightOnline } from "@/api/flyControl/device";
import { commonTool } from "@/utils/commonUtil.ts";
import ModuleTitle from "@/components/common/Title.vue";
// 在线飞行数据
const flightStats = ref({
  onlineFlights: 0,
  firstNumber: 0,
  secondNumber: 0,
  thirdNumber: 0,
  fourthNumber: 0,
  showFlightPath: true,
});
function getflightOnline() {
  flightStats.value.firstNumber = 0;
  flightStats.value.secondNumber = 0;
  flightStats.value.thirdNumber = 2;
  flightStats.value.fourthNumber = 0;
  return;
  // $getflightOnline().then((res:any) => {
  //   if (res?.code == 200) {
  //     let splitNum:any[] = [];
  //     if (res?.data<10) {
  //       splitNum = [res?.data];
  //     }
  //     else {
  //       splitNum = commonTool.SplitFormatNumber(res?.data).split(',');
  //     }
  //     if (splitNum.length === 1) {
  //       flightStats.value.firstNumber = 0;
  //       flightStats.value.secondNumber = 0;
  //       flightStats.value.thirdNumber = 0;
  //       flightStats.value.fourthNumber = splitNum[0];
  //     }
  //     else if (splitNum.length === 2) {
  //       flightStats.value.firstNumber = 0;
  //       flightStats.value.secondNumber = 0;
  //       flightStats.value.thirdNumber = splitNum[0];
  //       flightStats.value.fourthNumber = splitNum[1];
  //     }
  //     else if (splitNum.length === 3) {
  //       flightStats.value.firstNumber = 0;
  //       flightStats.value.secondNumber = splitNum[0];
  //       flightStats.value.thirdNumber = splitNum[1];
  //       flightStats.value.fourthNumber = splitNum[2];
  //     }
  //     else if (splitNum.length === 4) {
  //       flightStats.value.firstNumber = splitNum[0];
  //       flightStats.value.secondNumber = splitNum[1];
  //       flightStats.value.thirdNumber = splitNum[2];
  //       flightStats.value.fourthNumber = splitNum[3];
  //     }
  //   }
  //   else {
  //     flightStats.value.firstNumber = 0;
  //     flightStats.value.secondNumber = 0;
  //     flightStats.value.thirdNumber = 0;
  //     flightStats.value.fourthNumber = 0;
  //   }
  // });
}
onMounted(() => {
  getflightOnline();
});
</script>

<template>
  <div class="online-flight-card">
    <ModuleTitle :text="'在线架次统计'" icon="icon-飞行机器架次统计" />
    <div class="card-body">
      <div class="flight-stats-row">
        <div class="counter-container">
          <div class="counter-digit-container">
            <div class="counter-box">
              <div class="counter-digit">{{ flightStats.firstNumber }}</div>
            </div>
            <div class="counter-box">
              <div class="counter-digit">{{ flightStats.secondNumber }}</div>
            </div>
            <div class="counter-box">
              <div class="counter-digit">{{ flightStats.thirdNumber }}</div>
            </div>
            <div class="counter-box active">
              <div class="counter-digit">{{ flightStats.fourthNumber }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.online-flight-card {
  color: #fff;

  .card-body {
    display: flex;
    flex-direction: column;
    padding: 10px 0;
    .flight-stats-row {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;

      .counter-container {
        .counter-digit-container {
          display: flex;
          gap: 8px;

          .counter-box {
            width: 32px;
            height: 40px;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid #409eff;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.active {
              background-color: rgba(64, 158, 255, 0.2);
              box-shadow: 0 0 8px rgba(64, 158, 255, 0.3);
            }

            .counter-digit {
              color: #409eff;
              font-size: 20px;
              font-weight: bold;
            }
          }
        }
      }
    }
  }
}
</style>
