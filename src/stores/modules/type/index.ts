import { RouteRecordRaw } from 'vue-router'

export interface IWithoutAnimation {
  withoutAnimation: boolean
}
export type TSize = 'large' | 'default' | 'small'
export interface IChangeSetting {
  key: string
  value: any
}

export enum UserActionTypes {
  ACTION_LOGIN = 'ACTION_LOGIN',
  ACTION_RESET_TOKEN = 'ACTION_RESET_TOKEN',
  ACTION_GET_USER_INFO = 'ACTION_GET_USER_INFO',
  ACTION_CHANGE_ROLES = 'ACTION_CHANGE_ROLES',
  ACTION_LOGIN_OUT = 'ACTION_LOGIN_OUT',
  ACTION_GET_USER_ROUTERS = 'ACTION_GET_USER_ROUTERS',
}

export enum UserMutationTypes {
  SET_TOKEN = 'SET_TOKEN',
  SET_NAME = 'SET_NAME',
  SET_AVATAR = 'SET_AVATAR',
  SET_INTRODUCTION = 'SET_INTRODUCTION',
  SET_ROLES = 'SET_ROLES',
  SET_ROUTERS = 'SET_ROUTERS',
  SET_EMAIL = 'SET_EMAIL',
  SET_PREMISSION = 'SET_PREMISSION',
}
