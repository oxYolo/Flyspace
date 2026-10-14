<template>
  <div class="device-panel">
    <div class="main-content-area">
      <div class="panel-header">
        <div class="header-title">设备库 ({{ pageOptions.total }})</div>
        <el-icon @click="handleCloseDialog"><Close /></el-icon>
      </div>

      <!-- 多选时显示已选中的设备 -->
      <div
        v-if="multiple && selectedDevices.length > 0"
        class="selected-devices">
        <div class="selected-title">
          已选中设备 ({{ selectedDevices.length }})
        </div>
        <div class="selected-tags">
          <el-tag
            v-for="device in selectedDevices"
            :key="device.id"
            closable
            @close="removeSelectedDevice(device)"
            class="selected-tag">
            {{ device.nickname }}
          </el-tag>
        </div>
        <div class="selected-actions">
          <el-button
            type="primary"
            size="small"
            @click="handleConfirmSelection">
            确认选择
          </el-button>
          <el-button size="small" @click="clearSelection"> 清空 </el-button>
        </div>
      </div>

      <!-- 设备列表区 -->
      <div class="device-list">
        <!-- 通过 v-for 渲染设备卡片 -->
        <div
          v-for="item in deviceList"
          :key="item.id"
          class="device-card"
          :class="{
            active: multiple
              ? isDeviceSelected(item.id)
              : isSingleDeviceSelected(item),
          }"
          @click="handleClickDevice(item)">
          <div
            class="activity-icon"
            :class="item.domain"
            v-tooltip="item.domain == 3 ? '机场' : '无人机'">
            <img :src="item.domain == 3 ? dock : drone" alt="" />
          </div>
          <div class="activity-content">
            <div class="activity-title">
              <span>{{ item.nickname }}</span>
            </div>
            <div class="activity-time">{{ item.deviceName }}</div>
          </div>
          <div class="activity-status" :class="getStatusClass(item.status)">
            {{ item.status === "success" ? "在线" : "离线" }}
          </div>
        </div>
        <!-- 如果没有航线，可以显示一个提示 -->
        <div v-if="deviceList.length === 0" class="no-routes-message">
          暂无航线数据。
        </div>
      </div>
      <div class="actions">
        <el-pagination
          v-model:current-page="pageOptions.page"
          v-model:page-size="pageOptions.size"
          :background="false"
          :pager-count="4"
          size="small"
          layout="prev, pager, next,total"
          :total="pageOptions.total"
          class="white-el-pagination"
          @current-change="handleCurrentChange" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { $getflightList } from "@/api/flyControl/device";
import drone from "@/assets/images/drone/drone.png";
import dock from "@/assets/images/drone/dock.png";
import { Close } from "@element-plus/icons-vue";
import type { PageOptions } from "@/model/commonModel.ts";

// 定义 props
interface Props {
  multiple?: boolean; // 是否多选，默认单选
  defaultSelectedDeviceSn?: string;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  defaultSelectedDeviceSn: "",
});

const emits = defineEmits([
  "handleCloseDialog",
  "handleClickDevice",
  "handleMultipleSelection",
]);

interface DeviceActivity {
  id: number;
  deviceName: string;
  modelName: string;
  type: string;
  action: string;
  time: string;
  status: string;
  source?: string;
  longitude?: string;
  latitude?: string;
  unitName?: string;
  contactUser?: string;
  brandName?: string;
  city?: string;
  nickname?: string;
  district?: string;
  domain?: number | string;
}

const deviceList = ref<DeviceActivity[]>([]);
const selectedDeviceKey = ref<string>("");
// 多选相关状态
const selectedDevices = ref<DeviceActivity[]>([]);

const pageOptions = ref<PageOptions>({
  page: 1,
  size: 10,
  total: 0,
});

// 获取状态样式
const getStatusClass = (status: string) => {
  return `status-${status}`;
};

// 检查设备是否已选中（多选模式）
const isDeviceSelected = (deviceId: number | string) => {
  return selectedDevices.value.some((device) => device.id === deviceId);
};

const getDeviceKey = (item: any) => {
  const sn = String(item?.deviceSn || item?.sn || "").trim();
  if (sn) return sn;
  const id = item?.id;
  return id === null || id === undefined ? "" : String(id);
};

const isSingleDeviceSelected = (item: any) => {
  const key = getDeviceKey(item);
  if (!key) return false;
  return key === selectedDeviceKey.value;
};

// 移除已选中的设备
const removeSelectedDevice = (deviceToRemove: DeviceActivity) => {
  selectedDevices.value = selectedDevices.value.filter(
    (device) => device.id !== deviceToRemove.id,
  );
};

// 清空选择
const clearSelection = () => {
  selectedDevices.value = [];
};

// 确认选择（多选模式）
const handleConfirmSelection = () => {
  emits("handleMultipleSelection", selectedDevices.value);
};

/**
 * 获取设备数据
 */
const getflightList = async () => {
  const params = {
    domain: 3, // 只查询机场
    pageNum: pageOptions.value.page,
    pageSize: pageOptions.value.size,
  };
  try {
    const res: any = await $getflightList(params);
    if (res?.code === 200) {
      const data = <any>[];
      res.rows.forEach((element: any) => {
        data.push({
          ...element,
          type: element.deviceType == 2 ? "dock" : "drone",
          action: "",
          time: element.lastOnlineTime,
          status: element.onlineStatus == 1 ? "success" : "warning",
          source: "",
        });
      });
      deviceList.value = data;
      pageOptions.value.total = res.total;
    }
  } catch (error) {
    console.log(error);
  }
};

const handleCurrentChange = (page: number) => {
  pageOptions.value.page = page;
  getflightList();
};

/**
 * 关闭弹框
 */
const handleCloseDialog = () => {
  emits("handleCloseDialog");
};

/**
 * 选择设备事件
 */
const handleClickDevice = (item: DeviceActivity) => {
  if (props.multiple) {
    // 多选模式
    const index = selectedDevices.value.findIndex(
      (device) => device.id === item.id,
    );
    if (index > -1) {
      // 如果已选中，则取消选中
      selectedDevices.value.splice(index, 1);
    } else {
      // 如果未选中，则添加到选中列表
      selectedDevices.value.push(item);
    }
  } else {
    // 单选模式，保持原有逻辑
    selectedDeviceKey.value = getDeviceKey(item);
    emits("handleClickDevice", item);
  }
};

onMounted(() => {
  const wanted = String(props.defaultSelectedDeviceSn || "").trim();
  if (!props.multiple && wanted) {
    selectedDeviceKey.value = wanted;
  }
  getflightList();
});
</script>

<style lang="less" scoped>
.device-panel {
  color: #ccc;
  height: 100%;
  display: flex;
  flex-direction: row;
  width: 350px;
  position: absolute;
  top: 0;
  right: -10px;
  transform: translateX(100%);
  background-color: rgba(23, 44, 44, 0.9);
  .main-content-area {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    .panel-header {
      color: #fff;
      box-shadow: inset 0 -1px 0 0 #4f4f4f;
      margin: 0;
      padding: 10px;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .el-icon {
        cursor: pointer;
      }
      .header-title {
        font-weight: bold;
      }
    }

    // 已选中设备区域样式
    .selected-devices {
      padding: 15px 20px;
      background-color: rgba(51, 51, 51, 0.8);
      border-bottom: 1px solid #4f4f4f;

      .selected-title {
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
      }

      .selected-tags {
        margin-bottom: 15px;

        .selected-tag {
          margin-right: 8px;
          margin-bottom: 8px;
          background-color: rgba(64, 158, 255, 0.2);
          border-color: rgba(64, 158, 255, 0.5);
          color: #409eff;

          :deep(.el-tag__close) {
            color: #409eff;
            &:hover {
              background-color: rgba(64, 158, 255, 0.3);
            }
          }
        }
      }

      .selected-actions {
        display: flex;
        gap: 10px;

        .el-button {
          height: 28px;
          padding: 0 12px;
          font-size: 12px;
        }
      }
    }

    .device-list {
      flex-grow: 1;
      padding: 10px 20px;
      overflow-y: auto;
      min-height: 0;
      .device-card {
        background-color: rgba(51, 51, 51, 0.6);
        padding: 15px;
        margin-bottom: 10px;
        border-radius: 4px;
        cursor: pointer;
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease;
        display: flex;
        align-items: center;
        width: 100%;

        &.active {
          background-color: #444; /* 鼠标悬停时背景变浅 */
          border: 1px solid #409eff;
        }

        &:hover {
          background-color: #444; /* 鼠标悬停时背景变浅 */
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
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
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
          color: #fff;

          .activity-title {
            font-size: 14px;
            margin-bottom: 4px;

            .activity-action {
              margin-left: 8px;
              font-size: 12px;
              background-color: rgba(144, 147, 153, 0.1);
              padding: 1px 6px;
              border-radius: 10px;
              flex-shrink: 0;
            }
          }

          .activity-time {
            font-size: 12px;
            color: #aaa;
          }
        }

        .activity-status {
          min-width: 8px; /* 防止状态指示点被压缩 */
          font-size: 12px;

          &.status-success {
            color: #67c23a;
          }

          &.status-warning {
            color: #e6a23c;
          }

          &.status-error {
            color: #f56c6c;
          }
        }
      }
    }
    .actions {
      width: 100%;
      padding: 20px 16px;
      height: 65px;
      border-top: 1px solid #4f4f4f;
    }
    .no-routes-message {
      text-align: center;
      color: #aaa;
      padding-top: 20px;
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}
</style>
