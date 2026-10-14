import request from "@/utils/request";
import urlConfig from "@/public-path.ts";

/**
 * 飞行概览数据统计
 * @param timeType 时间口径：all=全部、day=今日、week=本周、month=本月，默认 day
 */
export function $getFlightOverview(timeType: string = 'day') {
    return request({
        url: `${urlConfig.baseUrl}/drone/situation/statistics/flight/overview`,
        method: "get",
        params: {
            timeType
        }
    });
}

/**
 * 按机场统计飞行次数
 */
export function $getAirportFlightStats() {
    return request({
        url: `${urlConfig.baseUrl}/drone/situation/statistics/flight/byAirport`,
        method: "get"
    });
}

/**
 * 按巡检类型统计飞行次数
 */
export function $getInspectionSceneFlightStats() {
    return request({
        url: `${urlConfig.baseUrl}/drone/situation/statistics/flight/byInspectionScene`,
        method: "get"
    });
}

/**
 * 媒体文件大小统计
 */
export function $getMediaFileSizeStats() {
    return request({
        url: `${urlConfig.baseUrl}/drone/situation/statistics/media/fileSize`,
        method: "get"
    });
}

/**
 * 设备总览统计
 */
export function $getDeviceOverviewStats() {
    return request({
        url: `${urlConfig.baseUrl}/drone/situation/statistics/device/overview`,
        method: "get"
    });
}
