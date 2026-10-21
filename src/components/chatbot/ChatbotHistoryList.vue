<template>
  <section class="chatbot-history">
    <div class="chatbot-history__header">
      <button
        class="chatbot-history__back"
        type="button"
        title="返回聊天"
        aria-label="返回聊天"
        @click="emit('back')">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <h3 class="chatbot-history__title">历史任务</h3>
      <span class="chatbot-history__count">{{ total }}</span>
    </div>

    <div class="chatbot-history__search">
      <el-icon class="chatbot-history__search-icon"><Search /></el-icon>
      <input
        v-model="keyword"
        class="chatbot-history__search-input"
        type="text"
        placeholder="搜索任务名称或编号"
        @input="handleSearchInput" />
    </div>

    <div
      ref="listRef"
      class="chatbot-history__list"
      @scroll.passive="handleScroll">
      <template v-for="group in groups" :key="group.title">
        <template v-if="group.items.length">
          <div class="chatbot-history__group-title">{{ group.title }}</div>
          <div
            v-for="session in group.items"
            :key="session.session_id"
            class="chatbot-history__item"
            @click="handleSelect(session, $event)">
            <span class="chatbot-history__item-name" :title="session.session_name">
              {{ session.session_name }}
            </span>
            <el-dropdown
              trigger="click"
              placement="bottom-end"
              popper-class="chatbot-history-menu"
              @command="(command: string) => handleCommand(command, session)">
              <button
                class="chatbot-history__item-more"
                type="button"
                title="更多操作"
                aria-label="更多操作">
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pin">
                    <img
                      class="chatbot-history-menu__icon"
                      :src="session.is_pinned ? unpinIcon : pinIcon"
                      alt="" />
                    <span>{{ session.is_pinned ? "取消置顶" : "置顶聊天" }}</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="rename">
                    <el-icon class="chatbot-history-menu__icon"><EditPen /></el-icon>
                    <span>重命名</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="delete">
                    <el-icon class="chatbot-history-menu__icon"><Delete /></el-icon>
                    <span>删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </template>

      <div v-if="loading" class="chatbot-history__placeholder">加载中...</div>
      <template v-else-if="loadError">
        <div class="chatbot-history__placeholder">加载失败</div>
        <button
          class="chatbot-history__retry"
          type="button"
          @click="loadPage(1)">
          重新加载
        </button>
      </template>
      <div v-else-if="!sessions.length" class="chatbot-history__placeholder">
        未找到相关任务
      </div>
      <div v-else-if="finished" class="chatbot-history__placeholder">
        已加载全部
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowLeft,
  Delete,
  EditPen,
  MoreFilled,
  Search,
} from "@element-plus/icons-vue";
import pinIcon from "@/assets/icons/pushpin-line.svg";
import unpinIcon from "@/assets/icons/unpin-line.svg";
import {
  deleteChatSession,
  getChatSessions,
  pinChatSession,
  renameChatSession,
} from "@/api/chatbot";
import type { ChatSessionItem } from "@/api/chatbot";

const props = defineProps<{
  // active 变为 true（进入历史页）时才首次拉取列表，避免未打开就发请求。
  active: boolean;
}>();

const emit = defineEmits<{
  back: [];
  select: [sessionId: string];
  deleted: [sessionId: string];
}>();

const PAGE_SIZE = 20;
const sessions = ref<ChatSessionItem[]>([]);
const total = ref(0);
const keyword = ref("");
const loading = ref(false);
const loadError = ref(false);
const finished = ref(false);
const pageNum = ref(1);
const listRef = ref<HTMLElement | null>(null);

let generation = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const groups = computed(() => [
  { title: "置顶", items: sessions.value.filter((item) => item.is_pinned) },
  { title: "最近", items: sessions.value.filter((item) => !item.is_pinned) },
]);

const hasMore = computed(() => sessions.value.length < total.value);

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as Error & { status?: number };
  if (err?.status === 401) return "登录状态无效，请重新登录后再试";
  return err?.message || fallback;
};

const loadPage = async (page: number) => {
  const current = ++generation;
  loading.value = true;
  loadError.value = false;
  try {
    const res = await getChatSessions({
      keyword: keyword.value,
      pageNum: page,
      pageSize: PAGE_SIZE,
    });
    if (current !== generation) return;

    const list = Array.isArray(res?.sessions) ? res.sessions : [];
    sessions.value = page === 1 ? list : [...sessions.value, ...list];
    total.value = Number(res?.total || 0);
    pageNum.value = page;
    finished.value =
      sessions.value.length >= total.value || list.length < PAGE_SIZE;
  } catch (error) {
    if (current !== generation) return;
    loadError.value = true;
    finished.value = true;
    ElMessage.error(getErrorMessage(error, "获取历史任务失败，请重试"));
  } finally {
    if (current === generation) loading.value = false;
  }
};

const handleSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    void loadPage(1);
  }, 300);
};

const handleScroll = () => {
  const element = listRef.value;
  if (!element) return;
  if (loading.value || loadError.value || !hasMore.value) return;
  if (element.scrollHeight - element.scrollTop - element.clientHeight <= 24) {
    void loadPage(pageNum.value + 1);
  }
};

const handleSelect = (session: ChatSessionItem, event: MouseEvent) => {
  // el-dropdown 会接管「更多」按钮自身的 click 并继续冒泡，这里用目标元素判断，
  // 避免点菜单按钮时误触发会话选中。
  const target = event.target as HTMLElement | null;
  if (target?.closest(".chatbot-history__item-more")) return;
  emit("select", session.session_id);
};

const handlePin = async (session: ChatSessionItem) => {
  const nextPinned = !session.is_pinned;
  try {
    await pinChatSession(session.session_id, nextPinned);
    ElMessage.success(nextPinned ? "已置顶" : "已取消置顶");
    // 置顶状态变化会影响排序，回到第一页重新拉取。
    await loadPage(1);
    listRef.value?.scrollTo({ top: 0 });
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "操作失败，请重试"));
  }
};

const handleRename = async (session: ChatSessionItem) => {
  let newName: string;
  try {
    const result = (await ElMessageBox.prompt("请输入新的任务名称", "重命名", {
      inputValue: session.session_name,
      inputValidator: (value: string) =>
        value && value.trim() ? true : "名称不能为空",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    })) as { value: string };
    newName = result.value.trim();
  } catch {
    return;
  }

  if (newName === session.session_name) return;

  try {
    await renameChatSession(session.session_id, newName);
    session.session_name = newName;
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "重命名失败，请重试"));
  }
};

const handleDelete = async (session: ChatSessionItem) => {
  try {
    await ElMessageBox.confirm(
      `确定删除「${session.session_name}」吗？`,
      "删除任务",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }

  try {
    await deleteChatSession(session.session_id);
    sessions.value = sessions.value.filter(
      (item) => item.session_id !== session.session_id,
    );
    total.value = Math.max(0, total.value - 1);
    ElMessage.success("已删除");
    emit("deleted", session.session_id);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "删除失败，请重试"));
  }
};

const handleCommand = (command: string, session: ChatSessionItem) => {
  if (command === "pin") void handlePin(session);
  else if (command === "rename") void handleRename(session);
  else if (command === "delete") void handleDelete(session);
};

watch(
  () => props.active,
  (isActive) => {
    // 每次进入历史页都重新拉取第一页，保证新建会话、最新消息能及时展示
    if (!isActive) return;
    void loadPage(1);
    listRef.value?.scrollTo({ top: 0 });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  generation += 1;
});
</script>

<style lang="less" scoped>
@cyan: #00ffff;
@text-main: #e6f7ff;
@text-sub: #8acdd6;
@bg-hl: rgba(0, 255, 255, 0.08);
@border-cyan: 1px solid rgba(0, 255, 255, 0.25);

.chatbot-history {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0 18px 16px;
  box-sizing: border-box;
}

.chatbot-history__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding: 14px 0 12px;
}

.chatbot-history__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: @text-main;
  background: transparent;
  cursor: pointer;

  &:hover {
    color: @cyan;
    background: @bg-hl;
  }
}

.chatbot-history__title {
  margin: 0;
  color: @cyan;
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.chatbot-history__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 7px;
  border: @border-cyan;
  border-radius: 10px;
  color: @text-sub;
  font-size: 11px;
  line-height: 1;
}

.chatbot-history__search {
  position: relative;
  flex-shrink: 0;
  margin-bottom: 6px;
}

.chatbot-history__search-icon {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  color: @text-sub;
  font-size: 15px;
  pointer-events: none;
}

.chatbot-history__search-input {
  width: 100%;
  height: 34px;
  padding: 0 12px 0 32px;
  border: @border-cyan;
  border-radius: 6px;
  color: @text-main;
  font-size: 13px;
  background: @bg-hl;
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: @text-sub;
  }

  &:focus {
    border-color: @cyan;
  }
}

.chatbot-history__list {
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  overflow-x: hidden;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.35);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.chatbot-history__group-title {
  margin: 12px 0 8px;
  color: @text-sub;
  font-size: 12px;
}

.chatbot-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  margin-bottom: 8px;
  border: @border-cyan;
  border-radius: 6px;
  color: @text-main;
  font-size: 14px;
  background: @bg-hl;
  cursor: pointer;

  &:hover {
    background: rgba(0, 255, 255, 0.16);
  }
}

.chatbot-history__item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chatbot-history__item-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: @text-sub;
  background: transparent;
  cursor: pointer;

  &:hover {
    color: @cyan;
    background: rgba(0, 255, 255, 0.16);
  }
}

.chatbot-history__placeholder {
  padding: 14px 0;
  color: @text-sub;
  font-size: 13px;
  text-align: center;
}

.chatbot-history__retry {
  display: block;
  margin: 0 auto;
  padding: 4px 14px;
  border: @border-cyan;
  border-radius: 4px;
  color: @cyan;
  font-size: 13px;
  background: transparent;
  cursor: pointer;

  &:hover {
    background: @bg-hl;
  }
}
</style>

<style lang="less">
// 下拉菜单挂载在 body 上，需要用全局样式控制（popper-class 指定）。
.chatbot-history-menu {
  .el-dropdown-menu {
    min-width: 150px;
    padding: 6px;
    border-radius: 6px;
    background: #f4f5f6;
  }

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 12px;
    border-radius: 4px;
    color: #4a4a4a;
    font-size: 15px;
    line-height: 1;

    &:not(.is-disabled):hover,
    &:not(.is-disabled):focus {
      background: rgba(0, 0, 0, 0.08);
      color: #4a4a4a;
    }
  }

  .chatbot-history-menu__icon {
    // 上传的图钉 SVG 是 1024 视口、笔画较细，16px 下会显得发虚，放大到 18px 更清晰
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: #4a4a4a;
    font-size: 18px;
  }
}
</style>
