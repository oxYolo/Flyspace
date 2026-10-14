import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";

export interface BusinessMenuRecord {
  menuId: number;
  menuName: string;
  parentId: number;
  orderNum: number;
  path: string;
  component: string | null;
  visible: string;
  status: string;
  icon: string | null;
  businessSource: string;
}

interface BusinessMenuResponse {
  code: number;
  msg: string;
  data: BusinessMenuRecord[];
}

export function getBusinessMenuList(businessSource: string) {
  return request<any, BusinessMenuResponse>({
    url: `${urlConfig.baseUrl}/system/menu/listByUserAndBusinessSource/${businessSource}`,
    method: "get",
  });
}
