<template>
  <GeoCommonDialog
    v-model:dialogVisible="currentVisible"
    title="快捷键说明"
    height="41vh"
    width="38vw"
    @close="handleClosed"
    @cancel="cancel"
    @confirm="confirm">
    <div class="dialogContent">
      <div class="kb-wrap">
        <div class="kb-left">
          <div
            class="row"
            v-for="(row, rIdx) in keyboardRows"
            :key="'row-' + rIdx">
            <template
              v-for="(key, kIdx) in row"
              :key="'k-' + rIdx + '-' + kIdx">
              <!-- 右下角云台占两键位的插槽 -->
              <div
                v-if="key.type === 'gimbalSlot'"
                class="keycap gimbal-slot"
                :style="{ '--w': String(key.w || 2.4) }">
                <div class="gimbal-mini">
                  <div class="mini g left">
                    <span>◀</span><em>云台向左</em>
                  </div>
                  <div class="mini g up"><em>云台向上</em></div>
                  <div class="mini g right">
                    <span>▶</span><em>云台向右</em>
                  </div>
                  <div class="mini g down"><em>云台向下</em></div>
                </div>
              </div>
              <!-- 常规键位：灰色空键不显示文字 -->
              <div
                v-else
                class="keycap"
                :class="[key.type || 'idle', key.k === 'Space' ? 'space' : '']"
                :style="{ '--w': String(key.w || 1) }">
                <div class="key-top" v-if="key.type && key.type !== 'idle'">
                  {{ key.k }}
                </div>
                <div
                  class="key-label"
                  v-if="key.type && key.type !== 'idle' && key.label">
                  {{ key.label }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </GeoCommonDialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import GeoCommonDialog from "@/components/common/GeoCommonDialog.vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const currentVisible = ref(false);
watch(
  () => props.visible,
  () => {
    currentVisible.value = props.visible;
  },
);

const emit = defineEmits([
  "update:modelValue",
  "confirm",
  "cancel",
  "update:visible",
]);

// 处理对话框关闭事件
const handleClosed = (done: () => void) => {
  emit("update:visible", false);
};

const confirm = () => {
  emit("update:visible", false);
};

const cancel = () => {
  emit("update:visible", false);
  emit("cancel");
};

type KeyType = "camera" | "move" | "feature" | "space" | "idle" | "gimbalSlot";
interface KeyItem {
  k: string;
  w?: number;
  type?: KeyType;
  label?: string;
}

const keyboardRows = ref<KeyItem[][]>([
  // 数字行（含 Backspace）
  [
    { k: "`" },
    { k: "1", type: "camera", label: "广角镜头" },
    { k: "2", type: "camera", label: "变焦镜头" },
    { k: "3", type: "camera", label: "红外镜头" },
    { k: "4" },
    { k: "5" },
    { k: "6" },
    { k: "7" },
    { k: "8" },
    { k: "9" },
    { k: "0" },
    { k: "Backspace", w: 2.4 },
  ],
  // Tab 行（标准字母键宽度）
  [
    { k: "Tab", w: 1.5 },
    { k: "Q", type: "move", label: "左旋", w: 1 },
    { k: "W", type: "move", label: "前进", w: 1 },
    { k: "E", type: "move", label: "右旋", w: 1 },
    { k: "R", type: "feature", label: "录像", w: 1 },
    { k: "T", type: "feature", label: "一键起飞", w: 1 },
    { k: "Y", type: "feature", label: "全景", w: 1 },
    { k: "U", w: 1 },
    { k: "I", w: 1 },
    { k: "O", w: 1 },
    { k: "P", type: "feature", label: "飞行参数", w: 1 },
    { k: "\\", w: 1.9 },
  ],
  // Caps 行
  [
    { k: "Caps", w: 1.9 },
    { k: "A", type: "move", label: "左移", w: 1 },
    { k: "S", type: "move", label: "后退", w: 1 },
    { k: "D", type: "move", label: "右移", w: 1 },
    { k: "F", type: "feature", label: "拍照", w: 1 },
    { k: "G", type: "feature", label: "一键返航", w: 1 },
    { k: "H", type: "feature", label: "一键水平", w: 1 },
    { k: "J", w: 1 },
    { k: "K", w: 1 },
    { k: "L", w: 1 },
    { k: "Enter", w: 2.7 },
  ],
  // Shift 行
  [
    { k: "Shift", w: 2.4 },
    { k: "Z", type: "move", label: "下降", w: 1 },
    { k: "X", type: "feature", label: "速度切换", w: 1 },
    { k: "C", type: "move", label: "上升", w: 1 },
    { k: "V", type: "feature", label: "一键垂直", w: 1 },
    { k: "B", type: "feature", label: "恢复航线", w: 1 },
    { k: "N", type: "feature", label: "取消返航", w: 1 },
    { k: "M", w: 1 },
    { k: "?", type: "feature", label: "帮助", w: 1.2 },
    { k: "", w: 3.15 },
  ],
  // 空格行
  [
    { k: "Ctrl", w: 1 },
    { k: "Win", w: 1 },
    { k: "Alt", w: 1 },
    { k: "Space", w: 6, type: "space", label: "急停" },
    { k: "Alt", w: 1 },
    { k: "Ctrl", w: 1 },
    { k: "GIMBAL", type: "gimbalSlot", w: 3.2 },
  ],
]);
</script>

<style lang="less" scoped>
.dialogContent {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kb-wrap {
  display: grid;
  grid-template-columns: 1fr; /* 单列以对齐右边界 */
  gap: 12px;
  height: 100%;
}

.kb-left {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  --unit: 56px;
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.keycap {
  --w: 1;
  --key-h: 58px;
  flex: 0 0 auto;
  height: var(--key-h);
  width: calc(var(--unit) * var(--w));
  background: #5b5b5b;
  border-radius: 8px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4px;
}

/* 空格键高度与其他键一致 */
.keycap.space {
  background: #8b1d1d;
}

.key-top {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}
.key-label {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
}

.keycap.camera {
  background: #b58412;
}
.keycap.move {
  background: #2b74c9;
}
.keycap.feature {
  background: #6b3aa8;
}

/* 右下角云台小面板（占两键位容器内） */
.gimbal-slot {
  background: transparent;
  box-shadow: none;
  padding: 0;
  height: var(--key-h);
}
.gimbal-mini {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* 左 | 中 | 右 */
  grid-template-rows: calc(var(--key-h) / 2) calc(var(--key-h) / 2);
  gap: 6px;
  width: 100%;
  height: 100%;
}
.mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.mini.g {
  background: #168b8b;
  color: #fff;
}
.mini.left {
  grid-column: 1 / 2;
  grid-row: 1 / 3;
} /* 左键占两行，等高于普通键 */
.mini.right {
  grid-column: 3 / 4;
  grid-row: 1 / 3;
} /* 右键占两行，等高于普通键 */
.mini.up {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
}
.mini.down {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
}
.mini span {
  font-weight: 700;
  line-height: 1;
}
.mini em {
  font-style: normal;
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
}
</style>
