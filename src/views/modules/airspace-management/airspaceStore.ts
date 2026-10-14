import { defineStore } from 'pinia';
import { CesiumMapManager } from "@/map-system";

export const useAirspaceStore = defineStore("airspaceStore", {
  state: () => ({
    showLeftPanel: true,
    cesiumViewer: null,
    mapSize: 'large',
    currentAirspace: null, // 当前选中的空域
    drawingMode: null, // 绘制模式：'polygon' | 'circle' | null
  }),
  actions: {
    changeLeftPanelVisible(flag?: boolean) {
      if (flag === false || flag === true) {
        this.showLeftPanel = flag;
      } else {
        this.showLeftPanel = !this.showLeftPanel;
      }
    },
    setCesiumViewer(viewer: any) {
      this.cesiumViewer = viewer;
    },
    changeMapSize(size: 'large' | 'small') {
      this.mapSize = size;
    },
    setCurrentAirspace(data: any) {
      this.currentAirspace = data;
    },
    setDrawingMode(mode: 'polygon' | 'circle' | null) {
      this.drawingMode = mode;
    },
    resetInfo() {
      this.mapSize = 'large';
      this.currentAirspace = null;
      this.drawingMode = null;
      const mapManager = new CesiumMapManager(this.cesiumViewer)
      const dataSource = mapManager.getDataSource("airspace-layer-source");
      if(dataSource) {
        dataSource.entities.removeAll();
      }
    }
  }
})
