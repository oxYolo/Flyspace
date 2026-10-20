<template>
  <div class="header-container">
    <div class="header-wrap">
      <!-- 左侧菜单 -->
      <div class="header-left">
        <div class="header-logo">
          <img :src="whuLogoUrl" alt="WHU" />
        </div>
        <div class="menu-items">
          <div
            v-for="item in leftMenuItems"
            :key="item.key"
            class="menu-item-wrapper">
            <div
              class="menu-item"
              :class="[
                { active: activeMenu === item.key },
                { disabled: item.disabled },
                // item.key === 'device-management' ? 'menu-item-wide' : ''
              ]"
              @click="handleMenuClick(item)">
              {{ item.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- 中间标题 -->
      <div class="header-center">
        <h1 class="main-title">{{ headerTitle }}</h1>
      </div>

      <!-- 右侧菜单 -->
      <div class="header-right">
        <div class="menu-items">
          <div
            v-for="item in rightMenuItems"
            :key="item.key"
            class="menu-item"
            :class="[
              { active: activeMenu === item.key },
              { disabled: item.disabled },
            ]"
            @click="handleMenuClick(item)">
            {{ item.label }}
          </div>
        </div>
        <div class="header-icons">
          <!-- 智能体 -->
          <el-tooltip content="低空智飞助手">
            <div class="chatbot-entry" @click="chatbotStore.toggle()">
              <img :src="chatbotGif" />
            </div>
          </el-tooltip>
          <!-- 图层管理 -->
          <el-tooltip content="图层管理">
            <div class="icon-item" @click="handleShowLayerManage">
              <img :src="layerIcon" />
            </div>
          </el-tooltip>
          <!-- 退出登录 -->
          <el-tooltip content="退出登录">
            <div class="icon-item" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
            </div>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import urlConfig from "@/public-path.ts";
import layerIcon from "@/assets/icons/图层.png";
import chatbotGif from "@/assets/icons/chatbot.gif";
import { useLayerManageStore } from "@/stores/layer-manage.ts";
import { useChatbotStore } from "@/stores/chatbot.ts";
import useUserStore from "@/stores/modules/user";
import { ElMessage, ElMessageBox } from "element-plus";
import { getBusinessMenuList, type BusinessMenuRecord } from "@/api/menu.ts";

const layerManageStore = useLayerManageStore();
const chatbotStore = useChatbotStore();
const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const systemName = urlConfig.systemName;
const HEADER_BUSINESS_SOURCE = "uavip";
const DEFAULT_LOGO_URL = import.meta.env.BASE_URL + "images/whu_logo.png";

// 校徽（放在 public/images 下，由 Vite 静态服务，不再走 import 打包）
const whuLogoUrl = ref(DEFAULT_LOGO_URL);
const headerTitle = ref(systemName);

// 当前激活菜单
const activeMenu = ref("");

interface MenuItem {
  label: string;
  key: string;
  route: string;
  disabled?: boolean;
  developingText?: string;
}

// 当前展开的下拉菜单 key
const openDropdownKey = ref<string | null>(null);

const defaultLeftMenuItems: MenuItem[] = [
  {
    label: "态势感知",
    key: "device-management",
    route: "/defaultMapPage/flyControl/project",
  },

  {
    label: "需求工单",
    key: "requirement-management",
    route: "/defaultMapPage/flyControl/requirement",
  },
  {
    label: "航线管理",
    key: "flight-plan-management",
    route: "/defaultMapPage/flyControl/route",
  },
];

const defaultRightMenuItems: MenuItem[] = [
  {
    label: "任务管理",
    key: "task-management",
    route: "/defaultMapPage/flyControl/task",
  },
  {
    label: "成果管理",
    key: "result-management",
    route: "/defaultMapPage/flyControl/achievement",
  },
  {
    label: "智能服务",
    key: "intelligent-service",
    route: "/defaultMapPage/flyControl/smartService",
  },
];

// 动态菜单数据
const leftMenuItems = ref<MenuItem[]>([...defaultLeftMenuItems]);
const rightMenuItems = ref<MenuItem[]>([...defaultRightMenuItems]);

const allMenu = computed(() => {
  return [...leftMenuItems.value, ...rightMenuItems.value];
});

const normalizeRoutePath = (routePath: string) => {
  if (!routePath) return "";
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
};

const resolveLogoUrl = (icon: string | null) => {
  if (!icon) return DEFAULT_LOGO_URL;
  if (/^(https?:)?\/\//.test(icon) || icon.startsWith("/")) {
    return icon;
  }
  return `${import.meta.env.BASE_URL}images/${icon}`;
};

const mapBusinessMenuToMenuItem = (
  item: BusinessMenuRecord,
): MenuItem | null => {
  if (!item.component) return null;

  return {
    label: item.menuName,
    key: item.path || String(item.menuId),
    route: normalizeRoutePath(item.component),
    disabled: item.status !== "0",
    developingText: `${item.menuName}暂不可用`,
  };
};

const updateActiveMenu = (path = route.path) => {
  console.debug("[Header] route changed to=", path);
  // 直接根据主菜单匹配
  const activeMenuItem = allMenu.value.find(
    (item) => !item.disabled && item.route && path.indexOf(item.route) > -1,
  );
  if (activeMenuItem) {
    activeMenu.value = activeMenuItem.key;
  } else {
    activeMenu.value = "";
  }
};

const loadHeaderMenus = async () => {
  try {
    const result = await getBusinessMenuList(HEADER_BUSINESS_SOURCE);
    if (result.code !== 200 || !Array.isArray(result.data)) return;

    const rootMenuRecord =
      result.data.find((item) => item.parentId === 0) || result.data[0];
    const logoRecord = result.data.find((item) => item.icon) || rootMenuRecord;
    headerTitle.value = rootMenuRecord?.menuName || systemName;
    whuLogoUrl.value = resolveLogoUrl(logoRecord?.icon || null);

    const menuItems = result.data
      .filter((item) => item.component)
      .sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0))
      .map(mapBusinessMenuToMenuItem)
      .filter((item): item is MenuItem => Boolean(item));

    if (menuItems.length === 0) return;

    const middleIndex = Math.ceil(menuItems.length / 2);
    leftMenuItems.value = menuItems.slice(0, middleIndex);
    rightMenuItems.value = menuItems.slice(middleIndex);
    updateActiveMenu();
  } catch (error) {
    console.warn("[Header] load header menus failed:", error);
  }
};

// 监听路由变化，更新激活菜单
watch(
  () => route.path,
  (value) => updateActiveMenu(value),
  {
    immediate: true,
  },
);

// 菜单点击事件（不再展开下拉，直接跳转）
const handleMenuClick = (item: MenuItem) => {
  console.debug("[Header] handleMenuClick item=", item);
  if (item.disabled) {
    activeMenu.value = "";
    ElMessage.info(item.developingText || `${item.label}功能开发中，敬请期待`);
    return;
  }
  if (!item.route) return;
  if (item && item.key) {
    activeMenu.value = item.key;
    router
      .push({ path: item.route })
      .catch((e: any) => console.warn("[Header] router.push warning:", e));
    openDropdownKey.value = null;
  } else {
    activeMenu.value = "";
  }
};

onMounted(() => {
  loadHeaderMenus();
});

const handleShowLayerManage = () => {
  layerManageStore.setLayerManageVisible(true);
};

const handleLogout = () => {
  ElMessageBox.confirm("确定要退出系统吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await userStore.logout();
        router.push("/login");
        ElMessage.success("退出成功");
      } catch (e: any) {
        ElMessage.error(e?.message || "退出失败");
      }
    })
    .catch(() => {
      // 取消退出
    });
};
</script>

<style scoped lang="less">
.header-container {
  height: 90px;
  color: white;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: url("../assets/images/header/top.png") center no-repeat;
  background-size: cover;
  z-index: 1000;
  pointer-events: none;
}

.header-wrap {
  display: flex;
  align-items: center;
  pointer-events: auto;
  // margin-top: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;

  .header-logo {
    position: absolute;
    top: 10px;
    left: 10px;
    height: 56px;
    width: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: left center;
      display: block;
    }
  }

  .menu-items {
    margin-left: auto;
    display: flex;
    align-items: center;
    height: 100%;
    .menu-item {
      background: url("../assets/images/header/nav_左_nor.png") center no-repeat;
      background-size: 100% 100%;

      display: flex;
      align-items: center;
      justify-content: center;
    }
    .active {
      background: url("../assets/images/header/nav_左_sel.png") center no-repeat;
      background-size: 100% 100%;
    }
  }
}

.header-center {
  flex: 1.1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  height: 100%;

  .main-title {
    font-size: 34px;
    font-weight: bold;
    letter-spacing: 3px;
    color: #ffffff;
    text-shadow:
      0 0 10px rgba(0, 255, 255, 0.8),
      0 0 20px rgba(0, 255, 255, 0.6),
      0 0 30px rgba(0, 255, 255, 0.4),
      2px 2px 4px rgba(0, 0, 0, 0.8);
  }
}

.header-right {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;

  .menu-items {
    display: flex;
    align-items: center;
    height: 100%;
    min-width: 0;
    .menu-item {
      background: url("../assets/images/header/nav_右_nor.png") center no-repeat;
      background-size: 100% 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .active {
      background: url("../assets/images/header/nav_右_sel.png") center no-repeat;
      background-size: 100% 100%;
    }
  }

  .header-icons {
    display: flex;
    align-items: center;
    height: 100%;
    margin-left: auto;
    margin-bottom: 12px;
  }
}

.chatbot-entry {
      width: 60px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 20px;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.menu-item {
  padding: 2px 10px;
  width: clamp(84px, 7vw, 120px);
  height: 35px;
  color: #fff;
  font-size: clamp(12px, 1.1vw, 18px);
  font-weight: 500;
  text-align: center;
  cursor: pointer;
}

// .menu-item-wide {
//   width: clamp(140px, 10vw, 170px);
// }

.menu-item-wrapper {
  position: relative;
}

.caret {
  margin-left: 6px;
  font-size: 12px;
}

.dropdown {
  position: absolute;
  top: 36px;
  left: 0;
  min-width: 140px;
  background: rgba(0, 10, 20, 0.85);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 255, 255, 0.2);
  z-index: 2000;
}

.dropdown-item {
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
}

.dropdown-item:hover {
  background: rgba(0, 255, 255, 0.12);
}

.icon-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s ease;
  img {
    width: 60%;
    height: 60%;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .header-container {
    padding: 0 15px;
  }

  .header-center .main-title {
    font-size: 20px;
  }

  .header-left .time-display {
    min-width: 150px;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .header-container {
    flex-direction: column;
    height: auto;
    padding: 10px;
    gap: 10px;
  }

  .header-left,
  .header-right {
    flex: none;
  }

  .header-center .main-title {
    font-size: 18px;
  }

  .menu-item {
    padding: 6px 12px;
    font-size: 12px;
  }
}

.menu-item.disabled {
  cursor: not-allowed;
  filter: grayscale(0.15);
}
</style>
