import axios from 'axios'
import {
  ElMessageBox,
  ElLoading,
} from 'element-plus'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { tansParams, blobValidate } from '@/utils/ruoyi'
import { saveAs } from 'file-saver'
import useUserStore from '@/stores/modules/user'
import type { RequestParams } from 'axios-mapper'

import type { IRspObj, TErrorCode, TOtherCode } from '@/model/requestModel.ts'
import urlConfig from "@/public-path.ts";

let downloadLoadingInstance: { close: () => void }
/**
 * 是否显示重新登录
 */
export const isRelogin = { show: false }
axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

/**
 * 创建axios实例
 */
const service = axios.create({
  // axios中请求配置有baseURL选项，表示请求URL公共部分
  baseURL: urlConfig.baseUrl,
  // 超时
  timeout: 100000,
})

/**
 * request请求拦截器
 */
service.interceptors.request.use(
  // @ts-ignore
  (config) => {
    // 是否需要设置 token
    const isToken = (config.headers || {}).isToken === false
    if (getToken() && !isToken) {
      if (config.headers) {
        config.headers['Authorization'] = 'Bearer ' + getToken() // 让每个请求携带自定义token 请根据实际情况自行修改
      }
    }
    // get请求映射params参数
    if (config.method === 'get' && config.params) {
      let url = config.url + '?' + tansParams(config.params)
      url = url.slice(0, -1)
      config.params = {}
      config.url = url
    }
    return config
  },
  (error: any) => {
    console.log(error)
    Promise.reject(error)
  },
)

/**
 * 响应拦截器
 */
service.interceptors.response.use(
  (res: any) => {
    // 未设置状态码则默认成功状态
    const code: TErrorCode = res.data.code || 200
    const otherCode: TOtherCode = res.data.code
    // 获取错误信息
    const msg =
      code === 401 || code === 403 || code === 404
        ? errorCode[code as 401 | 403 | 404]
        : res.data.msg || errorCode['default']
    // 二进制数据则直接返回
    if (
      res.request.responseType === 'blob' ||
      res.request.responseType === 'arraybuffer'
    ) {
      return res.data
    }
    if (code === 401) {
      location.href = '/'
      return Promise.reject('无效的会话，或者会话已过期，请重新登录。')
    } else if (otherCode === 500) {
      return Promise.reject(new Error(msg))
    } else if (otherCode === 601) {
      return Promise.reject(new Error(msg))
    } else {
      return Promise.resolve(res.data)
    }
  },
  (error: any) => {
    return Promise.reject(error)
  },
)

/**
 * 通用下载方法
 * @param url
 * @param params
 * @param filename
 * @param config
 * @returns
 */
export function download(
  url: string,
  params: RequestParams,
  filename: string,
  config: any,
) {
  downloadLoadingInstance = ElLoading.service({
    text: '正在下载数据，请稍候',
    background: 'rgba(0, 0, 0, 0.7)',
  })
  return service
  .post(url, params, {
    transformRequest: [
      (params: RequestParams) => {
        return tansParams(params)
      },
    ],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    ...config,
  })
  .then(async (data: any) => {
    const isLogin = await blobValidate(data)
    if (isLogin) {
      const blob = new Blob([data])
      saveAs(blob, filename)
    }
    downloadLoadingInstance.close()
  })
  .catch((r: any) => {
    downloadLoadingInstance.close()
  })
}

export default service
