
import { cloneDeep } from "lodash";
import { defineStore } from "pinia";

export type SideTabType = {
  // 面板id
  id: string;
  // 面板名称
  name: string;
  // 面板是否显示
  isVisible: boolean;
  // 面板是否创建
  isCreate: boolean;
  // 面板是否展开
  isExpand: boolean;
  // 面板是否已被拖拽
  isDraged: boolean;
}

export const useSideTabStore = defineStore("sideTab", {
  state: () => ({
    sideTabList: [] as SideTabType[], // 停靠标签列表
    isSideTabFixed: true, // 停靠标签是否固定
  }),
  actions: {
    // 新增标签
    addSideTab(tab: SideTabType) {
      const newTabList = cloneDeep(this.sideTabList);
      // 如果标签是可见的，将除已拖拽面板之外的其他标签设置为不可见
      if (tab?.isVisible) {
        newTabList.forEach((item) => {
          if (!item.isDraged) {
            if (tab.id != item.id) {
              item.isVisible = false;
            }
          } else {
            item.isVisible = true;
          }
        });
      }
      //新增标签位于列表第一项
      if (!newTabList.some((item: SideTabType) => item.id === tab.id)) {
        newTabList.unshift(tab);
      }
      this.sideTabList = newTabList;
    },
    // 删除标签
    removeSideTab(tab: SideTabType) {
      this.sideTabList = this.sideTabList.filter(
        (item: SideTabType) => item.id !== tab.id,
      );
    },

    // 更新标签
    updateSideTab(tab: SideTabType, index?: number) {
      this.sideTabList = this.sideTabList.map((item: SideTabType) => {
        if (item.id === tab.id) return tab;

        //  如果标签是可见的，将除已拖拽面板之外其他标签设置为不可见
        if (!tab.isDraged && tab.isVisible && !item.isDraged) {
          item.isVisible = false;
        }

        return item;
      });

      // 如果提供了有效索引，则执行位置更新
      if (typeof index === 'number' && index >= 0) {
        // 先移除原有位置的tab（如果存在）
        const existingIndex = this.sideTabList.findIndex(item => item.id === tab.id);
        if (existingIndex !== -1) {
          this.sideTabList.splice(existingIndex, 1);
        }

        // 插入到指定位置（不超过数组长度）
        const insertIndex = Math.min(index, this.sideTabList.length);
        this.sideTabList.splice(insertIndex, 0, tab);
      }
    },
    // 设置停靠标签列表固定
    setSideTabFixed(isSideTabFixed: boolean) {
      this.isSideTabFixed = isSideTabFixed;
    },
  },
  getters: {
    sideTabIds: (state) => {
      return state.sideTabList.map((item: SideTabType) => item.id);
    }
  },
});
