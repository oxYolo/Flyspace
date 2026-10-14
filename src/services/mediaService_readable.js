/**
 * mediaService.js — 解混淆后的可读版本
 *
 * 原文件使用了 JavaScript 混淆技术（字符串数组编码 + 变量名替换 + 控制流平坦化）。
 * 本文件已完整还原为人类可读的代码，逻辑与原文件完全等价。
 */

import { getMapManager } from "./mapService";

// ─── 枚举常量（对应 Cesium / 地图引擎的常量） ───────────────────────────────

/** 高度参考模式 */
const HeightReference = {
  NONE: "NONE", // 绝对高度
  CLAMP_TO_GROUND: "CLAMP_TO_GROUND", // 贴地
  RELATIVE_TO_GROUND: "RELATIVE_TO_GROUND", // 相对地面
};

/** 垂直对齐方式 */
const VerticalOrigin = {
  BASELINE: "BASELINE",
  BOTTOM: "BOTTOM",
  CENTER: "CENTER",
  TOP: "TOP",
};

/** 水平对齐方式 */
const HorizontalOrigin = {
  CENTER: "CENTER",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
};

/** 标签样式 */
const LabelStyle = {
  FILL: "FILL",
  OUTLINE: "OUTLINE",
  FILL_AND_OUTLINE: "FILL_AND_OUTLINE",
};

// ─── 数据源名称常量 ─────────────────────────────────────────────────────────

const DATASOURCE_NAME = "media";

// ─── 交互状态标志 ────────────────────────────────────────────────────────────

let isInteractionSetup = false;
let currentMediaList = [];

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 深度读取对象属性（支持点分隔路径，如 "a.b.c"）
 * @param {object} entity - 目标对象
 * @param {string} propertyPath - 属性路径，例如 "properties.rawData"
 * @returns {*} 属性值，找不到则返回 undefined
 */
function getEntityProperty(entity, propertyPath) {
  if (!entity) return undefined;
  const keys = propertyPath.split(".");
  let current = entity;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * 给地图添加事件监听器
 * @param {string} eventType - 事件类型（如 'leftClick'）
 * @param {Function} handler - 回调函数
 * @returns {Function} 取消监听的函数
 */
function addMapEventListener(eventType, handler) {
  const mapManager = getMapManager();
  return mapManager?.addEventListener(eventType, handler) || (() => {});
}

/**
 * 创建颜色对象（通过地图管理器）
 * @param {string} colorStr - 颜色字符串（如 '#FF0000'）
 * @param {number} [alpha=1] - 透明度（0~1）
 * @returns {object|string} 地图颜色对象，失败则返回原始字符串
 */
function createColor(colorStr, alpha = 1) {
  const mapManager = getMapManager();
  return mapManager?.createColor(colorStr, alpha) || colorStr;
}

/**
 * 创建 2D 像素偏移坐标（Cartesian2）
 * @param {number} x
 * @param {number} y
 * @returns {object} Cartesian2 对象
 */
function createCartesian2(x, y) {
  const mapManager = getMapManager();
  return mapManager?.createCartesian2(x, y) || { x, y };
}

/**
 * 向地图图层批量添加广告牌（Billboard）标注
 * @param {string} layerName - 图层名称
 * @param {Array} billboards - 广告牌数据数组
 * @returns {Array} 添加结果
 */
function addBillboards(layerName, billboards) {
  const mapManager = getMapManager();
  return mapManager?.addBillboards(layerName, billboards) || [];
}

/**
 * 飞行定位到指定坐标
 * @param {{ data: { longitude: number, latitude: number, altitude?: number } }} options
 */
function flyToPoint(options) {
  const mapManager = getMapManager();
  if (
    options &&
    options.data?.longitude !== undefined &&
    options.data?.latitude !== undefined
  ) {
    mapManager?.flyToPosition(
      options.data.longitude,
      options.data.latitude,
      options.data.altitude || 1000,
    );
  }
}

/**
 * 向地图图层添加点位标注
 * @param {string} layerName - 图层名称
 * @param {Array} points - 点位数据数组
 * @returns {Array}
 */
function addPoints(layerName, points) {
  const mapManager = getMapManager();
  return mapManager?.addPoints(layerName, points) || [];
}

/**
 * 清除指定图层的所有内容
 * @param {string} layerName - 图层名称
 */
function clearLayer(layerName) {
  const mapManager = getMapManager();
  mapManager?.clearLayer(layerName);
}

/**
 * 构建单个媒体广告牌配置
 * @param {object} item
 * @param {boolean} isSelected
 * @param {string} entityPrefix
 */
async function buildMediaBillboard(item, isSelected = false, entityPrefix = "media_") {
  const longitude = parseFloat(item.longitude);
  const latitude = parseFloat(item.latitude);
  const altitude = parseFloat(item.absolutealtitude);

  if (isNaN(longitude) || isNaN(latitude)) return null;

  const iconUrl = item.scalePath?.startsWith("http")
    ? item.scalePath
    : item.filePath?.startsWith("http")
      ? item.filePath
      : getDefaultIconByFileType(item.fileType);

  const thumbnailCanvas = await createMediaThumbnail(iconUrl, isSelected);
  const entityId =
    entityPrefix +
    (item.id || Date.now() + Math.random().toString(36).substring(2, 10));

  return {
    id: entityId,
    coordinates: [longitude, latitude, altitude],
    image: !isSelected ? thumbnailCanvas : null,
    billboardStyle: {
      scale: isSelected ? 0.78 : 0.6,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: createCartesian2(0, isSelected ? 8 : 4),
    },
    properties: {
      rawData: item,
      entityType: "mediaBillboard",
      entityId: entityId,
      imageUrl: iconUrl,
    },
  };
}

// ─── 对外导出函数 ────────────────────────────────────────────────────────────

/**
 * 清除地图上的所有媒体标注，并销毁鼠标交互事件
 */
export function clearMediaFromMap() {
  const mapManager = getMapManager();
  // 清除媒体图层
  mapManager?.clearLayer(DATASOURCE_NAME);
  currentMediaList = [];
  // 销毁鼠标事件处理器
  if (
    window.mediaMouseHandler &&
    typeof window.mediaMouseHandler.destroy === "function"
  ) {
    window.mediaMouseHandler.destroy();
    window.mediaMouseHandler = null;
    isInteractionSetup = false;
  }
}

/**
 * 将媒体数据渲染为地图上的广告牌标注
 * @param {Array<{
 *   latitude: string|number,
 *   longitude: string|number,
 *   absolutealtitude?: string|number,
 *   scalePath?: string,
 *   fileType?: string,
 *   id?: string,
 *   name?: string
 * }>} mediaList - 媒体数据列表
 */
export async function renderMediaToMap(mediaList) {
  const mapManager = getMapManager();
  if (!mapManager) {
    console.error("Map manager not initialized");
    return;
  }

  currentMediaList = Array.isArray(mediaList) ? mediaList : [];

  // 清除旧图层
  mapManager.clearLayer(DATASOURCE_NAME);


  // 过滤出有坐标的媒体项，并并发创建广告牌配置
  const billboardTasks = currentMediaList
    .filter((item) => item.latitude && item.longitude)
    .map((item) => buildMediaBillboard(item, false));

  const billboards = (await Promise.all(billboardTasks)).filter(Boolean);

  if (billboards.length > 0) {
    await addBillboards(DATASOURCE_NAME, billboards);
  }
}


/**
 * 根据文件类型返回默认缩略图图标路径
 * @param {string} fileType - 文件类型（'PHOTO' | 'VIDEO' | 其他）
 * @returns {string} 图标 URL
 */
function getDefaultIconByFileType(fileType) {
  switch (fileType) {
    case "PHOTO":
      return "/images/icons/photo-thumbnail.png";
    case "VIDEO":
      return "/images/icons/video-thumbnail.png";
    default:
      return "/images/icons/photo-thumbnail.png";
  }
}

/**
 * 绘制圆角矩形路径（辅助函数，用于 Canvas 2D）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - 左上角 x
 * @param {number} y - 左上角 y
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} radius - 圆角半径
 */
function roundRect(ctx, x, y, width, height, radius) {
  // 控制圆角不超过边长一半
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * 创建媒体缩略图 Canvas（带圆角、阴影、播放三角指示）
 * @param {string} imageUrl - 图片地址
 * @param {boolean} [isSelected=false] - 是否选中状态（暂未使用）
 * @returns {Promise<HTMLCanvasElement>} 渲染好的 canvas 元素
 */
async function createMediaThumbnail(imageUrl, isSelected = false) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const drawCanvas = (loadedImage) => {
      const canvas = document.createElement("canvas");
      const SIZE = 48; // 缩略图主体尺寸
      const TAIL = 8; // 底部"气泡尾巴"高度
      const PADDING = 3; // 内边距
      const RADIUS = 6; // 圆角半径

      canvas.width = SIZE + PADDING * 2;
      canvas.height = SIZE + PADDING * 2 + TAIL;

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(canvas);

      // 绘制白色圆角矩形背景
      ctx.fillStyle = "white";
      roundRect(ctx, 0, 0, SIZE + PADDING * 2, SIZE + PADDING * 2, RADIUS);
      ctx.fill();

      if (loadedImage) {
        // 有图：裁剪并绘制图片
        ctx.save();
        roundRect(ctx, PADDING, PADDING, SIZE, SIZE, RADIUS - PADDING / 2);
        ctx.clip();
        ctx.drawImage(
          loadedImage,
          0,
          0,
          loadedImage.width,
          loadedImage.height,
          PADDING,
          PADDING,
          SIZE,
          SIZE,
        );
        ctx.restore();
      } else {
        // 无图：填充灰色占位背景
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        roundRect(ctx, PADDING, PADDING, SIZE, SIZE, RADIUS - PADDING / 2);
        ctx.fill();
      }

      // 选中样式已移除，缩略图始终使用统一样式

      // 绘制阴影 + 播放三角箭头（指示气泡方向）
      ctx.shadowColor = "#3388ff";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = "white";
      ctx.beginPath();

      const tipX = SIZE + PADDING * 2; // 三角顶点 x（右下方向）
      const leftY = (SIZE + PADDING * 2) / 2 - TAIL;
      const rightY = (SIZE + PADDING * 2) / 2 + TAIL;

      ctx.moveTo(leftY, tipX);
      ctx.lineTo((leftY + rightY) / 2, tipX + TAIL);
      ctx.lineTo(rightY, tipX);
      ctx.closePath();
      ctx.fill();

      resolve(canvas);
    };

    img.onload = () => drawCanvas(img);
    img.onerror = () => drawCanvas(null);
    img.src = imageUrl;
  });
}

/**
 * 初始化地图媒体交互（点击广告牌弹出媒体详情）
 * 只初始化一次，重复调用无效。
 */
export function setupMediaInteraction() {
  const mapManager = getMapManager();
  // 已初始化或没有地图管理器时，直接返回
  if (isInteractionSetup || !mapManager) return;

  // 监听地图左键点击事件
  const removeListener = addMapEventListener("leftClick", (event) => {
    const pickedEntity = event.pickedEntity;
    // 读取实体的 rawData 属性
    const rawData = getEntityProperty(pickedEntity, "rawData");
    if (rawData) {
      // 通过全局事件总线发射"打开媒体详情"事件
      if (window.mittInstance) {
        window.mittInstance.emit("openMediaDetail", rawData);
      }
    }
  });

  // 保存销毁函数，供 clearMediaFromMap 调用
  window.mediaMouseHandler = {
    destroy: () => {
      removeListener();
    },
  };

  isInteractionSetup = true;
}

/**
 * 将地图视角飞行定位到指定媒体的坐标，并短暂高亮显示该点位
 * @param {{ latitude: string|number, longitude: string|number }} mediaItem
 */
export function locateToMedia(mediaItem) {
  if (mediaItem.latitude && mediaItem.longitude) {
    const longitude = parseFloat(mediaItem.longitude);
    const latitude = parseFloat(mediaItem.latitude);

    // 飞行定位
    flyToPoint({
      data: { longitude, latitude, altitude: 1000 },
    });

    // 在高亮图层绘制一个蓝色圆点，10 秒后自动清除
    const HIGHLIGHT_LAYER = "mediaHighlight";
    clearLayer(HIGHLIGHT_LAYER);

    addPoints(HIGHLIGHT_LAYER, [
      {
        coordinates: [longitude, latitude],
        pointStyle: {
          color: createColor("#0000FF"),
          pixelSize: 12,
          outlineColor: createColor("#FFFFFF"),
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        properties: {
          entityType: "mediaHighlight",
        },
      },
    ]);

    setTimeout(() => clearLayer(HIGHLIGHT_LAYER), 10000);
  }
}

export { createMediaThumbnail };
