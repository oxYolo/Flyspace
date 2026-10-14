import urlConfig from "@/public-path.ts";
import request from '@/utils/request'

//  空域管理接口
export function $getNoFlyZoneList(params?: any) {
    return request({
        url: `${urlConfig.baseUrl}/data/noFlyZone/list`,
        method: "post",
        data: params,
    });
}

//  获取低空适飞区接口 get 请求 /data/flight/area/getFlightArea 
export function $getFlightAreaList(params?: any) {
    return request({
        url: `${urlConfig.baseUrl}/data/flight/area/getFlightArea`,
        method: "get",
        params: params,
    });
}








