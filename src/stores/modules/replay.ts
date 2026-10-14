import { defineStore } from 'pinia';
import router from '@/router';

interface ReplayState {
  currentTask: any;
}

export const useReplayStore = defineStore('replay', {
  state: (): ReplayState => ({
    currentTask: null,
  }),

  getters: {
    hasTask: (state) => !!state.currentTask,
  },

  actions: {
    backToPage() {
      this.currentTask = null;
      router.push({
        path: '/defaultMapPage/flyControl/task'
      });
    },

    /**
     * 设置回放页面数据
     * @param currentTask 当前任务信息
     */
    setReplayData(currentTask: any) {
      this.currentTask = currentTask;
    },

    /**
     * 跳转到回放页面
     * @param currentTask 当前任务信息
     */
    navigateToReplay(currentTask: any) {
      if (!currentTask) {
        console.error('任务信息不能为空');
        return;
      }
      // 设置数据到 store
      this.setReplayData(currentTask);

      // 跳转到回放页面
      router.push({
        path: '/replay'
      });
    },
  }
});
