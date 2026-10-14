<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { $getflightStatisticsByStatus } from "@/api/flyControl/device";
import ModuleTitle from "@/components/common/Title.vue";
// 模拟数据
const deviceStats = ref({
  totalDrones: 0,//无人机总数
  onlineDrones: 0,//无人机在线数量
  offlineDrones: 0,//无人机离线数量
  droneOnlineRate:0,//无人机在线率
  totalDocks: 0,//机场总数
  onlineDocks: 0,//机场在线数量
  offlineDocks: 0,//机场离线数量
  dockOnlineRate:0 //机场在线率
});

function getflightStatisticsByStatus() {
  $getflightStatisticsByStatus().then((res) => {
    if (res?.code == 200) {
      res.data.forEach(element => {
        if (element.deviceType === '无人机') {
          deviceStats.value.totalDrones = element.total;
          deviceStats.value.onlineDrones = element.online;
          deviceStats.value.offlineDrones = element.offline;
          // 计算在线率
          deviceStats.value.droneOnlineRate = deviceStats.value.totalDrones && deviceStats.value.totalDrones > 0
            ? Math.round((deviceStats.value.onlineDrones / deviceStats.value.totalDrones) * 100)
            : 0;
        }
        else if (element.deviceType === '机场') {
          deviceStats.value.totalDocks = element.total;
          deviceStats.value.onlineDocks = element.online;
          deviceStats.value.offlineDocks = element.offline;
          // 计算在线率
          deviceStats.value.dockOnlineRate = deviceStats.value.totalDocks && deviceStats.value.totalDocks > 0
            ? Math.round((deviceStats.value.onlineDocks / deviceStats.value.totalDocks) * 100)
            : 0;
        }
      });
    }
  })
}

onMounted(() => {
  getflightStatisticsByStatus();
});
</script>

<template>
  <div class="device-status-card">
    <ModuleTitle :text="'设备状态概览'" icon="icon-设备状态" />
    <div class="card-body">
      <div class="device-section">
        <div class="section-title">
          <span class="icon drone-icon"></span>
          无人机状态
          <span class="online-rate">在线率 {{ deviceStats.droneOnlineRate }}%</span>
        </div>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-value">{{ deviceStats.totalDrones }}</div>
            <div class="status-label">总数量</div>
          </div>
          <div class="status-item online">
            <div class="status-value">{{ deviceStats.onlineDrones }}</div>
            <div class="status-label">在线</div>
          </div>
          <div class="status-item offline">
            <div class="status-value">{{ deviceStats.offlineDrones }}</div>
            <div class="status-label">离线</div>
          </div>
        </div>
      </div>

      <div class="device-section">
        <div class="section-title">
          <span class="icon dock-icon"></span>
          无人机场状态
          <span class="online-rate">在线率 {{ deviceStats.dockOnlineRate }}%</span>
        </div>
        <div class="status-grid dock-grid">
          <div class="status-item">
            <div class="status-value">{{ deviceStats.totalDocks }}</div>
            <div class="status-label">总数量</div>
          </div>
          <div class="status-item online">
            <div class="status-value">{{ deviceStats.onlineDocks }}</div>
            <div class="status-label">在线</div>
          </div>
          <div class="status-item offline">
            <div class="status-value">{{ deviceStats.offlineDocks }}</div>
            <div class="status-label">离线</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.device-status-card {
  color: #fff;

  .card-header {
    margin-bottom: 12px;

    h3 {
      font-size: 14px;
      font-weight: 600;
      color: #333333;
      margin: 0;
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;

    .device-section {
      margin-bottom: 0;
      &:last-child {
        margin-bottom: 0;
      }

      .section-title {
        display: flex;
        align-items: center;
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 12px;

        .icon {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;

          &.drone-icon {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzQwOUVGRiI+PHBhdGggZD0iTTIyLDEwLjlWNkg1VjEwLjlDNSwxMS43LDUuNCwxMi40LDYsMTIuOUwxMiwxN0wxOCwxMi45QzE4LjYsMTIuNCwxOSwxMS43LDE5LDEwLjlWOUgyMlYxMC45TTE3LDEwSDE3LjVWNi41SDE3VjEwTTE1LDEwSDE1LjVWNi41SDE1VjEwTTEzLDEwSDEzLjVWNi41SDEzVjEwTTExLDEwSDExLjVWNi41SDExVjEwTTksOC41SDE0VjEwSDlWOC41TTksNi41SDkuNVYxMEg5VjYuNU0yMCw1SDRWMTFDNCwxMi4yLDQuNiwxMy4zLDUuNiwxNEwxMiwxOC41TDE4LjQsMTRDMTkuNCwxMy4zLDIwLDEyLjIsMjAsMTFWNVoiLz48L3N2Zz4=');
          }

          &.dock-icon {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY3QzIzQSI+PHBhdGggZD0iTTEwLDJIMTRBMiwyIDAgMCwxIDE2LDRWNkgxNFY0SDEwVjZIOFY0QTIsMiAwIDAsMSAxMCwyTTE0LDZWOEgxMFY2SDE0TTE4LDdIMTlWOUgxOFY3TTYsN0g3VjlINlY3TTQsMTFIMjBBMiwyIDAgMCwxIDIyLDEzVjIySDJWMTNBMiwyIDAgMCwxIDQsMTFNNCwxM1YyMEg2VjEzSDRNOCwxM1YyMEgxMFYxM0g4TTEyLDEzVjIwSDE0VjEzSDEyTTE2LDEzVjIwSDE4VjEzSDE2TTIwLDEzVjIwSDIyVjEzSDIwWiIvPjwvc3ZnPg==');
          }
        }

        .online-rate {
          margin-left: auto;
          font-size: 11px;
          font-weight: normal;
          color: #fff;
          background-color: rgba(255, 255, 255, 0.1);
          padding: 1px 6px;
          border-radius: 10px;
        }
      }

      .status-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 8px;

        &.dock-grid {
          grid-template-columns: repeat(3, 1fr);
        }

        .status-item {
          text-align: center;
          padding: 8px 2px;
          border-radius: 6px;
          background-color: rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          &.online {
            background-color: rgba(103, 194, 58, 0.1);
            .status-value {
              color: #67C23A;
            }
          }

          &.offline {
            background-color: rgba(144, 147, 153, 0.1);
            .status-value {
              color: #999;
            }
          }

          .status-value {
            font-size: 18px;
            font-weight: 600;
            color: #0076D6;
            margin-bottom: 4px;
          }

          .status-label {
            font-size: 12px;
            color: #fff;
          }
        }
      }
    }
  }
}
</style>
