import { ref } from "vue";
import { getMapManager } from "./mapService";

// 从全局 window 对象获取 Cesium
const Cesium =
  typeof window !== "undefined" && window.Cesium ? window.Cesium : null;

// 状态管理
let __waypointDefaultAltitude = 100; // 默认高度（米）
let __currentSpeed = 5; // 默认速度（m/s）
const waypoints = ref([]);
const drawMode = ref(null);

// 事件清理函数
let leftClickListenerCleanup = null;
let rightClickListenerCleanup = null;

// 获取 Cesium Viewer
function getViewer() {
  const mapManager = getMapManager();
  if (!mapManager) {
    console.error("Map manager not initialized");
    return null;
  }
  // 尝试多种方式获取 viewer
  if (mapManager.getViewer) {
    return mapManager.getViewer();
  }
  // 如果 mapManager 本身就是 viewer
  if (mapManager.scene && mapManager.camera) {
    return mapManager;
  }
  return null;
}

// 设置默认高度
export function setWaypointDefaultAltitude(alt) {
  const n = Number(alt);
  if (Number.isFinite(n) && n >= 0) {
    __waypointDefaultAltitude = n;
  }
}

// 设置速度（m/s）
export function setSpeed(speed) {
  const n = Number(speed);
  if (Number.isFinite(n) && n > 0) {
    __currentSpeed = n;
    // 更新显示
    updateWaypointDisplay();
  }
}

// 获取当前速度
export function getSpeed() {
  return __currentSpeed;
}

// 设置绘制模式
export function setDrawMode(mode) {
  drawMode.value = mode;
}

// 停止绘制
function stopDrawing() {
  setDrawMode(null);
}

// 停止编辑区域多边形
export function stopEditingAreaPolygon() {
  // 停止绘制模式
  setDrawMode(null);

  // 清除绘制的航点和航线
  clearAllWaypoints();

  // 清除事件监听
  if (leftClickListenerCleanup) {
    leftClickListenerCleanup();
    leftClickListenerCleanup = null;
  }
  if (rightClickListenerCleanup) {
    rightClickListenerCleanup();
    rightClickListenerCleanup = null;
  }
}

// 清除所有航点
function clearAllWaypoints() {
  const viewer = getViewer();
  if (viewer) {
    // 移除所有航点实体
    const entitiesToRemove = [];
    viewer.entities.values.forEach((entity) => {
      if (entity._isWaypoint || entity._isWaypointLine) {
        entitiesToRemove.push(entity.id);
      }
    });
    entitiesToRemove.forEach((id) => {
      viewer.entities.removeById(id);
    });
  }
  waypoints.value = [];
}

// 计算两点之间的距离（米）
function calculateDistance(point1, point2) {
  if (!point1.cartesian || !point2.cartesian) return 0;
  return Cesium.Cartesian3.distance(point1.cartesian, point2.cartesian);
}

// 计算总距离（米）
function calculateTotalDistance() {
  if (waypoints.value.length < 2) return 0;
  let totalDistance = 0;
  for (let i = 0; i < waypoints.value.length - 1; i++) {
    totalDistance += calculateDistance(
      waypoints.value[i],
      waypoints.value[i + 1],
    );
  }
  return totalDistance;
}

// 计算时间（秒）
function calculateTime(distance) {
  if (__currentSpeed <= 0) return 0;
  return distance / __currentSpeed;
}

// 格式化时间显示
function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (secs === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    return `${hours}h${minutes}m${secs}s`;
  }
}

// 格式化距离显示
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(2)}km`;
  }
}

// 更新航点显示
function updateWaypointDisplay() {
  const viewer = getViewer();
  if (!viewer) return;

  // 先收集需要移除的实体ID
  const entitiesToRemove = [];
  viewer.entities.values.forEach((entity) => {
    if (
      entity._isWaypoint ||
      entity._isWaypointLine ||
      entity._isWaypointVerticalLine
    ) {
      entitiesToRemove.push(entity.id);
    }
  });

  // 移除旧的航点实体（使用ID移除，避免遍历过程中修改集合）
  entitiesToRemove.forEach((id) => {
    viewer.entities.removeById(id);
  });

  if (waypoints.value.length === 0) return;

  // 计算累计距离
  let cumulativeDistance = 0;

  // 添加航点
  waypoints.value.forEach((wp, index) => {
    // 计算到当前航点的累计时间
    const cumulativeTime = calculateTime(cumulativeDistance);

    // 创建标签文本（第一个点不显示总里程和总时间）
    // let labelText = `航点 ${index + 1}\n高度:${wp.altitude}m`;
    let labelText = `H：${wp.altitude}m`;
    if (index > 0) {
      labelText += `\nS：${formatDistance(cumulativeDistance)}\nT：${formatTime(cumulativeTime)}`;
    }

    // 添加从航点到地面的垂直虚线
    const groundPoint = Cesium.Cartesian3.fromDegrees(
      wp.longitude,
      wp.latitude,
      0,
    );
    viewer.entities.add({
      id: `waypoint_vertical_${wp.id}`,
      polyline: {
        positions: [wp.cartesian, groundPoint],
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.LIME.withAlpha(0.7),
        }),
      },
      _isWaypointVerticalLine: true,
    });

    viewer.entities.add({
      id: `waypoint_${wp.id}`,
      position: wp.cartesian,
      point: {
        color: Cesium.Color.GREEN,
        pixelSize: 12,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
      },
      label: {
        text: labelText,
        font: "bold 15px sans-serif",
        fillColor: Cesium.Color.BLACK,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充+边框
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 底部对齐
        pixelOffset: new Cesium.Cartesian2(0, -20),
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
        backgroundPadding: new Cesium.Cartesian2(8, 8),
      },
      _isWaypoint: true,
    });

    // 更新累计距离（加上到下一个航点的距离）
    if (index < waypoints.value.length - 1) {
      cumulativeDistance += calculateDistance(wp, waypoints.value[index + 1]);
    }
  });

  // 添加航线（绿色）
  if (waypoints.value.length >= 2) {
    const linePoints = waypoints.value.map((wp) => wp.cartesian);
    viewer.entities.add({
      id: `waypoint_line_${Date.now()}`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(
          linePoints.flatMap((p) => [
            Cesium.Math.toDegrees(
              Cesium.Cartographic.fromCartesian(p).longitude,
            ),
            Cesium.Math.toDegrees(
              Cesium.Cartographic.fromCartesian(p).latitude,
            ),
            Cesium.Cartographic.fromCartesian(p).height,
          ]),
        ),
        width: 5,
        material: Cesium.Color.LIME,
      },
      _isWaypointLine: true,
    });
  }
}

// 获取航点（基本数据）
export function getWaypoints() {
  return waypoints.value.map((wp) => ({
    id: wp.id,
    longitude: wp.longitude,
    latitude: wp.latitude,
    altitude: wp.altitude,
  }));
}

// 获取航点数据（包含距离和时间信息）
export function getWaypointsData() {
  let cumulativeDistance = 0;
  return waypoints.value.map((wp, index) => {
    const cumulativeTime = calculateTime(cumulativeDistance);
    const pointData = {
      id: wp.id,
      longitude: wp.longitude,
      latitude: wp.latitude,
      altitude: wp.altitude,
      cumulativeDistance: cumulativeDistance,
      cumulativeTime: cumulativeTime,
      formattedDistance: formatDistance(cumulativeDistance),
      formattedTime: formatTime(cumulativeTime),
    };

    if (index < waypoints.value.length - 1) {
      cumulativeDistance += calculateDistance(wp, waypoints.value[index + 1]);
    }

    return pointData;
  });
}

// 获取总距离
export function getTotalDistance() {
  return calculateTotalDistance();
}

// 获取总时间
export function getTotalTime() {
  return calculateTime(calculateTotalDistance());
}

// 开始绘制航点
export function startDrawingWaypoints() {
  const viewer = getViewer();
  if (!viewer) return;

  // 清空之前绘制的航点和航线
  clearAllWaypoints();

  setDrawMode("waypoint");

  // 清除之前的事件监听
  if (leftClickListenerCleanup) {
    leftClickListenerCleanup();
  }
  if (rightClickListenerCleanup) {
    rightClickListenerCleanup();
  }

  // 左键点击添加航点
  const leftHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  leftHandler.setInputAction((event) => {
    if (drawMode.value !== "waypoint") return;

    const ray = viewer.camera.getPickRay(event.position);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);

    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude);

      const waypoint = {
        id: Date.now() + Math.random(),
        longitude,
        latitude,
        altitude: __waypointDefaultAltitude,
        cartesian: Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          __waypointDefaultAltitude,
        ),
      };

      waypoints.value.push(waypoint);
      updateWaypointDisplay();
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 右键结束绘制
  const rightHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  rightHandler.setInputAction(() => {
    if (drawMode.value !== "waypoint") return;

    if (waypoints.value.length < 2) {
      console.warn("请至少绘制2个航点");
      clearAllWaypoints();
    } else {
      const totalDistance = calculateTotalDistance();
      const totalTime = calculateTime(totalDistance);
      console.log(
        `已创建 ${waypoints.value.length} 个航点，总里程: ${formatDistance(totalDistance)}，总时间: ${formatTime(totalTime)}`,
      );
    }
    stopDrawing();
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  leftClickListenerCleanup = () => leftHandler.destroy();
  rightClickListenerCleanup = () => rightHandler.destroy();
}
