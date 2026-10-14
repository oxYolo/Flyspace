import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";

/**
 * 获取图层目录树
 * @returns
 */
export function $getLayerTree() {
  return request({
    url: `${urlConfig.baseUrl}/system/layer/catalog/getLayerTree?businessSource=uavip`,
    method: "get",
  });
}
