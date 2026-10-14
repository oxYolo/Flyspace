import { defineStore } from "pinia";

export const useLayerManageStore = defineStore("layerManage", {
  state: () => ({
    visible: false,
  }),
  actions: {
    setLayerManageVisible(flag: boolean) {
      this.visible = flag;
    }
  },
  getters: {},
});
