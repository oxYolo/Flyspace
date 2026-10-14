<template>
  <div class="canvas-wrapper" ref="wrapperRef">
    <canvas
      ref="canvasRef"
      :width="canvasW"
      :height="canvasH"
      :style="{ cursor: cursorStyle }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @dblclick="onDoubleClick"
      @contextmenu.prevent="onRightClick" />

    <!-- 悬浮标签选择弹窗 -->
    <div
      v-if="labelPickerVisible"
      class="label-picker"
      :style="{ left: pickerPos.x + 'px', top: pickerPos.y + 'px' }">
      <div class="label-picker-title">选择标签</div>
      <div
        v-for="(cls, idx) in classes"
        :key="idx"
        class="label-item"
        :style="{
          borderLeft: `3px solid ${props.colors[idx] || classColors[idx % classColors.length]}`,
        }"
        @click="assignLabel(idx)">
        {{ cls }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";

const props = defineProps({
  imageSrc: String, // 当前图片URL
  classes: { type: Array, default: () => ["车辆", "人员", "机械", "违建"] },
  colors: { type: Array, default: () => [] },
  currentClass: { type: Number, default: 0 },
  allowDraw: { type: Boolean, default: true },
  tool: { type: String, default: "rect" }, // rect | polygon
});

const emit = defineEmits(["update:annotations", "ready", "draw-forbidden"]);

// ── 颜色表 ──────────────────────────────────────────────
const classColors = [
  "#FF0000",
  "#FF6600",
  "#FFCC00",
  "#00CC00",
  "#00CCCC",
  "#0066FF",
  "#6600CC",
  "#9933FF",
  "#FF0099",
  "#FF6633",
];

// ── 状态 ─────────────────────────────────────────────────
const canvasRef = ref(null);
const wrapperRef = ref(null);
const canvasW = ref(800);
const canvasH = ref(500);

let ctx = null;
let img = new Image();
let imgNaturalW = 1;
let imgNaturalH = 1;
let scaleX = 1;
let scaleY = 1;

// 标注列表（画布空间坐标）
// - rect: { type:'rect', x1,y1,x2,y2, classIdx, label }
// - polygon: { type:'polygon', points:[{x,y},...], classIdx, label }
const annotations = ref([]);
// 撤销栈
const undoStack = ref([]);

// 拖拽状态
let isDrawing = false;
let isDrawingPolygon = false;
let isMoving = false;
let isResizing = false;
let resizeHandle = -1;
let startX = 0;
let startY = 0;
let currentBox = null;
let currentPolygon = null;
let polygonHover = null;
let movingVertexIdx = -1;

// 选中框 index
const selectedIdx = ref(-1);

// label picker
const labelPickerVisible = ref(false);
const pickerPos = ref({ x: 0, y: 0 });
let pendingBoxIdx = -1;

const cursorStyle = ref("crosshair");

// ── 初始化 ───────────────────────────────────────────────
onMounted(() => {
  ctx = canvasRef.value.getContext("2d");
  if (props.imageSrc) loadImage(props.imageSrc);
  document.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeyDown);
});

watch(
  () => props.imageSrc,
  (src) => {
    if (src) {
      annotations.value = [];
      undoStack.value = [];
      loadImage(src);
    }
  },
);

/**
 * 加载图片并按原图比例初始化画布尺寸与缩放系数。
 */
const loadImage = (src) => {
  img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    imgNaturalW = img.naturalWidth;
    imgNaturalH = img.naturalHeight;

    // 为了保证原图极致清晰，Canvas实际缓冲区大小采用图片真实分辨率
    // （如果原图尺寸极大，为了避免内存溢出可在此做限制，例如4K上限）
    const maxCanvasSize = 3840;
    const ratio = Math.min(
      maxCanvasSize / imgNaturalW,
      maxCanvasSize / imgNaturalH,
      1,
    );

    canvasW.value = Math.round(imgNaturalW * ratio);
    canvasH.value = Math.round(imgNaturalH * ratio);

    scaleX = imgNaturalW / canvasW.value;
    scaleY = imgNaturalH / canvasH.value;

    nextTick(() => {
      ctx = canvasRef.value.getContext("2d");
      redraw();
      emit("ready", { width: imgNaturalW, height: imgNaturalH });
    });
  };
  img.src = src;
}

// ── 绘制 ─────────────────────────────────────────────────
/**
 * 统一重绘底图、已有标注和当前交互中的临时图形。
 */
const redraw = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasW.value, canvasH.value);
  // 绘制图片
  if (img.src) ctx.drawImage(img, 0, 0, canvasW.value, canvasH.value);
  // 已有标注框
  annotations.value.forEach((box, idx) => {
    if ((isMoving || isResizing) && idx === selectedIdx.value) return;
    drawAnnotation(box, idx === selectedIdx.value);
  });
  // 正在绘制/移动/缩放的框
  if (currentBox) {
    drawAnnotation(currentBox, isMoving || isResizing ? true : false, isDrawing);
  }
  if (currentPolygon) {
    drawAnnotation(currentPolygon, true, isDrawingPolygon);
  }
}

/**
 * 根据标注类型分发到矩形或多边形绘制逻辑。
 */
const drawAnnotation = (box, selected = false, drawing = false) => {
  if (box?.type === "polygon") {
    drawPolygon(box, selected, drawing);
    return;
  }

  drawRect(box, selected, drawing);
}

/**
 * 绘制矩形标注，包括描边、填充、手柄和标签文字。
 */
const drawRect = (box, selected = false, drawing = false) => {
  const color =
    props.colors && props.colors[box.classIdx]
      ? props.colors[box.classIdx]
      : classColors[box.classIdx % classColors.length];
  const x = Math.min(box.x1, box.x2);
  const y = Math.min(box.y1, box.y2);
  const w = Math.abs(box.x2 - box.x1);
  const h = Math.abs(box.y2 - box.y1);

  // 计算视觉缩放比：原图分辨率Canvas显示在更小的容器里时，为了让线段或字体肉眼看着够粗
  const rect = canvasRef.value?.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = (selected ? 2 : 1.5) * displayScale;
  ctx.setLineDash(drawing ? [5 * displayScale, 3 * displayScale] : []);
  ctx.strokeRect(x, y, w, h);

  // 填充半透明
  ctx.fillStyle = hexToRgba(color, selected ? 0.18 : 0.08);
  ctx.fillRect(x, y, w, h);

  // 角点手柄
  if (selected) {
    const handles = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ];
    const hw = 4 * displayScale;
    handles.forEach(([hx, hy]) => {
      ctx.fillStyle = color;
      ctx.fillRect(hx - hw, hy - hw, hw * 2, hw * 2);
    });
  }

  // 标签文字（水平居中）
  if (!drawing && box.label !== undefined) {
    const fontSize = Math.max(12, 11 * displayScale);
    ctx.font = `${Math.round(fontSize)}px sans-serif`;
    const text = String(box.label);
    const textWidth = ctx.measureText(text).width;
    const padding = 6 * displayScale;
    const rectWidth = Math.round(textWidth + padding * 2);
    const rectHeight = 18 * displayScale;

    // 确保文字框不会超过顶部
    const rectX = x;
    const rectY = y - rectHeight > 0 ? y - rectHeight : y;

    ctx.fillStyle = color;
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, rectX + rectWidth / 2, rectY + rectHeight / 2);

    // 恢复默认文本对齐
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
}

/**
 * 绘制多边形标注，包括边线、填充、顶点手柄和标签文字。
 */
const drawPolygon = (poly, selected = false, drawing = false) => {
  const color =
    props.colors && props.colors[poly.classIdx]
      ? props.colors[poly.classIdx]
      : classColors[poly.classIdx % classColors.length];

  const pts = Array.isArray(poly.points) ? poly.points : [];
  if (pts.length === 0) return;

  const rect = canvasRef.value?.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = (selected ? 2 : 1.5) * displayScale;
  ctx.setLineDash(drawing ? [5 * displayScale, 3 * displayScale] : []);

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  if (!drawing && pts.length >= 3) {
    ctx.closePath();
  } else if (drawing && polygonHover) {
    ctx.lineTo(polygonHover.x, polygonHover.y);
  }
  ctx.stroke();

  if (!drawing && pts.length >= 3) {
    ctx.fillStyle = hexToRgba(color, selected ? 0.18 : 0.08);
    ctx.fill();
  }

  if (selected) {
    const hw = 4 * displayScale;
    pts.forEach((p) => {
      ctx.fillStyle = color;
      ctx.fillRect(p.x - hw, p.y - hw, hw * 2, hw * 2);
    });
  }

  if (!drawing && poly.label !== undefined) {
    const bounds = polygonBounds(pts);
    const x = bounds.x;
    const y = bounds.y;
    const fontSize = Math.max(12, 11 * displayScale);
    ctx.font = `${Math.round(fontSize)}px sans-serif`;
    const text = String(poly.label);
    const textWidth = ctx.measureText(text).width;
    const padding = 6 * displayScale;
    const rectWidth = Math.round(textWidth + padding * 2);
    const rectHeight = 18 * displayScale;
    const rectX = x;
    const rectY = y - rectHeight > 0 ? y - rectHeight : y;
    ctx.fillStyle = color;
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, rectX + rectWidth / 2, rectY + rectHeight / 2);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  ctx.restore();
}

/**
 * 将十六进制颜色转换为带透明度的 rgba 字符串。
 */
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── 鼠标事件 ─────────────────────────────────────────────
/**
 * 将鼠标屏幕坐标转换为当前画布缓冲区坐标。
 */
const getPos = (e) => {
  const rect = canvasRef.value.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvasW.value / rect.width),
    y: (e.clientY - rect.top) * (canvasH.value / rect.height),
  };
}

/**
 * 计算画布缓冲区与页面显示尺寸之间的视觉缩放比。
 */
const getDisplayScale = () => {
  const rect = canvasRef.value?.getBoundingClientRect();
  return rect && rect.width ? canvasW.value / rect.width : 1;
}

/**
 * 计算两个点之间的平方距离，避免频繁开方。
 */
const dist2 = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * 计算多边形外接矩形，用于标签定位和导出换算。
 */
const polygonBounds = (points) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return {
    x: minX,
    y: minY,
    w: Math.max(0, maxX - minX),
    h: Math.max(0, maxY - minY),
  };
}

/**
 * 判断某个点是否位于多边形内部。
 */
const pointInPolygon = (point, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 命中检测多边形顶点，返回被命中的顶点索引。
 */
const findPolygonVertex = (points, x, y) => {
  const rect = canvasRef.value?.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;
  const r = 8 * displayScale;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy <= r * r) return i;
  }
  return -1;
}

/**
 * 根据顶点相对中心点的位置返回合适的拖拽光标样式。
 */
const getPolygonVertexCursor = (points, vertexIdx) => {
  if (!Array.isArray(points) || vertexIdx < 0 || vertexIdx >= points.length) {
    return "move";
  }
  const bounds = polygonBounds(points);
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  const point = points[vertexIdx];
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  return dx * dy >= 0 ? "nwse-resize" : "nesw-resize";
}

/**
 * 判断当前鼠标是否接近多边形首点，用于闭合多边形。
 */
const isNearFirstPolygonPoint = (points, x, y) => {
  if (points.length === 0) return false;
  const rect = canvasRef.value?.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;
  const r = 10 * displayScale;
  const p = points[0];
  const dx = p.x - x;
  const dy = p.y - y;
  return dx * dx + dy * dy <= r * r;
}

/**
 * 命中检测矩形四个缩放手柄，返回对应手柄索引。
 */
const hitHandleTest = (x, y, box) => {
  const rect = canvasRef.value?.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;
  const hw = 4 * displayScale;

  const bx = Math.min(box.x1, box.x2);
  const by = Math.min(box.y1, box.y2);
  const bw = Math.abs(box.x2 - box.x1);
  const bh = Math.abs(box.y2 - box.y1);

  const handles = [
    [bx, by], // 0: tl
    [bx + bw, by], // 1: tr
    [bx, by + bh], // 2: bl
    [bx + bw, by + bh], // 3: br
  ];

  for (let i = 0; i < handles.length; i++) {
    const [hx, hy] = handles[i];
    if (
      x >= hx - hw - 2 * displayScale &&
      x <= hx + hw + 2 * displayScale &&
      y >= hy - hw - 2 * displayScale &&
      y <= hy + hw + 2 * displayScale
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * 处理鼠标按下，负责开始绘制、选中、移动、缩放和多边形落点。
 */
const onMouseDown = (e) => {
  if (e.button !== 0) return;
  labelPickerVisible.value = false;
  const pos = getPos(e);

  if (selectedIdx.value >= 0) {
    const box = annotations.value[selectedIdx.value];
    if (box?.type === "polygon") {
      const pts = box.points || [];
      const vIdx = findPolygonVertex(pts, pos.x, pos.y);
      if (vIdx >= 0) {
        movingVertexIdx = vIdx;
        isMoving = true;
        startX = pos.x;
        startY = pos.y;
        currentPolygon = JSON.parse(JSON.stringify(box));
        return;
      }
      if (pts.length >= 3 && pointInPolygon(pos, pts)) {
        movingVertexIdx = -1;
        isMoving = true;
        startX = pos.x;
        startY = pos.y;
        currentPolygon = JSON.parse(JSON.stringify(box));
        return;
      }
    }
  }

  if (props.tool === "polygon") {
    if (!props.allowDraw) {
      emit("draw-forbidden");
      return;
    }

    if (isDrawingPolygon && currentPolygon) {
      if (
        currentPolygon.points.length >= 3 &&
        isNearFirstPolygonPoint(currentPolygon.points, pos.x, pos.y)
      ) {
        finalizePolygon();
        return;
      }
      currentPolygon.points.push({ x: pos.x, y: pos.y });
      redraw();
      return;
    }

    const hit = hitTest(pos.x, pos.y);
    if (hit >= 0) {
      if (selectedIdx.value !== hit) {
        selectedIdx.value = hit;
        redraw();
      }

      const target = annotations.value[hit];
      if (target?.type === "polygon") {
        const vIdx = findPolygonVertex(target.points || [], pos.x, pos.y);
        if (vIdx >= 0) {
          movingVertexIdx = vIdx;
          isMoving = true;
          startX = pos.x;
          startY = pos.y;
          currentPolygon = JSON.parse(JSON.stringify(target));
          return;
        }
        if (pointInPolygon(pos, target.points || [])) {
          movingVertexIdx = -1;
          isMoving = true;
          startX = pos.x;
          startY = pos.y;
          currentPolygon = JSON.parse(JSON.stringify(target));
          return;
        }
      }
    }

    selectedIdx.value = -1;
    isDrawingPolygon = true;
    currentPolygon = {
      type: "polygon",
      points: [{ x: pos.x, y: pos.y }],
      classIdx: props.currentClass,
      label: props.classes[props.currentClass],
    };
    polygonHover = { x: pos.x, y: pos.y };
    redraw();
    return;
  }

  if (selectedIdx.value >= 0) {
    const box = annotations.value[selectedIdx.value];
    if (box?.type !== "polygon") {
      const handleIdx = hitHandleTest(pos.x, pos.y, box);
      if (handleIdx >= 0) {
        isResizing = true;
        resizeHandle = handleIdx;
        startX = pos.x;
        startY = pos.y;
        const bx = Math.min(box.x1, box.x2);
        const by = Math.min(box.y1, box.y2);
        const bw = Math.abs(box.x2 - box.x1);
        const bh = Math.abs(box.y2 - box.y1);
        currentBox = { ...box, x1: bx, y1: by, x2: bx + bw, y2: by + bh };
        return;
      }
    }
  }

  // 检查是否点击已有框（移动 或 选中）
  const hit = hitTest(pos.x, pos.y);
  if (hit >= 0) {
    if (selectedIdx.value !== hit) {
      selectedIdx.value = hit;
      redraw();
    }
    const target = annotations.value[hit];
    if (target?.type === "polygon") {
      const pts = target.points || [];
      const vIdx = findPolygonVertex(pts, pos.x, pos.y);
      movingVertexIdx = vIdx >= 0 ? vIdx : -1;
      isMoving = true;
      startX = pos.x;
      startY = pos.y;
      currentPolygon = JSON.parse(JSON.stringify(target));
      return;
    }
    isMoving = true;
    startX = pos.x;
    startY = pos.y;
    currentBox = { ...target };
    return;
  }

  if (!props.allowDraw) {
    emit("draw-forbidden");
    return;
  }

  // 开始新框
  selectedIdx.value = -1;
  isDrawing = true;
  startX = pos.x;
  startY = pos.y;
  currentBox = {
    type: "rect",
    x1: startX,
    y1: startY,
    x2: startX,
    y2: startY,
    classIdx: props.currentClass,
    label: props.classes[props.currentClass],
  };
}

/**
 * 处理鼠标移动，实时更新光标样式和当前绘制/拖拽中的图形。
 */
const onMouseMove = (e) => {
  const pos = getPos(e);
  polygonHover = { x: pos.x, y: pos.y };

  if (!isDrawing && !isMoving && !isResizing) {
    let newCursor = "crosshair";
    if (selectedIdx.value >= 0) {
      const box = annotations.value[selectedIdx.value];
      if (box?.type === "polygon") {
        const vIdx = findPolygonVertex(box.points || [], pos.x, pos.y);
        if (vIdx >= 0) {
          newCursor = getPolygonVertexCursor(box.points || [], vIdx);
        }
        else if (pointInPolygon(pos, box.points || [])) newCursor = "move";
      } else {
        const handleIdx = hitHandleTest(pos.x, pos.y, box);
        if (handleIdx >= 0) {
          if (handleIdx === 0 || handleIdx === 3) newCursor = "nwse-resize";
          else newCursor = "nesw-resize";
        }
      }
    }
    if (newCursor === "crosshair") {
      const hit = hitTest(pos.x, pos.y);
      if (hit >= 0) newCursor = "move";
    }
    cursorStyle.value = newCursor;
    return;
  }

  if (isDrawing) {
    currentBox.x2 = pos.x;
    currentBox.y2 = pos.y;
  } else if (isDrawingPolygon) {
    redraw();
    return;
  } else if (isMoving) {
    if (currentPolygon) {
      cursorStyle.value =
        movingVertexIdx >= 0
          ? getPolygonVertexCursor(currentPolygon.points || [], movingVertexIdx)
          : "move";
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      if (movingVertexIdx >= 0) {
        const pts = currentPolygon.points || [];
        if (pts[movingVertexIdx]) {
          pts[movingVertexIdx].x += dx;
          pts[movingVertexIdx].y += dy;
        }
      } else {
        (currentPolygon.points || []).forEach((p) => {
          p.x += dx;
          p.y += dy;
        });
      }
      startX = pos.x;
      startY = pos.y;
      redraw();
      return;
    }
    const dx = pos.x - startX;
    const dy = pos.y - startY;
    currentBox.x1 += dx;
    currentBox.y1 += dy;
    currentBox.x2 += dx;
    currentBox.y2 += dy;
    startX = pos.x;
    startY = pos.y;
  } else if (isResizing) {
    if (resizeHandle === 0) {
      currentBox.x1 = pos.x;
      currentBox.y1 = pos.y;
    } else if (resizeHandle === 1) {
      currentBox.x2 = pos.x;
      currentBox.y1 = pos.y;
    } else if (resizeHandle === 2) {
      currentBox.x1 = pos.x;
      currentBox.y2 = pos.y;
    } else if (resizeHandle === 3) {
      currentBox.x2 = pos.x;
      currentBox.y2 = pos.y;
    }
  }

  redraw();
}

/**
 * 处理鼠标抬起，提交当前拖拽结果或新建标注并维护撤销栈。
 */
const onMouseUp = () => {
  if (!isDrawing && !isMoving && !isResizing) return;

  if (isMoving || isResizing) {
    undoStack.value.push(JSON.stringify(annotations.value));
    if (undoStack.value.length > 50) undoStack.value.shift();

    if (currentPolygon && selectedIdx.value >= 0) {
      annotations.value[selectedIdx.value] = currentPolygon;
      isMoving = false;
      movingVertexIdx = -1;
      currentPolygon = null;
      redraw();
      emitAnnotations();
      return;
    }

    const bx = Math.min(currentBox.x1, currentBox.x2);
    const by = Math.min(currentBox.y1, currentBox.y2);
    const bw = Math.abs(currentBox.x2 - currentBox.x1);
    const bh = Math.abs(currentBox.y2 - currentBox.y1);

    // 如果缩小到没有宽高则不更新，相当于放弃当前拖拽或者恢复原状
    // 简单起见，这里只要大于0就应用
    if (bw > 0 && bh > 0) {
      annotations.value[selectedIdx.value] = {
        ...currentBox,
        x1: bx,
        y1: by,
        x2: bx + bw,
        y2: by + bh,
      };
    }

    isMoving = false;
    isResizing = false;
    resizeHandle = -1;
    currentBox = null;
    redraw();
    emitAnnotations();
    return;
  }

  isDrawing = false;
  const w = Math.abs(currentBox.x2 - currentBox.x1);
  const h = Math.abs(currentBox.y2 - currentBox.y1);

  const rect = canvasRef.value.getBoundingClientRect();
  const wrapperRect = wrapperRef.value.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;
  const minSize = 8 * displayScale;

  if (w > minSize && h > minSize) {
    // 保存撤销快照
    undoStack.value.push(JSON.stringify(annotations.value));
    if (undoStack.value.length > 50) undoStack.value.shift();

    annotations.value.push({ ...currentBox });
    pendingBoxIdx = annotations.value.length - 1;
    selectedIdx.value = pendingBoxIdx;

    // 显示标签选择器并调整位置到屏幕真实像素
    const drawPx = Math.min(currentBox.x1, currentBox.x2) + 4 * displayScale;
    const drawPy = Math.max(currentBox.y1, currentBox.y2) + 4 * displayScale;

    // 从 Canvas缓冲坐标 => CSS屏幕坐标，并加上 Canvas 在 wrapper 中的偏移量
    pickerPos.value = {
      x: drawPx / displayScale + (rect.left - wrapperRect.left),
      y: drawPy / displayScale + (rect.top - wrapperRect.top),
    };
    labelPickerVisible.value = true;

    emitAnnotations();
  }
  currentBox = null;
  redraw();
}

/**
 * 处理多边形双击结束，并在结束前执行尾点去重。
 */
const onDoubleClick = () => {
  if (props.tool !== "polygon") return;
  if (!isDrawingPolygon || !currentPolygon) return;
  if ((currentPolygon.points || []).length < 3) return;
  const pts = currentPolygon.points || [];
  const scale = getDisplayScale();
  const thr = 4 * scale;
  if (pts.length >= 2 && dist2(pts[pts.length - 1], pts[pts.length - 2]) <= thr * thr) {
    pts.pop();
  }
  if (pts.length < 3) return;
  finalizePolygon();
}

/**
 * 处理右键操作，用于撤销当前多边形点或删除命中的标注。
 */
const onRightClick = (e) => {
  const pos = getPos(e);
  if (isDrawingPolygon && currentPolygon) {
    if (currentPolygon.points.length > 0) {
      currentPolygon.points.pop();
      if (currentPolygon.points.length === 0) {
        isDrawingPolygon = false;
        currentPolygon = null;
        polygonHover = null;
      }
      redraw();
    }
    return;
  }
  const hit = hitTest(pos.x, pos.y);
  if (hit >= 0) {
    undoStack.value.push(JSON.stringify(annotations.value));
    annotations.value.splice(hit, 1);
    selectedIdx.value = -1;
    redraw();
    emitAnnotations();
  }
}

/**
 * 按从上到下的顺序命中检测当前鼠标所在的标注。
 */
const hitTest = (x, y) => {
  for (let i = annotations.value.length - 1; i >= 0; i--) {
    const b = annotations.value[i];
    if (b?.type === "polygon") {
      const pts = b.points || [];
      if (pts.length >= 3 && pointInPolygon({ x, y }, pts)) return i;
      continue;
    }
    const x1 = Math.min(b.x1, b.x2),
      x2 = Math.max(b.x1, b.x2);
    const y1 = Math.min(b.y1, b.y2),
      y2 = Math.max(b.y1, b.y2);
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return i;
  }
  return -1;
}

// ── 标签选择 ─────────────────────────────────────────────
/**
 * 为新建标注分配类别并同步刷新画布与外部数据。
 */
const assignLabel = (classIdx) => {
  if (pendingBoxIdx >= 0 && pendingBoxIdx < annotations.value.length) {
    annotations.value[pendingBoxIdx].classIdx = classIdx;
    annotations.value[pendingBoxIdx].label = props.classes[classIdx];
  }
  labelPickerVisible.value = false;
  redraw();
  emitAnnotations();
}

/**
 * 完成多边形创建，执行去重、入栈、选中和标签选择器定位。
 */
const finalizePolygon = () => {
  if (!currentPolygon) return;
  const pts = currentPolygon.points || [];
  if (pts.length < 3) return;

  const scale = getDisplayScale();
  const thr = 4 * scale;
  while (
    pts.length >= 2 &&
    dist2(pts[pts.length - 1], pts[pts.length - 2]) <= thr * thr
  ) {
    pts.pop();
  }
  if (pts.length < 3) return;

  undoStack.value.push(JSON.stringify(annotations.value));
  if (undoStack.value.length > 50) undoStack.value.shift();

  annotations.value.push({ ...currentPolygon });
  pendingBoxIdx = annotations.value.length - 1;
  selectedIdx.value = pendingBoxIdx;

  const rect = canvasRef.value.getBoundingClientRect();
  const wrapperRect = wrapperRef.value.getBoundingClientRect();
  const displayScale = rect && rect.width ? canvasW.value / rect.width : 1;
  const bounds = polygonBounds(pts);
  const drawPx = bounds.x + 4 * displayScale;
  const drawPy = bounds.y + 4 * displayScale;
  pickerPos.value = {
    x: drawPx / displayScale + (rect.left - wrapperRect.left),
    y: drawPy / displayScale + (rect.top - wrapperRect.top),
  };
  labelPickerVisible.value = true;

  isDrawingPolygon = false;
  currentPolygon = null;
  polygonHover = null;
  redraw();
  emitAnnotations();
}

// ── 键盘快捷键 ───────────────────────────────────────────
/**
 * 处理 Delete/Backspace 删除以及 Ctrl/Cmd+Z 撤销快捷键。
 */
const onKeyDown = (e) => {
  if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedIdx.value >= 0) {
      undoStack.value.push(JSON.stringify(annotations.value));
      annotations.value.splice(selectedIdx.value, 1);
      selectedIdx.value = -1;
      redraw();
      emitAnnotations();
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    undo();
  }
}

/**
 * 回退到上一份标注快照并触发重绘。
 */
const undo = () => {
  if (undoStack.value.length > 0) {
    annotations.value = JSON.parse(undoStack.value.pop());
    selectedIdx.value = -1;
    redraw();
    emitAnnotations();
  }
}

/**
 * 取消当前未完成的绘制或拖拽状态，但不清空已存在标注。
 */
const cancelCurrentDrawing = () => {
  isDrawing = false;
  isDrawingPolygon = false;
  isMoving = false;
  isResizing = false;
  resizeHandle = -1;
  movingVertexIdx = -1;
  currentBox = null;
  currentPolygon = null;
  polygonHover = null;
  labelPickerVisible.value = false;
  redraw();
}

// ── 对外暴露 ─────────────────────────────────────────────
/**
 * 将内部画布标注转换后同步给父组件。
 */
const emitAnnotations = () => {
  emit(
    "update:annotations",
    annotations.value.map((b) => toYolo(b)),
  );
}

/**
 * 将内部画布坐标转换为归一化的 YOLO 标注结构。
 */
const toYolo = (box) => {
  if (box?.type === "polygon") {
    const pts = box.points || [];
    const bounds = polygonBounds(pts);
    const x1 = bounds.x * scaleX;
    const y1 = bounds.y * scaleY;
    const x2 = (bounds.x + bounds.w) * scaleX;
    const y2 = (bounds.y + bounds.h) * scaleY;
    const cx = (x1 + x2) / 2 / imgNaturalW;
    const cy = (y1 + y2) / 2 / imgNaturalH;
    const w = (x2 - x1) / imgNaturalW;
    const h = (y2 - y1) / imgNaturalH;
    return {
      shapeType: "polygon",
      classIdx: box.classIdx,
      label: box.label,
      cx: +cx.toFixed(6),
      cy: +cy.toFixed(6),
      w: +w.toFixed(6),
      h: +h.toFixed(6),
      polygonPoints: pts.map((p) => ({
        x: +((p.x * scaleX) / imgNaturalW).toFixed(6),
        y: +((p.y * scaleY) / imgNaturalH).toFixed(6),
      })),
    };
  }
  const x1 = Math.min(box.x1, box.x2) * scaleX;
  const y1 = Math.min(box.y1, box.y2) * scaleY;
  const x2 = Math.max(box.x1, box.x2) * scaleX;
  const y2 = Math.max(box.y1, box.y2) * scaleY;
  const cx = (x1 + x2) / 2 / imgNaturalW;
  const cy = (y1 + y2) / 2 / imgNaturalH;
  const w = (x2 - x1) / imgNaturalW;
  const h = (y2 - y1) / imgNaturalH;
  return {
    shapeType: "rect",
    classIdx: box.classIdx,
    label: box.label,
    cx: +cx.toFixed(6),
    cy: +cy.toFixed(6),
    w: +w.toFixed(6),
    h: +h.toFixed(6),
  };
}

// 暴露给父组件调用
defineExpose({
  undo,
  cancelCurrentDrawing,
  clearAll: () => {
    annotations.value = [];
    redraw();
    emitAnnotations();
  },
  deleteAnnotation: (idx) => {
    if (idx >= 0 && idx < annotations.value.length) {
      undoStack.value.push(JSON.stringify(annotations.value));
      if (undoStack.value.length > 50) undoStack.value.shift();
      annotations.value.splice(idx, 1);
      selectedIdx.value = -1;
      redraw();
      emitAnnotations();
    }
  },
  updateAnnotationClass: (idx, classIdx) => {
    if (
      idx >= 0 &&
      idx < annotations.value.length &&
      classIdx >= 0 &&
      classIdx < props.classes.length
    ) {
      undoStack.value.push(JSON.stringify(annotations.value));
      if (undoStack.value.length > 50) undoStack.value.shift();
      annotations.value[idx].classIdx = classIdx;
      annotations.value[idx].label = props.classes[classIdx];
      redraw();
      emitAnnotations();
    }
  },
});
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
  cursor: crosshair;
  background: #0a0a0a;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: auto;
}

.label-picker {
  position: absolute;
  background: rgba(15, 20, 35, 0.96);
  border: 1px solid rgba(100, 180, 255, 0.3);
  padding: 6px 0;
  min-width: 120px;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.label-picker-title {
  font-size: 11px;
  color: #6b7280;
  padding: 2px 12px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 4px;
}

.label-item {
  padding: 6px 12px;
  font-size: 13px;
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.12s;
}

.label-item:hover {
  background: rgba(100, 180, 255, 0.12);
}
</style>
