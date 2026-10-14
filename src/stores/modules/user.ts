import { defineStore } from 'pinia'

import { droneLogin, logout, getUserDetail } from '@/api/login'
import { getToken, setToken, removeToken } from '@/utils/auth'
import type {
  IUserModel,
  ILoginResponse,
  IUserInfoResponse,
} from '@/model/userModel'

export const state: any = {
  token: getToken() || '',
  name: '',
  introduction: '',
  roles: [],
  routers: [],
  email: '',
  premission: [],
}

const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    name: '',
    email: '',
    routers: [] as any[],
    roles: [] as string[],
    permissions: [] as string[],
  }),

  actions: {
    /**
     * @description: 登录, 别用箭头函数，因为这里需要用到this指针！
     * @param {IUserModel} userInfo 用户信息
     * @return {Promise<string>}
     */
    async login(userInfo: IUserModel): Promise<string> {
      const result: ILoginResponse = await droneLogin(userInfo)
      if (result.code === 200) {
        setToken(result.data.access_token)
        this.token = result.data.access_token
        return 'ok'
      } else {
        return Promise.reject(new Error(result.msg))
      }
    },

    /**
     * @description: 获取用户信息, 别用箭头函数，因为这里需要用到this指针！
     * @return {Promise<string>}
     */
    async getUserInfo(): Promise<string> {
      try {
        const userInfo: IUserInfoResponse = await getUserDetail()
        if (userInfo.code == 200) {
          const user = userInfo.user

          if (userInfo.roles && userInfo.roles.length > 0) {
            // 验证返回的roles是否是一个非空数组
            this.roles = userInfo.roles
            this.permissions = userInfo.permissions
          } else {
            this.roles = ['ROLE_DEFAULT']
          }
          this.name = user.userName
          return 'ok'
        } else {
          removeToken()
          return Promise.reject(new Error(userInfo.msg))
        }
      } catch (error: any) {
        removeToken()
        return Promise.reject(new Error(error.msg || ''))
      }
    },

    /**
     * @description: 退出系统,别用箭头函数，因为这里需要用到this指针！
     * @return {Promise<void>}
     */
    async logout(): Promise<string> {
      const result: any = await logout()
      if (result.code == 200) {
        // 清空用户的token信息
        this.token = ''
        // 清空用户角色信息
        this.roles = []
        // 清空用户权限信息
        this.permissions = []
        // 移除本地存储的token
        removeToken()
        return 'ok'
      } else {
        return Promise.reject(new Error(result.msg || ''))
      }
    },
  },
})

export default useUserStore
