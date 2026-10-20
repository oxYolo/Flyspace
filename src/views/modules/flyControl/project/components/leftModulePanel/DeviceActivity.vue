<script setup lang="ts">
import { onMounted, ref } from "vue";
import DeviceDetailDialog from "@/views/modules/flyControl/project/components/leftModulePanel/DeviceDetailDialog.vue";
import DeviceLiveDialog from "@/components/business/DeviceLiveDialog.vue";
import { useFlyControlStore } from "@/stores/modules/flyControl";
import { Search } from "@element-plus/icons-vue";
import { $getflightList } from "@/api/flyControl/device";
import drone from "@/assets/images/drone/drone.png";
import dock from "@/assets/images/drone/dock.png";
import { deviceFlightItem } from "@/transform/device";
import { getRunTask } from "@/transform/control";
import { ElMessage } from "element-plus";
import type { DeviceInfo } from "@/model/device";
import ModuleTitle from "@/components/common/Title.vue";
// @ts-ignore
import { getMapManager } from "@/services/mapService";

const flyControlStore = useFlyControlStore();

const recentActivities = ref<DeviceInfo[]>([]);

// 搜索和筛选
const searchQuery = ref("");
const selectedSource = ref("");
const selectedStatus = ref("online");

// 来源列表
const sourceOptions = [
  { label: "全部", value: "" },
  { label: "飞行器", value: 0 },
  { label: "机场", value: 3 },
];

// 状态列表
const statusOptions = [
  { label: "全部", value: "" },
  { label: "在线", value: "online" },
  { label: "执行中", value: "executing" },
  { label: "离线", value: "offline" },
];

// 获取状态样式
const getStatusClass = (status: string | undefined) => {
  return `status-${status ?? ""}`;
};

// 状态标签文案
const getStatusText = (status: string | undefined) => {
  const map: Record<string, string> = {
    success: "在线",
    processing: "执行中",
    warning: "离线",
  };
  return map[status ?? ""] ?? "离线";
};

// 设备详情对话框
const deviceDialogVisible = ref(false);
const selectedDevice = ref<DeviceInfo | null>(null);

// 直播对话框
const liveDialogVisible = ref(false);
const liveDevice = ref<DeviceInfo | null>(null);

// 控制设备
const controlDevice = ref<DeviceInfo | null>(null);

const selectedActivityId = ref<any>(null);

// 显示设备详情
const showDeviceDetail = async (activity: DeviceInfo) => {
  const mapManage = getMapManager();
  selectedDevice.value = {
    ...activity,
  };
  await getRunTaskData();
  deviceDialogVisible.value = true;
  //设备定位
  mapManage?.flyToPosition(
    activity.longitude as number,
    activity.latitude as number,
    20000,
    1,
  );
};

const handleSelectActivity = (activity: DeviceInfo) => {
  selectedActivityId.value = (activity as any)?.id ?? null;
  showDeviceDetail(activity);
};

// 连接设备
const handleConnect = (device: DeviceInfo) => {
  liveDevice.value = device;
  liveDialogVisible.value = true;
};

const handleCloseDetail = () => {
  deviceDialogVisible.value = false;
  liveDialogVisible.value = false;
  selectedActivityId.value = null;
};

// 控制设备
const handleControl = (device: DeviceInfo) => {
  controlDevice.value = device;
  liveDialogVisible.value = false;
  // 跳转到飞控管理页面
  flyControlStore.navigateToFlyControl(device, runTaskData.value);
};

const runTaskData = ref({});
//获取正在进行的任务数据
const getRunTaskData = async () => {
  try {
    runTaskData.value = await getRunTask(
      selectedDevice.value?.deviceSn as string,
    );
    console.log("runTaskData.value=====>", runTaskData.value);
  } catch (error: any) {
    ElMessage.error(String(error?.message || error));
  }
};

function getflightList() {
  const params: any = {
    nickname: searchQuery.value,
    domain: selectedSource.value,
    pageNum: 1,
    pageSize: 50,
  };
  // 状态筛选：在线为宽口径（onlineStatus=1，含执行中设备）
  if (selectedStatus.value === "online") {
    params.onlineStatus = 1;
  } else if (selectedStatus.value === "executing") {
    params.onlineStatus = 1;
    params.workStatus = 1;
  } else if (selectedStatus.value === "offline") {
    params.onlineStatus = 0;
  }
  $getflightList(params).then((res: any) => {
    if ((res as any)?.code == 200) {
      recentActivities.value = (res as any).rows.map((element: any) =>
        deviceFlightItem(element),
      );
    }
  });
}
/**
 * 根据设备类型查询
 */
function selectByDeviceType() {
  getflightList();
}
/**
 * 根据设备状态查询
 */
function selectByDeviceStatus() {
  getflightList();
}

onMounted(async () => {
  getflightList();
});
</script>

<template>
  <div class="device-activity-card">
    <ModuleTitle
      :text="`设备活动监控（${recentActivities?.length || 0}）`"
      icon="icon-设备监控" />
    <div class="card-body">
      <!-- 搜索和筛选区域 -->
      <div class="search-filter-area device-activity-search">
        <div class="filter-box">
          <div class="filter-item">
            <el-input
              size="small"
              v-model="searchQuery"
              placeholder="请输入设备名称，按回车键搜索"
              :prefix-icon="Search"
              class="custom-input"
              @input="getflightList" />
          </div>
          <div class="filter-item filter-item--source">
            <el-select
              size="small"
              v-model="selectedSource"
              placeholder="设备类型"
              @change="selectByDeviceType">
              <el-option
                v-for="option in sourceOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" />
            </el-select>
          </div>
          <div class="filter-item">
            <el-select
              size="small"
              v-model="selectedStatus"
              placeholder="状态"
              @change="selectByDeviceStatus">
              <el-option
                v-for="option in statusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" />
            </el-select>
          </div>
        </div>
      </div>

      <div class="activity-list">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="activity-item"
          :class="{ active: selectedActivityId === activity.id }"
          @click="handleSelectActivity(activity)">
          <div
            class="activity-icon"
            :class="activity.type"
            v-tooltip="activity.type === 'drone' ? '无人机' : '机场'">
            <img :src="activity.type === 'drone' ? drone : dock" alt="" />
          </div>
          <div class="activity-content">
            <div class="activity-title">
              <span>{{ activity.nickname || activity.deviceName }}</span>
            </div>
            <div class="activity-time">{{ activity.deviceName }}</div>
          </div>
          <div class="activity-status" :class="getStatusClass(activity.status)">
            {{ getStatusText(activity.status) }}
          </div>
        </div>
      </div>
    </div>
    <!-- 设备详情对话框 -->
    <DeviceDetailDialog
      v-if="deviceDialogVisible"
      :device="selectedDevice"
      :runTaskData="runTaskData"
      @connect="handleConnect"
      @control="handleControl"
      @close="handleCloseDetail" />

    <!-- 设备直播对话框 -->
    <DeviceLiveDialog
      v-if="liveDialogVisible"
      :device="liveDevice"
      :runTaskData="runTaskData"
      @close="liveDialogVisible = false" />
  </div>
</template>

<style scoped lang="less">
.device-activity-card {
  color: #fff;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; // 防止整个组件溢出

  .card-body {
    height: calc(100% - 50px);
    padding: 0px 10px;
    display: flex;
    flex-direction: column;
    // 搜索和筛选区域样式
    .search-filter-area {
      margin-bottom: 2px;

      .search-box {
        margin-bottom: 10px;
      }

      .filter-box {
        display: flex;
        gap: 5px;

        .filter-item {
          flex: 1;

          .custom-input {
            height: 24px;
          }
        }

        .filter-item--source {
          min-width: 110px;
        }
      }
    }

    .activity-list {
      width: 100%;
      flex: 1;
      overflow-y: auto;

      .activity-item {
        display: flex;
        align-items: center;
        padding: 8px 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
        width: 100%;
        cursor: pointer;
        box-sizing: border-box;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        &.active {
          background-color: rgba(1, 209, 202, 0.3);
        }

        .activity-icon {
          width: 24px;
          height: 24px;
          min-width: 24px; /* 防止图标被压缩 */
          border-radius: 50%;
          margin-right: 10px;
          background-size: 16px;
          background-position: center;
          background-repeat: no-repeat;
          transition: transform 0.3s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          &:hover {
            transform: scale(1.1);
          }

          &.drone {
            background-color: rgba(64, 158, 255, 0.1);
          }

          &.dock {
            background-color: rgba(103, 194, 58, 0.1);
          }
        }
        .activity-content {
          flex: 1;
          min-width: 0; // 防止文本溢出
          max-width: calc(100% - 50px); // 确保内容不会超出容器

          .activity-title {
            font-size: 14px;
            color: #fff;
            margin-bottom: 4px;

            .activity-action {
              margin-left: 8px;
              font-size: 12px;
              color: #333333;
              background-color: rgba(144, 147, 153, 0.1);
              padding: 1px 6px;
              border-radius: 10px;
              flex-shrink: 0;
            }
          }

          .activity-time {
            font-size: 12px;
            color: #ccc;
          }
        }

        .activity-status {
          min-width: 8px; /* 防止状态指示点被压缩 */
          border-radius: 5px;
          margin-left: 6px;
          padding: 2px 5px;
          flex-shrink: 0;
          font-size: 12px;

          &.status-success {
            background-color: #67c23a;
          }

          &.status-processing {
            background-color: #e6a23c;
            box-shadow: 0 0 0 rgba(230, 162, 60, 0.4);
            animation: pulse 1.5s infinite;
          }

          &.status-warning {
            color: #eee;
            background-color: #999;
          }

          &.status-error {
            background-color: #f56c6c;
          }
        }
      }
    }
  }
}

.con {
  background: linear-gradient(
    135deg,
    rgba(0, 50, 100, 0.8) 0%,
    rgba(0, 30, 60, 0.9) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(230, 162, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(230, 162, 60, 0);
  }
}
</style>
