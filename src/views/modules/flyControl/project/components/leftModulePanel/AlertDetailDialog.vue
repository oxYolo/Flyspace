<script setup lang="ts">
import { ref, defineProps, defineEmits, computed, onMounted, watch } from 'vue';
import { $getHMSInfo } from "@/api/flyControl/device.ts";
import dayjs from 'dayjs';
import { ElMessage } from 'element-plus';
import { Calendar, Search, Refresh } from '@element-plus/icons-vue';
import ModuleTitle from "@/components/common/Title.vue";

interface AlertInfo {
  hmsId?: string;
  level?: number;
  messageZh?: string;
  messageEn?: string;
  createTime?: string;
  deviceSn?: string;
}

interface DeviceInfo {
  id?: number;
  name?: string;
  type?: string;
  status?: string;
  deviceSn?: string;
  subDeviceSn?: string;
}

const props = defineProps({
  device: {
    type: Object as () => DeviceInfo | null,
    default: () => null,
  },
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// 判断是否为无人机场
const isDock = computed(() => {
  return props.device?.type === 'dock' || props.device?.name?.includes('Dock');
});

// 获取设备类型标签
const getDeviceTypeLabel = (deviceSn: string) => {
  if (!props.device) return '';

  // 如果是机场设备
  if (isDock.value) {
    if (deviceSn === props.device.deviceSn) {
      return '机场';
    } else if (deviceSn === props.device.subDeviceSn) {
      return '无人机';
    }
  } else {
    // 如果是无人机设备
    return '无人机';
  }

  return '';
};

// 获取设备类型样式类名
const getDeviceTypeClass = (deviceSn: string) => {
  if (!props.device) return '';

  // 如果是机场设备
  if (isDock.value) {
    if (deviceSn === props.device.deviceSn) {
      return 'device-dock';
    } else if (deviceSn === props.device.subDeviceSn) {
      return 'device-drone';
    }
  } else {
    // 如果是无人机设备
    return 'device-drone';
  }

  return '';
};

// 分页参数
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

// 时间筛选参数
const timeRange = ref([
  dayjs().startOf('date').valueOf(),
  dayjs().valueOf()
]);

// 筛选参数
const filterParams = ref({
  deviceType: '', // 设备类型筛选：'all', 'dock', 'drone'
  alertLevel: '', // 警告类型筛选：'all', '0', '1', '2'
});

// 设备类型选项
const deviceTypeOptions = [
  { label: '全部设备', value: 'all' },
  { label: '机场', value: 'dock' },
  { label: '无人机', value: 'drone' }
];

// 警告类型选项
const alertLevelOptions = [
  { label: '全部级别', value: 'all' },
  { label: '通知', value: '0' },
  { label: '提醒', value: '1' },
  { label: '警告', value: '2' }
];

// 告警列表
const alertList = ref<AlertInfo[]>([]);
const loading = ref(false);

// 获取告警级别文本
const getAlertLevelText = (level: number) => {
  const levelMap = {
    0: "通知",
    1: "提醒",
    2: "警告"
  };
  return levelMap[level] || "未知";
};

// 获取告警样式类名
const getAlertClass = (level: number) => {
  const classMap = {
    0: "alert-notice",
    1: "alert-remind",
    2: "alert-warning"
  };
  return classMap[level] || "alert-unknown";
};

// 格式化告警时间
const formatAlertTime = (timeStr: string) => {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('时间格式化失败:', error);
    return timeStr;
  }
};

// 获取告警列表
const getAlertList = async () => {
  if (!props.device) return;

  try {
    loading.value = true;

    const deviceSnList = [];

    // 根据设备类型筛选确定要查询的设备序列号
    if (isDock.value) {
      // 机场设备
      if (filterParams.value.deviceType === 'all' || filterParams.value.deviceType === '') {
        // 查询所有设备
        if (props.device.deviceSn) {
          deviceSnList.push(props.device.deviceSn);
        }
        if (props.device.subDeviceSn) {
          deviceSnList.push(props.device.subDeviceSn);
        }
      } else if (filterParams.value.deviceType === 'dock') {
        // 只查询机场
        if (props.device.deviceSn) {
          deviceSnList.push(props.device.deviceSn);
        }
      } else if (filterParams.value.deviceType === 'drone') {
        // 只查询无人机
        if (props.device.subDeviceSn) {
          deviceSnList.push(props.device.subDeviceSn);
        }
      }
    } else {
      // 无人机设备，只查询无人机告警
      if (props.device.deviceSn) {
        deviceSnList.push(props.device.deviceSn);
      }
    }

    if (deviceSnList.length === 0) {
      return;
    }

    const params = {
      language: 'zh-CN',
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      device_sn: deviceSnList,
      begin_time: timeRange.value[0],
      end_time: timeRange.value[1],
    };

    const res = await $getHMSInfo(params);

    if (res && res.rows) {
      // 根据警告类型筛选结果
      let filteredRows = res.rows;
      if (filterParams.value.alertLevel && filterParams.value.alertLevel !== 'all') {
        filteredRows = res.rows.filter((alert: AlertInfo) =>
          alert.level?.toString() === filterParams.value.alertLevel
        );
      }

      alertList.value = filteredRows;
      pagination.value.total = filteredRows.length;
    } else {
      alertList.value = [];
      pagination.value.total = 0;
    }


  } catch (error) {
    console.error('获取告警列表失败:', error);
    ElMessage.error('获取告警列表失败');
    alertList.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
};

// 刷新数据
const handleRefresh = () => {
  pagination.value.page = 1;
  getAlertList();
};

// 时间范围变化
const handleTimeRangeChange = () => {
  pagination.value.page = 1;
  getAlertList();
};

// 筛选参数变化
const handleFilterChange = () => {
  pagination.value.page = 1;
  getAlertList();
};

// 重置筛选
const handleResetFilter = () => {
  filterParams.value.deviceType = '';
  filterParams.value.alertLevel = '';
  timeRange.value = [
    dayjs().startOf('date').valueOf(),
    dayjs().valueOf()
  ];
  pagination.value.page = 1;
  getAlertList();
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.page = page;
  getAlertList();
};

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size;
  pagination.value.page = 1;
  getAlertList();
};

// 关闭对话框
const closeDialog = () => {
  emit('close');
};

// 监听对话框显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    getAlertList();
  }
});

// 监听设备变化
watch(() => props.device, () => {
  if (props.visible) {
    getAlertList();
  }
}, { deep: true });

onMounted(() => {
  if (props.visible) {
    getAlertList();
  }
});
</script>

<template>
  <div class="alert-detail-dialog common-background">
    <ModuleTitle :text="`${device?.name || '设备'} - 告警详情`" icon="icon-告警详情" />
    <div class="close-btn" @click="closeDialog">×</div>

      <!-- 头部操作区域 -->
      <div class="head-container">
        <div class="filter-section">
          <!-- 第一行：时间范围 -->
          <div class="filter-row">
            <div class="filter-item time-filter">
              <span class="filter-label">时间范围：</span>
              <el-date-picker
                v-model="timeRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="x"
                :shortcuts="[
                  {
                    text: '今天',
                    value: () => [dayjs().startOf('date').valueOf(), dayjs().valueOf()]
                  },
                  {
                    text: '昨天',
                    value: () => [dayjs().subtract(1, 'day').startOf('date').valueOf(), dayjs().subtract(1, 'day').endOf('date').valueOf()]
                  },
                  {
                    text: '最近7天',
                    value: () => [dayjs().subtract(7, 'day').valueOf(), dayjs().valueOf()]
                  },
                  {
                    text: '最近30天',
                    value: () => [dayjs().subtract(30, 'day').valueOf(), dayjs().valueOf()]
                  }
                ]"
                @change="handleTimeRangeChange"
              />
            </div>
          </div>

          <!-- 第二行：设备类型和警告类型 -->
          <div class="filter-row">
            <div class="filter-item device-filter" v-if="isDock">
              <span class="filter-label">设备类型：</span>
              <el-select
                v-model="filterParams.deviceType"
                placeholder="选择设备类型"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="option in deviceTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>

            <div class="filter-item level-filter">
              <span class="filter-label">警告类型：</span>
              <el-select
                v-model="filterParams.alertLevel"
                placeholder="选择警告类型"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="option in alertLevelOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="dialog-content">
        <!-- 告警列表 -->
        <div class="alert-list">
          <div v-if="loading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载告警信息...</div>
          </div>

          <div v-else-if="alertList.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-text">暂无告警信息</div>
          </div>

          <div v-else class="alert-items">
            <div
              v-for="alert in alertList"
              :key="alert.hmsId"
              class="alert-item"
              :class="getAlertClass(alert.level)"
            >
              <div class="alert-header">
                <span class="alert-level">{{ getAlertLevelText(alert.level) }}</span>
                <span class="alert-time">{{ formatAlertTime(alert.createTime) }}</span>
                <span v-if="getDeviceTypeLabel(alert.sn)" class="device-type-tag" :class="getDeviceTypeClass(alert.sn)">
                  {{ getDeviceTypeLabel(alert.sn) }}
                </span>
              </div>
              <div class="alert-message">
                {{ alert.messageZh || alert.messageEn || '未知告警信息' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="alertList.length > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
  </div>
</template>

<style scoped lang="less">
.alert-detail-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 610px;
  height: 600px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  color: #fff;
  z-index: 210000;

  .close-btn {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    color: #fff;
    cursor: pointer;
    z-index: 210001;

    &:hover {
      color: #ff6b6b;
    }
  }

  .head-container {
    padding: 20px;
    margin-bottom: 10px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    min-height: 100px;

    .filter-section {
      flex: 1;

      .filter-row {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: nowrap;
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;

          .filter-label {
            font-size: 14px;
            color: #fff;
            white-space: nowrap;
            font-weight: 500;
            min-width: 70px;
          }

          &.time-filter {
            .el-date-picker {
              width: 320px;
            }
          }

          &.device-filter,
          &.level-filter {
            .el-select {
              width: 140px;
            }
          }
        }
      }
    }
  }

    .dialog-content {
    padding: 10px 20px;
    height: calc(100% - 120px);
    display: flex;
    flex-direction: column;

      .alert-list {
      flex: 1;
      overflow-y: auto;
      position: relative;

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;

        .loading-spinner {
          border: 3px solid rgba(25, 118, 210, 0.3);
          border-radius: 50%;
          border-top: 3px solid #1976d2;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          color: #fff;
          margin-top: 15px;
          font-size: 14px;
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #fff;

        .empty-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .empty-text {
          font-size: 14px;
        }
      }

      .alert-items {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .alert-item {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .alert-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;

            .alert-level {
              font-size: 12px;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 4px;
              color: white;
            }

            .alert-time {
              font-size: 12px;
              color: #fff;
            }

            .device-type-tag {
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 3px;
              color: white;
              font-weight: 500;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

              &.device-dock {
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
              }

              &.device-drone {
                background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
              }
            }
          }

          .alert-message {
            font-size: 14px;
            line-height: 1.5;
            color: #fff;
          }

          &.alert-notice {
            background-color: rgba(33, 150, 243, 0.05);
            border-color: rgba(33, 150, 243, 0.2);

            .alert-level {
              background-color: #2196f3;
            }
          }

          &.alert-remind {
            background-color: rgba(255, 152, 0, 0.05);
            border-color: rgba(255, 152, 0, 0.2);

            .alert-level {
              background-color: #ff9800;
            }
          }

          &.alert-warning {
            background-color: rgba(244, 67, 54, 0.05);
            border-color: rgba(244, 67, 54, 0.2);

            .alert-level {
              background-color: #f44336;
            }
          }

          &.alert-unknown {
            background-color: rgba(158, 158, 158, 0.05);
            border-color: rgba(158, 158, 158, 0.2);

            .alert-level {
              background-color: #9e9e9e;
            }
          }
        }
      }
    }

    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      padding: 10px 0;
      border-top: 1px solid #e0e0e0;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .alert-detail-dialog {
    .head-container {
      .filter-section {
        .filter-row {
          gap: 16px;

          .filter-item {
            &.time-filter {
              .el-date-picker {
                width: 280px;
              }
            }

            &.device-filter,
            &.level-filter {
              .el-select {
                width: 120px;
              }
            }
          }
        }
      }
    }
  }
}

@media (max-width: 1000px) {
  .alert-detail-dialog {
    .head-container {
      .filter-section {
        .filter-row {
          flex-wrap: wrap;
          gap: 12px;

          .filter-item {
            flex: 1;
            min-width: 200px;

            &.time-filter {
              flex: 2;
              min-width: 300px;
            }
          }
        }
      }
    }
  }
}

.con {
  background: linear-gradient(135deg, rgba(0, 50, 100, 0.8) 0%, rgba(0, 30, 60, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}
</style>
