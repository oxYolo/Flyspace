<template>
  <!-- 返回按钮 - 与 smartServiceContainer 平级 -->
  <div
    v-if="isLocateMode"
    class="smartServiceBackBtn"
    :class="{ locateMode: isLocateMode }">
    <el-button :icon="Back" @click="handleBack">返 回</el-button>
  </div>

  <div v-show="!isLocateMode" class="smartServiceContainer">
    <div class="pageHeader">
      <SceneTabs v-model="activeScene" />
    </div>

    <div class="pageBody">
      <div class="leftPanel">
        <!-- 识别任务列表 -->
        <InspectionTaskList
          :key="`${activeScene}-${taskListRefreshKey}`"
          :sceneCode="activeScene"
          :activeTaskId="activeTaskId"
          @create="handleOpenCreateDialog"
          @select="handleSelectTask"
          @empty="handleTaskListEmpty" />
      </div>

      <div class="rightPanel">
        <InspectionTaskDetail
          :task="activeTask"
          :sceneCode="activeScene"
          v-model:current-page="pageState.currentPage"
          v-model:page-size="pageState.pageSize"
          @locate="handleLocateIssue"
          @resubmitted="handleTaskResubmitted" />
      </div>
    </div>

    <CreateRecognitionTaskDialog
      v-model="createDialogVisible"
      :defaultScene="activeScene"
      @submit="handleCreateTask" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { Back } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import SceneTabs from "./components/SceneTabs.vue";
import InspectionTaskList from "./components/InspectionTaskList.vue";
import InspectionTaskDetail from "./components/InspectionTaskDetail.vue";
import CreateRecognitionTaskDialog from "./components/CreateRecognitionTaskDialog.vue";
// @ts-ignore
import { getMapManager } from "@/services/mapService";
// @ts-ignore
import { createMediaThumbnail } from "@/services/mediaService_readable";

type SceneKey = string;

interface InspectionTask {
  id: string;
  name: string;
  createdAt: string;
  viewStatus: "PROCESSING" | "SUCCESS" | "FAILED";
  videoName?: string;
  raw?: any;
}

const emits = defineEmits<{
  (e: "close"): void;
}>();

const router = useRouter();

const activeScene = ref<SceneKey>("");
const createDialogVisible = ref(false);
const taskListRefreshKey = ref(0);

const pageState = ref({
  currentPage: 1,
  pageSize: 9,
});

const activeTaskId = ref<string>("");
const activeTask = ref<InspectionTask | null>(null);

const isLocateMode = ref(false);

const SMART_SERVICE_LOCATE_LAYER = "smartServiceLocate";

const clearLocateLayers = () => {
  const mapManager = getMapManager();
  mapManager?.clearLayer(SMART_SERVICE_LOCATE_LAYER);
};

const handleLocateIssue = async (payload: {
  longitude: number;
  latitude: number;
  imageUrl?: string;
  id?: string;
}) => {
  const longitude = Number(payload.longitude);
  const latitude = Number(payload.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    ElMessage.warning("暂无有效经纬度");
    return;
  }
  const mapManager = getMapManager();
  if (!mapManager) return;

  isLocateMode.value = true;
  clearLocateLayers();

  const imgUrl = String(payload.imageUrl || "").trim();
  const thumbnail = imgUrl ? await createMediaThumbnail(imgUrl) : null;
  const entityId = payload.id
    ? `smartService_${payload.id}`
    : `smartService_${Date.now()}`;

  mapManager.addBillboards(SMART_SERVICE_LOCATE_LAYER, [
    {
      id: entityId,
      coordinates: [longitude, latitude, 10],
      image: thumbnail,
      billboardStyle: {
        scale: 1.1,
        heightReference: "CLAMP_TO_GROUND",
        verticalOrigin: "BOTTOM",
        pixelOffset: mapManager.createCartesian2(0, 0),
      },
      properties: {
        entityType: "smartServiceLocate",
        raw: payload,
      },
    },
  ]);

  mapManager.flyToPosition(longitude, latitude, 1600, 1);
};

const handleBack = () => {
  if (isLocateMode.value) {
    isLocateMode.value = false;
    return;
  }
  emits("close");
  const hasBack = Boolean((router.options.history.state as any)?.back);
  if (hasBack || window.history.length > 1) {
    router.back();
    return;
  }
  router.push({ path: "/defaultMapPage/flyControl/smartService" });
};

/** 打开“新建识别任务”弹窗 */
function handleOpenCreateDialog() {
  createDialogVisible.value = true;
}

/** 点击任务卡片后，更新右侧详情展示并重置分页 */
function handleSelectTask(task: InspectionTask) {
  activeTaskId.value = task.id;
  activeTask.value = task;
  pageState.value.currentPage = 1;
}

function handleTaskListEmpty() {
  activeTaskId.value = "";
  activeTask.value = null;
  pageState.value.currentPage = 1;
}

/** 提交新建任务表单后，将任务追加到列表并默认选中 */
function handleCreateTask(payload: {
  name: string;
  scene: SceneKey;
  majorCategory: string;
  minorCategories: string[];
  videoSource: "history" | "upload";
  videoName?: string;
  startTime: string;
  taskId?: string;
  videoUrl?: string;
}) {
  activeScene.value = payload.scene;
  activeTaskId.value = payload.taskId || "";
  activeTask.value = payload.taskId
    ? {
        id: payload.taskId,
        name: payload.name,
        createdAt: "",
        viewStatus: "PROCESSING",
        videoName: payload.videoName,
        raw: {
          taskId: payload.taskId,
          taskName: payload.name,
          sourceFilePath: payload.videoUrl,
        },
      }
    : null;
  pageState.value.currentPage = 1;
  taskListRefreshKey.value += 1;
}

/** 再次识别提交成功后刷新任务列表（列表重建时会优先选回当前任务） */
function handleTaskResubmitted() {
  taskListRefreshKey.value += 1;
}

onBeforeUnmount(() => {
  clearLocateLayers();
});
</script>

<style scoped lang="less">
.smartServiceContainer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(28, 99, 99, 0.6);
  backdrop-filter: blur(10px);
}

.smartServiceBackBtn {
  position: fixed;
  top: 80px;
  left: 10px;
  z-index: 600;
}

.smartServiceBackBtn.locateMode {
  z-index: 500;
  pointer-events: none;
}

.smartServiceBackBtn.locateMode .el-button {
  pointer-events: auto;
}

.pageHeader {
  margin-top: 80px;
  flex-shrink: 0;
  padding: 0px 6px;
}

.pageBody {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 5px;
  padding: 6px;
  padding-top: 5px;
}

.leftPanel {
  width: 20%;
  min-width: 280px;
  height: 100%;
  min-height: 0;
}

.rightPanel {
  flex: 1;
  height: 100%;
  min-height: 0;
}
</style>
