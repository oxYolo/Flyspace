import request from '@/utils/request'
import urlConfig from '@/public-path.ts'
import { encryptSm2LoginText } from '@/utils/sm2'
import type {
  ICodeModel,
  IUserModel,
  IUserInfoResponse,
  ILoginResponse,
} from '@/model/userModel'

enum USER_API_URL {
  LOGIN_URL = '/auth/login',
  NO_CODE_LOGIN = '/auth/dronelogin',
  REGISTER_URL = '/auth/register',
  REFRESH_URL = '/auth/refresh',
  GET_USER_INFO_URL = '/system/user/getInfo',
  LOGOUT_URL = '/auth/logout',
  GET_LOGIN_ANTH_CODE_URL = '/code',
}

/**
 * 用户登录
 * @param userInfo
 * @returns Promise<ILoginResponse>
 */
export function login(userInfo: IUserModel): Promise<ILoginResponse> {
  return request<any, ILoginResponse>({
    url: USER_API_URL.LOGIN_URL,
    headers: {
      isToken: false,
    },
    method: 'post',
    data: buildEncryptedLoginData(userInfo),
  })
}

/**
 * 用户登录（不用验证码，内部使用）
 * @param userInfo
 * @returns Promise<ILoginResponse>
 */
export function droneLogin(userInfo: IUserModel): Promise<ILoginResponse> {
  const isCbEnv = ["cb", "production", "test"].includes(import.meta.env.MODE);
  return request<any, ILoginResponse>({
    url: USER_API_URL.NO_CODE_LOGIN,
    headers: {
      isToken: false,
    },
    method: 'post',
    data: isCbEnv ? buildEncryptedLoginData(userInfo) : userInfo,
  })
}

function buildEncryptedLoginData(userInfo: IUserModel) {
  const sm2LoginConfig = (urlConfig as any).sm2Login || {}

  return {
    username: userInfo.username,
    password: encryptSm2LoginText(userInfo.password, sm2LoginConfig),
    rememberMe: userInfo.rememberMe,
  }
}

/**
 * 用户注册
 * @returns
 * @param userInfo
 */
export function register(userInfo: IUserModel) {
  return request({
    url: USER_API_URL.REGISTER_URL,
    headers: {
      isToken: false,
    },
    method: 'post',
    data: userInfo,
  })
}

/**
 * 刷新方法
 * @returns Promise<any>
 */
export function refreshToken(): Promise<any> {
  return request.post<any, any>(USER_API_URL.REFRESH_URL)
}

/**
 * 获取用户详细信息
 * @returns Promise<IUserInfoResponse>
 */
export function getUserDetail(): Promise<IUserInfoResponse> {
  return request.get<any, IUserInfoResponse>(USER_API_URL.GET_USER_INFO_URL)
}

/**
 * 用户退出登录
 * @returns Promise<any>
 */
export function logout(): Promise<any> {
  return request.delete<any, any>(USER_API_URL.LOGOUT_URL)
}

/**
 * 获取图片验证码
 * @returns Promise<ICodeModel>
 */
export function getCodeImg(): Promise<ICodeModel> {
  return request.get<any, ICodeModel>(USER_API_URL.GET_LOGIN_ANTH_CODE_URL, {
    headers: {
      isToken: false,
    },
    method: 'get',
    timeout: 20000,
  })
  //
}
