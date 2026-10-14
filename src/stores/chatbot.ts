import { defineStore } from "pinia";

export const useChatbotStore = defineStore("chatbot", {
  state: () => ({
    visible: false,
    // 面板宽度（vw），与 .content-wrap 的 padding-right 联动
    panelWidth: 36,
  }),
  actions: {
    open() {
      this.visible = true;
    },
    close() {
      this.visible = false;
    },
    toggle() {
      this.visible = !this.visible;
    },
    setWidth(width: number) {
      // 下限放宽到 20vw，允许 FlyControlPage 等场景使用更窄的面板宽度
      this.panelWidth = Math.min(70, Math.max(20, Number(width.toFixed(2))));
    },
  },
  getters: {},
});
