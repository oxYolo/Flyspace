<script setup lang="ts">
import { ref, reactive, onBeforeUnmount } from "vue";
import { useSmartServiceStore } from "@/views/modules/smartService/commonStore.ts";
import { Plus } from "@element-plus/icons-vue";
import PlanPanel from "@/views/modules/flyControl/Plan/PlanPanel.vue";
import { ElMessage } from "element-plus";

import { $getRouteDetailByRouteId } from "@/api/flyControl/flight.ts";
import { CesiumMapManager } from "@/map-system";
import { $getVideoList } from "@/api/flyControl/task.ts";
import { WebSocketClient } from "@/utils/community/websocket_client.ts";
const smartServiceStore: any = useSmartServiceStore();

// Cesium 全局（由外部脚本注入）
declare const Cesium: any;

const formModel = ref<any>({
  model: "SLAM",
  objectType: "2d",
  planRecord: null,
});

const modelList = ref([
  { label: "快拼模型-V1.0", value: "SLAM" },
  { label: "精拼模型-V1.0", value: "ODM" },
  { label: "孪生场景-V1.0", value: "twin" },
]);

const objectTypeList = ref([
  { label: "二维场景", value: "2d" },
  { label: "三维场景", value: "3d" },
  { label: "孪生场景", value: "twin" },
]);

const showPlanPanel = ref(false);
const handleChooseRecord = () => {
  showPlanPanel.value = true;
};

const handleChoosePlan = async (plan: any) => {
  const { flyInfo, planInfo } = plan;
  formModel.value.planRecord = flyInfo;
  // 加载航线
  const res = await $getRouteDetailByRouteId(planInfo.routeId);

  if (!res.data.routePointJson.coordinates.length) {
    ElMessage.warning("航线数据为空");
    return;
  }

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
  const videoRes = await $getVideoList(flyInfo.jobId);
  if (videoRes.data?.[0].id)
    smartServiceStore.setResultInfo({
      resultType: "objectRecognitionVedio",
      url: videoRes.data[0].filePath,
    });
};

const running = ref(false);
const loading = ref(false);
const runningInfo = reactive({
  activeStep: 0,
  logInfo: [] as any[],
});

const handelRunModel = () => {
  if (!formModel.value.model) {
    ElMessage.warning("请选择模型");
    return;
  }
  if (!formModel.value.objectType) {
    ElMessage.warning("请选择重建场景");
    return;
  }
  if (!formModel.value.planRecord) {
    ElMessage.warning("请选择数据");
    return;
  }
  cleanupImageStitching();
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
  // 模拟第一步：任务开始 (立即)
  runningInfo.activeStep = 1;
  // 创建新的WebSocket连接
  stitchingWebSocket = new WebSocketClient(
    "ws://demo-lt.geostar.com.cn:11413/uavdom/",
    {
      maxReconnectAttempts: 3,
      reconnectInterval: 5000,
      autoReconnect: false, // 手动控制重连
    },
  );
  // 监听连接打开事件
  stitchingWebSocket.onOpen(() => {
    ElMessage.success("开始影像快拼处理");
    runningInfo.activeStep = 2;
    // 发送初始化消息
    const initMessage = {
      action: "init_stitcher",
      data: {
        canvas_width: 12000,
        canvas_height: 3000,
        temp_dir: "./temp",
      },
      timestamp: new Date().toISOString(),
    };

    stitchingWebSocket?.sendJSON(initMessage);

    // 发送开始拼接消息
    setTimeout(() => {
      const startMessage = {
        action: "start_stitching",
        data: {
          output_file: `dom_${Date.now()}.png`,
          frame_interval: 1,
          frames_per_canvas: 10,
          taskId: formModel.value.planRecord?.jobId,
        },
        timestamp: new Date().toISOString(),
      };

      stitchingWebSocket?.sendJSON(startMessage);
    }, 1000); // 延迟1秒发送，确保初始化完成
  });

  // 监听消息事件
  stitchingWebSocket.onMessage((event) => {
    try {
      const message = JSON.parse(event.data);

      // 处理不同类型的消息
      switch (message.type) {
        case "init_success":
          runningInfo.logInfo.unshift({
            key: new Date().getTime(),
            time: new Date().toLocaleString(),
            info: "初始化成功:",
          });
          break;

        case "processing_started":
          runningInfo.logInfo.unshift({
            key: new Date().getTime(),
            time: new Date().toLocaleString(),
            info: "处理开始:",
          });
          console.log("🎬 处理开始:", message);
          break;

        case "incremental_image":
          updateDOMOverlay(message);
          // 只在第一次收到影像时定位
          if (!hasFlownToStitchingArea) {
            flyToStitchingArea(message);
            hasFlownToStitchingArea = true;
          }
          runningInfo.logInfo.unshift({
            key: new Date().getTime(),
            time: new Date().toLocaleString(),
            info: "拼接进行中:",
          });
          break;
        case "progress_update":
          runningInfo.logInfo.unshift({
            key: new Date().getTime(),
            time: new Date().toLocaleString(),
            info: `已处理帧数: ${message.processed_frames}帧`,
          });
          break;
        case "stitch_success":
          console.log("✅ 拼接完成:", message);
          if (message.data) {
            updateDOMOverlay(message);
          }
          runningInfo.activeStep = 3;
          runningInfo.logInfo.unshift({
            key: new Date().getTime(),
            time: new Date().toLocaleString(),
            info: "任务完成",
          });
          loading.value = false;
          break;
      }
    } catch (error) {
      console.error("解析WebSocket消息失败:", error);
    }
  });

  // 监听错误事件
  stitchingWebSocket.onError((error) => {
    console.error("影像拼接WebSocket连接错误:", error);
    ElMessage.error("影像拼接连接失败");
    runningInfo.activeStep = 3;
    runningInfo.logInfo.unshift({
      key: new Date().getTime(),
      time: new Date().toLocaleString(),
      info: "任务失败",
    });
    loading.value = false;
  });

  // 建立连接
  stitchingWebSocket.connect();
};

const clearInfo = () => {
  formModel.value = {
    model: "SLAM",
    objectType: "2d",
    planRecord: null,
  };
  showPlanPanel.value = false;
  loading.value = false;
  runningInfo.activeStep = 0;
  runningInfo.logInfo = [];
  smartServiceStore.setResultInfo(null);
  cleanupImageStitching();
};

onBeforeUnmount(() => {
  smartServiceStore.resetInfo();
  cleanupImageStitching();
});
let stitchingWebSocket: WebSocketClient | null = null;
let hasFlownToStitchingArea = false; // 标记是否已经定位过拼接区域
const canvasOverlays = new Map<number, string>(); // 存储画布索引到图层ID的映射
// 清理影像拼接相关资源
const cleanupImageStitching = () => {
  // 关闭WebSocket连接
  if (stitchingWebSocket) {
    stitchingWebSocket.close();
    stitchingWebSocket = null;
  }

  hasFlownToStitchingArea = false; // 重置定位标记

  // 清理所有DOM覆盖层
  clearAllOverlays();
};

// 清理所有覆盖层（调试用）
const clearAllOverlays = () => {
  const mapManager = new CesiumMapManager(smartServiceStore.cesiumViewer);
  if (!mapManager) return;

  canvasOverlays.forEach((layerId) => {
    try {
      const layerData = mapManager.getDataSource(layerId);
      if (layerData && layerData.type === "imagery") {
        smartServiceStore.cesiumViewer?.imageryLayers?.remove(layerData.layer);
      }
    } catch (error) {
      console.error(`清理覆盖层失败: ${layerId}`, error);
    }
  });

  canvasOverlays.clear();
};

// 更新DOM覆盖层 - 支持多画布（Cesium版本）
const updateDOMOverlay = (data: any) => {
  const mapManager = new CesiumMapManager(smartServiceStore.cesiumViewer);
  if (!mapManager || !data.image_data) {
    return;
  }

  const canvasIndex = data.canvas_index || 0;
  const isNewCanvas = data.is_new_canvas || false;
  try {
    // 生成唯一的图层ID
    const layerId = `dom-canvas-${canvasIndex}`;

    // 如果不是新画布，移除旧的覆盖层
    if (!isNewCanvas && canvasOverlays.has(canvasIndex)) {
      const oldLayerId = canvasOverlays.get(canvasIndex)!;
      const layerData = mapManager.getDataSource(oldLayerId);
      if (layerData && layerData.type === "imagery") {
        mapManager.getViewer().imageryLayers.remove(layerData.layer);
        console.log(`🗑️ 移除旧覆盖层: ${oldLayerId}`);
      }
    }

    // 计算边界 - 优先使用服务器bounds数据
    let rectangle;
    if (data.bounds) {
      rectangle = Cesium.Rectangle.fromDegrees(
        data.bounds.top_left.longitude,
        data.bounds.bottom_left.latitude,
        data.bounds.top_right.longitude,
        data.bounds.top_left.latitude,
      );
    } else {
      // 默认坐标
      console.warn("⚠️ 未收到bounds数据，使用默认坐标");
      const centerLat = 30.8389;
      const centerLon = 114.1328;
      const deltaLat = 0.003;
      const deltaLon = 0.004;

      rectangle = Cesium.Rectangle.fromDegrees(
        centerLon - deltaLon,
        centerLat - deltaLat,
        centerLon + deltaLon,
        centerLat + deltaLat,
      );
    }

    // 创建单一影像提供者
    const imageryProvider = new Cesium.SingleTileImageryProvider({
      url: data.image_data,
      rectangle: rectangle,
    });

    // 添加影像图层
    const imageryLayer = mapManager
      .getViewer()
      .imageryLayers.addImageryProvider(imageryProvider);
    imageryLayer.alpha = 1.0;

    // 存储图层引用
    mapManager.getDataSources().set(layerId, {
      type: "imagery",
      layer: imageryLayer,
      provider: imageryProvider,
    });

    // 更新覆盖层映射
    canvasOverlays.set(canvasIndex, layerId);
  } catch (error) {
    console.error("更新DOM覆盖层失败:", error);
  }
};

// 自动定位到拼接区域（仅首次定位）
const flyToStitchingArea = (data: any) => {
  const mapManager = new CesiumMapManager(smartServiceStore.cesiumViewer);
  if (!data.bounds || !mapManager) return;

  const bounds = data.bounds;
  const centerLat =
    (bounds.top_left.latitude + bounds.bottom_right.latitude) / 2;
  const centerLon =
    (bounds.top_left.longitude + bounds.bottom_right.longitude) / 2;

  console.log(
    `🎯 首次定位到拼接区域: ${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}`,
  );

  // 使用Cesium的flyTo方法，仅首次定位
  mapManager.flyToPosition(centerLon, centerLat, 1000, 2.0);
};
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
      <div class="header-title">模型重建</div>
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
        <div class="label">场景类型</div>
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
        <div class="label">生成处理</div>
        <div class="info">
          <el-button :loading="loading" @click="handelRunModel" color="#2D8CF0"
            >开始运行</el-button
          >
          <!--          <el-button color="#2D8CF0">历史记录</el-button>-->
          <el-button @click="clearInfo" color="#2D8CF0">重置</el-button>
        </div>
      </div>
      <template v-if="running">
        <div class="section-item">
          <div class="label">运行结果</div>
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
