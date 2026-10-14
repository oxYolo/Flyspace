import { defineStore } from 'pinia';
import router from '@/router';
import type { DeviceInfo } from '@/model/device.ts';
interface FlyControlState {
  device: DeviceInfo | null;
  runTaskData: any;
  drcConnected: boolean; // 设备接管授权状态
}

export const useFlyControlStore = defineStore('flyControl', {
  state: (): FlyControlState => ({
    device: null,
    runTaskData: null,
    drcConnected: false,
  }),

  getters: {
    hasDevice: (state) => !!state.device,
    isDock: (state) => state.device?.type === 'dock' || state.device?.name?.includes('Dock')
  },

  actions: {
    backToPage() {
      this.device = null;
      this.runTaskData = null;
      router.push({
        path: '/defaultMapPage/flyControl/project'
      });
    },
    /**
     * 设置飞控页面数据
     * @param device 设备信息
     * @param runTaskData 任务数据（可选）
     */
    setFlyControlData(device: DeviceInfo, runTaskData?: any) {
      this.device = device;
      this.runTaskData = runTaskData || null;
    },

    /**
     * 跳转到飞控管理页面
     * @param device 设备信息
     * @param runTaskData 任务数据（可选）
     */
    navigateToFlyControl(device: DeviceInfo, runTaskData?: any) {
      if (!device) {
        console.error('设备信息不能为空');
        return;
      }
      // 设置数据到 store（内存态，正常跳转无需回捞）
      this.setFlyControlData(device, runTaskData);

      // 跳转到飞控页面，URL 携带 deviceSn 作为主键
      // 目的：刷新页面时 store 内存丢失，FlyControlPage 可据此按 SN 回捞设备档案与任务
      router.push({
        path: '/flyControl',
        query: { deviceSn: device.deviceSn }
      });
    },

    /**
     * 设置设备接管授权状态
     * @param status 接管状态
     */
    setDrcConnected(status: boolean) {
      this.drcConnected = status;
    },
  }
});
