<script setup lang="ts">
import { ref, reactive, onBeforeUnmount } from "vue";
import { useSmartServiceStore } from "@/views/modules/smartService/commonStore.ts";
import { Plus } from "@element-plus/icons-vue";
import PlanPanel from "@/views/modules/flyControl/Plan/PlanPanel.vue";
import { ElMessage } from "element-plus";
import urlConfig from "@/public-path.ts";
import { $getRouteDetailByRouteId } from "@/api/flyControl/flight.ts";
import { CesiumMapManager } from "@/map-system";
import { $getVideoList } from "@/api/flyControl/task.ts";
import { WebRTCConnection } from "@/utils/community/webrtc_connection.ts";
import {
  $changeIceCandidate,
  $changeIceCandidateModel,
} from "@/api/flyControl/device.ts";
import { $startModelVideo } from "@/api/flyControl/modelInfo.ts";
const smartServiceStore = useSmartServiceStore();

// Cesium 全局（由外部脚本注入）
declare const Cesium: any;

const formModel = ref<any>({
  model: "yolo11",
  objectType: "car",
  planRecord: null,
});

const modelList = ref([{ label: "AI车辆识别-V1.0", value: "yolo11" }]);

const objectTypeList = ref([
  { label: "车", value: "car" },
  { label: "人", value: "person" },
  { label: "烟雾", value: "smoke" },
  { label: "火点", value: "fire" },
  { label: "船只", value: "ship" },
  { label: "游泳", value: "swim" },
  { label: "道路裂缝", value: "roadCracks" },
  { label: "漂浮物", value: "floating" },
  { label: "工程车辆", value: "engineeringVehicle" },
  { label: "安全帽", value: "safetyHelmet" },
  { label: "垃圾堆放", value: "garbage" },
]);

const showPlanPanel = ref(false);
const handleChooseRecord = () => {
  showPlanPanel.value = true;
};

const currentVideoPath = ref("");
// 处理选择航线
const handleChoosePlan = async (plan: any) => {
  currentVideoPath.value = "";
  const { flyInfo, planInfo } = plan;
  formModel.value.planRecord = flyInfo;
  // 加载航线
  const res = await $getRouteDetailByRouteId(planInfo.routeId);

  const mapManager = new CesiumMapManager(smartServiceStore.cesiumViewer);
  let dataSource = mapManager.getDataSource("routeLayer-source");
  if (!dataSource) {
    dataSource = mapManager.createDataSource("routeLayer-source");
  }

  // 清除旧的实体
  dataSource.entities.removeAll();
  // 如果有航线数据，添加航线
  if (res.data.routePointJson.coordinates.length > 0) {
    const coords = res.data.routePointJson.coordinates;
    const positions = coords.map((coord: any) =>
      Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 0),
    );
    dataSource.entities.add({
      polyline: {
        positions: positions,
        width: 7,
        material: mapManager.createColor("#0FCCC4", 0.5),
        clampToGround: true,
      },
    });
    mapManager.zoomToTarget("routeLayer-source", {
      cameraHeight: 4000,
    });
  }
  // 加载视频
  const videoRes = await $getVideoList(flyInfo.jobId);
  if (videoRes.data?.[0].id) {
    currentVideoPath.value = videoRes.data[0].filePath;
    smartServiceStore.setResultInfo({
      resultType: "objectRecognitionVedio",
      url: videoRes.data[0].filePath,
    });
  }
};

const running = ref(false);
const loading = ref(false);
const runningInfo = reactive({
  activeStep: 0,
  logInfo: [] as any[],
});

// 模型推理相关状态
const modelWebrtcService = ref<WebRTCConnection | null>(null);
const processingId = ref("");
const isModelRunning = ref(false);

let simulateTimer: number | null = null;
let stepTimer: number | null = null;

// 关闭模型推理服务
const handleCloseModel = async () => {
  try {
    if (modelWebrtcService.value) {
      modelWebrtcService.value.close();
      modelWebrtcService.value = null;
    }
    // 可以调用停止模型推理的 API
    // await $stopModelVideo({ id: processingId.value });
  } catch (err) {
    console.error("关闭模型服务失败:", err);
  } finally {
    processingId.value = "";
    isModelRunning.value = false;
  }
};

const handelRunModel = async () => {
  if (!formModel.value.model) {
    ElMessage.warning("请选择模型");
    return;
  }
  if (!formModel.value.objectType) {
    ElMessage.warning("请选择识别目标");
    return;
  }
  if (!formModel.value.planRecord) {
    ElMessage.warning("请选择识别数据");
    return;
  }
  // 清除之前的模拟
  if (simulateTimer) {
    clearTimeout(simulateTimer);
    simulateTimer = null;
  }
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }

  showPlanPanel.value = false;
  loading.value = true;
  running.value = true;

  // 重置运行信息
  runningInfo.activeStep = 0;
  runningInfo.logInfo = [
    {
      key: new Date().getTime(),
      time: new Date().toLocaleString(),
      info: "任务开始",
    },
  ];

  // 第一步：任务开始
  runningInfo.activeStep = 1;
  runningInfo.logInfo.unshift({
    key: new Date().getTime(),
    time: new Date().toLocaleString(),
    info: "准备启动模型推理...",
  });

  try {
    // 关闭之前的模型服务
    await handleCloseModel();

    // 第二步：进行中
    runningInfo.activeStep = 2;
    runningInfo.logInfo.unshift({
      key: new Date().getTime(),
      time: new Date().toLocaleString(),
      info: "连接推理服务器...",
    });

    // 准备推理参数
    const videoUrl = currentVideoPath.value;
    if (!videoUrl) {
      throw new Error("无可用视频源");
    }

    const params = {
      stream_type: "http",
      stream_url: videoUrl,
      task_id: formModel.value.planRecord?.jobId || "",
      // model_name: formModel.value.model,
      // object_type: formModel.value.objectType,
      is_historical: true,
      conf_threshold: 0.25,
      iou_threshold: 0.7,
      fps: 25,
      skip_frames: 0,
    };

    runningInfo.logInfo.unshift({
      key: new Date().getTime(),
      time: new Date().toLocaleString(),
      info: "启动模型推理服务...",
    });

    const res: any = await $startModelVideo(params);

    if (res?.output_url) {
      // 提取处理ID
      processingId.value = res.output_url.match(/\/([^/]+)$/)?.[1] || "";

      runningInfo.logInfo.unshift({
        key: new Date().getTime(),
        time: new Date().toLocaleString(),
        info: "建立视频流连接...",
      });

      // 创建模型视频的 WebRTC 连接
      modelWebrtcService.value = new WebRTCConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:your-turn-server.com",
            username: "user",
            credential: "pass",
          },
        ],
        reconnectAttempts: 5,
        reconnectInterval: 2000,
      });

      await modelWebrtcService.value.init(true);

      // 先将WebRTC服务传递给结果面板，确保onStream监听器在连接建立前就注册好
      smartServiceStore.setResultInfo({
        resultType: "objectRecognitionVedio",
        url: currentVideoPath.value,
        webrtcService: modelWebrtcService.value,
        isModelStream: true,
      });

      runningInfo.logInfo.unshift({
        key: new Date().getTime(),
        time: new Date().toLocaleString(),
        info: "注册视频流监听器...",
      });

      // 等待一小段时间确保监听器已注册
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 再添加音视频接收器并创建offer
      modelWebrtcService.value.addAudioVideoReceivers();
      const offer = await modelWebrtcService.value.createOffer();

      runningInfo.logInfo.unshift({
        key: new Date().getTime(),
        time: new Date().toLocaleString(),
        info: "交换SDP信息...",
      });

      const sdpResponse: any = await $changeIceCandidateModel(
        { id: processingId.value },
        offer.sdp,
      );

      // 处理 SDP 响应格式
      let remoteDesc: RTCSessionDescriptionInit;

      if (typeof sdpResponse === "string") {
        // 如果返回的是字符串（纯 SDP 文本），构造 answer 对象
        remoteDesc = {
          type: "answer" as RTCSdpType,
          sdp: sdpResponse,
        };
      } else if (sdpResponse && typeof sdpResponse === "object") {
        // 如果返回的是对象，验证格式
        if (!sdpResponse.type || !sdpResponse.sdp) {
          throw new Error(`无效的SDP响应格式: ${JSON.stringify(sdpResponse)}`);
        }
        remoteDesc = {
          type: sdpResponse.type as RTCSdpType,
          sdp: sdpResponse.sdp,
        };
      } else {
        throw new Error(`无效的SDP响应: ${JSON.stringify(sdpResponse)}`);
      }

      await modelWebrtcService.value.setRemoteDescription(remoteDesc);

      isModelRunning.value = true;

      runningInfo.logInfo.unshift({
        key: new Date().getTime(),
        time: new Date().toLocaleString(),
        info: "推理服务连接成功",
      });

      // 第三步：运行完成
      runningInfo.activeStep = 3;
      runningInfo.logInfo.unshift({
        key: new Date().getTime(),
        time: new Date().toLocaleString(),
        info: "模型推理运行中，请查看结果视频",
      });

      ElMessage.success("模型推理已启动");
    } else {
      throw new Error("模型推理启动失败");
    }

    loading.value = false;
  } catch (error) {
    console.error("模型推理失败:", error);
    ElMessage.error(
      `模型推理失败: ${error instanceof Error ? error.message : String(error)}`,
    );

    runningInfo.logInfo.unshift({
      key: new Date().getTime(),
      time: new Date().toLocaleString(),
      info: `错误: ${error instanceof Error ? error.message : String(error)}`,
    });

    loading.value = false;
    await handleCloseModel();
  }
};

const clearInfo = () => {
  formModel.value = {
    model: "yolo11",
    objectType: "car",
    planRecord: null,
  };
  showPlanPanel.value = false;
  if (simulateTimer) {
    clearTimeout(simulateTimer);
    simulateTimer = null;
  }
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  loading.value = false;
  runningInfo.activeStep = 0;
  runningInfo.logInfo = [];
  smartServiceStore.setResultInfo(null);
};

const handleResult = () => {
  if (currentVideoPath.value) {
    const resultName = "output.mp4";
    smartServiceStore.setResultInfo({
      resultType: "objectRecognitionVedio",
      url: currentVideoPath.value.replace(/^(.*\/)?[^/]*$/, `$1${resultName}`),
    });
  }
};

onBeforeUnmount(() => {
  // 清理模型推理服务
  if (modelWebrtcService.value) {
    modelWebrtcService.value.close();
    modelWebrtcService.value = null;
  }

  // 清理定时器
  if (simulateTimer) {
    clearTimeout(simulateTimer);
    simulateTimer = null;
  }
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }

  smartServiceStore.resetInfo();
});
</script>
<template>
  <div
    class="common-left animate__animated"
    :class="[
      {
        animate__fadeInLeft: smartServiceStore.showLeftPanel,
        animate__fadeOutLeft: !smartServiceStore.showLeftPanel,
      },
    ]">
    <!-- 顶部标题和操作区 -->
    <div class="panel-header">
      <div class="header-title">目标识别</div>
    </div>
    <div class="main-contain">
      <div class="section-item">
        <div class="label">选择模型</div>
        <div class="info">
          <el-select
            v-model="formModel.model"
            placeholder="请选择模型"
            class="black-select"
            popper-class="black-select"
            :teleported="false">
            <el-option
              v-for="item in modelList"
              :key="item.value"
              :label="item.label"
              :value="item.value" />
          </el-select>
        </div>
      </div>
      <div class="section-item">
        <div class="label">识别类型</div>
        <div class="info">
          <el-radio-group v-model="formModel.objectType">
            <el-radio
              v-for="item in objectTypeList"
              :key="item.value"
              :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </div>
      </div>
      <div class="section-item">
        <div class="label">数据选择</div>
        <div class="info">
          <div
            v-tooltip="formModel.planRecord.jobName"
            class="plan-card"
            v-if="formModel.planRecord"
            @click="handleChooseRecord">
            <span>{{ formModel.planRecord.jobName }}</span>
          </div>
          <el-button
            v-else
            @click="handleChooseRecord"
            color="#2D8CF0"
            :icon="Plus"
            >选择记录</el-button
          >
        </div>
      </div>
      <div class="section-item">
        <div class="label">检测处理</div>
        <div class="info">
          <el-button :loading="loading" @click="handelRunModel" color="#2D8CF0"
            >开始检测</el-button
          >
          <!--          <el-button color="#2D8CF0">历史记录</el-button>-->
          <el-button @click="clearInfo" color="#2D8CF0">重置</el-button>
        </div>
      </div>
      <template v-if="running">
        <div class="section-item">
          <div class="label">检测结果</div>
          <div class="info">
            <el-steps
              align-center
              :active="runningInfo.activeStep"
              process-status="wait">
              <el-step title="任务开始" />
              <el-step title="进行中" />
              <el-step title="运行完成" />
            </el-steps>
          </div>
        </div>
        <div class="section-item log-info">
          <div style="flex-grow: 1; flex-shrink: 1" />
          <div
            v-for="item in runningInfo.logInfo"
            :key="item.key"
            class="log-item">
            <span>{{ item.time }}</span>
            <span>{{ item.info }}</span>
          </div>
        </div>
      </template>
    </div>
    <PlanPanel
      v-if="showPlanPanel"
      class="plan-panel-in-smart-service"
      :show-btns="false"
      @close="showPlanPanel = false"
      @choose-plan="handleChoosePlan" />
  </div>
</template>
<style scoped lang="less">
.el-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  .el-radio {
    min-width: 30%;
    margin: 0;
    background-color: #333;
    box-shadow: 0 0 0 1px #555 inset;
    padding: 0 5px;
    color: #ccc;
    .el-radio__inner {
      background: #999;
    }
  }
}
.plan-panel-in-smart-service {
  position: fixed;
  left: 310px;
  top: 0;
  height: 100%;
  width: 100%;
  background-color: rgba(23, 44, 44, 0.9); /* 深色背景 */
  color: #ccc; /* 默认图标颜色 */
  z-index: 10; /* 确保在最上层 */
}
.plan-card {
  width: 100%;
  background-color: rgba(51, 51, 51, 0.6); /* 卡片默认背景色 */
  padding: 15px;
  margin-bottom: 10px; /* 卡片之间的间距 */
  border-radius: 4px; /* 圆角 */
  position: relative; /* 用于定位卡片内的操作按钮 */
  cursor: pointer; /* 鼠标悬停时显示手型 */
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease; /* 添加过渡效果 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    background-color: #444; /* 鼠标悬停时背景变浅 */
  }
}
</style>
