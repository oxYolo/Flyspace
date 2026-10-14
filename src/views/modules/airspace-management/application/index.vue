<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { $createAirspace, $saveDraft } from '@/api/airspace-management';
import type { AirspaceApplicationRequestModel } from '@/model/airspace-management';
import { useAirspaceStore } from "@/views/modules/airspace-management/airspaceStore.ts";
import { getViewer } from '@/services/mapService';

// 声明Cesium全局变量
declare const Cesium: any;

const airspaceStore = useAirspaceStore();
const router = useRouter();

// 表单数据
// const formModel = ref<AirspaceApplicationRequestModel>({
//   applicantUnit: '',
//   name: '',
//   contactPerson: '',
//   contactPhone: '',
//   flightType: 'UAV',
//   flightMode: 'VLOS',
//   type: 'TEMPORARY',
//   purpose: '',
//   startTime: '',
//   endTime: '',
//   altitude: {
//     min: 0,
//     max: 120
//   },
//   coordinates: [],
//   remarks: ''
// });

const formModel = ref<AirspaceApplicationRequestModel>({
  applicantUnit: '',
  contactPerson: '',
  contactPhone: '',
  flightType: 'UAV',
  subject: '',
  name: '',
  flightMode: 'VLOS',
  type: 'TEMPORARY',
  purpose: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  altitude: { min: 0, max: 120 },
  coordinates: [],
  adep: '',
  ades: '',
  alnap: '',
  memo: '',
  proc: '',
  files: [],
  remarks: ''
});

const loading = ref(false);

// 飞行类型选项
const flightTypeOptions = [
  { label: '无人飞行', value: 'UAV' },
  { label: '有人飞行', value: 'MAV' },
];

const flightModeOptions = [
  { label: '视距内飞行', value: 'VLOS' },
  { label: '超视距飞行', value: 'BVLOS' },
];

// 空域类型选项
const airspaceTypeOptions = [
  { label: '临时空域', value: 'TEMPORARY' },
  { label: '固定空域', value: 'FIXED' },
];

// 绘制模式
const drawingMode = ref<'polygon' | 'circle' | null>(null);
let drawHandler: any = null;
let tempPositions: any[] = [];
let tempEntity: any = null;
let tempPoints: any[] = [];

// 开始绘制多边形
const startDrawPolygon = () => {
  const viewer = airspaceStore.cesiumViewer || getViewer();
  if (!viewer) {
    ElMessage.error('地图未初始化');
    return;
  }

  // 清除之前的绘制
  clearDrawing();

  drawingMode.value = 'polygon';
  airspaceStore.setDrawingMode('polygon');
  tempPositions = [];

  ElMessage.info('请在地图上点击绘制多边形顶点，双击完成绘制');

  // 创建绘制handler
  drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // 左键点击添加点
  drawHandler.setInputAction((click: any) => {
    const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
    if (cartesian) {
      tempPositions.push(cartesian);

      // 添加点标记
      const point = viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 10,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      });
      tempPoints.push(point);

      // 如果有2个以上的点，绘制动态多边形
      if (tempPositions.length >= 2) {
        if (tempEntity) {
          viewer.entities.remove(tempEntity);
        }
        tempEntity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
              return new Cesium.PolygonHierarchy(tempPositions);
            }, false),
            material: Cesium.Color.CYAN.withAlpha(0.3),
            outline: true,
            outlineColor: Cesium.Color.CYAN,
            outlineWidth: 2
          }
        });
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 双击完成绘制
  drawHandler.setInputAction(() => {
    if (tempPositions.length >= 3) {
      // 转换为经纬度坐标
      const coordinates = tempPositions.map(pos => {
        const cartographic = Cesium.Cartographic.fromCartesian(pos);
        return [
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude)
        ];
      });

      // 闭合多边形
      coordinates.push(coordinates[0]);

      formModel.value.coordinates = coordinates;

      ElMessage.success(`多边形绘制完成，共 ${tempPositions.length} 个顶点`);
      console.log('绘制完成的坐标:', coordinates);

      // 清除handler但保留绘制结果
      if (drawHandler) {
        drawHandler.destroy();
        drawHandler = null;
      }
      drawingMode.value = null;
    } else {
      ElMessage.warning('至少需要3个点才能形成多边形');
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
};

// 开始绘制圆形
const startDrawCircle = () => {
  const viewer = airspaceStore.cesiumViewer || getViewer();
  if (!viewer) {
    ElMessage.error('地图未初始化');
    return;
  }

  // 清除之前的绘制
  clearDrawing();

  drawingMode.value = 'circle';
  airspaceStore.setDrawingMode('circle');

  let centerPosition: any = null;
  let radiusPosition: any = null;

  ElMessage.info('请点击地图选择圆心位置');

  // 创建绘制handler
  drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // 第一次点击设置圆心
  drawHandler.setInputAction((click: any) => {
    const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
    if (cartesian) {
      if (!centerPosition) {
        centerPosition = cartesian;

        // 添加圆心标记
        const centerPoint = viewer.entities.add({
          position: centerPosition,
          point: {
            pixelSize: 10,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          }
        });
        tempPoints.push(centerPoint);

        ElMessage.info('请点击地图设置圆的半径');

        // 鼠标移动时显示动态圆
        viewer.scene.canvas.addEventListener('mousemove', updateCircle);
      } else {
        radiusPosition = cartesian;

        // 计算半径
        const radius = Cesium.Cartesian3.distance(centerPosition, radiusPosition);

        // 生成圆形的坐标点
        const coordinates = generateCircleCoordinates(centerPosition, radius, 64);
        formModel.value.coordinates = coordinates;

        ElMessage.success(`圆形绘制完成，半径约 ${Math.round(radius)} 米`);
        console.log('绘制完成的坐标:', coordinates);

        // 清除事件监听
        viewer.scene.canvas.removeEventListener('mousemove', updateCircle);

        // 清除handler但保留绘制结果
        if (drawHandler) {
          drawHandler.destroy();
          drawHandler = null;
        }
        drawingMode.value = null;
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 动态更新圆形
  function updateCircle(event: MouseEvent) {
    if (!centerPosition) return;

    const cartesian = viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(event.clientX, event.clientY),
      viewer.scene.globe.ellipsoid
    );

    if (cartesian) {
      const radius = Cesium.Cartesian3.distance(centerPosition, cartesian);

      // 移除之前的临时圆
      if (tempEntity) {
        viewer.entities.remove(tempEntity);
      }

      // 绘制新的临时圆
      tempEntity = viewer.entities.add({
        position: centerPosition,
        ellipse: {
          semiMinorAxis: radius,
          semiMajorAxis: radius,
          material: Cesium.Color.CYAN.withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.CYAN,
          outlineWidth: 2
        }
      });
    }
  }
};

// 生成圆形坐标点
const generateCircleCoordinates = (center: any, radius: number, segments: number = 64) => {
  const coordinates: number[][] = [];
  const centerCartographic = Cesium.Cartographic.fromCartesian(center);
  const centerLon = Cesium.Math.toDegrees(centerCartographic.longitude);
  const centerLat = Cesium.Math.toDegrees(centerCartographic.latitude);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    // 简化的坐标计算（适用于小范围）
    const lon = centerLon + (dx / (111320 * Math.cos(centerLat * Math.PI / 180)));
    const lat = centerLat + (dy / 110540);

    coordinates.push([lon, lat]);
  }

  return coordinates;
};

// 清除绘制
const clearDrawing = () => {
  const viewer = airspaceStore.cesiumViewer || getViewer();

  // 销毁handler
  if (drawHandler) {
    drawHandler.destroy();
    drawHandler = null;
  }

  // 清除临时实体
  if (viewer) {
    if (tempEntity) {
      viewer.entities.remove(tempEntity);
      tempEntity = null;
    }

    tempPoints.forEach(point => {
      viewer.entities.remove(point);
    });
    tempPoints = [];
  }

  tempPositions = [];
  drawingMode.value = null;
  airspaceStore.setDrawingMode(null);
  formModel.value.coordinates = [];

  ElMessage.success('已清除绘制');
};

// 保存草稿
const handleSaveDraft = async () => {
  if (!formModel.value.applicantUnit) {
    ElMessage.warning('请填写申请单位');
    return;
  }

  loading.value = true;
  try {
    const response = await $saveDraft(formModel.value);
    if (response.code === 200) {
      ElMessage.success('草稿保存成功');
    } else {
      ElMessage.error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存草稿失败:', error);
    ElMessage.error('保存失败');
  } finally {
    loading.value = false;
  }
};

// 提交申请
const handleSubmit = async () => {
  if (!formModel.value.applicantUnit) {
    ElMessage.warning('请填写申请单位');
    return;
  }
  if (!formModel.value.contactPerson) {
    ElMessage.warning('请填写联系人');
    return;
  }
  if (!formModel.value.contactPhone) {
    ElMessage.warning('请填写联系电话');
    return;
  }
  if (!formModel.value.startTime || !formModel.value.endTime) {
    ElMessage.warning('请选择使用时间');
    return;
  }

  loading.value = true;
  try {
    const response = await $createAirspace(formModel.value);
    if (response.code === 200) {
        ElMessageBox.alert('空域申请已提交至湖北省一张网审核', '提交成功', {
          confirmButtonText: '确认',
          type: 'success'
        });
      router.push('/airspace-management/list');
    } else {
      ElMessage.error(response.message || '提交失败');
    }
  } catch (error) {
    console.error('提交申请失败:', error);
    ElMessage.error('提交失败');
  } finally {
    loading.value = false;
  }
};

// 重置表单
const handleReset = () => {
  formModel.value = {
  applicantUnit: '',
  contactPerson: '',
  contactPhone: '',
  flightType: 'UAV',
  flightMode: 'VLOS',
  type: 'TEMPORARY',
  purpose: '',
  startTime: '',
  endTime: '',
  altitude: {
    min: 0,
    max: 120
  },
  coordinates: [],
  remarks: ''
};
  clearDrawing();
};

onMounted(() => {
  // 清除空域管理中的高亮显示
  const viewer = airspaceStore.cesiumViewer || getViewer();
  if (viewer) {
    const highlightDataSource = viewer.dataSources.getByName('airspace-highlight')?.[0];
    if (highlightDataSource) {
      highlightDataSource.entities.removeAll();
    }
  }
});

onBeforeUnmount(() => {
  airspaceStore.resetInfo();
});
</script>

<template>
  <div
    class="common-left animate__animated"
    :class="[
      {
        animate__fadeInLeft: airspaceStore.showLeftPanel,
        animate__fadeOutLeft: !airspaceStore.showLeftPanel,
      },
    ]">
    <!-- 顶部标题和操作区 -->
    <div class="panel-header">
      <div class="header-title">空域申请</div>
    </div>
    <div class="main-contain">
      <!-- 申请单位 -->
      <div class="section-item">
        <div class="label">申请单位 *</div>
        <div class="info">
          <el-input
            v-model="formModel.applicantUnit"
            placeholder="请输入申请单位"
            clearable
          />
        </div>
      </div>

      <!-- 联系人 -->
      <div class="section-item">
        <div class="label">联系人 *</div>
        <div class="info">
          <el-input
            v-model="formModel.contactPerson"
            placeholder="请输入联系人"
            clearable
          />
        </div>
      </div>

      <!-- 联系电话 -->
      <div class="section-item">
        <div class="label">联系电话 *</div>
        <div class="info">
          <el-input
            v-model="formModel.contactPhone"
            placeholder="请输入联系电话"
            clearable
          />
        </div>
      </div>

      <!-- 飞行类型 -->
      <div class="section-item">
        <div class="label">飞行类型</div>
        <div class="info">
          <el-select
            v-model="formModel.flightType"
            placeholder="请选择飞行类型"
            class="black-select">
            <el-option
              v-for="item in flightTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>

      <div class="section-item">
        <div class="label">飞行模式</div>
        <div class="info">
          <el-select
            v-model="formModel.flightMode"
            placeholder="请选择飞行模式"
            class="black-select">
            <el-option
              v-for="item in flightModeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>

      <!-- 空域类型 -->
      <div class="section-item">
        <div class="label">空域类型</div>
        <div class="info">
          <el-select
            v-model="formModel.type"
            placeholder="请选择空域类型"
            class="black-select">
            <el-option
              v-for="item in airspaceTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>

      <div class="section-item">
        <div class="label">空域名称</div>
        <div class="info">
          <el-input
            v-model="formModel.name"
            type="textarea"
            :rows="1"
            placeholder="请为本次空域申请命名，如'XX区物流配送空域'"
          />
        </div>
      </div>
      <!-- 使用时间 -->
      <div class="section-item">
        <div class="label">使用时间 *</div>
        <div class="info">
          <el-date-picker
            v-model="formModel.startTime"
            type="datetime"
            placeholder="开始时间"
            style="width: 100%; margin-bottom: 5px;"
          />
          <el-date-picker
            v-model="formModel.endTime"
            type="datetime"
            placeholder="结束时间"
            style="width: 100%;"
          />
        </div>
      </div>

      <!-- 飞行高度 -->
      <div class="section-item">
        <div class="label">飞行高度(米)</div>
        <div class="info" style="display: flex; gap: 10px; align-items: center;">
          <el-input-number
            v-model="formModel.altitude.min"
            :min="0"
            :max="1000"
            controls-position="right"
            style="width: 120px;"
          />
          <span style="color: #ccc;">至</span>
          <el-input-number
            v-model="formModel.altitude.max"
            :min="0"
            :max="1000"
            controls-position="right"
            style="width: 120px;"
          />
        </div>
      </div>

      <!-- 区域绘制 -->
      <div class="section-item">
        <div class="label">空域范围</div>
        <div class="info" style="display: flex; gap: 10px;">
          <el-button
            color="#2D8CF0"
            size="small"
            @click="startDrawPolygon"
            :disabled="!!drawingMode">
            绘制多边形
          </el-button>
          <el-button
            color="#2D8CF0"
            size="small"
            @click="startDrawCircle"
            :disabled="!!drawingMode">
            绘制圆形
          </el-button>
          <el-button
            color="#E6A23C"
            size="small"
            @click="clearDrawing"
            :disabled="!drawingMode && formModel.coordinates.length === 0">
            清除
          </el-button>
        </div>
      </div>

      <!-- 申请用途 -->
      <div class="section-item">
        <div class="label">申请用途</div>
        <div class="info">
          <el-input
            v-model="formModel.purpose"
            type="textarea"
            :rows="3"
            placeholder="请输入申请用途"
          />
        </div>
      </div>

      <div class="section-item">
        <div class="label">起飞场地名称</div>
        <div class="info">
          <el-input
            v-model="formModel.adep"
            type="textarea"
            :rows="1"
            placeholder="如'XX物流中心楼顶'，详细坐标请在附件中说明"
          />
        </div>
      </div>

      <div class="section-item">
        <div class="label">降落场地名称</div>
        <div class="info">
          <el-input
            v-model="formModel.ades"
            type="textarea"
            :rows="1"
            placeholder="如'XX科技园停机坪'，详细坐标请在附件中说明"
          />
        </div>
      </div>

      <div class="section-item">
        <div class="label">备降场地名称</div>
        <div class="info">
          <el-input
            v-model="formModel.alnap"
            type="textarea"
            :rows="1"
            placeholder="详细坐标请在附件中说明"
          />
        </div>
      </div>

      <div class="section-item">
        <div class="label">应急处置程序</div>
        <div class="info">
          <el-input
            v-model="formModel.proc"
            type="textarea"
            :rows="1"
            placeholder="简要说明通信丢失、GPS信号丢失等情况的处置流程"
          />
        </div>
      </div>

      <div class="section-item">
        <div class="label">备注信息</div>
        <div class="info">
          <el-input
            v-model="formModel.memo"
            type="textarea"
            :rows="1"
            placeholder="可填写其他需要说明的事项"
          />
        </div>
      </div>

      <div class="section-item">
        <div class="label">上传附件</div>
        <div class="info">
          <el-upload
            v-model:file-list="fileList"
            :action="`/api/airspace/upload`"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              点击上传
            </el-button>
          </el-upload>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="section-item">
        <div class="info" style="display: flex; gap: 10px;">
          <el-button
            color="#67C23A"
            @click="handleSubmit"
            :loading="loading">
            提交申请
          </el-button>
          <el-button
            color="#2D8CF0"
            @click="handleSaveDraft"
            :loading="loading">
            保存草稿
          </el-button>
          <el-button
            color="#909399"
            @click="handleReset">
            重置
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.el-input-number) {
  background-color: #333 !important;

  .el-input__wrapper {
    background-color: #333 !important;
    box-shadow: 0 0 0 1px #555 inset !important;
  }

  .el-input-number__decrease,
  .el-input-number__increase {
    background-color: #444;
    color: #ccc;

    &:hover {
      color: #2d8cf0;
    }
  }
}

:deep(.el-textarea__inner) {
  background-color: #333 !important;
  box-shadow: 0 0 0 1px #555 inset !important;
  color: #fff;
}
</style>
