import { onMounted, ref } from "vue";
import { getNoticeList } from "@/api/flyControl/weather";
export function useRightBottomModule() {
  const noticeList = ref<any[]>([]);

  const fetchNoticeData = () => {
    getNoticeList({
      pageNum: 1,
      pageSize: 10,
    }).then(res => {
      noticeList.value = res.data.records;
    })
  }


  onMounted(() => {
    fetchNoticeData();
  });
  return {
    noticeList
  }
}
