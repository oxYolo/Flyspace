import { defineStore } from 'pinia';
import { $handleGetDeviceDictionaryPage } from "@/api/flyControl/device.ts";

interface DeviceResponse {
  rows?: any[];
  [key: string]: any;
}

export const useRouterLibraryStore = defineStore('RouterLibrary', {
  state: () => ({
    deviceDictionary: [] as Array<any>
  }),
  actions: {
    setDeviceDictionary(data: Array<any>) {
      this.deviceDictionary = data;
    },

    async getDeviceDictionary() {
      // 检查 pinia 中是否已有数据
      if (this.deviceDictionary?.length > 0) {
        return this.deviceDictionary;
      } else {
        // 如果没有数据，则调用接口获取
        const params = {
          domain: 0,
          pageNum: 1,
          pageSize: 100,
        }
        const res = await $handleGetDeviceDictionaryPage(params) as DeviceResponse;
        const deviceDictionaryList = res.rows || [];
        this.setDeviceDictionary(deviceDictionaryList);
        return deviceDictionaryList;
      }
    }
  },
});
