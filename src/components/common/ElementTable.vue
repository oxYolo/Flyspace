<template>
  <div class="element-table" :style="'height:' + maxHeight">
    <el-table
      ref="table"
      v-loading="loading"
      :row-key="rowKey"
      :data="tableData"
      border
      :height="showPagination ? 'calc(100% - 40px)' : '100%'"
      stripe
      style="width: 100%"
      highlight-current-row
      @cell-dblclick="cellDbClick"
      @row-click="rowClick"
    >
      <el-table-column
        v-if="showIndex"
        type="index"
        :index="indexMethod"
        label="序号"
        align="center"
        width="60"
        fixed="left"
      />
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        show-tooltip-when-overflow
        header-align="center"
        align="center"
        :label="column.label"
        :prop="column.prop"
        :width="column.width"
        :min-width="column.minWidth"
        :sortable="column.sortable"
      >
        <el-table-column
          v-for="child in column.children"
          :key="child.prop"
          show-tooltip-when-overflow
          header-align="center"
          align="center"
          :prop="child.prop"
          :label="child.label"
          :width="child.width"
          :min-width="child.minWidth"
          :sortable="child.sortable"
        >
          <template #default="scope">
            <span>{{ scope.row[child.prop] }}</span>
          </template>
        </el-table-column>
        <template v-if="!column.children" #default="scope">
          <span v-if="column.option">
            {{ column.option.find(el => String(el.value) === String(scope.row[column.prop]))?.label ?? scope.row[column.prop] }}
          </span>
          <span v-else-if="column.slot">
            <slot :name="column.slot" :row="scope.row" />
          </span>
          <span v-else>{{ scope.row[column.prop] }}</span>
        </template>
      </el-table-column>
      <slot name="otherOperation" />
      <el-table-column v-if="showActions" label="操作" fixed="right" :width="`${actionsWidth}px`" align="center">
        <template #default="scope">
          <slot name="handelBtn" :row="scope.row" />
        </template>
      </el-table-column>
    </el-table>
    <div class="el-pagination-container">
      <el-pagination
        class="el-pagination-table"
        v-if="showPagination"
        :page-size="pageOptions.size"
        :pager-count="5"
        :total="pageOptions.total"
        :current-page="pageOptions.page"
        :page-sizes="pageSizes"
        :layout="pageLayout"
        @size-change="sizeChange"
        @current-change="currentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, watch, nextTick, defineOptions} from 'vue'

defineOptions({ name: 'ElementTable'})

interface Column {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  sortable?: boolean | string
  children?: Column[]
  option?: Array<{ value: string | number, label: string }>
  slot?: string
}

interface PageOptions {
  page: number
  size: number
  total: number
}

const props = withDefaults(defineProps<{
  data: any[]
  columns: Column[]
  pageSizes?: number[]
  pageLayout?: string
  showIndex?: boolean
  showSelection?: boolean
  maxHeight?: number | string
  actionsWidth?: number
  loading?: boolean
  showActions?: boolean
  pageOptions?: PageOptions
  showPagination?: boolean
  rowKey?: string | ((row: any) => string)
}>(), {
  data: () => [],
  columns: () => [],
  pageSizes: () => [10, 20, 50, 100],
  pageLayout: 'total, prev, pager, next',
  showIndex: true,
  showSelection: false,
  maxHeight: 600,
  actionsWidth: 100,
  loading: false,
  showActions: false,
  pageOptions: () => ({
    page: 1,
    size: 10,
    total: 0
  }),
  showPagination: false,
  rowKey: () => 'id'
})

const emit = defineEmits<{
  (e: 'cellDbClick', row: any, column: any): void
  (e: 'rowClick', row: any): void
  (e: 'pageOptionsChange', size: number): void
  (e: 'handleCurrentChange', page: number): void
}>()

const table = ref()
const tableData = ref([...props.data])

watch(() => Array.isArray(props.data) ? props.data : [], (val) => {
  tableData.value = [...val] // 现在 val 保证是数组
  if (val.length) {
    nextTick(() => {
      setTimeout(() => {
        table.value?.doLayout()
      }, 50)
    })
  }
}, { immediate: true, deep: true })

const cellDbClick = (row: any, column: any) => {
  emit('cellDbClick', row, column)
}

const rowClick = (row: any) => {
  emit('rowClick', row)
}

const sizeChange = (size: number) => {
  emit('pageOptionsChange', size)
}

const currentChange = (page: number) => {
  emit('handleCurrentChange', page)
}

const indexMethod = (index: number) => {
  const page = props.pageOptions
  return index + 1 + page.size * (page.page - 1)
}

</script>

<style scoped lang="less">
.element-table {
  font-size: 12px !important;
  color: #333 !important;

  ::-webkit-scrollbar {
    width: 5px;
    height: 5px !important;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(64, 158, 255, 0.5); // 使用主色调
  }
  ::-webkit-scrollbar-track {
    background: rgba(204, 229, 255, 0.4); // 浅蓝色轨道
  }
}

::v-deep {
  .el-table {
    color: #eee;
    font-size: 12px;
    background: transparent !important;
    .el-table__header-wrapper,
    tr {
      background-color: transparent !important;
    }
    .el-table__border-left-patch {
      background-color: #069bd3 !important ;
    }
    .el-table__body td {
      color: #fff;
    }
    .el-table__inner-wrapper:after,
    .el-table__inner-wrapper:before {
      background-color: #069bd3 !important ;
    }
      // 表头样式
    th.el-table__cell {
      background-color: transparent !important; // 浅蓝色表头
      border-bottom: 1px solid #069bd3 !important;
      >.cell {
        font-size: 12px !important;
        font-weight: 500;
        color: #fff !important;
        line-height: 20px !important;
        text-shadow: none !important;
      }
    }


    // 单元格样式
    .cell {
      line-height: 24px;
      padding: 0 8px !important;
    }


    // 当前行高亮
    .current-row {
      td {
        background-color: #23596c !important; // 选中行蓝色
        .cell {
          color: #fff !important;
        }
      }
    }

    // 排序图标颜色
    .ascending .sort-caret.ascending {
      border-bottom-color: #409eff;
    }
    .descending .sort-caret.descending {
      border-top-color: #409eff;
    }

    // 边框处理
    &::before, td, th {
      border-color: #1491cd !important; // 浅蓝色边框
    }
  }

  .el-pagination {
    margin-top: 12px;
    .btn-prev,
    .el-pager li,
    .btn-next {
      min-width: 24px !important;
      height: 24px !important;
      margin: 0 2px !important;
    }
  }
}

// 移除不必要的边框
.el-table::before,
.el-table--group::after,
.el-table--border::after {
  display: none;
}
</style>
