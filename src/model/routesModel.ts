import type { IBaseResponseModel } from './baseResponseModel'
import type { Component } from 'vue'
import type { RouteMeta as VueRouteMeta } from 'vue-router'

export interface Meta {
  title: string
  icon: string
  noCache?: boolean
  link?: string
}

export interface Route {
  name: string
  path: string
  hidden: boolean
  component: string
  redirect?: string
  alwaysShow?: boolean
  meta: Meta
  children?: RouteList
}

export type RouteList = Route[]

// {
//   "msg": "操作成功",
//     "code": 200,
//       "data": [
//         {
//           "name": "System",
//           "path": "/system",
//           "hidden": false,
//           "redirect": "noRedirect",
//           "component": "Layout",
//           "alwaysShow": true,
//           "meta": {
//             "title": "系统管理",
//             "icon": "system",
//             "noCache": false,
//             "link": null
//           },
//           "children": [
//             {
//               "name": "User",
//               "path": "user",
//               "hidden": false,
//               "component": "system/user/index",
//               "meta": {
//                 "title": "用户管理",
//                 "icon": "user",
//                 "noCache": false,
//                 "link": null
//               }
//             }
//           ]
//         }
//       ]
// }

/**
 * 定义获取路由的返回数据结构
 */
export interface IRouteResponseModel extends IBaseResponseModel {
  data: RouteList
}

export interface RouteMeta extends VueRouteMeta {
  title?: string
  icon?: string
  noCache?: boolean
  breadcrumb?: boolean
  activeMenu?: string
  affix?: boolean,
  permissionKey?: string
}

export interface AppRouteRecordRaw {
  path: string
  name?: string
  meta?: RouteMeta
  component?: Component | string
  children?: AppRouteRecordRaw[]
  hidden?: boolean
  permissions?: string[]
  redirect?: string
  roles?: string[]
}
