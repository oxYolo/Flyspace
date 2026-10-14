<template>
  <div class="route-confidence-panel" v-if="props.visible">
    <div
      class="panel-content-wrapper"
      v-loading="props.loading"
      element-loading-text="置信度获取中...">
      <div class="panel-header">
        <div class="header-title">
          航线置信度
          <span class="route-name">{{ props.routeName || "未命名" }}</span>
        </div>
        <div class="header-actions">
          <el-icon :size="20" class="close-button" @click="emit('close')">
            <Close />
          </el-icon>
        </div>
      </div>

      <div class="panel-content">
        <div class="confidence-summary" :class="summaryClass">
          {{ summaryText }}
        </div>

        <div class="confidence-table" v-if="props.list.length > 0">
          <div class="confidence-row confidence-header-row">
            <div class="grid-code">北斗网格码</div>
            <div class="score">评分</div>
          </div>
          <div class="confidence-table-body">
            <div
              class="confidence-row"
              v-for="item in props.list"
              :key="item.gridCode">
              <div class="grid-code">{{ item.gridCode }}</div>
              <div
                class="score"
                :class="
                  Number.isFinite(item.score) && item.score >= 1
                    ? 'score-good'
                    : 'score-bad'
                ">
                {{ Number.isFinite(item.score) ? item.score : "-" }}
              </div>
            </div>
          </div>
        </div>

        <div class="confidence-empty" v-else>暂无列表数据</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Close } from "@element-plus/icons-vue";

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  routeName: string;
  status: number | null;
  list: Array<{ gridCode: string; score: number }>;
}>();

const emit = defineEmits(["close"]);

const summaryText = computed(() => {
  if (props.status === 1) return "航线不合格：存在高风险区域";
  if (props.status === 0) return "航线合格：";
  return "航线合格性未知：暂无置信度数据";
});

const summaryClass = computed(() => {
  if (props.status === 0) return "qualified";
  if (props.status === 1) return "unqualified";
  return "unknown";
});
</script>

<style lang="less" scoped>
.route-confidence-panel {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  width: 350px;
  height: 100%;
  background-color: rgba(23, 44, 44, 0.9);
  pointer-events: auto;
  z-index: 1000;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);

  .panel-content-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: #fff;
  }

  .panel-header {
    color: #fff;
    box-shadow: inset 0 -1px 0 0 #4f4f4f;
    padding: 10px 16px;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;

    .header-title {
      font-size: 16px;
      font-weight: bold;
      color: white;
      .route-name {
        font-size: 12px;
        color: #e6e6e6;
      }
    }

    .close-button {
      cursor: pointer;
      color: #ccc;
      transition: color 0.2s ease;

      &:hover {
        color: white;
      }
    }
  }

  .panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px;
    gap: 10px;
  }

  .confidence-summary {
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    border-left: 3px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.06);
  }

  .confidence-summary.qualified {
    color: #00ff7f;
    border-left-color: rgba(0, 255, 127, 0.8);
    background: rgba(0, 255, 127, 0.08);
  }

  .confidence-summary.unqualified {
    color: #ff5252;
    border-left-color: rgba(255, 82, 82, 0.9);
    background: rgba(255, 82, 82, 0.08);
  }

  .confidence-summary.unknown {
    color: #ccc;
    border-left-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.05);
  }

  .confidence-table {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }

  .confidence-table-body {
    overflow-y: auto;
  }

  .confidence-row {
    display: flex;
    gap: 10px;
    padding: 8px 10px;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .confidence-header-row {
    border-top: none;
    background: rgba(255, 255, 255, 0.06);
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .grid-code {
    flex: 1;
    font-size: 12px;
    word-break: break-all;
    color: #e6e6e6;
  }

  .score {
    width: 72px;
    text-align: right;
    font-size: 12px;
    font-weight: 700;
  }

  .score-good {
    color: #00ff7f;
  }

  .score-bad {
    color: #ff5252;
  }

  .confidence-empty {
    color: #aaa;
    font-size: 12px;
    padding: 8px 2px;
  }
}
</style>
