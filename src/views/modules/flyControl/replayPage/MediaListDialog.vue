<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { PageOptions } from "@/model/commonModel.ts";
import { $getMediaList } from "@/api/flyControl/file.ts";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";
import ElementTable from "@/components/common/ElementTable.vue";

const props = defineProps({
  executorId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["close", "loadMediaList", "openMediaDetail"]);
const tableColumns = ref([
  { prop: "fileName", label: "文件名称", width: 240 },
  { prop: "fileType", label: "文件类型" },
]);

const tableData = ref([]);
const searchForm = ref({
  fileName: "",
  fileType: "PHOTO",
});

// 文件类型列表
const fileTypeList = [
  { label: "全部", value: "" },
  { label: "图片", value: "PHOTO" },
  { label: "视频", value: "VIDEO" },
  { label: "影像图片", value: "MAPIMAGE" },
];

const pageOptions = ref<PageOptions>({
  page: 1,
  size: 10,
  total: 0,
});

// 搜索方法
const handleSearch = () => {
  // 重置分页到第一页
  pageOptions.value.page = 1;
  getMediaList();
};

const getMediaList = () => {
  const params = {
    ...searchForm.value,
    missionId: props.executorId,
    pageNum: pageOptions.value.page,
    pageSize: pageOptions.value.size,
    orderBy: "fileName",
    orderDirection: "asc",
  };
  $getMediaList(params).then((res: any) => {
    tableData.value = res.rows;
    pageOptions.value.total = res.total;
    emit("loadMediaList", res.rows);
  });
};

// 组件挂载后初始化
onMounted(() => {
  getMediaList();
});

const handleRowClick = (row: any) => {
  // 触发打开媒体详情事件，传递当前点击的媒体和完整的媒体列表
  emit("openMediaDetail", row, tableData.value);
};
const handleCurrentChange = (current: number) => {
  pageOptions.value.page = current;
  getMediaList();
};
</script>

<template>
  <div class="media-list-wrap">
    <GeoBorderBox title="成果列表" width="100%">
      <!-- 标签页导航 -->
      <div class="head-container">
        <!-- 操作按钮 -->
        <el-input
          v-model="searchForm.fileName"
          placeholder="按文件名称搜索"
          clearable
          @keyup.enter="handleSearch" />
        <el-select
          clearable
          v-model="searchForm.fileType"
          placeholder="选择文件类型"
          @change="handleSearch">
          <el-option
            v-for="el in fileTypeList"
            :key="el.value"
            :label="el.label"
            :value="el.value" />
        </el-select>
      </div>

      <!-- 内容区域 -->
      <div class="dialog-content">
        <ElementTable
          :columns="tableColumns"
          :data="tableData"
          :pageOptions="pageOptions"
          :show-index="false"
          :show-pagination="true"
          :max-height="'100%'"
          @row-click="handleRowClick"
          @handleCurrentChange="handleCurrentChange" />
      </div>
    </GeoBorderBox>
  </div>
</template>

<style scoped lang="less">
.media-list-wrap {
  .head-container {
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .dialog-content {
    height: 100%;
    overflow: hidden;
  }
}
</style>
