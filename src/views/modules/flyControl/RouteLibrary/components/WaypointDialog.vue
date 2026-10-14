<template>
  <WaypointListPanel
    v-show="visible"
    :waypoints="waypoints"
    :routeId="routeId"
    :selectedRow="selectedRow"
    :selectedIconIdx="selectedIconIdx"
    @select="handleSelect"
    @handleShowSettingsPanel="handleShowSettingsPanel"
    @closePanel="handelClosePanel" />
  <WaypointDetailPanel
    :selectedRow="selectedRow"
    :selectedIconIdx="selectedIconIdx"
    :selectedIcon="selectedIcon" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import WaypointListPanel from "./WaypointListPanel.vue";
import WaypointDetailPanel from "./WaypointDetailPanel.vue";
// 定义组件接收的 props
const props = defineProps<{
  routeId: any;
}>();

interface Waypoint {
  id: number;
  icons: string[];
  selectedIconIdx: number;
}
const emits = defineEmits(["handleShowSettingsPanel", "close"]);
const waypoints = ref<Waypoint[]>([
  { id: 1, icons: ["Camera", "ZoomIn", "VideoCamera"], selectedIconIdx: 0 },
  { id: 2, icons: ["Camera", "Refresh"], selectedIconIdx: 0 },
  { id: 3, icons: ["ZoomIn", "Camera", "Refresh"], selectedIconIdx: 0 },
  { id: 4, icons: ["VideoCamera", "Camera"], selectedIconIdx: 0 },
  { id: 5, icons: ["Refresh", "ZoomIn"], selectedIconIdx: 0 },
  { id: 6, icons: ["Camera", "VideoCamera"], selectedIconIdx: 0 },
  { id: 7, icons: ["ZoomIn", "Refresh"], selectedIconIdx: 0 },
  { id: 8, icons: ["Camera", "Refresh"], selectedIconIdx: 0 },
]);

const selectedRow = ref(0);
const selectedIconIdx = ref(0);
const selectedIcon = computed(
  () => waypoints.value[selectedRow.value]?.icons[selectedIconIdx.value] ?? "",
);

function handleSelect({
  row,
  iconIdx,
  icon,
}: {
  row: number;
  iconIdx: number;
  icon: string;
}) {
  selectedRow.value = row;
  selectedIconIdx.value = iconIdx;
  waypoints.value.forEach((wp, idx) => {
    if (idx === row) {
      wp.selectedIconIdx = iconIdx;
    }
  });
}

const visible = ref(true);
const handleShowSettingsPanel = () => {
  visible.value = false;
  emits("handleShowSettingsPanel");
};
const showVisible = () => {
  visible.value = true;
};

const handelClosePanel = () => {
  emits("close");
};

// 暴露方法给父组件
defineExpose({
  showVisible,
});
</script>

<style scoped>
.waypoint-dialog-body {
  display: flex;
  flex-direction: row;
  min-height: 500px;
}
</style>
