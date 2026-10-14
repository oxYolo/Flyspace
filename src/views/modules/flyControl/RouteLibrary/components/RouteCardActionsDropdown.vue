<template>
  <div>
    <el-dropdown
      trigger="click"
      @command="handleCommand"
      popper-class="route-card-dropdown-popper"
      :teleported="false">
      <span class="el-dropdown-link action-icon" @click.stop>
        <el-icon><MoreFilled /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <template v-for="action in filteredActions" :key="action.command">
            <el-dropdown-item
              :command="{ command: action.command, routeId: props.routeId }"
              :divided="action.divided"
              :disabled="action.disabled">
              {{ action.label }}
            </el-dropdown-item>
          </template>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElIcon,
} from "element-plus";
import { MoreFilled } from "@element-plus/icons-vue";

const props = defineProps<{
  actions: Array<{
    command: string;
    label: string;
    divided?: boolean;
    permission?: string;
    disabled?: boolean;
  }>;
  routeId: number | string;
  isLocked: boolean;
  routeType: string; // 新增 prop
}>();

const emit = defineEmits(["command"]);

// 计算属性，根据 isLocked 和 routeType 过滤和修改 actions
const filteredActions = computed(() => {
  return props.actions
    .map((action) => {
      // 复制 action 对象，避免直接修改 props
      const newAction = { ...action };

      // 如果航线已锁定
      if (props.isLocked) {
        // 隐藏重命名和删除
        if (newAction.command === "rename" || newAction.command === "delete") {
          return null; // 返回 null 会在 filter 阶段被移除
        }
        // 改变锁定按钮为解锁
        if (newAction.command === "lock") {
          newAction.label = "解锁";
          newAction.command = "unlock";
        }
      } else {
        // 如果航线未锁定，确保锁定按钮显示为“锁定”
        if (newAction.command === "unlock") {
          // 确保从解锁状态切换回来时是锁定
          newAction.label = "锁定";
          newAction.command = "lock";
        }
      }

      // 根据航线类型禁用“航线拼接”
      if (newAction.command === "splice" && props.routeType !== "waypoint") {
        newAction.disabled = true;
        newAction.label = "航线拼接"; // 可以添加提示
      }

      return newAction;
    })
    .filter((action) => action !== null); // 过滤掉 null 值
});

const handleCommand = (command: {
  command: string;
  routeId: number | string;
}) => {
  emit("command", command);
};
</script>

<style lang="less" scoped>
.action-icon {
  width: 16px;
  height: 16px;
  cursor: pointer;
  color: #ccc; /* 默认图标颜色 */
  transition: color 0.2s ease; /* 添加颜色过渡 */

  svg {
    width: 100%;
    height: 100%;
  }

  &:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
    color: white; /* 鼠标悬停时颜色变亮 */
  }
}

:deep(.el-dropdown .el-dropdown__popper) {
  border: none !important;
}
:deep(.route-card-dropdown-popper) {
  /* 设置下拉菜单容器的背景色 */
  background-color: #444 !important; /* 使用 !important 确保覆盖 */
  /* 移除或修改默认的边框和阴影 */
  border: none !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important; /* 调整阴影 */
}

/* 修改下拉菜单内部的 el-dropdown-menu 样式 (通常不需要再次设置背景色) */
:deep(.route-card-dropdown-popper .el-dropdown-menu) {
  padding: 5px 0 !important; /* 调整内边距 */
  background-color: #444 !important; /* 下拉菜单背景色 */
}

/* 修改菜单项的样式 */
:deep(.route-card-dropdown-popper .el-dropdown-menu__item) {
  color: #ccc !important; /* 默认文字颜色 */
  padding: 0 20px !important; /* 调整菜单项内边距 */
  line-height: 36px !important; /* 调整行高 */
  background: transparent;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item.is-disabled) {
  color: #aaa !important; /* 默认文字颜色 */
}

/* 修改菜单项悬停时的样式 */
:deep(
  .route-card-dropdown-popper .el-dropdown-menu__item:not(.is-disabled):hover
) {
  background-color: #555 !important; /* 悬停背景色 */
  color: white !important; /* 悬停文字颜色 */
}

/* 修改分割线的样式 */
:deep(.route-card-dropdown-popper .el-dropdown-menu__item.is-divided) {
  border-top: 1px solid #555 !important; /* 分割线颜色 */
  margin-top: 5px !important; /* 分割线上方间距 */
  padding-top: 5px !important; /* 分割线下方内边距 */
}
:deep(.route-card-dropdown-popper .el-popper__arrow:before) {
  background-color: #444 !important;
  border: 1px solid #444 !important;
}
:deep(.route-card-dropdown-popper .el-dropdown-menu__item--divided) {
  border-top: 1px solid #ccc !important;
}
</style>
