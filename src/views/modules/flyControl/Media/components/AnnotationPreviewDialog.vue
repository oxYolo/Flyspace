<template>
  <el-dialog
    v-model="visibleProxy"
    width="94vw"
    top="-10px"
    class="annotationPreviewDialog"
    modal-class="annotationPreviewDialogModal"
    destroy-on-close
    @closed="handleClosed">
    <template #header>
      <div class="dialogHeader">
        <div class="headerTitle">{{ fileTitle }}</div>
        <div class="headerFilters">
          <el-select
            v-model="selectedSceneCode"
            placeholder="请选择巡检场景..."
            :loading="optionsLoading"
            class="filterItem"
            clearable>
            <el-option
              v-for="item in inspectionSceneOptions"
              :key="item.dictCode"
              :label="item.name"
              :value="item.dictCode" />
          </el-select>

          <el-select
            v-model="selectedProblemKey"
            placeholder="请选择识别问题..."
            :loading="optionsLoading"
            :disabled="!selectedSceneCode"
            class="filterItem"
            clearable>
            <el-option
              v-for="item in problemOptions"
              :key="item.key"
              :label="item.label"
              :value="item.key" />
          </el-select>
        </div>
      </div>
    </template>

    <div class="dialogBody">
      <div v-if="previewLoading" class="stateWrap">
        <el-empty description="标注预览加载中..." />
      </div>
      <div v-else-if="previewAnnotations.length > 0" class="imageWrap">
        <div class="previewGrid">
          <div
            v-for="(ann, idx) in previewAnnotations"
            :key="`${ann.labelFirstEn || ''}_${ann.labelEn || ''}_${idx}`"
            class="previewItem">
            <div class="previewMeta">
              <span class="previewScene">{{ ann.labelFirstCn || "-" }}</span>
              <span class="previewLabel">
                {{ ann.labelCn || ann.labelEn || "-" }}
              </span>
            </div>
            <div class="previewCanvasWrap">
              <img
                class="previewImage"
                :src="previewBaseImageUrl"
                :ref="(el) => setImageRef(el, idx)"
                @load="handlePreviewImageLoad(idx)"
                @error="handlePreviewImageError" />
              <canvas
                class="previewCanvas"
                :ref="(el) => setCanvasRef(el, idx)"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="stateWrap">
        <el-empty description="当前图片暂无标注预览" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  $getInspectionImageLabelSceneProblems,
  $previewInspectionAnnotation,
} from "@/api/flyControl/file.ts";

interface MediaItem {
  id?: string | number;
  fileId?: string | number;
  fileName?: string;
  name?: string;
}

interface SceneItem {
  id: string | number;
  name: string;
  dictCode: string;
}

interface ProblemOption {
  key: string;
  label: string;
  labelEn: string;
  labelCn: string;
  color?: string;
  sort?: number;
}

interface PreviewAnnotationItem {
  labelFirstCn?: string;
  labelFirstEn?: string;
  labelCn?: string;
  labelEn?: string;
  color?: string;
  yoloSort?: number;
  yoloAnnotation?: string;
}

const props = defineProps<{
  modelValue: boolean;
  media: MediaItem | null;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const visibleProxy = computed({
  get() {
    return props.modelValue;
  },
  set(value: boolean) {
    emits("update:modelValue", value);
  },
});

const fileTitle = computed(() => {
  return props.media?.fileName || props.media?.name || "标注预览";
});
const imageIdForQuery = computed(() => {
  return String(props.media?.fileId || props.media?.id || "").trim();
});

const optionsLoading = ref(false);
const previewLoading = ref(false);
const inspectionSceneOptions = ref<SceneItem[]>([]);
const sceneProblemsBySceneCode = ref<Record<string, ProblemOption[]>>({});
const selectedSceneCode = ref("");
const selectedProblemKey = ref("");
const previewBaseImageUrl = ref("");
const previewAnnotations = ref<PreviewAnnotationItem[]>([]);
const canvasRefs = ref<(HTMLCanvasElement | null)[]>([]);
const imageRefs = ref<(HTMLImageElement | null)[]>([]);
const previewImageLoadFailed = ref(false);
const syncingFilterChange = ref(false);
const problemOptions = computed(() => {
  const code = String(selectedSceneCode.value || "").trim();
  return sceneProblemsBySceneCode.value[code] || [];
});

const setCanvasRef = (el: any, idx: number) => {
  canvasRefs.value[idx] = el instanceof HTMLCanvasElement ? el : null;
};

const setImageRef = (el: any, idx: number) => {
  imageRefs.value[idx] = el instanceof HTMLImageElement ? el : null;
};

const resetPreviewState = () => {
  selectedSceneCode.value = "";
  selectedProblemKey.value = "";
  inspectionSceneOptions.value = [];
  sceneProblemsBySceneCode.value = {};
  syncingFilterChange.value = false;
  clearPreviewResult();
};

const clearPreviewResult = () => {
  previewBaseImageUrl.value = "";
  previewAnnotations.value = [];
  canvasRefs.value = [];
  imageRefs.value = [];
  previewImageLoadFailed.value = false;
};

const parseYoloNumbers = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
};

const polygonBounds = (points: Array<{ x: number; y: number }>) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  return {
    x: Number.isFinite(minX) ? minX : 0,
    y: Number.isFinite(minY) ? minY : 0,
    w: Number.isFinite(maxX - minX) ? Math.max(0, maxX - minX) : 0,
    h: Number.isFinite(maxY - minY) ? Math.max(0, maxY - minY) : 0,
  };
};

const hexToRgba = (color: string, alpha: number) => {
  const raw = String(color || "").trim();
  if (/^#([0-9a-fA-F]{6})$/.test(raw)) {
    const r = parseInt(raw.slice(1, 3), 16);
    const g = parseInt(raw.slice(3, 5), 16);
    const b = parseInt(raw.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(0, 204, 0, ${alpha})`;
};

const syncCanvasSizeWithImage = (idx: number) => {
  const canvas = canvasRefs.value[idx];
  const img = imageRefs.value[idx];
  if (!canvas || !img) return false;

  const width = Math.round(img.clientWidth || 0);
  const height = Math.round(img.clientHeight || 0);
  if (!width || !height) return false;

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }
  return true;
};

const drawLabelTag = (
  ctx: CanvasRenderingContext2D,
  label: string,
  color: string,
  x: number,
  y: number,
) => {
  if (!label) return;

  const fontSize = 12;
  const padding = 6;
  const rectHeight = 18;
  ctx.font = `${fontSize}px sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const rectWidth = Math.round(textWidth + padding * 2);
  const rectX = Math.max(0, x);
  const rectY = y - rectHeight > 0 ? y - rectHeight : y;

  ctx.fillStyle = color;
  ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rectX + rectWidth / 2, rectY + rectHeight / 2);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
};

const drawAnnotationOnCanvas = (
  canvas: HTMLCanvasElement,
  ann: PreviewAnnotationItem,
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const boxW = canvas.width || 1;
  const boxH = canvas.height || 1;
  ctx.clearRect(0, 0, boxW, boxH);

  const nums = parseYoloNumbers(ann?.yoloAnnotation);
  if (nums.length !== 4 && (nums.length < 6 || nums.length % 2 !== 0)) {
    return;
  }

  const color = String(ann?.color || "#00CC00");
  const label = String(ann?.labelCn || ann?.labelEn || "").trim();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.setLineDash([]);

  if (nums.length === 4) {
    const [cx, cy, w, h] = nums;
    const dx = (cx - w / 2) * boxW;
    const dy = (cy - h / 2) * boxH;
    const dw = w * boxW;
    const dh = h * boxH;

    ctx.save();
    ctx.strokeRect(dx, dy, dw, dh);
    ctx.fillStyle = hexToRgba(color, 0.08);
    ctx.fillRect(dx, dy, dw, dh);
    drawLabelTag(ctx, label, color, dx, dy);
    ctx.restore();
    return;
  }

  const points: Array<{ x: number; y: number }> = [];
  ctx.beginPath();
  for (let i = 0; i < nums.length; i += 2) {
    const dx = nums[i] * boxW;
    const dy = nums[i + 1] * boxH;
    points.push({ x: dx, y: dy });
    if (i === 0) ctx.moveTo(dx, dy);
    else ctx.lineTo(dx, dy);
  }
  ctx.closePath();
  ctx.fillStyle = hexToRgba(color, 0.08);
  ctx.fill();
  ctx.stroke();

  const bounds = polygonBounds(points);
  drawLabelTag(ctx, label, color, bounds.x, bounds.y);
};

const renderPreviewCanvases = async () => {
  await nextTick();
  previewAnnotations.value.forEach((ann, idx) => {
    if (!syncCanvasSizeWithImage(idx)) return;
    const canvas = canvasRefs.value[idx];
    if (!canvas) return;
    drawAnnotationOnCanvas(canvas, ann);
  });
};

const handlePreviewImageLoad = (idx: number) => {
  previewImageLoadFailed.value = false;
  if (!syncCanvasSizeWithImage(idx)) return;
  const canvas = canvasRefs.value[idx];
  const ann = previewAnnotations.value[idx];
  if (!canvas || !ann) return;
  drawAnnotationOnCanvas(canvas, ann);
};

const handlePreviewImageError = () => {
  if (previewImageLoadFailed.value) return;
  previewImageLoadFailed.value = true;
  ElMessage.error("标注预览图片加载失败");
};

const normalizeSceneProblemsData = (data: any) => {
  const list = Array.isArray(data) ? data : [];
  const scenes: SceneItem[] = [];
  const problemsByScene: Record<string, ProblemOption[]> = {};

  list.forEach((sceneItem: any) => {
    const sceneDictCode = String(sceneItem?.sceneDictCode || "").trim();
    const sceneName = String(sceneItem?.sceneName || "").trim();
    const sceneId = sceneItem?.sceneId ?? sceneDictCode;
    if (!sceneDictCode) return;

    scenes.push({
      id: sceneId,
      name: sceneName || sceneDictCode,
      dictCode: sceneDictCode,
    });

    const problems = Array.isArray(sceneItem?.problems)
      ? sceneItem.problems
      : [];
    problemsByScene[sceneDictCode] = problems
      .map((p: any) => {
        const labelEn = String(p?.labelEn || "").trim();
        const labelCn = String(p?.labelCn || "").trim();
        const sort =
          p?.sort === undefined || p?.sort === null
            ? undefined
            : Number(p.sort);
        return {
          key: labelEn,
          label: labelCn || labelEn,
          labelEn,
          labelCn: labelCn || labelEn,
          color: p?.color,
          sort,
        } as ProblemOption;
      })
      .filter((x: ProblemOption) => !!x.key)
      .sort(
        (a: ProblemOption, b: ProblemOption) =>
          Number(a.sort ?? 0) - Number(b.sort ?? 0),
      );
  });

  return { scenes, problemsByScene };
};

const loadSceneProblems = async () => {
  const imageId = String(props.media?.fileId || props.media?.id || "").trim();
  if (!imageId) {
    inspectionSceneOptions.value = [];
    sceneProblemsBySceneCode.value = {};
    ElMessage.error("无法获取图片ID");
    return;
  }

  optionsLoading.value = true;
  try {
    const res: any = await $getInspectionImageLabelSceneProblems(imageId);
    if (res?.code !== 200) {
      inspectionSceneOptions.value = [];
      sceneProblemsBySceneCode.value = {};
      ElMessage.error(res?.msg || "获取巡检场景失败");
      return;
    }
    const { scenes, problemsByScene } = normalizeSceneProblemsData(res?.data);
    inspectionSceneOptions.value = scenes;
    sceneProblemsBySceneCode.value = problemsByScene;
  } catch (e: any) {
    inspectionSceneOptions.value = [];
    sceneProblemsBySceneCode.value = {};
    ElMessage.error(e?.message || "获取巡检场景及识别问题失败");
  } finally {
    optionsLoading.value = false;
  }
};

const queryPreview = async () => {
  const imageId = imageIdForQuery.value;
  if (!imageId) {
    clearPreviewResult();
    return;
  }
  const queryParams: any = { imageId };
  const labelEn = String(selectedProblemKey.value || "").trim();
  if (labelEn) {
    queryParams.labelEn = labelEn;
  }
  if (selectedSceneCode.value) {
    const pickedScene = inspectionSceneOptions.value.find(
      (item) =>
        String(item.dictCode || "").trim() ===
        String(selectedSceneCode.value || "").trim(),
    );
    const identifyDictId = String(pickedScene?.id ?? "").trim();
    if (!identifyDictId) {
      ElMessage.error("无法获取巡检场景ID");
      return;
    }
    queryParams.identifyDictId = identifyDictId;
  }

  previewLoading.value = true;
  clearPreviewResult();
  try {
    const res: any = await $previewInspectionAnnotation(queryParams);
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "获取标注预览失败");
      return;
    }
    const imageUrl = String(res?.data?.imageUrl || "").trim();
    const annotations = Array.isArray(res?.data?.annotations)
      ? res.data.annotations
      : [];
    previewBaseImageUrl.value = imageUrl;
    previewAnnotations.value = annotations;
    if (!imageUrl || annotations.length === 0) {
      ElMessage.warning("暂无标注预览");
      return;
    }
    await renderPreviewCanvases();
  } catch (e: any) {
    ElMessage.error(e?.message || "获取标注预览失败");
  } finally {
    previewLoading.value = false;
  }
};

const handleClosed = () => {
  resetPreviewState();
};

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return;
    resetPreviewState();
    await loadSceneProblems();
    await queryPreview();
  },
);

watch(selectedSceneCode, async (sceneCode, previousSceneCode) => {
  if (!props.modelValue || syncingFilterChange.value) return;

  syncingFilterChange.value = true;
  try {
    if (sceneCode !== previousSceneCode) {
      selectedProblemKey.value = "";
      clearPreviewResult();
    }
    const list =
      sceneProblemsBySceneCode.value[String(sceneCode || "").trim()] || [];
    if (sceneCode && !selectedProblemKey.value && list.length === 1) {
      selectedProblemKey.value = list[0]?.key || "";
    }
  } finally {
    syncingFilterChange.value = false;
  }

  await queryPreview();
});

watch(selectedProblemKey, async () => {
  if (!props.modelValue || syncingFilterChange.value) return;
  clearPreviewResult();
  await queryPreview();
});

onBeforeUnmount(() => {
  resetPreviewState();
});
</script>

<style scoped lang="less">
.dialogHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.headerTitle {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.92);
  font-size: 15px;
  font-weight: 600;
}

.headerFilters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filterItem {
  width: 220px;
}

.dialogBody {
  height: calc(90vh - 120px);
  min-height: 520px;
}

.stateWrap,
.imageWrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.previewGrid {
  width: 100%;
  height: 100%;

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  gap: 12px;
  align-content: start;
  overflow: auto;
}

.previewItem {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(23, 44, 44, 1);
}

.previewCanvasWrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.22);
}

.previewMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
}

.previewScene,
.previewLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previewScene {
  color: rgba(255, 255, 255, 0.62);
  flex: 0 0 auto;
  max-width: 40%;
}

.previewLabel {
  flex: 1 1 auto;
  text-align: right;
}

.previewImage {
  width: 100%;
  height: auto;
  display: block;
}

.previewCanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>

<style lang="less">
.annotationPreviewDialog.el-dialog {
  background-color: rgba(23, 44, 44, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  padding: 0 !important;
}

.annotationPreviewDialog .el-dialog__header {
  padding: 16px !important;
  margin-right: 0 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.annotationPreviewDialog .el-dialog__body {
  padding: 16px !important;
  background-color: rgba(23, 44, 44, 0.6) !important;
}

.annotationPreviewDialog .el-select__wrapper,
.annotationPreviewDialog .el-input__wrapper {
  background-color: rgba(23, 44, 44, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14) inset !important;
}

.annotationPreviewDialog .el-input__inner,
.annotationPreviewDialog .el-select__selected-item {
  color: rgba(255, 255, 255, 0.84) !important;
}

.annotationPreviewDialogModal {
  --el-overlay-color-lighter: rgba(0, 0, 0, 0.55);
}
</style>
