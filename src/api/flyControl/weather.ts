import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";


/**
 * 查询24小时天气数据
 * @param data 查询参数
 * @returns
 */
export const getWeatherList = (data?: any) => {
  return request({
    url: `${urlConfig.baseUrl}/data/weather/page/24h`,
    method: "post",
    data
  })
}

/**
 * 查询24小时天气报警数据
 * @param data 查询参数
 * @returns
 */
export const getWeatherAlarmPage = (data?: any) => {
  return request({
    url: `${urlConfig.baseUrl}/data/weather/alarm/page`,
    method: "post",
    data
  })
}

/**
 * 查询通知列表
 * @param data 查询参数
 * @returns
 */
export const getNoticeList = (data?: any) => {
  return request({
    url: `${urlConfig.baseUrl}/data/notice/list`,
    method: "post",
    data
  })
}
