import { defineStore } from 'pinia';
import { CesiumMapManager } from "@/map-system";

export const useSmartServiceStore = defineStore("smartServiceStore", {
  state: () => ({
    showLeftPanel: true,
    resultInfo: null,
    cesiumViewer: null,
    mapSize: 'large'
  }),
  actions: {
    changeLeftPanelVisible(flag?: boolean) {
      if (flag === false || flag === true) {
        this.showLeftPanel = flag;
      } else {
        this.showLeftPanel = !this.showLeftPanel;
      }
    },
    setResultInfo(data: any) {
      this.resultInfo = data;
    },
    setCesiumViewer(viewer: any) {
      this.cesiumViewer = viewer;
    },
    changeMapSize(size: 'large' | 'small') {
      this.mapSize = size;
    },
    resetInfo() {
      this.mapSize = 'large';
      this.resultInfo = null;
      const mapManager = new CesiumMapManager(this.cesiumViewer)
      const dataSource = mapManager.getDataSource("routeLayer-source");
      if(dataSource) {
        dataSource.entities.removeAll();
      }
    }
  }
})
