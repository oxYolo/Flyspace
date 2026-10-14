
import type { RouteRecordRaw } from 'vue-router'
import type { IBaseResponseModel } from './baseResponseModel'

export interface UserInfoModel {
  id: number
  username: string
  password: string
  name: string
  avatar: string
  introduction: string
  email: string
  phone: string
  roles: string[]
}

export interface Users {
  items: any
}

export interface IUserModel {
  username: string
  password: string
  confirmPassword?: string
  code?: string
  uuid?: string
  rememberMe?: boolean
}

/**
 * 验证码model对象
 */
export interface ICodeModel {
  /**
   * 是否启用验证码
   */
  captchaEnabled: boolean
  /**
   * http 请求返回状态码
   */
  code: number
  /**
   * 图片信息,base64编码字符串
   */
  img: string
  /**
   * 提示信息
   */
  msg: string
  uuid: string
}

export interface IUserState {
  token: string
  name: string
  avatar: string
  introduction: string
  roles: string[]
  routers: RouteRecordRaw[]
  email: string
  premission: string[]
}

export interface ILoginResponse extends IBaseResponseModel {
  data: {
    access_token: string
    expires_in: number
  }
}

export interface IUserInfoResponse extends IBaseResponseModel {
  permissions: string[]
  roles: string[]
  user: {
    userId?: number
    deptId?: number
    userName: string
    nickName?: string
    email?: string
    phonenumber?: string
    avatar?: string
    admin?: true
  }
}
