import { ref, onMounted } from 'vue';
import { getWeatherAlarmPage } from "@/api/flyControl/weather";
export function useRightCenterModule() {
  const warningData = ref<any[]>([]);

  // 获取数据
  const fetchWarningData = async () => {
    getWeatherAlarmPage({
      pageNum: 1,
      pageSize: 10,
      name: '咸宁'
    }).then((res: any) => {
      warningData.value = res.data.records
    })
  };


  onMounted(() => {
    fetchWarningData();
  });

  return {
    warningData
  }
}
